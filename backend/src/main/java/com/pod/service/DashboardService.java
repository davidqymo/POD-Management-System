package com.pod.service;

import com.pod.repository.AllocationRepository;
import com.pod.repository.DashboardRepository;
import com.pod.repository.ProjectRepository;
import com.pod.repository.ResourceRepository;
import com.pod.service.dto.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final DashboardRepository dashboardRepository;
    private final ResourceRepository resourceRepository;
    private final AllocationRepository allocationRepository;
    private final ProjectRepository projectRepository;

    private static final double HCM_HOURS = 144.0; // 1 HCM = 144 hours

    public DashboardService(DashboardRepository dashboardRepository,
                           ResourceRepository resourceRepository,
                           AllocationRepository allocationRepository,
                           ProjectRepository projectRepository) {
        this.dashboardRepository = dashboardRepository;
        this.resourceRepository = resourceRepository;
        this.allocationRepository = allocationRepository;
        this.projectRepository = projectRepository;
    }

    public DashboardSummaryDTO getSummary() {
        long totalSupply = dashboardRepository.getTotalSupply();

        LocalDate now = LocalDate.now();
        LocalDate startOfMonth = now.withDayOfMonth(1);
        LocalDate endOfMonth = now.withDayOfMonth(now.lengthOfMonth());
        double totalDemand = dashboardRepository.getTotalDemand(startOfMonth, endOfMonth.plusDays(1));

        double totalBudgetK = projectRepository.findAll().stream()
                .filter(p -> p.isActive())
                .mapToDouble(p -> p.getBudgetTotalK() != null ? p.getBudgetTotalK().doubleValue() : 0)
                .sum();

        List<Object[]> overplanProjects = dashboardRepository.getOverplanProjects();
        long overplanCount = overplanProjects.stream()
                .filter(p -> {
                    double allocated = ((Number) p[2]).doubleValue();
                    return allocated > 0;
                })
                .count();

        double utilizationRate = totalSupply > 0 ? (totalDemand / (totalSupply * HCM_HOURS)) * 100 : 0;

        // Get allocation counts by status
        List<Object[]> statusCounts = dashboardRepository.getAllocationCountsByStatus();
        long pendingCount = 0;
        long approvedCount = 0;
        for (Object[] row : statusCounts) {
            String status = (String) row[0];
            long count = ((Number) row[1]).longValue();
            if ("PENDING".equals(status)) pendingCount = count;
            if ("APPROVED".equals(status)) approvedCount = count;
        }

        return new DashboardSummaryDTO(
                totalSupply,
                totalDemand,
                totalBudgetK,
                0, // totalSpentK - would need rate calculation
                overplanCount,
                Math.min(utilizationRate, 100), // cap at 100%
                pendingCount,
                approvedCount
        );
    }

    public List<MonthlyDataDTO> getSupplyDemandTrend(int months) {
        LocalDate startDate = LocalDate.now().minusMonths(months);
        List<Object[]> results = dashboardRepository.getMonthlyDemandTrend(startDate);

        List<MonthlyDataDTO> data = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM yyyy");

        for (Object[] row : results) {
            LocalDate month = (LocalDate) row[0];
            double hours = ((Number) row[1]).doubleValue();
            data.add(new MonthlyDataDTO(month.format(formatter), hours));
        }

        return data;
    }

    public List<VarianceDTO> getVariance() {
        List<Object[]> projectData = dashboardRepository.getActiveProjects();
        List<VarianceDTO> variances = new ArrayList<>();

        for (Object[] row : projectData) {
            Long projectId = (Long) row[0];
            String projectName = (String) row[1];
            Double budgetK = row[2] != null ? ((Number) row[2]).doubleValue() : 0.0;

            double allocatedHours = dashboardRepository.getProjectAllocatedHours(projectId);
            double spentK = dashboardRepository.getProjectSpentK(projectId);

            // Estimate allocated K (simplified - assumes avg rate)
            double allocatedK = allocatedHours * 0.1; // placeholder rate
            double varianceK = budgetK - spentK;
            double variancePercent = budgetK > 0 ? (varianceK / budgetK) * 100 : 0;

            variances.add(new VarianceDTO(projectId, projectName, budgetK, allocatedK, spentK, varianceK, variancePercent));
        }

        return variances;
    }

    public List<MonthlyDataDTO> getBurnRateTrend(int months) {
        // Simplified - would need proper rate calculation
        return getSupplyDemandTrend(months);
    }

    public List<SkillSupplyDTO> getSupplyBySkill() {
        List<Object[]> results = dashboardRepository.getSupplyBySkill();
        List<SkillSupplyDTO> supply = new ArrayList<>();

        for (Object[] row : results) {
            String skill = (String) row[0];
            long count = ((Number) row[1]).longValue();
            supply.add(new SkillSupplyDTO(skill != null ? skill : "Unknown", count));
        }

        return supply;
    }

    public List<StatusCountDTO> getAllocationStatus() {
        List<Object[]> results = dashboardRepository.getAllocationCountsByStatus();
        List<StatusCountDTO> statusList = new ArrayList<>();

        for (Object[] row : results) {
            String status = (String) row[0];
            long count = ((Number) row[1]).longValue();
            statusList.add(new StatusCountDTO(status, count));
        }

        return statusList;
    }

    public List<OverplanProjectDTO> getOverplanProjects() {
        List<Object[]> results = dashboardRepository.getOverplanProjects();
        List<OverplanProjectDTO> overplanProjects = new ArrayList<>();

        for (Object[] row : results) {
            Long projectId = (Long) row[0];
            // Need to get more details from project entity
            // Simplified for now
            double allocatedHours = dashboardRepository.getProjectAllocatedHours(projectId);
            double spentK = dashboardRepository.getProjectSpentK(projectId);

            if (allocatedHours > 0) { // This is a simplified check
                overplanProjects.add(new OverplanProjectDTO(
                        projectId,
                        "Project " + projectId,
                        0, // budgetK
                        0, // estimatedHours
                        allocatedHours,
                        spentK,
                        0, // overHours
                        0  // overBudgetK
                ));
            }
        }

        return overplanProjects;
    }

    public Map<String, Object> getUtilization() {
        long totalSupply = dashboardRepository.getTotalSupply();
        LocalDate now = LocalDate.now();
        LocalDate startOfMonth = now.withDayOfMonth(1);
        LocalDate endOfMonth = now.withDayOfMonth(now.lengthOfMonth());
        double totalDemand = dashboardRepository.getTotalDemand(startOfMonth, endOfMonth.plusDays(1));

        double maxCapacity = totalSupply * HCM_HOURS;
        double utilization = maxCapacity > 0 ? (totalDemand / maxCapacity) * 100 : 0;

        Map<String, Object> result = new HashMap<>();
        result.put("totalSupply", totalSupply);
        result.put("totalDemand", totalDemand);
        result.put("maxCapacity", maxCapacity);
        result.put("utilizationPercent", Math.min(utilization, 100));
        result.put("availableCapacity", Math.max(0, maxCapacity - totalDemand));

        return result;
    }
}