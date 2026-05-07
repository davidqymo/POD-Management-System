# Project Actual Consumption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Project Actual Consumption feature to capture actual resource consumption per project for budget tracking, billing/revenue, and capacity planning.

**Architecture:** New ProjectActual entity stores consumption data (resource/clarityId/month in JSONB). Frontend: dedicated page with CSV upload + grid editing. Data stored separately from planned allocations (Allocation table).

**Tech Stack:** Spring Boot 3.2.5 + JPA/Hibernate | React + TypeScript + TanStack Query | CSV parsing

---

## File Structure

### Backend (Create)
- `backend/src/main/java/com/pod/entity/ProjectActual.java` - Entity with JSONB map
- `backend/src/main/java/com/pod/entity/ConsumptionSource.java` - Enum (IMPORT | MANUAL)
- `backend/src/main/java/com/pod/repository/ProjectActualRepository.java` - JPA repository
- `backend/src/main/java/com/pod/service/ProjectActualService.java` - Business logic + CSV parsing
- `backend/src/main/java/com/pod/controller/ProjectActualController.java` - REST API
- `backend/src/main/resources/db/migration/V1_7__add_project_actuals_table.sql` - Database migration

### Frontend (Create)
- `frontend/src/types/index.ts` - Add ProjectActual types
- `frontend/src/api/actuals.ts` - API functions
- `frontend/src/components/modals/ImportActualsModal.tsx` - CSV import modal
- `frontend/src/components/actuals/ActualGrid.tsx` - Editable grid component
- `frontend/src/pages/projects/ProjectActuals.tsx` - Main page

### Frontend (Modify)
- `frontend/src/App.tsx` - Add route `/projects/actuals` and nav link

---

## Task 1: Backend - Database Migration

**Files:**
- Create: `backend/src/main/resources/db/migration/V1_7__add_project_actuals_table.sql`

- [ ] **Step 1: Write the migration**

```sql
-- V1_7__add_project_actuals_table.sql
CREATE TABLE project_actuals (
    id BIGSERIAL PRIMARY KEY,
    resource_id BIGINT NOT NULL REFERENCES resources(id),
    clarity_id VARCHAR(50) NOT NULL,
    project_name VARCHAR(200),
    monthly_data JSONB NOT NULL DEFAULT '{}',
    source VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    imported_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_project_actuals_resource_clarity UNIQUE (resource_id, clarity_id)
);

CREATE INDEX idx_project_actuals_clarity_id ON project_actuals(clarity_id);
```

- [ ] **Step 2: Run migration to verify**

Run: `cd backend && mvn flyway:migrate`
Expected: Migration applies successfully

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/db/migration/V1_7__add_project_actuals_table.sql
git commit -m "feat: add project_actuals table for consumption tracking"
```

---

## Task 2: Backend - Entity & Enum

**Files:**
- Create: `backend/src/main/java/com/pod/entity/ConsumptionSource.java`
- Create: `backend/src/main/java/com/pod/entity/ProjectActual.java`

- [ ] **Step 1: Create ConsumptionSource enum**

```java
// backend/src/main/java/com/pod/entity/ConsumptionSource.java
package com.pod.entity;

