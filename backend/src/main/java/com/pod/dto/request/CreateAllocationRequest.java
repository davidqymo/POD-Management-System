package com.pod.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * CreateAllocationRequest — request to create a new allocation.
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

    @NotNull(message = "weekStart is required")
    @FutureOrPresent(message = "weekStart must be today or in the future")
    private LocalDate weekStart;

    @NotNull(message = "hours is required")
    @DecimalMin(value = "0.5", message = "hours must be at least 0.5")
    @DecimalMax(value = "80.0", message = "hours cannot exceed 80")
    private BigDecimal hours;

    @Size(max = 1000, message = "notes cannot exceed 1000 characters")
    private String notes;
}
