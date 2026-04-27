package com.pod.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * AllocationDTO — allocation record for API responses.
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
    private LocalDate weekStartDate;
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
