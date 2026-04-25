package com.pod.entity;

public enum ProjectStatus {
    REQUESTED,    // Initial state, awaiting approval
    EXECUTING,    // Active work in progress
    ON_HOLD,     // Temporarily paused
    COMPLETED,    // Successfully finished
    CANCELLED     // Abandoned/terminated
}