package com.pod.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * AllocationDTO — allocation record for API responses.
 * Uses HCM (Headcount Month) in YYYYMM format.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AllocationDTO {
    private Long id;
    private Long resourceId;
    private String resourceName;
    private Long projectId;
    private String projectName;
    private Long activityId;
    private String activityName;
    /**
     * HCM (Headcount Month) in YYYYMM format.
     * e.g., 202512 = December 2025, 202601 = January 2026
     */
    private Integer hcm;
    private BigDecimal hours;
    private String status;  // PENDING, APPROVED, REJECTED, LOCKED
    private Integer version;
    private Long approvedBy;
    private Instant approvedAt;
    private String rejectionReason;
    private String notes;
    private boolean isActive;
    private Instant createdAt;
    private Instant updatedAt;
}
