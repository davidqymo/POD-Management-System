package com.pod.repository;

import com.pod.entity.Project;
import com.pod.entity.ProjectStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByIsActiveTrue();
    Optional<Project> findByIdAndIsActiveTrue(Long id);
    List<Project> findByStatusAndIsActiveTrue(ProjectStatus status);
    Page<Project> findByStatusAndIsActiveTrue(ProjectStatus status, Pageable pageable);
    Optional<Project> findByRequestId(String requestId);
    Page<Project> findByIsActiveTrue(Pageable pageable);

    @Modifying
    @Query("update Project p set p.updatedAt = :updatedAt where p.id = :id")
    void setUpdatedAt(@Param("id") Long id, @Param("updatedAt") Instant updatedAt);

    @Query(value = "SELECT * FROM projects ORDER BY id DESC LIMIT 1", nativeQuery = true)
    Project findLatestProject();

    @Modifying
    @Query(value = "UPDATE projects SET clarity_id = :clarityId, billable_product_id = :billableProductId, updated_at = NOW() WHERE id = :id", nativeQuery = true)
    void updateClarityAndProductIds(@Param("id") Long id, @Param("clarityId") String clarityId, @Param("billableProductId") String billableProductId);

    Optional<Project> findByClarityId(String clarityId);
}