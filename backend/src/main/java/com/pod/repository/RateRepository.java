package com.pod.repository;

import com.pod.entity.Rate;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * RateRepository — JPA CRUD + custom query for active rate lookup.
 *
 * findActiveRate(): returns the rate with effectiveTo IS NULL for given CC+team;
 * used by RateService.createRate() to acquire PESSIMISTIC_WRITE lock before closing.
 */
@Repository
public interface RateRepository extends JpaRepository<Rate, Long> {

    /**
     * Find the currently active (open-ended) rate for a cost center + team.
     * Acquires a PESSIMISTIC_WRITE lock to serialize concurrent rate updates.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Rate> findByCostCenterIdAndBillableTeamCodeAndEffectiveToIsNull(String costCenterId, String billableTeamCode);
}
