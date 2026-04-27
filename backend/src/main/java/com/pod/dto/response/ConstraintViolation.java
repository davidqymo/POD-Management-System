package com.pod.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ConstraintViolation — single rule violation returned in 422 responses.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConstraintViolation {
    private String code;
    private String message;
    private String details;
}
