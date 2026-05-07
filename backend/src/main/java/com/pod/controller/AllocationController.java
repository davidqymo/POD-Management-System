package com.pod.controller;

import com.pod.dto.request.CreateAllocationRequest;
import com.pod.dto.request.CreateBulkAllocationRequest;
// import com.pod.dto.request.ApproveAllocationRequest; // Removed - no approval needed
import com.pod.dto.response.AllocationDTO;
import com.pod.entity.Allocation;
import com.pod.entity.AllocationStatus;
import com.pod.service.AllocationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * AllocationController - REST API endpoints for allocation lifecycle.
 *
 * PROCESS FLOW:
 *
 * 1. POST /api/v1/allocations - Create new allocation
 *    - Input: CreateAllocationRequest (resourceId, projectId, activityId, hcm, hours, notes)
 *    - Validates: HCM constraints, budget, overlap detection
 *    - Output: AllocationDTO (201 Created)
 *    - Errors: 400 Bad Request (validation), 422 Unprocessable (constraint violation)
 *
 * 2. GET /api/v1/allocations - List allocations with filters
 *    - Query params: resourceId, projectId, hcm, status, page, size
 *    - Output: Paginated list of AllocationDTO
 *
 * 3. POST /api/v1/allocations/{id}/approve - Approve allocation
 *    - Input: ApproveAllocationRequest (approverId, reason)
 *    - Validates: Four-eyes policy (approver != resource owner)
 *    - Output: Updated AllocationDTO
 *    - Errors: 400 Bad Request (invalid state), 409 Conflict (four-eyes violation)
 *
 * 4. POST /api/v1/allocations/{id}/reject - Reject allocation
 *    - Input: { "approverId": long, "reason": string }
 *    - Validates: Reason minimum 10 characters
 *    - Output: Updated AllocationDTO
 *
 * 5. PATCH /api/v1/allocations/{id} - Update allocation
 *    - Partial update with PESSIMISTIC_WRITE lock
 *
 * 6. DELETE /api/v1/allocations/{id} - Soft delete
 *    - Sets isActive=false (cannot delete PENDING allocations)
 *
 * CONVERSION:
 * - Entity <-> DTO mapping via mapToDTO() and mapToEntity()
 * - Exposes only necessary fields, hides internal IDs
 */
@RestController
@RequestMapping("/api/v1/allocations")
@RequiredArgsConstructor
public class AllocationController {

    private final com.pod.service.AllocationService allocationService;

    /**
     * Create a new allocation.
     */
    @PostMapping
    public ResponseEntity<AllocationDTO> createAllocation(@Valid @RequestBody CreateAllocationRequest request) {
        Allocation allocation = allocationService.createAllocation(
            request.getResourceId(),
            request.getProjectId(),
            request.getActivityId(),
            request.getHcm(),
            request.getHours(),
            request.getNotes()
        );
        AllocationDTO dto = mapToDTO(allocation);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    /**
     * Create multiple allocations (bulk) for fiscal year.
     */
    @PostMapping("/bulk")
    public ResponseEntity<List<AllocationDTO>> createBulkAllocations(@Valid @RequestBody CreateBulkAllocationRequest request) {
        List<Allocation> allocations = new java.util.ArrayList<>();
        for (var entry : request.getAllocations()) {
            Allocation allocation = allocationService.createAllocation(
                request.getResourceId(),
                request.getProjectId(),
                null,
                entry.getHcm(),
                entry.getHours(),
                request.getNotes()
            );
            allocations.add(allocation);
        }
        List<AllocationDTO> dtos = allocations.stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
        return ResponseEntity.status(HttpStatus.CREATED).body(dtos);
    }

    /**
     * List allocations with optional filters.
     */
    @GetMapping
    public ResponseEntity<List<AllocationDTO>> listAllocations(
        @RequestParam(required = false) Long resourceId,
        @RequestParam(required = false) Long projectId,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) Integer hcm
    ) {
        List<Allocation> allocations;
        if (resourceId != null) {
            allocations = allocationService.findByResource(resourceId);
        } else if (projectId != null) {
            allocations = allocationService.findByProject(projectId);
        } else {
            allocations = allocationService.findAll();
        }

        if (status != null) {
            AllocationStatus statusEnum = AllocationStatus.valueOf(status);
            allocations = allocations.stream()
                .filter(a -> a.getStatus() == statusEnum)
                .collect(Collectors.toList());
        }

        // Filter by HCM if provided
        if (hcm != null) {
            allocations = allocations.stream()
                .filter(a -> a.getHcm().equals(hcm))
                .collect(Collectors.toList());
        }

        List<AllocationDTO> dtos = allocations.stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    // Approve/reject endpoints removed - allocations auto-approved

    /**
     * Get allocation by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<AllocationDTO> getAllocation(@PathVariable Long id) {
        Allocation allocation = allocationService.findById(id);
        AllocationDTO dto = mapToDTO(allocation);
        return ResponseEntity.ok(dto);
    }

    /**
     * Assign activity to allocation.
     */
    @PostMapping("/assign-activity")
    public ResponseEntity<AllocationDTO> assignActivityBody(@RequestBody Map<String, Long> body) {
        Long allocationId = body.get("allocationId");
        Long activityId = body.get("activityId");
        Allocation allocation = allocationService.updateAllocation(allocationId, activityId);
        AllocationDTO dto = mapToDTO(allocation);
        return ResponseEntity.ok(dto);
    }

    /**
     * Update allocation hours.
     */
    @PatchMapping("/{id}/hours")
    public ResponseEntity<AllocationDTO> updateAllocationHours(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        BigDecimal hours = new BigDecimal(body.get("hours").toString());
        Allocation allocation = allocationService.updateAllocationHours(id, hours);
        AllocationDTO dto = mapToDTO(allocation);
        return ResponseEntity.ok(dto);
    }

    /**
     * Delete an allocation.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAllocation(@PathVariable Long id) {
        allocationService.deleteAllocation(id);
        return ResponseEntity.noContent().build();
    }

    private AllocationDTO mapToDTO(Allocation allocation) {
        var builder = AllocationDTO.builder()
            .id(allocation.getId())
            .resourceId(allocation.getResource().getId())
            .resourceName(allocation.getResource().getName())
            .projectId(allocation.getProject().getId())
            .projectName(allocation.getProject().getName())
            .hcm(allocation.getHcm())
            .hours(allocation.getHours())
            .status(allocation.getStatus().name())
            .version(allocation.getVersion())
            .approvedBy(allocation.getApprovedBy())
            .approvedAt(allocation.getApprovedAt())
            .rejectionReason(allocation.getRejectionReason())
            .notes(allocation.getNotes())
            .isActive(allocation.isActive())
            .createdAt(allocation.getCreatedAt())
            .updatedAt(allocation.getUpdatedAt());

        var activity = allocation.getActivity();
        if (activity != null) {
            builder.activityId(activity.getId())
                    .activityName(activity.getName());
        }

        return builder.build();
    }
}