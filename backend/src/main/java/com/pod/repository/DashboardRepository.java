package com.pod.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface DashboardRepository {

    /**
     * Get supply (distinct active resources count) for a given month
     */
    @Query("SELECT COUNT(DISTINCT r.id) FROM Resource r WHERE r.isActive = true AND r.status = 'ACTIVE'")
    long getTotalSupply();

    /**
     * Get demand (total approved allocation hours) for a given month/year
     */
    @Query("SELECT COALESCE(SUM(a.hours), 0) FROM Allocation a WHERE a.status = 'APPROVED' " +
           "AND a.weekStartDate >= :startDate AND a.weekStartDate < :endDate")
    double getTotalDemand(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    /**
     * Get total spent (hours * rate) for a project
     */
    @Query("SELECT COALESCE(SUM(a.hours * COALESCE(r.hourlyRateK, 0)), 0) FROM Allocation a " +
           "LEFT JOIN a.resource r WHERE a.project.id = :projectId AND a.status = 'APPROVED'")
    double getProjectSpentK(@Param("projectId") Long projectId);

    /**
     * Get total allocated hours for a project
     */
    @Query("SELECT COALESCE(SUM(a.hours), 0) FROM Allocation a " +
           "WHERE a.project.id = :projectId AND a.status = 'APPROVED'")
    double getProjectAllocatedHours(@Param("projectId") Long projectId);

    /**
     * Get projects with overplan (allocated > estimated hours)
     */
    @Query("SELECT p.id, p.name, p.budgetTotalK, p.estimatedHours, " +
           "(SELECT COALESCE(SUM(a.hours), 0) FROM Allocation a WHERE a.project.id = p.id AND a.status = 'APPROVED') as allocatedHours " +
           "FROM Project p WHERE p.isActive = true")
    List<Object[]> getOverplanProjects();

    /**
     * Get all active projects for variance analysis
     */
    @Query("SELECT p.id, p.name, p.budgetTotalK, p.startDate, p.endDate " +
           "FROM Project p WHERE p.isActive = true ORDER BY p.name")
    List<Object[]> getActiveProjects();

    /**
     * Get monthly demand trend (last N months)
     */
    @Query("SELECT FUNCTION('DATE_TRUNC', 'month', a.weekStartDate) as month, SUM(a.hours) " +
           "FROM Allocation a WHERE a.status = 'APPROVED' AND a.weekStartDate >= :startDate " +
           "GROUP BY FUNCTION('DATE_TRUNC', 'month', a.weekStartDate) ORDER BY month")
    List<Object[]> getMonthlyDemandTrend(@Param("startDate") LocalDate startDate);

    /**
     * Get supply by skill
     */
    @Query("SELECT r.skill, COUNT(r.id) FROM Resource r WHERE r.isActive = true AND r.status = 'ACTIVE' " +
           "GROUP BY r.skill ORDER BY COUNT(r.id) DESC")
    List<Object[]> getSupplyBySkill();

    /**
     * Get allocation counts by status
     */
    @Query("SELECT a.status, COUNT(a.id) FROM Allocation a WHERE a.isActive = true GROUP BY a.status")
    List<Object[]> getAllocationCountsByStatus();
}