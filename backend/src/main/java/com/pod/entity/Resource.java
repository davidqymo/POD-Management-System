package com.pod.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.Instant;

/**
 * Resource Entity - Core domain model for POD Team Management System.
 *
 * Represents a team member/employee with their cost center assignment, skills, and employment details.
 * Uses soft-delete pattern (isActive flag) for data retention and supports optimistic locking via version field.
 *
 * VALIDATION RULES:
 * - External ID: Required, unique, max 50 chars (employee ID from external system)
 * - Name: Required, max 200 chars
 * - Cost Center: Required, max 20 chars (e.g., "HT366", "ENG-CC1")
 * - Billable Team Code: Required, max 20 chars (e.g., "ITDDEVPEM18")
 * - Category: Required, enum (PERMANENT, CONTRACT, TEMPORARY)
 * - Level: Integer 1-10 (skill/experience level)
 * - Status: Enum (ACTIVE, ON_LEAVE, TERMINATED) - state machine enforced
 *
 * AUDIT FIELDS:
 * - createdAt: Set on first creation, never modified
 * - updatedAt: Auto-updated on every save
 * - version: Optimistic locking for concurrent edit protection
 *
 * STATE TRANSITIONS (via isValidTransition):
 * - ACTIVE -> ON_LEAVE, TERMINATED
 * - ON_LEAVE -> ACTIVE
 * - TERMINATED -> (none - terminal state)
 */
@Entity
@Table(name = "resources")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class Resource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "External ID is required")
    @Size(max = 50, message = "External ID must not exceed 50 characters")
    @Column(name = "external_id", nullable = false, unique = true, length = 50)
    private String externalId;

    @NotBlank(message = "Name is required")
    @Size(max = 200, message = "Name must not exceed 200 characters")
    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @NotBlank(message = "Cost center is required")
    @Size(max = 20, message = "Cost center must not exceed 20 characters")
    @Column(name = "cost_center_id", nullable = false, length = 20)
    private String costCenterId;

    @NotBlank(message = "Billable team code is required")
    @Size(max = 20, message = "Billable team code must not exceed 20 characters")
    @Column(name = "billable_team_code", nullable = false, length = 20)
    private String billableTeamCode;

    @Enumerated(EnumType.STRING)
    @NotNull(message = "Category is required")
    @Column(name = "category", nullable = false, length = 20)
    private ResourceCategory category = ResourceCategory.PERMANENT;

    @Size(max = 100, message = "Skill must not exceed 100 characters")
    @Column(name = "skill", length = 100)
    private String skill = "general";

    @Min(value = 1, message = "Level must be at least 1")
    @Max(value = 10, message = "Level must not exceed 10")
    @Column(name = "level")
    @Builder.Default
    private Integer level = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ResourceStatus status = ResourceStatus.ACTIVE;

    @JsonProperty("functionalManager")
    @Column(name = "functional_manager", length = 100)
    private String functionalManager;

    @JsonProperty("l5TeamCode")
    @Column(name = "l5_team_code", length = 50)
    private String l5TeamCode;

    @Column(name = "is_billable", nullable = false)
    private boolean isBillable = true;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Integer version = 1;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    public void prePersist() {
        Instant now = Instant.now();
        // Only set createdAt if not already set (allows explicit value during testing)
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        this.updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }

    /**
     * Status transition validation — Sprint 1 expands this to full state machine (T1.4).
     */
    public boolean isValidTransition(ResourceStatus from, ResourceStatus to) {
        return switch (from) {
            case ACTIVE -> to == ResourceStatus.ON_LEAVE || to == ResourceStatus.TERMINATED;
            case ON_LEAVE -> to == ResourceStatus.ACTIVE;
            case TERMINATED -> false;
            default -> false;
        };
    }
}
