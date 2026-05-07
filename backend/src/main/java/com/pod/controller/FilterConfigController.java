package com.pod.controller;

import com.pod.entity.FilterConfig;
import com.pod.service.FilterConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * FilterConfigController - REST API for Admin filter configuration management.
 *
 * PURPOSE:
 * Provides endpoints for managing dynamic filter options used across the UI.
 * Allows administrators to add, edit, and remove filter values without code changes.
 *
 * ENDPOINTS:
 * - GET /api/v1/admin/filters - List all active filters
 * - GET /api/v1/admin/filters/{category} - List filters by category
 * - POST /api/v1/admin/filters - Create new filter
 * - PUT /api/v1/admin/filters/{id} - Update filter value
 * - DELETE /api/v1/admin/filters/{id} - Soft delete filter
 *
 * CATEGORIES:
 * - skill, cost_center, l5_team, billable_team, level, status
 *
 * USAGE:
 * Frontend calls these APIs to populate dropdown filters.
 * Falls back to hardcoded defaults if APIs unavailable.
 */
@RestController
@RequestMapping("/api/v1/admin/filters")
@RequiredArgsConstructor
public class FilterConfigController {

    private final FilterConfigService filterConfigService;

    @GetMapping
    public ResponseEntity<List<FilterConfig>> getAllFilters() {
        return ResponseEntity.ok(filterConfigService.getAllFilters());
    }

    @GetMapping("/{category}")
    public ResponseEntity<List<FilterConfig>> getFiltersByCategory(@PathVariable String category) {
        return ResponseEntity.ok(filterConfigService.getFiltersByCategory(category));
    }

    @PostMapping
    public ResponseEntity<FilterConfig> createFilter(@RequestBody Map<String, String> body) {
        String category = body.get("category");
        String value = body.get("value");
        Integer displayOrder = body.containsKey("displayOrder") ? Integer.parseInt(body.get("displayOrder")) : null;
        String description = body.get("description");

        if (category == null || value == null) {
            return ResponseEntity.badRequest().build();
        }

        FilterConfig filter = filterConfigService.createFilter(category, value, displayOrder, description);
        return ResponseEntity.status(HttpStatus.CREATED).body(filter);
    }

    @PutMapping("/{id}")
    public ResponseEntity<FilterConfig> updateFilter(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String value = body.get("value");
        Integer displayOrder = body.containsKey("displayOrder") ? Integer.parseInt(body.get("displayOrder")) : null;
        String description = body.get("description");

        FilterConfig filter = filterConfigService.updateFilter(id, value, displayOrder, description);
        return ResponseEntity.ok(filter);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFilter(@PathVariable Long id) {
        filterConfigService.deleteFilter(id);
        return ResponseEntity.noContent().build();
    }
}