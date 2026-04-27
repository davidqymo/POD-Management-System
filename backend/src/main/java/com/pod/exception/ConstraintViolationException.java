package com.pod.exception;

import com.pod.dto.response.ConstraintViolation;
import lombok.Getter;

import java.util.List;

/**
 * ConstraintViolationException — thrown when allocation constraints are violated.
 * Contains a list of constraint violations detailing what rules were broken.
 */
@Getter
public class ConstraintViolationException extends RuntimeException {

    private final List<ConstraintViolation> violations;

    public ConstraintViolationException(String message, List<ConstraintViolation> violations) {
        super(message);
        this.violations = violations;
    }

    public ConstraintViolationException(List<ConstraintViolation> violations) {
        this("Allocation constraint violations detected", violations);
    }
}
