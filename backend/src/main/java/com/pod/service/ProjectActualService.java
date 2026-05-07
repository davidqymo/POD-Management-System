package com.pod.service;

import com.pod.entity.ConsumptionSource;
import com.pod.entity.ProjectActual;
import com.pod.entity.Project;
import com.pod.entity.Resource;
import com.pod.repository.ProjectActualRepository;
import com.pod.repository.ProjectRepository;
import com.pod.repository.ResourceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

/**
 * ProjectActualService - Business logic for ProjectActual entity.
 *
 * PROCESS FLOW:
 * 1. CSV IMPORT (importFromCSV):
 *    a. Parse CSV content with columns: externalId, clarityId, projectName, Dec-Nov
 *    b. Validate each row: look up resource by externalId
 *    c. Auto-create project if clarityId doesn't exist
 *    d. Upsert ProjectActual records (replace monthly data on conflict)
 *
 * 2. CRUD OPERATIONS:
 *    - getByClarityId: Get all actuals for a project
 *    - upsert: Create or update actual record
 *    - delete: Remove actual record
 *
 * VALIDATION:
 * - Resource must exist by externalId
 * - Project auto-created if missing (optional behavior)
 * - Monthly data stored as JSONB map
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectActualService {

    private final ProjectActualRepository projectActualRepository;
    private final ResourceRepository resourceRepository;
    private final ProjectRepository projectRepository;

    private static final List<String> MONTH_ORDER = Arrays.asList(
        "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov"
    );

    @Transactional(readOnly = true)
    public List<ProjectActual> getByClarityId(String clarityId) {
        return projectActualRepository.findByClarityId(clarityId);
    }

    @Transactional
    public ProjectActual upsert(Long resourceId, String clarityId, String projectName,
                                 Map<String, BigDecimal> monthlyData, ConsumptionSource source) {
        Resource resource = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new IllegalArgumentException("Resource not found: " + resourceId));

        Optional<ProjectActual> existing = projectActualRepository
            .findByResourceIdAndClarityId(resourceId, clarityId);

        ProjectActual actual;
        if (existing.isPresent()) {
            actual = existing.get();
            actual.setMonthlyData(monthlyData);
            actual.setSource(source);
        } else {
            actual = ProjectActual.builder()
                .resource(resource)
                .clarityId(clarityId)
                .projectName(projectName)
                .monthlyData(monthlyData)
                .source(source)
                .build();
        }

        return projectActualRepository.save(actual);
    }

    @Transactional
    public void delete(Long id) {
        projectActualRepository.deleteById(id);
    }

    @Transactional
    public ImportResult importFromCSV(String csvContent) {
        List<String> lines = Arrays.asList(csvContent.trim().split("\n"));
        if (lines.size() < 2) {
            throw new IllegalArgumentException("CSV must have header and at least one data row");
        }

        String[] headers = lines.get(0).split(",");
        Map<String, Integer> headerMap = new HashMap<>();
        for (int i = 0; i < headers.length; i++) {
            headerMap.put(headers[i].trim().toLowerCase(), i);
        }

        // Validate required columns
        List<String> required = Arrays.asList("externalid", "clarityid", "projectname");
        for (String req : required) {
            if (!headerMap.containsKey(req)) {
                throw new IllegalArgumentException("Missing required column: " + req);
            }
        }

        int successCount = 0;
        List<String> errors = new ArrayList<>();
        int currentYear = Calendar.getInstance().get(Calendar.YEAR);

        for (int i = 1; i < lines.size(); i++) {
            try {
                String[] values = lines.get(i).split(",");
                if (values.length < headers.length) continue;

                String externalId = values[headerMap.get("externalid")].trim();
                String clarityId = values[headerMap.get("clarityid")].trim();
                String projectName = values[headerMap.get("projectname")].trim();

                Resource resource = resourceRepository.findByExternalId(externalId)
                    .orElse(null);

                if (resource == null) {
                    errors.add("Row " + (i+1) + ": Resource not found with externalId: " + externalId);
                    continue;
                }

                // Build monthly data map
                Map<String, BigDecimal> monthlyData = new LinkedHashMap<>();
                for (int m = 0; m < MONTH_ORDER.size(); m++) {
                    String monthName = MONTH_ORDER.get(m);
                    if (headerMap.containsKey(monthName.toLowerCase())) {
                        int colIdx = headerMap.get(monthName.toLowerCase());
                        if (colIdx < values.length && !values[colIdx].trim().isEmpty()) {
                            try {
                                BigDecimal hcm = new BigDecimal(values[colIdx].trim());
                                String hcmKey = getHcmKey(currentYear, m);
                                monthlyData.put(hcmKey, hcm);
                            } catch (NumberFormatException e) {
                                // Skip invalid values
                            }
                        }
                    }
                }

                // Auto-create project if not exists
                Project project = projectRepository.findByClarityId(clarityId).orElse(null);
                if (project == null && !clarityId.isEmpty()) {
                    project = Project.builder()
                        .clarityId(clarityId)
                        .name(projectName.isEmpty() ? clarityId : projectName)
                        .build();
                    project = projectRepository.save(project);
                }

                upsert(resource.getId(), clarityId, projectName, monthlyData, ConsumptionSource.IMPORT);
                successCount++;

            } catch (Exception e) {
                errors.add("Row " + (i+1) + ": " + e.getMessage());
            }
        }

        return new ImportResult(successCount, errors);
    }

    private String getHcmKey(int year, int monthIndex) {
        // Month order: Dec(0), Jan(1), Feb(2), ..., Nov(11)
        // Dec is previous year
        if (monthIndex == 0) {
            return String.valueOf((year - 1) * 100 + 12); // 202512
        }
        return String.valueOf(year * 100 + monthIndex); // e.g., 202601
    }

    public record ImportResult(int successCount, List<String> errors) {}
}