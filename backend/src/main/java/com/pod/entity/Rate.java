package com.pod.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * Rate Entity - Monthly cost rates for cost center + billable team combinations.
 *
 * PURPOSE:
 * Stores billing rates (monthly cost in K USD) for resource allocation cost calculation.
 * Each rate applies to a specific cost center and billable team for a time period.
 *
 * FIELDS:
 * - costCenterId: Cost center code (e.g., "HT366")
 * - billableTeamCode: Billable team code (e.g., "ITDDEVPEM18")
 * - monthlyRateK: Monthly rate in thousands of USD (e.g., 5.5 = $5,500/month)
 * - effectiveFrom: Start month in YYYYMM format (e.g., "202601" = Jan 2026)
 * - effectiveTo: End month in YYYYMM format (null = currently active)
 * - isBillable: Whether this rate is billable
 *
 * CONSTRAINTS:
 * - Unique constraint on (cost_center_id, billable_team_code, effective_from)
 * - No overlapping periods for same cost center + team combination
 * - Periods must be contiguous (RateService validates this)
 *
 * UNIQUE INDEX:
 * Partial unique index guarantees only one rate entry covers a given month.
 * RateService.closeActiveRate() sets effective_to on previous record to enforce
 * contiguous periods (no gaps between rate periods).
 */
@Entity
@Table(name = "rates",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_rate_period_active",
        columnNames = {"cost_center_id", "billable_team_code", "effective_from"}
    )
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Rate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cost_center_id", nullable = false, length = 20)
    private String costCenterId;

    @Column(name = "billable_team_code", nullable = false, length = 20)
    private String billableTeamCode;

    @Column(name = "monthly_rate_k", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal monthlyRateK = BigDecimal.ZERO;

    @Column(name = "effective_from", nullable = false, length = 6)
    @Builder.Default
    private String effectiveFrom = "200001"; // sentinel default; set by service

    @Column(name = "effective_to", length = 6)
    private String effectiveTo;  // null = active/open-ended

    @Column(name = "is_billable", nullable = false)
    @Builder.Default
    private boolean isBillable = true;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
