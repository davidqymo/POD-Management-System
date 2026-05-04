package com.pod.repository;

import com.pod.entity.ProjectActual;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectActualRepository extends JpaRepository<ProjectActual, Long> {
    @Query("SELECT pa FROM ProjectActual pa JOIN FETCH pa.resource WHERE pa.clarityId = :clarityId")
    List<ProjectActual> findByClarityId(String clarityId);
    Optional<ProjectActual> findByResourceIdAndClarityId(Long resourceId, String clarityId);
    List<ProjectActual> findByResourceId(Long resourceId);
    void deleteByClarityId(String clarityId);
}