package com.pod.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Allocation — weekly resource assignment to a project activity.
 * One active allocation per resource per week (PENDING or APPROVED).
 *
 * The DB-level partial unique index on (resource_id, week_start_date)
 * where status IN ('PENDING','APPROVED') and is_active=true is defined in Flyway V1.
 * Uniqueness is enforced in AllocationService via PESSIMISTIC_WRITE lock + overlap query.
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

    @Column(name = "week_start_date", nullable = false)
    private LocalDate weekStartDate;

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
