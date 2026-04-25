package com.pod.controller;

import com.pod.entity.Project;
import com.pod.entity.ProjectStatus;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/projects")
public class ProjectController {

    private final ProjectService projectService;
    private final GanttService ganttService;

    public ProjectController(ProjectService projectService, GanttService ganttService) {
        this.projectService = projectService;
        this.ganttService = ganttService;
    }

    @GetMapping
    public ResponseEntity<?> getAll(@RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<Project> projects = projectService.findAll(PageRequest.of(page, size, Sort.by("createdAt").descending()));
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
            java.math.BigDecimal budgetK = new java.math.BigDecimal(budget.toString());
            Project created = projectService.create(name, budgetK, ownerUserId, description);
            return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(created));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            String name = (String) payload.get("name");
            java.math.BigDecimal budgetK = payload.get("budgetTotalK") != null ? new java.math.BigDecimal(payload.get("budgetTotalK").toString()) : null;
            String description = (String) payload.get("description");
            Project updated = projectService.update(id, name, budgetK, description);
            return ResponseEntity.ok(toResponse(updated));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
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
