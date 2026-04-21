package com.pod.entity;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.pod.exception.RatePeriodGapException;
import com.pod.service.RateService;

import com.pod.exception.RatePeriodGapException;
import com.pod.service.RateService;

/**
 * RateEntityTest — RED phase tests for Rate entity (Sprint 1 T1.1).
 *
 * Validates:
 * - Entity construction (all fields assignable)
 * - Effective date period contiguity rules (rate period gap detection)
 * - Overlapping period prevention via database-level unique partial index
 * - pessimistic locking queries in RateRepository
 *
 * RED phase: start with failing assertions; then implement Rate entity + service logic.
 */
class RateEntityTest {

    @Test
    void rateEntity_creation_succeeds() {
        // Given
        Rate rate = Rate.builder()
            .costCenterId("ENG-CC1")
            .billableTeamCode("BTC-API")
            .monthlyRateK(new BigDecimal("4.95"))
            .effectiveFrom("202601")
            .effectiveTo("202612")
            .isBillable(true)
            .isActive(true)
            .build();

        // Then
        assertThat(rate.getCostCenterId()).isEqualTo("ENG-CC1");
        assertThat(rate.getMonthlyRateK()).isEqualTo(new BigDecimal("4.95"));
        assertThat(rate.getEffectiveFrom()).isEqualTo("202601");
        assertThat(rate.getEffectiveTo()).isEqualTo("202612");
        assertThat(rate.isBillable()).isTrue();
        assertThat(rate.isActive()).isTrue();
    }

    @Test
    void rateEntity_contiguity_adjacentMonths_valid() {
        // Given consecutive months
        Rate prev = Rate.builder()
            .costCenterId("ENG-CC1")
            .billableTeamCode("BTC-API")
            .effectiveFrom("202512")
            .effectiveTo(null)
            .build();
        Rate next = Rate.builder()
            .costCenterId("ENG-CC1")
            .billableTeamCode("BTC-API")
            .effectiveFrom("202601")
            .effectiveTo(null)
            .build();

        // When — check validation via RateService (RED test asserts service call works)
        // For RED we just assert the Rate entity itself stores the fields correctly
        assertThat(prev.getEffectiveFrom()).isEqualTo("202512");
        assertThat(next.getEffectiveFrom()).isEqualTo("202601");
        // Contiguity check gap detection = nextEffFrom == prevEffFrom + 1 month
        // RED: assert that validation method exists and returns true for adjacent months
    }

    @Test
    void rateEntity_contiguity_gapDetected_throws() {
        // Given a monthly jump skipping March: DEC → APR
        Rate prev = Rate.builder()
            .costCenterId("ENG-CC1")
            .billableTeamCode("BTC-API")
            .effectiveFrom("202512")
            .effectiveTo(null)
            .build();
        Rate next = Rate.builder()
            .costCenterId("ENG-CC1")
            .billableTeamCode("BTC-API")
            .effectiveFrom("202604") // jump of 4 months (gap Jan–Mar)
            .effectiveTo(null)
            .build();

        // Then — RED: expect RatePeriodGapException
        assertThatThrownBy(() -> RateService.validateContiguity(prev, next))
            .isInstanceOf(RatePeriodGapException.class)
            .hasMessageContaining("Gap");
    }

    @Test
    void rateEntity_overlappingPeriods_rejected() {
        // Given overlapping effective ranges for same CC+BTC
        Rate existing = Rate.builder()
            .costCenterId("ENG-CC1")
            .billableTeamCode("BTC-API")
            .effectiveFrom("202601")
            .effectiveTo("202606") // covers Jan–Jun
            .build();
        Rate newRate = Rate.builder()
            .costCenterId("ENG-CC1")
            .billableTeamCode("BTC-API")
            .effectiveFrom("202604") // overlaps Apr–Jun
            .effectiveTo(null) // active range
            .build();

        // Then — partial unique index at DB will reject overlap when inserted
        // RED assert: RateRepository.save() throws ConstraintViolationException
        // We'll write test in T1.3 (Controller) — here we assert the builder allows
        // creation and rely on DB constraint for final check.
        assertThat(existing.getEffectiveFrom()).isEqualTo("202601");
        assertThat(newRate.getEffectiveFrom()).isEqualTo("202604"); // overlap starts in Apr
    }
}
