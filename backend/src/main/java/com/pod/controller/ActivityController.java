package com.pod.controller;

import com.pod.entity.Activity;
import com.pod.service.ActivityService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/activities")
public class ActivityController {

    private final ActivityService activityService;

    public ActivityController(ActivityService activityService) {
        this.activityService = activityService;
    }

    @GetMapping
    public ResponseEntity<List<Activity>> getActivities(@PathVariable Long projectId) {
        return ResponseEntity.ok(activityService.findByProjectId(projectId));
    }

    @PostMapping
    public ResponseEntity<?> create(@PathVariable Long projectId, @RequestBody Map<String, Object> payload) {
        try {
            Activity activity = activityService.create(projectId, payload);
            return ResponseEntity.status(HttpStatus.CREATED).body(activity);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long projectId, @PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            Activity updated = activityService.update(id, payload);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long projectId, @PathVariable Long id) {
        try {
            activityService.deactivate(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/dependencies")
    public ResponseEntity<?> addDependency(
            @PathVariable Long projectId,
            @RequestBody Map<String, Object> payload) {
        try {
            Long predecessorId = ((Number) payload.get("predecessorId")).longValue();
            Long successorId = ((Number) payload.get("successorId")).longValue();
            String dependencyType = (String) payload.getOrDefault("dependencyType", "FS");

            var dep = activityService.addDependency(predecessorId, successorId, dependencyType);
            return ResponseEntity.status(HttpStatus.CREATED).body(dep);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/dependencies")
    public ResponseEntity<?> removeDependency(
            @PathVariable Long projectId,
            @RequestBody Map<String, Object> payload) {
        try {
            Long predecessorId = ((Number) payload.get("predecessorId")).longValue();
            Long successorId = ((Number) payload.get("successorId")).longValue();
            activityService.removeDependency(predecessorId, successorId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}