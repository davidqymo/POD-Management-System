package com.pod.exception;

/**
 * FourEyesViolationException — thrown when approval/rejection attempted by the
 * same person who is the allocated resource (self-approval/rejection).
 */
public class FourEyesViolationException extends RuntimeException {
    public FourEyesViolationException(String message) {
        super(message);
    }
}
