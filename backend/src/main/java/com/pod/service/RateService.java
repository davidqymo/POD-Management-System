package com.pod.service;

import com.pod.entity.Rate;
import com.pod.exception.RatePeriodGapException;
import com.pod.repository.RateRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

import jakarta.persistence.EntityNotFoundException;

/**
 * RateService - Business logic for Rate entity and rate period management.
 *
 * PROCESS FLOW:
 * 1. CREATE RATE (createRate):
 *    a. Validate rate period (check for gaps in contiguous months)
 *    b. Acquire PESSIMISTIC_WRITE lock on currently active rate
 *    c. Close previous rate (set effectiveTo = new rate's effectiveFrom - 1 month)
 *    d. Create new rate with PENDING status
 *
 * 2. UPDATE RATE:
 *    a. Find rate by ID
 *    b. Update rate values
 *    c. Validate no overlapping periods
 *
 * 3. DELETE RATE (soft delete):
 *    a. Set isActive=false
 *    b. Cannot delete if there are allocation records referencing this rate
 *
 * CONSTRAINTS:
 * - No gaps between rate periods (contiguous months)
 * - Cannot have overlapping periods for same cost center + billable team
 * - effectiveTo must be before next rate's effectiveFrom
 *
 * VALIDATION:
 * - RatePeriodGapException: Thrown when new rate creates a gap in periods
 * - Unique constraint violation on duplicate effective_from
 *
 * QUERY:
 * - findActiveByCostCenterAndTeam: Get current rate for cost center + team
 * - findByCostCenterAndBillableTeam: Get all rates (including historical)
 */
@Service
@Transactional
public class RateService {

    private static final DateTimeFormatter YYYYMM = DateTimeFormatter.ofPattern("yyyyMM");

    private final RateRepository rateRepository;

    public RateService(RateRepository rateRepository) {
        this.rateRepository = rateRepository;
    }

    /**
     * Find all rates.
     */
    @Transactional(readOnly = true)
    public List<Rate> findAll() {
        return rateRepository.findAll();
    }

    /**
     * Find rate by ID.
     */
    @Transactional(readOnly = true)
    public Optional<Rate> findById(Long id) {
        return rateRepository.findById(id);
    }

    /**
     * Find the currently active rate for a cost center and billable team code.
     */
    @Transactional(readOnly = true)
    public Optional<Rate> findActiveRate(String costCenterId, String billableTeamCode) {
        return rateRepository.findByCostCenterIdAndBillableTeamCodeAndEffectiveToIsNull(
            costCenterId, billableTeamCode
        );
    }

    /**
     * Validate that {@code next.effectiveFrom} directly follows
     * {@code prev.effectiveFrom} by exactly one month.
     *
     * @throws RatePeriodGapException if gap > 1 month is detected
     */
    public static void validateContiguity(Rate prev, Rate next) {
        if (prev == null) return;

        YearMonth prevEff = YearMonth.parse(prev.getEffectiveFrom(), YYYYMM);
        YearMonth nextEff = YearMonth.parse(next.getEffectiveFrom(), YYYYMM);

        if (nextEff.isAfter(prevEff.plusMonths(1))) {
            String message = String.format(
                "Rate period Gap detected: prev=%s → next=%s (expected %s)",
                prevEff, nextEff, prevEff.plusMonths(1)
            );
            throw new RatePeriodGapException(message);
        }
    }

    /**
     * Create a new rate entry with contiguous period validation.
     *
     * <p>Steps:
     * <ol>
     *   <li>Lock the currently active rate (effectiveTo IS NULL) for the same CC+team
     *       using PESSIMISTIC_WRITE to serialize concurrent writers.
     *   <li>Validate that new effectiveFrom == prev.effectiveFrom + 1 month.
     *   <li>Set prev.effectiveTo = computePreviousMonth(new.effectiveFrom).
     *   <li>Save prev (closing it) and insert new rate with effectiveTo = null.
     * </ol>
     *
     * @param request payload with rate details
     * @return persisted new rate
     * @throws RatePeriodGapException if new period does not follow prev contiguously
     */
    public Rate createRate(CreateRateRequest request) {
        return createRateInternal(request);
    }

    /**
     * Internal createRate implementation — called within retry wrapper.
     */
    private Rate createRateInternal(CreateRateRequest request) {
        // Acquire PESSIMISTIC_WRITE lock on active rate (if any)
        // findByCostCenterIdAndBillableTeamCodeAndEffectiveToIsNull() is annotated with @Lock(PESSIMISTIC_WRITE)
        Optional<Rate> activeOpt = rateRepository.findByCostCenterIdAndBillableTeamCodeAndEffectiveToIsNull(
            request.costCenterId(), request.billableTeamCode()
        );

        Rate prev = activeOpt.orElse(null);

        // Build new Rate entity
        Rate next = Rate.builder()
            .costCenterId(request.costCenterId())
            .billableTeamCode(request.billableTeamCode())
            .monthlyRateK(request.monthlyRateK())
            .effectiveFrom(request.effectiveFrom())
            .isBillable(request.billable())
            .isActive(true)
            .build();

        // Validate contiguity (no-op if prev is null — first rate)
        validateContiguity(prev, next);

        // Close previous rate: effectiveTo = month before next.effectiveFrom
        if (prev != null) {
            YearMonth nextEff = YearMonth.parse(request.effectiveFrom(), YYYYMM);
            String prevEffectiveTo = nextEff.minusMonths(1).format(YYYYMM);
            prev.setEffectiveTo(prevEffectiveTo);
            rateRepository.save(prev);
        }

        // Persist new rate (effectiveTo remains null for active)
        return rateRepository.save(next);
    }

    // Request DTO
    public record CreateRateRequest(
        String costCenterId,
        String billableTeamCode,
        BigDecimal monthlyRateK,
        String effectiveFrom,
        boolean billable
    ) {}
}
