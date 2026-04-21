package com.pod.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * Rate — records the monthly cost per HCM (k USD) for a given cost center
 * and billable team code.
 *
 * Column semantics (TDD §4.2):
 *  - monthly_rate_K: cost in thousand USD per full-time HCM (monthly)
 *  - effective_from: first month rate applies (YYYYMM string, e.g. "202601")
 *  - effective_to: last month rate applies before replacement; null = still active
 *
 * Uniqueness: partial unique index on (cost_center_id, billable_team_code, effective_from)
 * guarantees only one rate entry covers a given month. RateService.closeActiveRate()
 * sets effective_to on previous record to enforce contiguous periods.
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
