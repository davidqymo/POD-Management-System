package com.pod.repository;

import com.pod.entity.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * ResourceRepository — Spring Data JPA repository for Resource entity.
 *
 * T1.3: Implements custom queries with pessimistic locking for concurrent edits.
 *
 * Queries:
 * - findByIdWithLock: PESSIMISTIC_WRITE lock — blocks concurrent updates
 * - findByCostCenterAndTeam: filter by cc+btc + active-only
 * - findByFilters: skill IN, level range, active+billable filter, with pagination support.
 */
@Repository
public interface ResourceRepository extends JpaRepository<Resource, Long>, JpaSpecificationExecutor<Resource> {

    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Resource r WHERE r.id = :id")
    Optional<Resource> findByIdWithLock(@Param("id") Long id);

    @Query("SELECT r FROM Resource r WHERE r.costCenterId = :cc AND r.billableTeamCode = :btc AND r.isActive = true")
    List<Resource> findByCostCenterAndTeam(@Param("cc") String costCenterId, @Param("btc") String billableTeamCode);

    @Query("SELECT r FROM Resource r WHERE r.skill IN :skills AND r.level BETWEEN :min AND :max AND r.isActive = true AND r.isBillable = true")
    Page<Resource> findByFilters(@Param("skills") List<String> skills, @Param("min") int minLevel, @Param("max") int maxLevel, Pageable pageable);
}
