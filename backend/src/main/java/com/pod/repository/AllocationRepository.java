package com.pod.repository;

import com.pod.entity.Allocation;
import com.pod.entity.AllocationStatus;
import com.pod.entity.Resource;
import com.pod.entity.Project;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

@Repository
public interface AllocationRepository extends JpaRepository<Allocation, Long> {

    /**
     * Find all allocations with eager fetch of associations.
     */
    @Query("SELECT a FROM Allocation a " +
           "LEFT JOIN FETCH a.resource " +
           "LEFT JOIN FETCH a.project " +
           "LEFT JOIN FETCH a.activity")
    List<Allocation> findAllWithAssociations();

    /**
     * Find an allocation with PESSIMISTIC_WRITE lock for concurrent edits.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Allocation a " +
           "LEFT JOIN FETCH a.resource " +
           "LEFT JOIN FETCH a.project " +
           "LEFT JOIN FETCH a.activity " +
           "WHERE a.id = :id")
    Optional<Allocation> findByIdWithLock(@Param("id") Long id);

    /**
     * Find active (PENDING/APPROVED) allocations by resource in a given month.
     * Used for overlap detection.
     */
    @Query("SELECT a FROM Allocation a " +
           "WHERE a.resource.id = :resourceId " +
           "  AND a.weekStartDate BETWEEN :monthStart AND :monthEnd " +
           "  AND a.status IN ('PENDING', 'APPROVED') " +
           "  AND a.isActive = true")
    List<Allocation> findActiveByResourceAndMonth(
        @Param("resourceId") Long resourceId,
        @Param("monthStart") LocalDate monthStart,
        @Param("monthEnd") LocalDate monthEnd
    );

    /**
     * Sum of approved allocation hours for a resource in a given month.
     * Excludes PENDING allocations from the approved-hour calculation.
     */
    @Query("SELECT COALESCE(SUM(a.hours), 0) FROM Allocation a " +
           "WHERE a.resource.id = :resourceId " +
           "  AND a.weekStartDate BETWEEN :monthStart AND :monthEnd " +
           "  AND a.status = 'APPROVED' " +
           "  AND a.isActive = true")
    BigDecimal sumApprovedHoursForActiveResource(
        @Param("resourceId") Long resourceId,
        @Param("monthStart") LocalDate monthStart,
        @Param("monthEnd") LocalDate monthEnd
    );

    /**
     * Count distinct active (APPROVED) projects a resource is allocated to in a given month,
     * optionally excluding a specific project.
     */
    @Query("SELECT COUNT(DISTINCT a.project.id) FROM Allocation a " +
           "WHERE a.resource.id = :resourceId " +
           "  AND a.weekStartDate BETWEEN :monthStart AND :monthEnd " +
           "  AND a.status = 'APPROVED' " +
           "  AND a.isActive = true " +
           "  AND (:excludeProjectId IS NULL OR a.project.id != :excludeProjectId)")
    Long countDistinctActiveProjectsInMonth(
        @Param("resourceId") Long resourceId,
        @Param("monthStart") LocalDate monthStart,
        @Param("monthEnd") LocalDate monthEnd,
        @Param("excludeProjectId") Long excludeProjectId
    );

    /**
     * Find overlapping approval-confirmed allocation (same resource, same week, PENDING/APPROVED).
     */
    @Query("SELECT a FROM Allocation a " +
           "WHERE a.resource.id = :resourceId " +
           "  AND a.weekStartDate = :weekStart " +
           "  AND a.status IN ('PENDING', 'APPROVED') " +
           "  AND a.isActive = true")
    List<Allocation> findOverlapping(
        @Param("resourceId") Long resourceId,
        @Param("weekStart") LocalDate weekStart
    );

    /**
     * Soft-close all active allocations for a project (CANCELLED/SUSPENDED transition).
     */
    @Modifying
    @Query("UPDATE Allocation a SET " +
           "  a.isActive = false, " +
           "  a.status = 'LOCKED', " +
           "  a.rejectionReason = :reason, " +
           "  a.updatedAt = cast(CURRENT_TIMESTAMP as instant) " +
           "WHERE a.project.id = :projectId " +
           "  AND a.isActive = true " +
           "  AND a.status IN ('PENDING', 'APPROVED')")
    int softCloseAllByProject(@Param("projectId") Long projectId, @Param("reason") String reason);

    /**
     * Find approved allocations for a project (used by ProjectService to check terminal state before close).
     */
    @Query("SELECT COUNT(a) FROM Allocation a " +
           "WHERE a.project.id = :projectId " +
           "  AND a.status = 'APPROVED' " +
           "  AND a.isActive = true")
    long countApprovedByProject(@Param("projectId") Long projectId);

    /**
     * Find pending allocations for a project.
     */
    @Query("SELECT COUNT(a) FROM Allocation a " +
           "WHERE a.project.id = :projectId " +
           "  AND a.status = 'PENDING' " +
           "  AND a.isActive = true")
    long countPendingByProject(@Param("projectId") Long projectId);

    /**
     * Paged query for admin views.
     */
    Page<Allocation> findByResourceIdAndProjectIdAndStatusIn(
        @Param("resourceId") Long resourceId,
        @Param("projectId") Long projectId,
        @Param("statuses") List<AllocationStatus> statuses,
        Pageable pageable
    );

    /**
     * Get rate for a resource: aggregate total approved hours in a month
     * Used by validator to compute actual budget remaining via project total - spent.
     */
    @Query("SELECT SUM(a.hours) FROM Allocation a " +
           "WHERE a.project.id = :projectId " +
           "  AND a.status = 'APPROVED' " +
           "  AND a.isActive = true")
    BigDecimal sumApprovedHoursByProject(@Param("projectId") Long projectId);
}
