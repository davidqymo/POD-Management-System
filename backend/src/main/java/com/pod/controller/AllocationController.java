package com.pod.controller;

import com.pod.dto.request.CreateAllocationRequest;
import com.pod.dto.request.ApproveAllocationRequest;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * AllocationController — REST API for allocation lifecycle.
 *
 * Endpoints:
 *   POST /api/v1/allocations                    — create allocation
 *   GET  /api/v1/allocations                     — list allocations
 *   POST /api/v1/allocations/approve            — approve allocation
 *   POST /api/v1/allocations/reject             — reject allocation
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
            request.getWeekStart(),
            request.getHours(),
            request.getNotes()
        );
        AllocationDTO dto = mapToDTO(allocation);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    /**
     * List allocations with optional filters.
     */
    @GetMapping
    public ResponseEntity<List<AllocationDTO>> listAllocations(
        @RequestParam(required = false) Long resourceId,
        @RequestParam(required = false) Long projectId,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) Integer week
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

        List<AllocationDTO> dtos = allocations.stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    /**
     * Approve a pending allocation (four-eyes enforced).
     */
    @PostMapping("/approve")
    public ResponseEntity<AllocationDTO> approveAllocation(@Valid @RequestBody ApproveAllocationRequest request) {
        Allocation allocation = allocationService.approveAllocation(
            request.getAllocationId(),
            request.getApproverId(),
            request.getReason()
        );
        AllocationDTO dto = mapToDTO(allocation);
        return ResponseEntity.ok(dto);
    }

    /**
     * Reject a pending allocation.
     */
    @PostMapping("/reject")
    public ResponseEntity<AllocationDTO> rejectAllocation(@Valid @RequestBody ApproveAllocationRequest request) {
        Allocation allocation = allocationService.rejectAllocation(
            request.getAllocationId(),
            request.getApproverId(),
            request.getReason()
        );
        AllocationDTO dto = mapToDTO(allocation);
        return ResponseEntity.ok(dto);
    }

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
     * Assign activity to allocation via body.
     */
    @PostMapping("/assign-activity")
    public ResponseEntity<AllocationDTO> assignActivityBody(@RequestBody Map<String, Long> body) {
        Long allocationId = body.get("allocationId");
        Long activityId = body.get("activityId");
        Allocation allocation = allocationService.updateAllocation(allocationId, activityId);
        AllocationDTO dto = mapToDTO(allocation);
        return ResponseEntity.ok(dto);
    }

    private AllocationDTO mapToDTO(Allocation allocation) {
        var builder = AllocationDTO.builder()
            .id(allocation.getId())
            .resourceId(allocation.getResource().getId())
            .resourceName(allocation.getResource().getName())
            .projectId(allocation.getProject().getId())
            .projectName(allocation.getProject().getName());

        var activity = allocation.getActivity();
        if (activity != null) {
            builder.activityId(activity.getId())
                    .activityName(activity.getName());
        }

        builder.weekStartDate(allocation.getWeekStartDate())
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

        return builder.build();
    }
}