public enum ConsumptionSource {
    IMPORT,
    MANUAL
}
```

- [ ] **Step 2: Create ProjectActual entity**

```java
// backend/src/main/java/com/pod/entity/ProjectActual.java
package com.pod.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Entity
@Table(name = "project_actuals", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"resource_id", "clarity_id"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProjectActual {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resource_id", nullable = false)
    private Resource resource;

    @Column(name = "clarity_id", nullable = false, length = 50)
    private String clarityId;

    @Column(name = "project_name", length = 200)
    private String projectName;

    @Column(name = "monthly_data", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, BigDecimal> monthlyData = new HashMap<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "source", length = 20)
    @Builder.Default
    private ConsumptionSource source = ConsumptionSource.MANUAL;

    @Column(name = "imported_at")
    private Instant importedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
        if (monthlyData == null) monthlyData = new HashMap<>();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd backend && mvn compile -q`
Expected: Compiles without errors

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/pod/entity/ConsumptionSource.java backend/src/main/java/com/pod/entity/ProjectActual.java
git commit -m "feat: add ProjectActual entity and ConsumptionSource enum"
```

---

## Task 3: Backend - Repository

**Files:**
- Create: `backend/src/main/java/com/pod/repository/ProjectActualRepository.java`

- [ ] **Step 1: Create repository**

```java
// backend/src/main/java/com/pod/repository/ProjectActualRepository.java
package com.pod.repository;

import com.pod.entity.ProjectActual;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectActualRepository extends JpaRepository<ProjectActual, Long> {
    List<ProjectActual> findByClarityId(String clarityId);
    Optional<ProjectActual> findByResourceIdAndClarityId(Long resourceId, String clarityId);
    List<ProjectActual> findByResourceId(Long resourceId);
    void deleteByClarityId(String clarityId);
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && mvn compile -q`
Expected: Compiles without errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/pod/repository/ProjectActualRepository.java
git commit -m "feat: add ProjectActualRepository"
```

---

## Task 4: Backend - Service

**Files:**
- Create: `backend/src/main/java/com/pod/service/ProjectActualService.java`

- [ ] **Step 1: Create service with CSV parsing**

```java
// backend/src/main/java/com/pod/service/ProjectActualService.java
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
```

- [ ] **Step 2: Add findByExternalId to ResourceRepository**

```java
// Add to ResourceRepository.java
Optional<Resource> findByExternalId(String externalId);
```

- [ ] **Step 3: Add findByClarityId to ProjectRepository**

```java
// Add to ProjectRepository.java
Optional<Project> findByClarityId(String clarityId);
```

- [ ] **Step 4: Verify compilation**

Run: `cd backend && mvn compile -q`
Expected: Compiles without errors

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/pod/service/ProjectActualService.java
git add backend/src/main/java/com/pod/repository/ResourceRepository.java
git add backend/src/main/java/com/pod/repository/ProjectRepository.java
git commit -m "feat: add ProjectActualService with CSV import"
```

---

## Task 5: Backend - Controller

**Files:**
- Create: `backend/src/main/java/com/pod/controller/ProjectActualController.java`

- [ ] **Step 1: Create controller**

```java
// backend/src/main/java/com/pod/controller/ProjectActualController.java
package com.pod.controller;

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

@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
public class ProjectActualController {

    private final ProjectActualService projectActualService;

    @GetMapping("/{clarityId}/actuals")
    public ResponseEntity<List<ProjectActual>> getActuals(@PathVariable String clarityId) {
        return ResponseEntity.ok(projectActualService.getByClarityId(clarityId));
    }

    @PostMapping("/{clarityId}/actuals")
    public ResponseEntity<?> createOrUpdate(@PathVariable String clarityId, 
                                             @RequestBody Map<String, Object> payload) {
        try {
            Long resourceId = ((Number) payload.get("resourceId")).longValue();
            String projectName = (String) payload.getOrDefault("projectName", "");
            
            @SuppressWarnings("unchecked")
            Map<String, BigDecimal> monthlyData = (Map<String, BigDecimal>) payload.get("monthlyData");
            
            ProjectActual actual = projectActualService.upsert(
                resourceId, clarityId, projectName, 
                monthlyData, ConsumptionSource.MANUAL
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(actual);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{clarityId}/actuals/{id}")
    public ResponseEntity<?> delete(@PathVariable String clarityId, @PathVariable Long id) {
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
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && mvn compile -q`
Expected: Compiles without errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/pod/controller/ProjectActualController.java
git commit -m "feat: add ProjectActualController with REST endpoints"
```

---

## Task 6: Frontend - Types

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Add ProjectActual types**

```typescript
// Add to frontend/src/types/index.ts

export interface ProjectActual {
  id: number
  resourceId: number
  resource?: Resource
  clarityId: string
  projectName: string
  monthlyData: Record<string, number> // {"202512": 1.5, "202601": 2.0, ...}
  source: 'IMPORT' | 'MANUAL'
  importedAt?: string
  createdAt: string
  updatedAt: string
}

export interface ImportActualsResult {
  successCount: number
  errors: string[]
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat: add ProjectActual types"
```

---

## Task 7: Frontend - API Client

**Files:**
- Create: `frontend/src/api/actuals.ts`

- [ ] **Step 1: Create API functions**

```typescript
// frontend/src/api/actuals.ts
import client from './client'
import type { ProjectActual, ImportActualsResult } from '../types'

export async function getActualsByClarityId(clarityId: string): Promise<ProjectActual[]> {
  const response = await client.get<ProjectActual[]>(`/api/v1/projects/${clarityId}/actuals`)
  return response.data
}

export async function createOrUpdateActual(
  clarityId: string,
  data: {
    resourceId: number
    projectName: string
    monthlyData: Record<string, number>
  }
): Promise<ProjectActual> {
  const response = await client.post<ProjectActual>(`/api/v1/projects/${clarityId}/actuals`, data)
  return response.data
}

export async function deleteActual(clarityId: string, id: number): Promise<void> {
  await client.delete(`/api/v1/projects/${clarityId}/actuals/${id}`)
}

export async function importActuals(csvContent: string): Promise<ImportActualsResult> {
  const response = await client.post<ImportActualsResult>('/api/v1/projects/actuals/import', {
    csvContent,
  })
  return response.data
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/actuals.ts
git commit -m "feat: add actuals API client"
```

---

## Task 8: Frontend - Import Modal

**Files:**
- Create: `frontend/src/components/modals/ImportActualsModal.tsx`

- [ ] **Step 1: Create import modal**

```typescript
// frontend/src/components/modals/ImportActualsModal.tsx
import { useState, useCallback, useRef } from 'react'
import { FiUpload, FiCheck, FiAlertTriangle } from 'react-icons/fi'
import Modal from '../common/Modal'
import { importActuals } from '../../api/actuals'

interface ImportRow {
  externalId: string
  clarityId: string
  projectName: string
  dec: string
  jan: string
  feb: string
  mar: string
  apr: string
  may: string
  jun: string
  jul: string
  aug: string
  sep: string
  oct: string
  nov: string
  errors: string[]
}

interface ImportActualsModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

const MONTH_COLS = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']

function parseCSV(text: string): ImportRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const rows: ImportRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim())
    if (values.length < 4) continue

    const get = (header: string): string => {
      const idx = headers.indexOf(header)
      return idx >= 0 && idx < values.length ? values[idx] : ''
    }

    const errors: string[] = []
    if (!get('externalid')) errors.push('Missing externalId')
    if (!get('clarityid')) errors.push('Missing clarityId')

    rows.push({
      externalId: get('externalid'),
      clarityId: get('clarityid'),
      projectName: get('projectname'),
      dec: get('dec'),
      jan: get('jan'),
      feb: get('feb'),
      mar: get('mar'),
      apr: get('apr'),
      may: get('may'),
      jun: get('jun'),
      jul: get('jul'),
      aug: get('aug'),
      sep: get('sep'),
      oct: get('oct'),
      nov: get('nov'),
      errors,
    })
  }
  return rows
}

const sampleTemplate = `externalId,clarityId,projectName,Dec,Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov
EMP001,PRJ-001,Project Alpha,1.0,1.5,2.0,1.0,0.5,1.0,1.5,2.0,1.0,0.5,1.0,1.5
EMP002,PRJ-002,Project Beta,0.5,1.0,1.0,0.5,0.5,0.5,1.0,1.0,0.5,0.5,0.5,0.5`

export default function ImportActualsModal({ open, onClose, onSuccess }: ImportActualsModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'confirm'>('upload')
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)

  const handleFile = useCallback((text: string) => {
    const rows = parseCSV(text)
    setParsedRows(rows)
    setStep('preview')
  }, [])

  const handleConfirm = useCallback(async () => {
    setImporting(true)
    try {
      // Build CSV content from parsed rows
      const header = 'externalId,clarityId,projectName,' + MONTH_COLS.join(',')
      const dataRows = parsedRows
        .filter((r) => r.errors.length === 0)
        .map((r) =>
          [r.externalId, r.clarityId, r.projectName, r.dec, r.jan, r.feb, r.mar, r.apr, r.may, r.jun, r.jul, r.aug, r.sep, r.oct, r.nov].join(',')
        )
      const csvContent = [header, ...dataRows].join('\n')

      await importActuals(csvContent)
      onSuccess?.()
      handleReset()
      onClose()
    } catch (error) {
      console.error('Import failed:', error)
    } finally {
      setImporting(false)
    }
  }, [parsedRows, onSuccess, onClose])

  const handleReset = useCallback(() => {
    setStep('upload')
    setParsedRows([])
    setFileName('')
  }, [])

  const errorCount = parsedRows.filter((r) => r.errors.length > 0).length
  const validCount = parsedRows.length - errorCount

  const inputRef = useRef<HTMLInputElement>(null)

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => handleFile(ev.target?.result as string)
    reader.readAsText(file)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import Actual Consumption"
      size="xl"
      footer={
        step === 'upload' ? null : (
          <>
            <button
              onClick={() => {
                const blob = new Blob([sampleTemplate], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'actuals_import_template.csv'
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Download Template
            </button>
            <div className="flex gap-2">
              <button onClick={onClose} className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700">
                Close
              </button>
              {step === 'preview' && (
                <button
                  onClick={() => setStep('confirm')}
                  disabled={errorCount === parsedRows.length}
                  className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Confirm Import
                </button>
              )}
              {step === 'confirm' && (
                <button
                  onClick={handleConfirm}
                  disabled={importing}
                  className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {importing ? 'Importing...' : `Import ${validCount} Records`}
                </button>
              )}
            </div>
          </>
        )
      }
    >
      {step === 'upload' && (
        <div className="mx-6 rounded-xl border-2 border-dashed p-10 text-center">
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={onFileChange}
          />
          <FiUpload className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-700">Drop CSV file here or click to browse</p>
          <button
            onClick={() => inputRef.current?.click()}
            className="mt-2 text-sm text-primary-600 underline"
          >
            Click to upload
          </button>
        </div>
      )}

      {step === 'preview' && (
        <div className="mx-6">
          <div className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm ${
            errorCount > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
          }`}>
            {errorCount > 0 ? <FiAlertTriangle className="h-4 w-4" /> : <FiCheck className="h-4 w-4" />}
            <span>{validCount} of {parsedRows.length} rows parsed successfully</span>
          </div>
          <div className="mt-4 overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1">External ID</th>
                  <th className="px-2 py-1">Clarity ID</th>
                  <th className="px-2 py-1">Project</th>
                  <th className="px-2 py-1">Dec</th>
                  <th className="px-2 py-1">Jan</th>
                  <th className="px-2 py-1">Feb</th>
                  <th className="px-2 py-1">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {parsedRows.slice(0, 10).map((row, i) => (
                  <tr key={i} className={row.errors.length ? 'bg-red-50' : ''}>
                    <td className="px-2 py-1">{row.externalId}</td>
                    <td className="px-2 py-1">{row.clarityId}</td>
                    <td className="px-2 py-1">{row.projectName}</td>
                    <td className="px-2 py-1">{row.dec}</td>
                    <td className="px-2 py-1">{row.jan}</td>
                    <td className="px-2 py-1">{row.feb}</td>
                    <td className="px-2 py-1 text-red-500">{row.errors.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div className="mx-6">
          <div className="rounded-lg border bg-gray-50 px-4 py-3 text-sm">
            <p className="font-medium">Import Summary</p>
            <p>{validCount} records will be imported</p>
          </div>
        </div>
      )}
    </Modal>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npm run build 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/modals/ImportActualsModal.tsx
git commit -m "feat: add ImportActualsModal component"
```

---

## Task 9: Frontend - ActualGrid Component

**Files:**
- Create: `frontend/src/components/actuals/ActualGrid.tsx`

- [ ] **Step 1: Create editable grid**

```typescript
// frontend/src/components/actuals/ActualGrid.tsx
import { useState } from 'react'
import type { ProjectActual, Resource } from '../../types'

interface ActualGridProps {
  actuals: ProjectActual[]
  resources: Resource[]
  onSave: (resourceId: number, monthlyData: Record<string, number>) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onAddResource: (resourceId: number) => void
}

const MONTHS = [
  { key: '202512', label: 'Dec' },
  { key: '202601', label: 'Jan' },
  { key: '202602', label: 'Feb' },
  { key: '202603', label: 'Mar' },
  { key: '202604', label: 'Apr' },
  { key: '202605', label: 'May' },
  { key: '202606', label: 'Jun' },
  { key: '202607', label: 'Jul' },
  { key: '202608', label: 'Aug' },
  { key: '202609', label: 'Sep' },
  { key: '202610', label: 'Oct' },
  { key: '202611', label: 'Nov' },
]

export default function ActualGrid({ actuals, resources, onSave, onDelete, onAddResource }: ActualGridProps) {
  const [editData, setEditData] = useState<Record<number, Record<string, string>>>({})
  const [saving, setSaving] = useState<number | null>(null)

  const getValue = (actual: ProjectActual, monthKey: string): string => {
    return editData[actual.id]?.[monthKey] ?? String(actual.monthlyData[monthKey] ?? '')
  }

  const handleChange = (actualId: number, monthKey: string, value: string) => {
    setEditData((prev) => ({
      ...prev,
      [actualId]: {
        ...prev[actualId],
        [monthKey]: value,
      },
    }))
  }

  const handleSave = async (actual: ProjectActual) => {
    setSaving(actual.id)
    try {
      const monthlyData: Record<string, number> = {}
      MONTHS.forEach(({ key }) => {
        const val = getValue(actual, key)
        if (val !== '' && !isNaN(Number(val))) {
          monthlyData[key] = Number(val)
        }
      })
      await onSave(actual.resourceId, monthlyData)
      setEditData((prev) => {
        const next = { ...prev }
        delete next[actual.id]
        return next
      })
    } finally {
      setSaving(null)
    }
  }

  const hasChanges = (actual: ProjectActual): boolean => {
    return MONTHS.some(({ key }) => {
      const current = String(actual.monthlyData[key] ?? '')
      const edited = getValue(actual, key)
      return current !== edited && edited !== ''
    })
  }

  // Build rows from actuals + resources not yet added
  const actualsMap = new Map(actuals.map((a) => [a.resourceId, a]))
  const availableResources = resources.filter((r) => !actualsMap.has(r.id))

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Resource</th>
            {MONTHS.map(({ key, label }) => (
              <th key={key} className="px-2 py-2 text-center font-medium text-gray-600 w-20">
                {label}
              </th>
            ))}
            <th className="px-3 py-2 text-center font-medium text-gray-600 w-32">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {actuals.map((actual) => (
            <tr key={actual.id} className="hover:bg-gray-50">
              <td className="px-3 py-2">
                <div className="font-medium">{actual.resource?.name || 'Unknown'}</div>
                <div className="text-xs text-gray-500">{actual.resource?.externalId}</div>
              </td>
              {MONTHS.map(({ key }) => (
                <td key={key} className="px-1 py-1">
                  <input
                    type="number"
                    step="0.1"
                    value={getValue(actual, key)}
                    onChange={(e) => handleChange(actual.id, key, e.target.value)}
                    className="w-full rounded border border-gray-200 px-2 py-1 text-center text-sm"
                    placeholder="0"
                  />
                </td>
              ))}
              <td className="px-2 py-1 text-center">
                {hasChanges(actual) ? (
                  <button
                    onClick={() => handleSave(actual)}
                    disabled={saving === actual.id}
                    className="rounded bg-primary-600 px-2 py-1 text-xs text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    {saving === actual.id ? 'Saving...' : 'Save'}
                  </button>
                ) : (
                  <button
                    onClick={() => onDelete(actual.id)}
                    className="rounded text-red-600 hover:text-red-800 text-xs"
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
          {availableResources.length > 0 && (
            <tr className="bg-gray-50">
              <td className="px-3 py-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) onAddResource(Number(e.target.value))
                  }}
                  className="rounded border border-gray-200 px-2 py-1 text-sm"
                  defaultValue=""
                >
                  <option value="">+ Add Resource</option>
                  {availableResources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.externalId})
                    </option>
                  ))}
                </select>
              </td>
              <td colSpan={13} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npm run build 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/actuals/ActualGrid.tsx
git commit -m "feat: add ActualGrid component"
```

---

## Task 10: Frontend - Main Page

**Files:**
- Create: `frontend/src/pages/projects/ProjectActuals.tsx`

- [ ] **Step 1: Create main page**

```typescript
// frontend/src/pages/projects/ProjectActuals.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiUpload, FiAlertCircle } from 'react-icons/fi'
import { projectsApi } from '../../api/projects'
import { getActualsByClarityId, createOrUpdateActual, deleteActual } from '../../api/actuals'
import ImportActualsModal from '../../components/modals/ImportActualsModal'
import ActualGrid from '../../components/actuals/ActualGrid'
import type { Project, ProjectActual, Resource } from '../../types'
import { getResources } from '../../api/resources'

export default function ProjectActuals() {
  const queryClient = useQueryClient()
  const [selectedClarityId, setSelectedClarityId] = useState<string>('')
  const [importModalOpen, setImportModalOpen] = useState(false)

  // Fetch all projects for selector
  const { data: projectsData } = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: () => projectsApi.list({ page: 0, size: 500 }),
  })
  const projects: Project[] = projectsData?.data?.content || []

  // Fetch actuals for selected project
  const { data: actuals = [], isLoading: loadingActuals } = useQuery({
    queryKey: ['projectActuals', selectedClarityId],
    queryFn: () => getActualsByClarityId(selectedClarityId),
    enabled: !!selectedClarityId,
  })

  // Fetch all resources
  const { data: resourcesData } = useQuery({
    queryKey: ['resources', 'all'],
    queryFn: () => getResources({ page: 0, size: 500 }),
  })
  const resources: Resource[] = resourcesData?.content || []

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({ resourceId, monthlyData }: { resourceId: number; monthlyData: Record<string, number> }) => {
      const project = projects.find((p) => p.clarityId === selectedClarityId)
      await createOrUpdateActual(selectedClarityId, {
        resourceId,
        projectName: project?.name || '',
        monthlyData,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectActuals'] })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteActual(selectedClarityId, id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectActuals'] })
    },
  })

  // Add new resource
  const handleAddResource = async (resourceId: number) => {
    const emptyData: Record<string, number> = {}
    await saveMutation.mutateAsync({ resourceId, monthlyData: emptyData })
  }

  const selectedProject = projects.find((p) => p.clarityId === selectedClarityId)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Actuals</h1>
          <p className="text-sm text-gray-500">Track actual resource consumption vs budget</p>
        </div>
        <button
          onClick={() => setImportModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <FiUpload className="h-4 w-4" />
          Import CSV
        </button>
      </div>

      {/* Project Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Select Project:</label>
        <select
          value={selectedClarityId}
          onChange={(e) => setSelectedClarityId(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">-- Select Project --</option>
          {projects.map((p) => (
            <option key={p.id} value={p.clarityId}>
              {p.name} ({p.clarityId})
            </option>
          ))}
        </select>
      </div>

      {/* Summary Bar */}
      {selectedProject && (
        <div className="rounded-lg bg-gray-50 p-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Project</div>
            <div className="text-lg font-semibold">{selectedProject.name}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Budget</div>
            <div className="text-lg font-semibold">${selectedProject.budgetTotalK}K</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Total Actual HCM</div>
            <div className="text-lg font-semibold">
              {actuals.reduce((sum, a) => 
                sum + Object.values(a.monthlyData).reduce((s, v) => s + v, 0), 0
              ).toFixed(1)}
            </div>
          </div>
        </div>
      )}

      {/* Actual Grid */}
      {selectedClarityId && (
        <div>
          {loadingActuals ? (
            <div className="py-8 text-center text-gray-500">Loading...</div>
          ) : actuals.length === 0 && resources.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-gray-500">
              No data. Import a CSV or add resources manually.
            </div>
          ) : (
            <ActualGrid
              actuals={actuals}
              resources={resources}
              onSave={async (resourceId, monthlyData) => {
                await saveMutation.mutateAsync({ resourceId, monthlyData })
              }}
              onDelete={async (id) => {
                await deleteMutation.mutateAsync(id)
              }}
              onAddResource={handleAddResource}
            />
          )}
        </div>
      )}

      <ImportActualsModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['projectActuals'] })
          if (selectedClarityId) {
            // Trigger refresh
          }
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npm run build 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/projects/ProjectActuals.tsx
git commit -m "feat: add ProjectActuals page"
```

---

## Task 11: Frontend - Route & Navigation

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add route and import**

```typescript
// Add import
import ProjectActuals from './pages/projects/ProjectActuals'

// Add route
<Route path="/projects/actuals" element={<ProjectActuals />} />
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npm run build 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: add /projects/actuals route"
```

---

## Verification

1. Run backend compile: `cd backend && mvn compile -q`
2. Run frontend build: `cd frontend && npm run build`
3. Start backend: `cd backend && mvn spring-boot:run`
4. Start frontend: `cd frontend && npm run dev`
5. Navigate to `/projects/actuals`
6. Test import with sample CSV:
   ```csv
   externalId,clarityId,projectName,Dec,Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov
   EMP001,PRJ-001,Project Alpha,1.0,1.5,2.0,1.0,0.5,1.0,1.5,2.0,1.0,0.5,1.0,1.5
   ```
7. Verify data saved to database
8. Test manual edit - change HCM values and save
9. Verify comparison shows in summary bar

---

## Plan Complete

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?