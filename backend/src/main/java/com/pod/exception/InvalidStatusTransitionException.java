package com.pod.exception;

/**
 * InvalidStatusTransitionException — thrown when a Resource status
 * transition violates the allowed state machine.
 *
 * Rules (T1.4 spec):
 *   ACTIVE   → ON_LEAVE / TERMINATED   allowed
 *   ON_LEAVE → ACTIVE                    allowed
 *   TERMINATED → anything               forbidden
 */
public class InvalidStatusTransitionException extends RuntimeException {
    public InvalidStatusTransitionException(String message) {
        super(message);
    }
}
