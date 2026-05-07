package com.pod.entity;

import jakarta.persistence.*;
import lombok.*;
import com.pod.entity.Project;
import com.pod.entity.Resource;
import com.pod.entity.Activity;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * Allocation Entity - Monthly (HCM) resource assignment to a project/activity.
 *
 * PURPOSE:
 * Represents the allocation of a team member to a project for a specific month (HCM).
 * Used for capacity planning, budget tracking, and resource management.
 *
 * UNIQUE CONSTRAINT:
 * One active allocation per (resource, project, hcm) with status PENDING or APPROVED.
 * DB-level partial unique index on (resource_id, project_id, hcm) where is_active=true.
 * Service-level enforcement via PESSIMISTIC_WRITE lock + overlap query.
 *
 * RELATIONSHIPS:
 * - Resource: The team member being allocated (ManyToOne, required)
 * - Project: The project they are allocated to (ManyToOne, required)
 * - Activity: Optional specific activity within the project (ManyToOne, optional)
 *
 * FIELDS:
 * - hcm: Headcount Month in YYYYMM format (e.g., 202601 = Jan 2026)
 * - hours: Allocated hours for the month (max 999.99)
 * - status: PENDING (awaiting approval), APPROVED, REJECTED, LOCKED
 * - approvedBy: User ID who approved this allocation
 * - approvedAt: Timestamp of approval
 * - rejectionReason: Reason if REJECTED
 * - notes: Free-form notes
 *
 * SOFT DELETE:
 * - isActive flag for soft delete (cannot delete PENDING allocations)
 * - PrePersist validates: isActive=false requires status != PENDING
 *
 * AUDIT:
 * - createdAt: Set on first creation
 * - updatedAt: Auto-updated on every save
 * - version: Optimistic locking
 *
 * WORKFLOW:
 * 1. Create allocation -> status=PENDING
 * 2. Manager approves -> status=APPROVED, set approvedBy/approvedAt
 * 3. Manager rejects -> status=REJECTED, set rejectionReason
 * 4. Lock allocation -> status=LOCKED (for historical periods)
 */
@Entity
@Table(name = "allocations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Allocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resource_id", nullable = false)
    private Resource resource;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activity_id")
    private Activity activity;

    /**
     * HCM (Headcount Month) in YYYYMM format.
     * e.g., 202512 = December 2025, 202601 = January 2026
     */
    @Column(name = "hcm", nullable = false)
    private Integer hcm;

    @Column(name = "hours", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal hours = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private AllocationStatus status = AllocationStatus.PENDING;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Integer version = 1;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "rejection_reason", columnDefinition = "text")
    private String rejectionReason;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
        if (hours == null) hours = BigDecimal.ZERO;
        if (version == null) version = 1;
        if (status == null) status = AllocationStatus.PENDING;
        if (isActive == false && status == AllocationStatus.PENDING) {
            throw new IllegalStateException("Cannot soft-delete PENDING allocation");
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}
