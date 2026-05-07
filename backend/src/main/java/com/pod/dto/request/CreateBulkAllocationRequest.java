package com.pod.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * CreateBulkAllocationRequest — request to create multiple allocations at once.
 * Allows fiscal year allocation (Dec to Nov) in one submit.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateBulkAllocationRequest {

    @NotNull(message = "resourceId is required")
    private Long resourceId;

    @NotNull(message = "projectId is required")
    private Long projectId;

    @NotEmpty(message = "at least one allocation required")
    @Valid
    private List<AllocationEntry> allocations;

    @Size(max = 1000, message = "notes cannot exceed 1000 characters")
    private String notes;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AllocationEntry {

        @NotNull(message = "hcm is required")
        @Min(value = 202001, message = "hcm must be valid YYYYMM (>= 202001)")
        @Max(value = 203012, message = "hcm must be valid YYYYMM (<= 203012)")
        private Integer hcm;

        @NotNull(message = "hours is required")
        @DecimalMin(value = "0.5", message = "hours must be at least 0.5")
        @DecimalMax(value = "144.0", message = "hours cannot exceed 144 (1 HCM)")
        private BigDecimal hours;
    }
}