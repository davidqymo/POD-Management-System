package com.pod.controller;

import com.pod.service.DashboardService;
import com.pod.service.dto.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * DashboardController - REST API for dashboard analytics and reporting.
 *
 * ENDPOINTS:
 * - GET /api/v1/dashboard/summary - High-level metrics (resources, projects, allocations)
 * - GET /api/v1/dashboard/resources - Resource status breakdown
 * - GET /api/v1/dashboard/projects - Project status breakdown
 * - GET /api/v1/dashboard/supply-demand - Supply vs Demand analysis by skill
 * - GET /api/v1/dashboard/over-budget - Projects exceeding budget
 * - GET /api/v1/dashboard/variance - Budget variance analysis
 *
 * All endpoints return data optimized for dashboard visualizations.
 * Uses read-only transactions for performance.
 */
@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    public ResponseEntity<DashboardSummaryDTO> getSummary() {
        DashboardSummaryDTO summary = dashboardService.getSummary();
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/supply-demand")
    public ResponseEntity<List<MonthlyDataDTO>> getSupplyDemandTrend(
            @RequestParam(required = false, defaultValue = "6") int months) {
        List<MonthlyDataDTO> data = dashboardService.getSupplyDemandTrend(months);
        return ResponseEntity.ok(data);
    }

    @GetMapping("/variance")
    public ResponseEntity<List<VarianceDTO>> getVariance() {
        List<VarianceDTO> variance = dashboardService.getVariance();
        return ResponseEntity.ok(variance);
    }

    @GetMapping("/burn-rate")
    public ResponseEntity<List<MonthlyDataDTO>> getBurnRate(
            @RequestParam(required = false, defaultValue = "6") int months) {
        List<MonthlyDataDTO> burnRate = dashboardService.getBurnRateTrend(months);
        return ResponseEntity.ok(burnRate);
    }

    @GetMapping("/supply-by-skill")
    public ResponseEntity<List<SkillSupplyDTO>> getSupplyBySkill() {
        List<SkillSupplyDTO> supply = dashboardService.getSupplyBySkill();
        return ResponseEntity.ok(supply);
    }

    @GetMapping("/allocation-status")
    public ResponseEntity<List<StatusCountDTO>> getAllocationStatus() {
        List<StatusCountDTO> status = dashboardService.getAllocationStatus();
        return ResponseEntity.ok(status);
    }

    @GetMapping("/overplan")
    public ResponseEntity<List<OverplanProjectDTO>> getOverplanProjects() {
        List<OverplanProjectDTO> projects = dashboardService.getOverplanProjects();
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/utilization")
    public ResponseEntity<Map<String, Object>> getUtilization() {
        Map<String, Object> utilization = dashboardService.getUtilization();
        return ResponseEntity.ok(utilization);
    }

    @GetMapping("/budget-trend")
    public ResponseEntity<List<BudgetTrendDTO>> getBudgetTrend(
            @RequestParam(defaultValue = "2026") int fiscalYear) {
        List<BudgetTrendDTO> trend = dashboardService.getBudgetTrend(fiscalYear);
        return ResponseEntity.ok(trend);
    }
}