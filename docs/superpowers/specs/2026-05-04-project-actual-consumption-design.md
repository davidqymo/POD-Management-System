# Project Actual Consumption - Design Specification

> **For agentic workers:** This spec defines the Project Actual Consumption feature. Use superpowers:writing-plans to create implementation plan.

**Goal:** Capture actual resource consumption per project for budget tracking, billing/revenue, and capacity planning. Data stored separately from planned allocations (Allocation table).

**Architecture:** New ProjectActual entity stores consumption data (resource/project/month in JSON). Frontend: dedicated page with upload + grid editing.

**Tech Stack:** Spring Boot 3.2.5 + JPA/Hibernate | React + TypeScript + TanStack Query | CSV parsing

---

## 1. Data Model

### 1.1 Entity: ProjectActual

```java
@Entity
@Table(name = "project_actuals", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"resource_id", "clarity_id"})
})
public class ProjectActual {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resource_id", nullable = false)
    private Resource resource;

    // Clarity ID - used as unique key instead of project_id
    @Column(name = "clarity_id", nullable = false, length = 50)
    private String clarityId;

    // Project name (denormalized for display)
    @Column(name = "project_name", length = 200)
    private String projectName;

    // JSON map: {"202512": 1.5, "202601": 2.0, ...}
    @Column(name = "monthly_data", columnDefinition = "jsonb")
    private Map<String, BigDecimal> monthlyData;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", length = 20)
    private ConsumptionSource source; // IMPORT | MANUAL

    @Column(name = "imported_at")
    private Instant importedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;
}
```

**Unique constraint**: One record per resource/project. Monthly data stored as JSONB map.

**Enum**: ConsumptionSource { IMPORT, MANUAL }

---

## 2. Backend API

### 2.1 REST Endpoints

| Method | Path                                              | Description                              |
| ------ | ------------------------------------------------- | ---------------------------------------- |
| GET    | /api/v1/projects/{clarityId}/actuals              | Get all actuals for a project            |
| GET    | /api/v1/projects/{clarityId}/actuals/{resourceId} | Get single resource's actual for project |
| POST   | /api/v1/projects/{clarityId}/actuals              | Create/update actual (manual)            |
| POST   | /api/v1/projects/actuals/import                   | Bulk import from CSV                     |
| DELETE | /api/v1/projects/{clarityId}/actuals/{id}         | Delete actual record                     |

### 2.2 Import CSV Format

```csv
externalId,clarityId,projectName,Dec,Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov
EMP001,PRJ-001,Project Alpha,1.0,1.5,2.0,1.0,0.5,1.0,1.5,2.0,1.0,0.5,1.0,1.5
EMP002,PRJ-001,Project Alpha,0.5,1.0,1.0,0.5,0.5,0.5,1.0,1.0,0.5,0.5,0.5,0.5
```

- **Dec-Nov**: 12 months of financial year (Dec = 202512, Jan = 202601, etc.)
- **HCM values**: Decimal (e.g., 1.5 = 1.5 HCM = 216 hours)
- **Parse logic**: Look up Resource by externalId, look up Project by clarityId (auto-create if not exists)
- **On conflict**: Replace existing monthly data for (resource, project)

### 2.3 Service Layer

**ProjectActualService**:

- `importFromCSV(csvContent)`: Parse CSV, validate resources/projects, save all
- `getByProject(projectId)`: Return all ProjectActual for project with resource details
- `upsert(resourceId, projectId, monthlyData)`: Create or update record
- `delete(id)`: Remove actual record

---

## 3. Frontend

### 3.1 New Page: Project Actuals

**Route**: `/projects/actuals` or `/actuals`

**Components**:

1. **ProjectSelector**: Dropdown to select project
2. **UploadButton**: Opens import modal
3. **SummaryBar**: Shows total actual HCM vs budget (from project.budgetTotalK / rate)
4. **ActualGrid**: Editable table of resources × months

### 3.2 Import Modal

Reuse/extend existing ImportModal pattern:

- **Step 1**: Upload CSV file
- **Step 2**: Preview parsed data (show validation errors)
- **Step 3**: Confirm import

**Template**:

```csv
externalId,clarityId,projectName,Dec,Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov
EMP001,PRJ-001,Project Alpha,1.0,1.5,2.0,1.0,0.5,1.0,1.5,2.0,1.0,0.5,1.0,1.5
```

### 3.3 ActualGrid Component

- **Rows**: Resources allocated to the selected project (from Allocation table)
- **Columns**: Month headers (Dec, Jan, Feb... Nov)
- **Cells**: Editable input field for HCM value
- **Actions**: Add row (select resource), Save button, Delete row

### 3.4 Comparison View

- Fetch ProjectActual data + Allocation data for the project
- Calculate:
  - Total Actual HCM = sum of all ProjectActual.monthlyData
  - Total Planned HCM = sum of all Allocation.hours / 144
  - Variance = Actual - Planned

---

## 4. Key Files to Create/Modify

### Backend (Create)

- `entity/ProjectActual.java`
- `repository/ProjectActualRepository.java`
- `service/ProjectActualService.java`
- `controller/ProjectActualController.java`
- `dto/request/ImportActualsRequest.java`
- `V1_7__add_project_actuals_table.sql`

### Frontend (Create)

- `pages/projects/ProjectActuals.tsx` - Main page
- `components/modals/ImportActualsModal.tsx` - Import modal
- `components/actuals/ActualGrid.tsx` - Editable grid
- `api/actuals.ts` - API functions
- `types/index.ts` - Add ProjectActual type

### Frontend (Modify)

- `App.tsx` - Add nav link

---

## 5. Testing

- Backend: Unit test ProjectActualService (import parsing, CRUD)
- Frontend: Test import parsing, grid editing
- E2E: Upload CSV, verify data saved, edit manually, verify changes

---

## 6. Open Questions (Deferred)

1. **Auto-create projects**: Should import auto-create projects if clarityId doesn't exist? (Configurable)
2. **Fiscal year**: Assume Dec-Nov current fiscal year. Future: allow fiscal year selection.
3. **Rate conversion**: Display actual cost (HCM × rate) vs budget (K USD). Need to fetch applicable rate.
