package com.pod.repository;

import com.pod.entity.Project;
import com.pod.entity.ProjectStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {

    List<Project> findByIsActiveTrue();

    Optional<Project> findByIdAndIsActiveTrue(Long id);

    List<Project> findByStatusAndIsActiveTrue(ProjectStatus status);

    Optional<Project> findByRequestId(String requestId);
}