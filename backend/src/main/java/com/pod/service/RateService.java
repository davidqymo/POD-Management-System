package com.pod.service;

import com.pod.entity.Rate;
import com.pod.exception.RatePeriodGapException;
import com.pod.repository.RateRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

/**
 * RateService — manages rate periods with contiguous month chains.
 *
 * T1.4: createRate() acquires PESSIMISTIC_WRITE lock on the currently active
 * rate for the same (costCenterId, billableTeamCode), validates that the
 * new effective_from date is exactly one month after the previous rate's
 * effective_from, closes the previous rate by setting effective_to, and
 * persists both with a single Optimistic Lock retry on conflict.
 *
 * Contiguity rule examples:
 *   prev = 202512; new = 202601 → OK (adjacent)
 *   prev = 202512; new = 202602 → GAP (Jan missing) → throws RatePeriodGapException
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
