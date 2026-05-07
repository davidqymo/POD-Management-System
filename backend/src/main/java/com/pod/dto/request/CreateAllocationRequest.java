package com.pod.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * CreateAllocationRequest — request to create a new allocation.
 * Uses HCM (Headcount Month) in YYYYMM format.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAllocationRequest {

    @NotNull(message = "resourceId is required")
    private Long resourceId;

    @NotNull(message = "projectId is required")
    private Long projectId;

    private Long activityId;  // optional

    /**
     * HCM (Headcount Month) in YYYYMM format.
     * e.g., 202512 = December 2025, 202601 = January 2026
     */
    @NotNull(message = "hcm is required")
    @Min(value = 202001, message = "hcm must be valid YYYYMM (>= 202001)")
    @Max(value = 203012, message = "hcm must be valid YYYYMM (<= 203012)")
    private Integer hcm;

    @NotNull(message = "hours is required")
    @DecimalMin(value = "0.5", message = "hours must be at least 0.5")
    @DecimalMax(value = "144.0", message = "hours cannot exceed 144 (1 HCM)")
    private BigDecimal hours;

    @Size(max = 1000, message = "notes cannot exceed 1000 characters")
    private String notes;
}
