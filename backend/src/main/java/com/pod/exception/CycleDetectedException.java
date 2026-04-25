package com.pod.exception;

public class CycleDetectedException extends RuntimeException {
    public CycleDetectedException(String message) {
        super(message);
    }
}
