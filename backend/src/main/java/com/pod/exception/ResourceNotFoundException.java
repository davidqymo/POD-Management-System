package com.pod.exception;

/**
 * ResourceNotFoundException — thrown when a requested entity (resource, project, allocation, etc.) is not found.
 */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
}