package com.pod.controller;

import com.pod.entity.Project;
import com.pod.entity.ProjectStatus;
import com.pod.repository.ProjectRepository;
import com.pod.service.ProjectService;
import com.pod.dto.response.GanttResponse;
import com.pod.service.GanttService;
import com.pod.exception.TerminalStateException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/projects")
public class ProjectController {

    private final ProjectService projectService;
    private final ProjectRepository projectRepository;
    private final GanttService ganttService;

    public ProjectController(ProjectService projectService, ProjectRepository projectRepository, GanttService ganttService) {
        this.projectService = projectService;
        this.projectRepository = projectRepository;
        this.ganttService = ganttService;
    }

    @GetMapping
    public ResponseEntity<?> getAll(@RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<Project> projects = projectService.findAll(status, PageRequest.of(page, size, Sort.by("createdAt").descending()));
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return projectService.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> payload) {
        try {
            String name = (String) payload.get("name");
            Object budget = payload.get("budgetTotalK");
            Long ownerUserId = payload.get("ownerUserId") != null ? ((Number) payload.get("ownerUserId")).longValue() : null;
            String description = (String) payload.get("description");
            String requestId = (String) payload.get("requestId");
            String clarityId = (String) payload.get("clarityId");
            String billableProductId = (String) payload.get("billableProductId");
            String status = (String) payload.get("status");
            String startDate = (String) payload.get("startDate");
            String endDate = (String) payload.get("endDate");

            if (name == null || name.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Project name is required"));
            }

            if (budget == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Budget is required"));
            }

            java.math.BigDecimal budgetK = new java.math.BigDecimal(budget.toString());

            // Parse dates
            java.time.LocalDate start = startDate != null && !startDate.isBlank() ?
                java.time.LocalDate.parse(startDate) : null;
            java.time.LocalDate end = endDate != null && !endDate.isBlank() ?
                java.time.LocalDate.parse(endDate) : null;

            // First create the project with core fields
            Project created = projectService.create(name, budgetK, ownerUserId, description,
                requestId, clarityId, billableProductId, start, end);

            // Handle status separately
            if (status != null && !status.isBlank()) {
                try {
                    ProjectStatus projectStatus = ProjectStatus.valueOf(status);
                    created.setStatus(projectStatus);
                    created = projectRepository.saveAndFlush(created);
                } catch (IllegalArgumentException e) {
                    // ignore invalid status
                }
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(created));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to create project: " + e.getMessage()));
        }
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            String name = (String) payload.get("name");
            java.math.BigDecimal budgetK = payload.get("budgetTotalK") != null ? new java.math.BigDecimal(payload.get("budgetTotalK").toString()) : null;
            String description = (String) payload.get("description");
            String requestId = (String) payload.get("requestId");
            String clarityId = (String) payload.get("clarityId");
            String billableProductId = (String) payload.get("billableProductId");
            LocalDate startDate = payload.get("startDate") != null ? LocalDate.parse(payload.get("startDate").toString()) : null;
            LocalDate endDate = payload.get("endDate") != null ? LocalDate.parse(payload.get("endDate").toString()) : null;
            Project updated = projectService.update(id, name, budgetK, description, requestId, clarityId, billableProductId, startDate, endDate);
            return ResponseEntity.ok(toResponse(updated));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to update project: " + e.getMessage()));
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> transitionStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            ProjectStatus newStatus = ProjectStatus.valueOf(body.get("status"));
            Project updated = projectService.transitionToTerminal(id, newStatus);
            return ResponseEntity.ok(toResponse(updated));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            projectService.deactivate(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{id}/gantt")
    public ResponseEntity<?> getGantt(@PathVariable Long id) {
        try {
            GanttResponse gantt = ganttService.calculateCriticalPath(id);
            return ResponseEntity.ok(gantt);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<?> startProject(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(toResponse(projectService.startProject(id)));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/hold")
    public ResponseEntity<?> putOnHold(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(toResponse(projectService.putOnHold(id)));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/reactivate")
    public ResponseEntity<?> reactivateProject(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(toResponse(projectService.reactivateCancelledProject(id)));
        } catch (TerminalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private Map<String, Object> toResponse(Project project) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", project.getId());
        response.put("requestId", project.getRequestId());
        response.put("clarityId", project.getClarityId());
        response.put("billableProductId", project.getBillableProductId());
        response.put("name", project.getName());
        response.put("description", project.getDescription());
        response.put("budgetTotalK", project.getBudgetTotalK());
        response.put("status", project.getStatus() != null ? project.getStatus().name() : null);
        response.put("startDate", project.getStartDate());
        response.put("endDate", project.getEndDate());
        response.put("ownerUserId", project.getOwnerUserId());
        response.put("isActive", project.isActive());
        response.put("createdAt", project.getCreatedAt());
        return response;
    }
}
