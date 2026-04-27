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
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Objects;

/**
 * AllocationService — core allocation lifecycle with five-constraint validation
 * and four-eyes approval workflow.
 *
 * Constraints (validated by AllocationConstraintValidator):
 *   1. Daily avg ≤ 10h
 *   2. Monthly total ≤ 144h
 *   3. Monthly OT ≤ 36h
 *   4. Project spread ≤ 5 distinct projects
 *   5. Budget remaining ≥ proposed cost
 *
 * Workflow:
 *   createAllocation() → validate constraints → check overlap → insert PENDING
 *   approveAllocation() → PESSIMISTIC_WRITE → four-eyes check → APPROVED
 *   rejectAllocation() → PESSIMISTIC_WRITE → REJECTED + reason
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
     * Create a new allocation with validation and overlap detection.
     *
     * @param resourceId   resource being allocated
     * @param projectId    project receiving the allocation
     * @param activityId   nullable activity within project
     * @param weekStart    Monday of the week being allocated
     * @param hours        total hours for the week
     * @param notes        optional notes
     * @return created Allocation in PENDING status
     * @throws ConstraintViolationException if any of the 5 constraints violated
     * @throws IllegalStateException        if overlap detected (another PENDING/APPROVED allocation same resource+week)
     */
    @Transactional
    public Allocation createAllocation(
        Long resourceId,
        Long projectId,
        Long activityId,
        LocalDate weekStart,
        BigDecimal hours,
        String notes
    ) {
        // Validate inputs
        Objects.requireNonNull(resourceId, "resourceId required");
        Objects.requireNonNull(projectId, "projectId required");
        Objects.requireNonNull(weekStart, "weekStart required");
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

        // Derive month for constraint checks
        YearMonth month = YearMonth.from(weekStart);

        // 1. Run 5-constraint validation
        List<ConstraintViolation> violations = validator.validate(
            resourceId, projectId, month, hours, activityId
        );
        if (!violations.isEmpty()) {
            throw new ConstraintViolationException("Allocation constraints violated", violations);
        }

        // 2. Overlap detection (same resource + week with PENDING or APPROVED status)
        List<Allocation> overlaps = allocationRepository.findOverlapping(resourceId, weekStart);
        if (!overlaps.isEmpty()) {
            throw new IllegalStateException(
                String.format("Overlapping allocation exists for resource %d week starting %s",
                    resourceId, weekStart)
            );
        }

        // 3. Create allocation
        Allocation allocation = Allocation.builder()
            .resource(resource)
            .project(project)
            .activity(activity)
            .weekStartDate(weekStart)
            .hours(hours)
            .status(AllocationStatus.PENDING)
            .notes(notes)
            .isActive(true)
            .build();

        return allocationRepository.save(allocation);
    }

    /**
     * Approve an allocation with four-eyes check (approver != resource owner).
     *
     * @param allocationId ID of allocation to approve
     * @param approverId   ID of user performing approval
     * @param reason       optional reason/notes for approval
     * @return approved Allocation
     * @throws ResourceNotFoundException    if allocation not found
     * @throws FourEyesViolationException     if approver == resource (self-approval)
     * @throws IllegalStateException          if allocation not in PENDING status
     */
    @Transactional
    public Allocation approveAllocation(Long allocationId, Long approverId, String reason) {
        Objects.requireNonNull(allocationId, "allocationId required");
        Objects.requireNonNull(approverId, "approverId required");

        // Lock allocation row for concurrent safety
        Allocation allocation = allocationRepository.findByIdWithLock(allocationId)
            .orElseThrow(() -> new ResourceNotFoundException("Allocation not found: " + allocationId));

        // Four-eyes check: approver cannot be the resource being allocated
        // Get the resource that is allocated, then check if that resource has an associated user who is the approver
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
     *
     * @param allocationId ID of allocation to reject
     * @param approverId   ID of user performing rejection (must not be resource)
     * @param reason       required reason for rejection (min 10 chars)
     * @return rejected Allocation
     * @throws ResourceNotFoundException    if allocation not found
     * @throws FourEyesViolationException     if approver == resource
     * @throws IllegalArgumentException       if reason too short
     * @throws IllegalStateException          if allocation not in PENDING status
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
        allocation.setApprovedBy(approverId);  // record who rejected
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
}
