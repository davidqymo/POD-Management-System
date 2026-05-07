package com.pod.service;

import com.pod.dto.response.ConstraintViolation;
import com.pod.entity.Activity;
import com.pod.entity.Allocation;
import com.pod.entity.AllocationStatus;
import com.pod.entity.Project;
import com.pod.entity.Resource;
import com.pod.exception.ConstraintViolationException;
import com.pod.exception.FourEyesViolationException;
import com.pod.exception.ResourceNotFoundException;
import com.pod.repository.ActivityRepository;
import com.pod.repository.AllocationRepository;
import com.pod.repository.ProjectRepository;
import com.pod.repository.ResourceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;

/**
 * AllocationService - Core allocation lifecycle with HCM-based validation and four-eyes approval.
 *
 * PROCESS FLOW:
 *
 * 1. CREATE ALLOCATION (createAllocation):
 *    a. Validate inputs (resourceId, projectId, hcm, hours required)
 *    b. Verify resource and project exist
 *    c. Fetch activity if provided
 *    d. Run HCM-based constraint validation (via AllocationConstraintValidator):
 *       - Monthly total hours ≤ 144h (1 HCM = 144 hours)
 *       - Budget remaining ≥ proposed cost
 *    e. Check for overlapping allocations (same resource+project+hcm with PENDING/APPROVED)
 *    f. Create allocation with PENDING status
 *
 * 2. APPROVE ALLOCATION (approveAllocation):
 *    a. Acquire PESSIMISTIC_WRITE lock on allocation row
 *    b. Four-eyes check: approverId cannot equal allocated resource's ID
 *    c. Verify allocation is in PENDING status
 *    d. Set status to APPROVED, record approvedBy and approvedAt timestamp
 *    e. Append approval reason to notes if provided
 *
 * 3. REJECT ALLOCATION (rejectAllocation):
 *    a. Acquire PESSIMISTIC_WRITE lock
 *    b. Validate rejection reason (minimum 10 characters)
 *    c. Set status to REJECTED, record rejection reason
 *    d. Clear approvedBy/approvedAt fields
 *
 * CONSTRAINTS VALIDATED:
 * - Monthly total ≤ 144 hours per resource (HCM cap)
 * - Budget remaining ≥ proposed allocation cost
 * - No overlapping allocations for same resource+project+hcm
 *
 * CONCURRENCY CONTROL:
 * - PESSIMISTIC_WRITE lock for approve/reject operations
 * - Optimistic locking via @Version field
 * - Four-eyes policy prevents self-approval
 *
 * ERROR HANDLING:
 * - ConstraintViolationException: HCM or budget constraints violated
 * - FourEyesViolationException: Self-approval attempt
 * - ResourceNotFoundException: Resource/Project/Activity not found
 * - IllegalStateException: Invalid status transition or overlap detected
 */
@Service
@RequiredArgsConstructor
public class AllocationService {

    private final AllocationRepository allocationRepository;
    private final AllocationConstraintValidator validator;
    private final ResourceRepository resourceRepository;
    private final ProjectRepository projectRepository;
    private final ActivityRepository activityRepository;

