package com.pod.repository;

import com.pod.entity.Allocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DashboardRepository extends JpaRepository<Allocation, Long> {
    // Kept for backwards compatibility - actual queries handled in DashboardService
}