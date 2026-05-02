package com.pod.service;

import com.pod.entity.Allocation;
import com.pod.entity.AllocationStatus;
import com.pod.entity.Project;
import com.pod.entity.Rate;
import com.pod.entity.Resource;
import com.pod.repository.AllocationRepository;
import com.pod.repository.DashboardRepository;
import com.pod.repository.ProjectRepository;
import com.pod.repository.RateRepository;
import com.pod.repository.ResourceRepository;
import com.pod.service.dto.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final DashboardRepository dashboardRepository;
    private final ResourceRepository resourceRepository;
    private final AllocationRepository allocationRepository;
    private final ProjectRepository projectRepository;
    private final RateRepository rateRepository;

    private static final double HCM_HOURS = 144.0;

    public DashboardService(DashboardRepository dashboardRepository,
                          ResourceRepository resourceRepository,
                          AllocationRepository allocationRepository,
                          ProjectRepository projectRepository,
                          RateRepository rateRepository) {
        this.dashboardRepository = dashboardRepository;
        this.resourceRepository = resourceRepository;
        this.allocationRepository = allocationRepository;
        this.projectRepository = projectRepository;
        this.rateRepository = rateRepository;
    }

    public DashboardSummaryDTO getSummary() {
        // Count active billable resources
        long totalSupplyCount = resourceRepository.findAll().stream()
            .filter(r -> r.isActive() && r.isBillable())
            .count();

        // Calculate Total Supply in KUSD = sum of all resources × 12 months × rate
        double totalSupplyK = 0;
        for (Resource r : resourceRepository.findAll().stream()
                .filter(r -> r.isActive() && r.isBillable())
                .toList()) {
            var rateOpt = rateRepository.findAll().stream()
                .filter(rate -> rate.getCostCenterId() != null
                    && rate.getCostCenterId().equals(r.getCostCenterId())
                    && rate.getBillableTeamCode() != null
                    && rate.getBillableTeamCode().equals(r.getBillableTeamCode()))
                .findFirst();
            if (rateOpt.isPresent()) {
                // 12 months × monthly rate = annual supply value
                totalSupplyK += 12 * rateOpt.get().getMonthlyRateK().doubleValue();
            }
        }

        // Total Demand = sum of all project budgets (fiscal year)
        double totalDemand = projectRepository.findAll().stream()
            .filter(p -> p.isActive())
            .mapToDouble(p -> p.getBudgetTotalK() != null ? p.getBudgetTotalK().doubleValue() : 0)
            .sum();

        // Available Supply = Total Supply K - Total Demand
        double availableSupplyK = totalSupplyK - totalDemand;

        // Calculate utilization (as percentage of supply used by demand)
        double utilizationRate = totalSupplyK > 0 ? (totalDemand / totalSupplyK) * 100 : 0;

        // Count pending vs approved
        long approvedCount = allocationRepository.findAll().stream()
            .filter(a -> a.isActive() && a.getStatus() == AllocationStatus.APPROVED)
            .count();
        long pendingCount = allocationRepository.findAll().stream()
            .filter(a -> a.isActive() && a.getStatus() == AllocationStatus.PENDING)
            .count();

        return new DashboardSummaryDTO(
            totalSupplyCount,
            totalSupplyK,
            totalDemand,
            availableSupplyK,
            totalDemand,
            totalDemand,
            0L,
            utilizationRate,
            pendingCount,
            approvedCount
        );
    }

    public List<MonthlyDataDTO> getSupplyDemandTrend(int months) {
        List<MonthlyDataDTO> data = new ArrayList<>();

        // Get all active billable resources with their rates
        var billableResources = resourceRepository.findAll().stream()
            .filter(r -> r.isActive() && r.isBillable())
            .toList();

        // Fiscal year: Dec to Nov
        // If current month is Dec or later, start from Dec this year
        // If current month is Jan-Nov, start from Dec last year
        java.time.YearMonth current = java.time.YearMonth.now();
        java.time.YearMonth startOfFiscalYear;
        if (current.getMonthValue() >= 12) {
            startOfFiscalYear = java.time.YearMonth.of(current.getYear(), java.time.Month.DECEMBER);
        } else {
            startOfFiscalYear = java.time.YearMonth.of(current.getYear() - 1, java.time.Month.DECEMBER);
        }

        for (int i = 0; i < 12; i++) {
            java.time.YearMonth ym = startOfFiscalYear.plusMonths(i);
            int year = ym.getYear();
            int monthValue = ym.getMonthValue();
            int hcmValue = year * 100 + monthValue;

            // Calculate Supply for this month (resources × rate × 1 month)
            double monthlySupplyK = 0;
            for (Resource r : billableResources) {
                var rateOpt = rateRepository.findAll().stream()
                    .filter(rate -> rate.getCostCenterId() != null
                        && rate.getCostCenterId().equals(r.getCostCenterId())
                        && rate.getBillableTeamCode() != null
                        && rate.getBillableTeamCode().equals(r.getBillableTeamCode()))
                    .findFirst();
                if (rateOpt.isPresent()) {
                    monthlySupplyK += rateOpt.get().getMonthlyRateK().doubleValue();
                }
            }

            // Calculate Demand for this month from allocations
            double monthlyDemandK = 0;
            var monthAllocations = allocationRepository.findAll().stream()
                .filter(a -> a.isActive() && a.getStatus() != AllocationStatus.REJECTED && a.getHcm().equals(hcmValue))
                .toList();
            for (Allocation a : monthAllocations) {
                if (a.getHours() != null && a.getHours().doubleValue() > 0 && a.getResource() != null) {
                    Resource r = a.getResource();
                    var rateOpt = rateRepository.findAll().stream()
                        .filter(rate -> rate.getCostCenterId() != null
                            && rate.getCostCenterId().equals(r.getCostCenterId())
                            && rate.getBillableTeamCode() != null
                            && rate.getBillableTeamCode().equals(r.getBillableTeamCode()))
                        .findFirst();
                    if (rateOpt.isPresent()) {
                        double hcmAllocated = a.getHours().doubleValue() / HCM_HOURS;
                        double rateK = rateOpt.get().getMonthlyRateK().doubleValue();
                        monthlyDemandK += hcmAllocated * rateK;
                    }
                }
            }

            data.add(new MonthlyDataDTO(ym.getMonth().name().substring(0, 3) + " " + year, monthlySupplyK, monthlyDemandK));
        }
        return data;
    }

    public List<VarianceDTO> getVariance() {
        List<VarianceDTO> variance = new ArrayList<>();

        projectRepository.findAll().stream()
            .filter(p -> p.isActive())
            .forEach(p -> {
                BigDecimal budget = p.getBudgetTotalK() != null ? p.getBudgetTotalK() : BigDecimal.ZERO;

                // Count all active allocations (not rejected)
                double allocatedHours = allocationRepository.findAll().stream()
                    .filter(a -> a.isActive() && a.getStatus() != AllocationStatus.REJECTED && a.getProject().getId().equals(p.getId()))
                    .mapToDouble(a -> a.getHours() != null ? a.getHours().doubleValue() : 0)
                    .sum();

                // Calculate allocated KUSD using rates for each allocation
                double allocatedK = 0;
                var projectAllocations = allocationRepository.findAll().stream()
                        .filter(a -> a.isActive() && a.getStatus() != AllocationStatus.REJECTED && a.getProject().getId().equals(p.getId()))
                        .toList();

                for (com.pod.entity.Allocation a : projectAllocations) {
                    if (a.getHours() != null && a.getHours().doubleValue() > 0 && a.getResource() != null) {
                        com.pod.entity.Resource r = a.getResource();
                        var rateOpt = rateRepository.findAll().stream()
                            .filter(rate -> rate.getCostCenterId() != null
                                && rate.getCostCenterId().equals(r.getCostCenterId())
                                && rate.getBillableTeamCode() != null
                                && rate.getBillableTeamCode().equals(r.getBillableTeamCode()))
                            .findFirst();
                        if (rateOpt.isPresent()) {
                            double hcm = a.getHours().doubleValue() / HCM_HOURS;
                            double rateK = rateOpt.get().getMonthlyRateK().doubleValue();
                            allocatedK += hcm * rateK;
                        }
                    }
                }

                variance.add(new VarianceDTO(
                    p.getId(),
                    p.getName(),
                    budget.doubleValue(),
                    allocatedK,
                    budget.doubleValue() - allocatedK,
                    0,
                    0
                ));
            });

        return variance;
    }

    public List<MonthlyDataDTO> getBurnRateTrend(int months) {
        return getSupplyDemandTrend(months);
    }

    public List<SkillSupplyDTO> getSupplyBySkill() {
        List<SkillSupplyDTO> result = new ArrayList<>();
        return result;
    }

    public List<StatusCountDTO> getAllocationStatus() {
        List<StatusCountDTO> result = new ArrayList<>();
        return result;
    }

    public List<OverplanProjectDTO> getOverplanProjects() {
        List<OverplanProjectDTO> result = new ArrayList<>();
        return result;
    }

    public Map<String, Object> getUtilization() {
        Map<String, Object> result = new HashMap<>();
        result.put("rate", 0);
        result.put("totalSupply", 0);
        result.put("totalDemand", 0);
        return result;
    }
}