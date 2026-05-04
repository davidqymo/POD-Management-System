package com.pod.controller;

import com.pod.dto.response.ProjectActualDTO;
import com.pod.entity.ConsumptionSource;
import com.pod.entity.ProjectActual;
import com.pod.service.ProjectActualService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * ProjectActualController - REST API for Project Actual Consumption.
 *
 * ENDPOINTS:
 * - GET /api/v1/projects/{clarityId}/actuals - Get all actuals for a project
 * - POST /api/v1/projects/{clarityId}/actuals - Create/update actual (manual)
 * - DELETE /api/v1/projects/{clarityId}/actuals/{id} - Delete actual record
 * - POST /api/v1/projects/actuals/import - Bulk import from CSV
 *
 * VALIDATION:
 * - Resource must exist
 * - CSV format validation during import
 */
@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
public class ProjectActualController {

    private final ProjectActualService projectActualService;

    // Using query param instead of path param to handle special characters like "/" in clarityId
    @GetMapping("/actuals")
    public ResponseEntity<List<ProjectActualDTO>> getActuals(@RequestParam String clarityId) {
        List<ProjectActual> actuals = projectActualService.getByClarityId(clarityId);
        List<ProjectActualDTO> dtos = actuals.stream()
                .map(ProjectActualDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/actuals")
    public ResponseEntity<?> createOrUpdate(@RequestBody Map<String, Object> payload) {
        try {
            String clarityId = (String) payload.get("clarityId");
            if (clarityId == null || clarityId.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "clarityId is required"));
            }
            Long resourceId = ((Number) payload.get("resourceId")).longValue();
            String projectName = (String) payload.getOrDefault("projectName", "");

            @SuppressWarnings("unchecked")
            Map<String, BigDecimal> monthlyData = (Map<String, BigDecimal>) payload.get("monthlyData");

            ProjectActual actual = projectActualService.upsert(
                resourceId, clarityId, projectName,
                monthlyData, ConsumptionSource.MANUAL
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(ProjectActualDTO.fromEntity(actual));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/actuals/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, @RequestParam String clarityId) {
        try {
            projectActualService.delete(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/actuals/import")
    public ResponseEntity<?> importCSV(@RequestBody Map<String, String> payload) {
        try {
            String csvContent = payload.get("csvContent");
            ProjectActualService.ImportResult result = projectActualService.importFromCSV(csvContent);
            return ResponseEntity.ok(Map.of(
                "successCount", result.successCount(),
                "errors", result.errors()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}