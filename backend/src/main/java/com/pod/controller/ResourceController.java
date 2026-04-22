package com.pod.controller;

import com.pod.entity.Resource;
import com.pod.entity.ResourceStatus;
import com.pod.service.ResourceService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Map;

/**
 * ResourceController — REST API for Resource CRUD operations.
 *
 * T1.5: Endpoints:
 *   - GET /api/v1/resources — list all
 *   - GET /api/v1/resources/{id} — get by ID
 *   - POST /api/v1/resources — create new
 *   - PATCH /api/v1/resources/{id} — partial update (status only)
 *   - DELETE /api/v1/resources/{id} — soft delete
 */
@RestController
@RequestMapping("/api/v1/resources")
public class ResourceController {

    private final ResourceService resourceService;

    public ResourceController(ResourceService resourceService) {
        this.resourceService = resourceService;
    }

    @GetMapping
    public List<Resource> getAll() {
        return resourceService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resource> getById(@PathVariable Long id) {
        return resourceService.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Resource> create(@RequestBody Resource resource) {
        Resource saved = resourceService.create(resource);
        return ResponseEntity
            .created(URI.create("/api/v1/resources/" + saved.getId()))
            .body(saved);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> patch(@PathVariable Long id, @RequestBody Map<String, Object> updates) {
        // Block immutable field changes per G6-T1.4
        if (updates.containsKey("externalId")) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "FIELD_READ_ONLY",
                "message", "externalId is read-only"
            ));
        }

        // Only allow status updates via dedicated endpoint
        return ResponseEntity.badRequest().body(Map.of(
            "error", "INVALID_PATCH",
            "message", "Use PATCH /api/v1/resources/{id}/status for status changes"
        ));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        ResourceStatus status = ResourceStatus.valueOf(body.get("status"));
        String reason = body.getOrDefault("reason", "Status update");
        resourceService.changeStatus(id, status, reason);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        resourceService.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}