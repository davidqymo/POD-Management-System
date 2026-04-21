package com.pod.service;

import com.pod.entity.Rate;
import com.pod.exception.RatePeriodGapException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class RateService {

    private static final DateTimeFormatter YYYYMM = DateTimeFormatter.ofPattern("yyyyMM");

    /**
     * T1.4: Validate that {@code next.effectiveFrom} directly follows
     * {@code prev.effectiveFrom} by exactly one month. If not, throw
     * {@link RatePeriodGapException}.
     *
     * <p>Business rule: Rate periods must form a continuous chain — gaps forbidden.
     * This prevents uncovered months where a team has no defined rate.
     *
     * <p><b>Examples</b>:
     * <ul>
     *   <li>prev=202512, next=202601 → adjacent, OK
     *   <li>prev=202512, next=202602 → gap Jan — throws
     *   <li>prev=202512, next=202512 → overlapping — throws (handled separately)
     * </ul>
     *
     * @param prev the currently active rate (possibly null if this is the first)
     * @param next the rate candidate being inserted
     * @throws RatePeriodGapException if next starts > 1 month after prev ends
     */
    public static void validateContiguity(Rate prev, Rate next) {
        if (prev == null) {
            return; // no previous to validate against — OK
        }
        YearMonth prevEff = YearMonth.parse(prev.getEffectiveFrom(), YYYYMM);
        YearMonth nextEff = YearMonth.parse(next.getEffectiveFrom(), YYYYMM);

        // The new effective_from must be exactly prev + 1 month
        if (nextEff.isAfter(prevEff.plusMonths(1))) {
            String message = String.format("Rate period Gap detected: prev=%s → next=%s (expected %s)",
                prevEff, nextEff, prevEff.plusMonths(1));
            throw new RatePeriodGapException(message);
        }
    }

    /**
     * T1.4 todo: Implement create rate with PESSIMISTIC_WRITE lock + auto-close previous.
     *
     * GREEN phase — returns in-memory object. Fully implemented in T1.4.
     */
    public Rate createRate(CreateRateRequest request) {
        return Rate.builder()
            .costCenterId(request.costCenterId())
            .billableTeamCode(request.billableTeamCode())
            .monthlyRateK(request.monthlyRateK())
            .effectiveFrom(request.effectiveFrom())
            .isBillable(request.billable())
            .isActive(true)
            .build();
    }

    // Request record DTO for rate creation — simplifies validation
    public record CreateRateRequest(
        String costCenterId,
        String billableTeamCode,
        BigDecimal monthlyRateK,
        String effectiveFrom,
        boolean billable
    ) {}
}