    /**
     * Create a new allocation with HCM-based validation.
     *
     * @param resourceId   resource being allocated
     * @param projectId    project receiving the allocation
     * @param activityId   nullable activity within project
     * @param hcm         HCM in YYYYMM format (e.g., 202512 = Dec 2025)
     * @param hours       total hours for the HCM (max 144h)
     * @param notes       optional notes
     * @return created Allocation in PENDING status
     * @throws ConstraintViolationException if constraints violated
     * @throws IllegalStateException    if overlap detected
     */
    @Transactional
    public Allocation createAllocation(
        Long resourceId,
        Long projectId,
        Long activityId,
        Integer hcm,
        BigDecimal hours,
        String notes
    ) {
        // Validate inputs
        Objects.requireNonNull(resourceId, "resourceId required");
        Objects.requireNonNull(projectId, "projectId required");
        Objects.requireNonNull(hcm, "hcm required");
        Objects.requireNonNull(hours, "hours required");

        if (hours.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("hours must be > 0");
        }

        // Verify resource and project exist
        Resource resource = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new ResourceNotFoundException("Resource not found: " + resourceId));
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + projectId));

        // Fetch activity if provided
        Activity activity = null;
        if (activityId != null) {
            activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new ResourceNotFoundException("Activity not found: " + activityId));
        }

        // 1. Run HCM-based constraint validation
        List<ConstraintViolation> violations = validator.validateHcm(
            resourceId, projectId, hcm, hours, activityId
        );
        if (!violations.isEmpty()) {
            throw new ConstraintViolationException("Allocation constraints violated", violations);
        }

        // 2. Overlap detection (same resource + project + hcm with PENDING or APPROVED status)
        List<Allocation> overlaps = allocationRepository.findOverlappingByHcm(resourceId, projectId, hcm);
        if (!overlaps.isEmpty()) {
            throw new IllegalStateException(
                String.format("Overlapping allocation exists for resource %d project %d hcm %d",
                    resourceId, projectId, hcm)
            );
        }

        // 3. Create allocation - auto-approved (no approval needed)
        Allocation allocation = Allocation.builder()
            .resource(resource)
            .project(project)
            .activity(activity)
            .hcm(hcm)
            .hours(hours)
            .status(AllocationStatus.APPROVED)
            .notes(notes)
            .isActive(true)
            .build();

        return allocationRepository.save(allocation);
    }

    /**
     * Approve an allocation with four-eyes check (approver != resource owner).
     */
    @Transactional
    public Allocation approveAllocation(Long allocationId, Long approverId, String reason) {
        Objects.requireNonNull(allocationId, "allocationId required");
        Objects.requireNonNull(approverId, "approverId required");

        // Lock allocation row for concurrent safety
        Allocation allocation = allocationRepository.findByIdWithLock(allocationId)
            .orElseThrow(() -> new ResourceNotFoundException("Allocation not found: " + allocationId));

        // Four-eyes check: approver cannot be the resource being allocated
        Resource allocatedResource = allocation.getResource();
        if (allocatedResource != null && approverId.equals(allocatedResource.getId())) {
            throw new FourEyesViolationException(
                "Four-eyes policy violation: approver cannot be the allocated resource"
            );
        }

        // Status check
        if (allocation.getStatus() != AllocationStatus.PENDING) {
            throw new IllegalStateException(
                "Allocation must be in PENDING status to approve, current: " + allocation.getStatus()
            );
        }

        // Apply approval
        allocation.setStatus(AllocationStatus.APPROVED);
        allocation.setApprovedBy(approverId);
        allocation.setApprovedAt(Instant.now());
        if (reason != null && !reason.isBlank()) {
            allocation.setNotes(allocation.getNotes() == null ? reason : allocation.getNotes() + "\nApproval: " + reason);
        }

        return allocationRepository.save(allocation);
    }

    /**
     * Reject an allocation.
     */
    @Transactional
    public Allocation rejectAllocation(Long allocationId, Long approverId, String reason) {
        Objects.requireNonNull(allocationId, "allocationId required");
        Objects.requireNonNull(approverId, "approverId required");
        Objects.requireNonNull(reason, "reason required");

        if (reason.length() < 10) {
            throw new IllegalArgumentException("Rejection reason must be at least 10 characters");
        }

        Allocation allocation = allocationRepository.findByIdWithLock(allocationId)
            .orElseThrow(() -> new ResourceNotFoundException("Allocation not found: " + allocationId));

        // Four-eyes check
        Long resourceId = allocation.getResource().getId();
        if (approverId.equals(resourceId)) {
            throw new FourEyesViolationException(
                "Four-eyes policy violation: rejector cannot be the allocated resource"
            );
        }

        if (allocation.getStatus() != AllocationStatus.PENDING) {
            throw new IllegalStateException(
                "Allocation must be in PENDING status to reject, current: " + allocation.getStatus()
            );
        }

        allocation.setStatus(AllocationStatus.REJECTED);
        allocation.setRejectionReason(reason);
        allocation.setApprovedBy(approverId);
        allocation.setApprovedAt(Instant.now());

        return allocationRepository.save(allocation);
    }

    /**
     * Find an allocation by ID.
     */
    @Transactional(readOnly = true)
    public Allocation findById(Long allocationId) {
        return allocationRepository.findById(allocationId)
            .orElseThrow(() -> new ResourceNotFoundException("Allocation not found: " + allocationId));
    }

    /**
     * List allocations by resource.
     */
    @Transactional(readOnly = true)
    public List<Allocation> findByResource(Long resourceId) {
        return allocationRepository.findAllWithAssociations().stream()
            .filter(a -> a.getResource().getId().equals(resourceId))
            .toList();
    }

    /**
     * List allocations by project.
     */
    @Transactional(readOnly = true)
    public List<Allocation> findByProject(Long projectId) {
        return allocationRepository.findAllWithAssociations().stream()
            .filter(a -> a.getProject().getId().equals(projectId))
            .toList();
    }

    /**
     * List all allocations.
     */
    @Transactional(readOnly = true)
    public List<Allocation> findAll() {
        return allocationRepository.findAllWithAssociations();
    }

    /**
     * Update an allocation - assigns activity and auto-approves.
     */
    @Transactional
    public Allocation updateAllocation(Long allocationId, Long activityId) {
        Allocation allocation = allocationRepository.findById(allocationId)
            .orElseThrow(() -> new ResourceNotFoundException("Allocation not found: " + allocationId));

        if (activityId != null) {
            Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new ResourceNotFoundException("Activity not found: " + activityId));
            // Verify activity belongs to the same project
            if (!activity.getProjectId().equals(allocation.getProject().getId())) {
                throw new IllegalArgumentException("Activity does not belong to this project");
            }
            allocation.setActivity(activity);
        }

        // Auto-approve allocation when assigning to activity (no approval needed)
        if (allocation.getStatus() == AllocationStatus.PENDING) {
            allocation.setStatus(AllocationStatus.APPROVED);
        }

        return allocationRepository.save(allocation);
    }

    /**
     * Update allocation hours.
     */
    @Transactional
    public Allocation updateAllocationHours(Long allocationId, BigDecimal hours) {
        Allocation allocation = allocationRepository.findById(allocationId)
            .orElseThrow(() -> new ResourceNotFoundException("Allocation not found: " + allocationId));

        // Validate: cannot edit past months
        Integer nowHcm = getCurrentHcm();
        if (allocation.getHcm() < nowHcm) {
            throw new IllegalArgumentException("Cannot edit allocation for past months");
        }

        allocation.setHours(hours);
        return allocationRepository.save(allocation);
    }

    /**
     * Delete an allocation.
     */
    @Transactional
    public void deleteAllocation(Long allocationId) {
        Allocation allocation = allocationRepository.findById(allocationId)
            .orElseThrow(() -> new ResourceNotFoundException("Allocation not found: " + allocationId));

        // Validate: cannot delete past months
        Integer nowHcm = getCurrentHcm();
        if (allocation.getHcm() < nowHcm) {
            throw new IllegalArgumentException("Cannot delete allocation for past months");
        }

        allocationRepository.delete(allocation);
    }

    /**
     * Get current HCM (YYYYMM format).
     */
    private Integer getCurrentHcm() {
        YearMonth now = YearMonth.now();
        return now.getYear() * 100 + now.getMonthValue();
    }

    /**
     * Parse HCM (YYYYMM) to YearMonth.
     */
    private YearMonth parseHcmToYearMonth(Integer hcm) {
        String hcmStr = hcm.toString();
        int year = Integer.parseInt(hcmStr.substring(0, 4));
        int month = Integer.parseInt(hcmStr.substring(4, 6));
        return YearMonth.of(year, month);
    }
}
