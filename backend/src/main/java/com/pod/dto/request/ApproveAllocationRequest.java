package com.pod.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ApproveAllocationRequest — request to approve a pending allocation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApproveAllocationRequest {

    @NotNull(message = "allocationId is required")
    private Long allocationId;

    @NotNull(message = "approverId is required")
    private Long approverId;

    @Size(max = 500, message = "reason cannot exceed 500 characters")
    private String reason;
}
