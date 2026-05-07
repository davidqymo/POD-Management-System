package com.pod.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * ProjectActual Entity - Tracks actual resource consumption per project.
 *
 * PURPOSE:
 * Stores actual HCM consumption by resource per project, stored separately from
 * planned allocations. Used for budget tracking, billing, and capacity planning.
 *
 * UNIQUE CONSTRAINT:
 * One record per (resource, clarityId).
 * Monthly data stored as JSONB map: {"202512": 1.5, "202601": 2.0, ...}
 *
 * FIELDS:
 * - resource: Resource being tracked (ManyToOne, required)
 * - clarityId: Project clarity ID (unique key with resource)
 * - projectName: Project name (denormalized for display)
 * - monthlyData: JSONB map of HCM values by month (YYYYMM format)
 * - source: How data was entered (IMPORT or MANUAL)
 * - importedAt: Timestamp when data was imported
 *
 * AUDIT:
 * - createdAt: Set on first creation
 * - updatedAt: Auto-updated on every save
 */
@Entity
@Table(name = "project_actuals", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"resource_id", "clarity_id"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProjectActual {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resource_id", nullable = false)
    @JsonIgnore
    private Resource resource;

    @Column(name = "clarity_id", nullable = false, length = 50)
    private String clarityId;

    @Column(name = "project_name", length = 200)
    private String projectName;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "monthly_data", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, BigDecimal> monthlyData = new HashMap<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "source", length = 20)
    @Builder.Default
    private ConsumptionSource source = ConsumptionSource.MANUAL;

    @Column(name = "imported_at")
    private Instant importedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
        if (monthlyData == null) monthlyData = new HashMap<>();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }
}