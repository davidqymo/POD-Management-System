package com.pod.exception;

/**
 * RatePeriodGapException — thrown when a new rate's effective_from
 * does not directly follow the previous rate's effective_from + 1 month.
 *
 * Business rule: Rate periods must form a continuous chain — no gaps.
 *
 * Example: existing effective_from=202512; new rate effective_from=202601 OK
 *          existing effective_from=202512; new rate effective_from=202603 → gap (Jan–Feb missing) => exception
 */
public class RatePeriodGapException extends RuntimeException {
    public RatePeriodGapException(String message) {
        super(message);
    }
}
