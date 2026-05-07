package com.pod.dto.request;

import jakarta.validation.constraints.*;

/**
 * Request DTO for creating or updating scroll notices.
 * Includes validation annotations for input validation.
 */
public record ScrollNoticeRequest(
    @NotBlank(message = "Content is required")
    @Size(max = 200, message = "Content must not exceed 200 characters")
    String content,

    @NotNull(message = "Speed is required")
    @Min(value = 1, message = "Speed must be 1 (Slow), 2 (Medium), or 3 (Fast)")
    @Max(value = 3, message = "Speed must be 1 (Slow), 2 (Medium), or 3 (Fast)")
    Integer speed,

    @Min(value = 1, message = "Direction must be 1 (Right to Left) or 2 (Left to Right)")
    @Max(value = 2, message = "Direction must be 1 (Right to Left) or 2 (Left to Right)")
    Integer direction,

    @Min(value = 0, message = "Status must be 0 (Disabled) or 1 (Enabled)")
    @Max(value = 1, message = "Status must be 0 (Disabled) or 1 (Enabled)")
    Integer status,

    @Size(max = 500, message = "Link must not exceed 500 characters")
    String link,

    @Size(max = 100, message = "Remark must not exceed 100 characters")
    String remark
) {
    /**
     * Helper to get default values for optional fields.
     */
    public static ScrollNoticeRequest withDefaults(ScrollNoticeRequest request) {
        return new ScrollNoticeRequest(
            request.content(),
            request.speed(),
            request.direction() != null ? request.direction() : 1,
            request.status() != null ? request.status() : 1,
            request.link(),
            request.remark()
        );
    }
}