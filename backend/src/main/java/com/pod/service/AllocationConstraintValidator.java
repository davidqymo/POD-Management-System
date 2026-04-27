package com.pod.service;

import com.pod.dto.response.ConstraintViolation;
import com.pod.entity.AllocationStatus;
import com.pod.entity.Project;
import com.pod.entity.Resource;
import com.pod.exception.ConstraintViolationException;
import com.pod.repository.AllocationRepository;
import com.pod.repository.ProjectRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

/**
 * AllocationConstraintValidator — validates the 5 hard constraints for allocation creation.
 *
 * Constraints:
 *  1. DAILY_HOURS_EXCEEDED  — avg daily hours > 10 over the assignment week
 *  2. MONTHLY_CAP_EXCEEDED   — total approved hours for the month + proposed > 144
 *  3. OVERTIME_LIMIT_EXCEEDED — OT = max(0, total – 144) > 36
 *  4. PROJECT_SPREAD_LIMIT   — resource allocated to ≥5 distinct APPROVED projects in calendar month
 *  5. BUDGET_REMAINING       — project.budgetRemainingK >= proposedCost
 */
@Service
@RequiredArgsConstructor
public class AllocationConstraintValidator {

    private final AllocationRepository allocationRepository;
    private final ProjectRepository projectRepository;

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Validate allocation proposal is allowed.
     *
     * @param resourceId  ID of the resource being allocated
     * @param projectId   ID of the project
     * @param month       calendar month (year + month) of the allocation week start
     * @param weekHours   total hours proposed for that week
     * @param activityId  nullable activity ID (not used in validation currently)
     * @return list of constraint violations (empty = all checks passed)
     */
    @Transactional(readOnly = true)
    public List<com.pod.dto.response.ConstraintViolation> validate(
        Long resourceId,
        Long projectId,
        YearMonth month,
        BigDecimal weekHours,
        Long activityId
    ) {
        List<ConstraintViolation> violations = new ArrayList<>();

        if (weekHours == null || weekHours.compareTo(BigDecimal.ONE) <= 0) {
            violations.add(ConstraintViolation.builder()
                .code("INVALID_HOURS")
                .message("Hours must be greater than zero")
                .build());
            return violations;
        }

        // Compute month boundaries (first day to last day inclusive)
        LocalDate monthStart = month.atDay(1);
        LocalDate monthEnd = month.atEndOfMonth();

        // 1. Daily average <= 10 hours per working day (5-day week)
        BigDecimal avgDaily = weekHours.divide(BigDecimal.valueOf(5), 2, RoundingMode.HALF_UP);
        if (avgDaily.compareTo(BigDecimal.TEN) > 0) {
            violations.add(ConstraintViolation.builder()
                .code("DAILY_HOURS_EXCEEDED")
                .message(String.format("Daily average of %.2f hours exceeds limit of 10 hours", avgDaily))
                .details(String.format("Proposed weekHours=%.2f yields avg=%.2f", weekHours, avgDaily))
                .build());
        }

        // 2. Monthly cap ≤ 144 hours total (approved + proposed)
        BigDecimal approvedSum = allocationRepository.sumApprovedHoursForActiveResource(
            resourceId, monthStart, monthEnd
        );
        BigDecimal proposedTotal = approvedSum.add(weekHours);
        if (proposedTotal.compareTo(BigDecimal.valueOf(144)) > 0) {
            violations.add(ConstraintViolation.builder()
                .code("MONTHLY_CAP_EXCEEDED")
                .message(String.format("Monthly allocation %.2f exceeds cap of 144h", proposedTotal))
                .details(String.format("approved=%.2f + proposed=%.2f = %.2f > 144",
                    approvedSum, weekHours, proposedTotal))
                .build());
        }

        // 3. Overtime limit ≤ 36h over base cap (OT = max(0, total - 144))
        BigDecimal overtime = proposedTotal.subtract(BigDecimal.valueOf(144)).max(BigDecimal.ZERO);
        if (overtime.compareTo(BigDecimal.valueOf(36)) > 0) {
            violations.add(ConstraintViolation.builder()
                .code("OVERTIME_LIMIT_EXCEEDED")
                .message(String.format("OT %.2f exceeds monthly OT limit of 36h", overtime))
                .details(String.format("Total=%.2f, baseCap=144, OT=%.2f", proposedTotal, overtime))
                .build());
        }

        // 4. Project spread ≤ 5 distinct APPROVED active projects in the month
        Long activeProjectCount = allocationRepository.countDistinctActiveProjectsInMonth(
            resourceId, monthStart, monthEnd, projectId  // exclude current project
        );
        // Resource already on 5 projects? Then 6th is violation
        if (activeProjectCount >= 5) {
            violations.add(ConstraintViolation.builder()
                .code("PROJECT_SPREAD_LIMIT")
                .message(String.format("Resource already allocated to %d distinct projects this month (limit 5)", activeProjectCount))
                .details(String.format("resourceId=%d, month=%s, distinctCount=%d", resourceId, month, activeProjectCount))
                .build());
        }

        // 5. Budget remaining >= proposed cost
        // Cost = weekHours × (monthlyRateK / 144). monthlyRateK comes from Rate table.
        // Fetch resource to get cost center / team
        Resource res = entityManager.find(Resource.class, resourceId);
        if (res != null) {
            BigDecimal rateMonthlyK = fetchActiveRateMonthlyK(res.getCostCenterId(), res.getBillableTeamCode());
            if (rateMonthlyK == null) {
                violations.add(ConstraintViolation.builder()
                    .code("RATE_NOT_FOUND")
                    .message("No active rate found for resource's cost center and team")
                    .details(String.format("costCenterId=%s, team=%s", res.getCostCenterId(), res.getBillableTeamCode()))
                    .build());
                return violations;  // rate unknown → cannot validate budget; fail early
            }

            // Compute proposed cost in K units
            BigDecimal costK = weekHours.multiply(rateMonthlyK)
                .divide(BigDecimal.valueOf(144), 4, RoundingMode.HALF_UP);

            // Compute consumed cost: already approved allocations on this project
            // Sum hours by project × same rate (approved allocations on other projects?) — only this project's consumptions count
            BigDecimal approvedProjectHours = allocationRepository.sumApprovedHoursByProject(projectId);
            BigDecimal consumedCostK = (approvedProjectHours != null ? approvedProjectHours : BigDecimal.ZERO).multiply(rateMonthlyK)
                .divide(BigDecimal.valueOf(144), 4, RoundingMode.HALF_UP);

            BigDecimal totalProjectCostK = consumedCostK.add(costK);
            var projectOpt = projectRepository.findById(projectId);
            if (projectOpt.isPresent()) {
                var proj = projectOpt.get();
                BigDecimal remainingK = proj.getBudgetTotalK().subtract(consumedCostK);
                if (remainingK.compareTo(costK) < 0) {
                    violations.add(ConstraintViolation.builder()
                        .code("BUDGET_REMAINING_INSUFFICIENT")
                        .message(String.format("Budget remaining $%.4fK insufficient (need $%.4fK, has $%.4fK)",
                            remainingK, costK, remainingK))
                        .details(String.format("projectId=%d, budgetTotal=%.2f, consumed=%.4f, proposedCost=%.4f",
                            projectId, proj.getBudgetTotalK(), consumedCostK, costK))
                        .build());
                }
            }
        }

        return violations;
    }

    /**
     * Fetch the active monthly rate K USD for the given cost center and billable team.
     * Active = effectiveTo IS NULL (open-ended).
     */
    private BigDecimal fetchActiveRateMonthlyK(String costCenterId, String billableTeamCode) {
        // RateRepository method: findByCostCenterIdAndBillableTeamCodeAndEffectiveToIsNull
        // We'll implement that — here in validator we call allocationRepository or a custom query via entityManager
        var rateOpt = entityManager.createQuery(
                "SELECT r.monthlyRateK FROM Rate r " +
                "WHERE r.costCenterId = :cc AND r.billableTeamCode = :btc AND r.effectiveTo IS NULL",
                BigDecimal.class
            )
            .setParameter("cc", costCenterId)
            .setParameter("btc", billableTeamCode)
            .setMaxResults(1)
            .getResultStream()
            .findFirst();
        return rateOpt.orElse(BigDecimal.ZERO);
    }
}
