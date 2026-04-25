package com.pod.service;

import com.pod.entity.Project;
import com.pod.entity.ProjectStatus;
import com.pod.exception.TerminalStateException;
import com.pod.repository.ProjectRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ProjectService {

    private static final int REACTIVATE_DAYS_LIMIT = 30;
    private final ProjectRepository projectRepository;

    public ProjectService(ProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
    }

    @Transactional(readOnly = true)
    public List<Project> findAll() {
        return projectRepository.findByIsActiveTrue();
    }

    @Transactional(readOnly = true)
    public Page<Project> findAll(Pageable pageable) {
        return projectRepository.findByIsActiveTrue(pageable);
    }

    @Transactional(readOnly = true)
    public Optional<Project> findById(Long id) {
        return projectRepository.findByIdAndIsActiveTrue(id);
    }

    @Transactional(readOnly = true)
    public List<Project> findByStatus(ProjectStatus status) {
        return projectRepository.findByStatusAndIsActiveTrue(status);
    }

    public Project create(String name, BigDecimal budgetTotalK, Long ownerUserId, String description) {
        if (budgetTotalK == null || budgetTotalK.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Budget must be greater than zero");
        }
        Project project = Project.builder()
            .name(name).budgetTotalK(budgetTotalK).ownerUserId(ownerUserId)
            .description(description).status(ProjectStatus.REQUESTED).isActive(true).build();
        return projectRepository.save(project);
    }

    public Project update(Long id, String name, BigDecimal budgetTotalK, String description) {
        Project project = projectRepository.findByIdAndIsActiveTrue(id)
            .orElseThrow(() -> new IllegalArgumentException("Project not found: " + id));
        if (name != null && !name.isBlank()) project.setName(name);
        if (budgetTotalK != null && budgetTotalK.compareTo(BigDecimal.ZERO) > 0) project.setBudgetTotalK(budgetTotalK);
        if (description != null) project.setDescription(description);
        return projectRepository.save(project);
    }

    public Project transitionToTerminal(Long id, ProjectStatus newStatus) {
        Project project = projectRepository.findByIdAndIsActiveTrue(id)
            .orElseThrow(() -> new IllegalArgumentException("Project not found: " + id));
        if (newStatus != ProjectStatus.COMPLETED && newStatus != ProjectStatus.CANCELLED) {
            throw new IllegalArgumentException("Invalid terminal status. Use COMPLETED or CANCELLED.");
        }
        if (project.getStatus() == ProjectStatus.COMPLETED || project.getStatus() == ProjectStatus.CANCELLED) {
            throw new TerminalStateException("Project is already in terminal state: " + project.getStatus());
        }
        project.setStatus(newStatus);
        return projectRepository.save(project);
    }

    public Project startProject(Long id) {
        Project project = projectRepository.findByIdAndIsActiveTrue(id)
            .orElseThrow(() -> new IllegalArgumentException("Project not found: " + id));
        if (project.getStatus() != ProjectStatus.REQUESTED && project.getStatus() != ProjectStatus.ON_HOLD) {
            throw new IllegalStateException("Project cannot be started from status: " + project.getStatus());
        }
        project.setStatus(ProjectStatus.EXECUTING);
        return projectRepository.save(project);
    }

    public Project putOnHold(Long id) {
        Project project = projectRepository.findByIdAndIsActiveTrue(id)
            .orElseThrow(() -> new IllegalArgumentException("Project not found: " + id));
        if (project.getStatus() != ProjectStatus.EXECUTING) {
            throw new IllegalStateException("Only EXECUTING projects can be put on hold");
        }
        project.setStatus(ProjectStatus.ON_HOLD);
        return projectRepository.save(project);
    }

    public Project reactivateCancelledProject(Long id) {
        Project project = projectRepository.findByIdAndIsActiveTrue(id)
            .orElseThrow(() -> new IllegalArgumentException("Project not found: " + id));
        if (project.getStatus() != ProjectStatus.CANCELLED) {
            throw new IllegalArgumentException("Project is not cancelled. Current status: " + project.getStatus());
        }
        Instant updatedAt = project.getUpdatedAt();
        if (updatedAt == null) updatedAt = project.getCreatedAt();
        long daysSinceUpdate = ChronoUnit.DAYS.between(updatedAt, Instant.now());
        if (daysSinceUpdate > REACTIVATE_DAYS_LIMIT) {
            throw new TerminalStateException("Cannot reactivate project after " + REACTIVATE_DAYS_LIMIT + " days.");
        }
        project.setStatus(ProjectStatus.EXECUTING);
        return projectRepository.save(project);
    }

    public void deactivate(Long id) {
        Project project = projectRepository.findByIdAndIsActiveTrue(id)
            .orElseThrow(() -> new IllegalArgumentException("Project not found: " + id));
        project.setActive(false);
        projectRepository.save(project);
    }
}
