package com.pod.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * T0.1 + T1.1 Resource entity — core domain model.
 *
 * JPA mapping documents required columns (see TDD §4.1).
 * Minimal viable fields for Sprint 0 test scaffolding: code + name + identifiers + status + audit + version + contiguity hints.
 *
 * Full Sprint 1 expansion adds: skill, level, category, billable flags.
 */
@Entity
@Table(name = "resources")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class Resource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "external_id", nullable = false, unique = true, length = 50)
    private String externalId;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "cost_center_id", nullable = false, length = 20)
    private String costCenterId;

    @Column(name = "billable_team_code", nullable = false, length = 20)
    private String billableTeamCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    private ResourceCategory category = ResourceCategory.PERMANENT;

    @Column(name = "skill", length = 100)
    private String skill = "general";

    @Column(name = "level")
    @Builder.Default
    private Integer level = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ResourceStatus status = ResourceStatus.ACTIVE;

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
