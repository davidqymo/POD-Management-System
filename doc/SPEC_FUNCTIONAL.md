# System Functional Specification — POD Team Management System

**PRD Version:** 1.5
**Spec Version:** 1.0
**Date:** 2026-04-19
**Status:** Draft — Ready for Review
**Traceability:** All requirements traceable to `doc/PRODUCT_REQUIREMENTS.md` sections

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [User Roles & Personas](#2-user-roles--personas)
3. [Module 1 — Resource Management](#3-module-1--resource-management)
4. [Module 2 — Project Management](#4-module-2--project-management)
5. [Module 3 — Resource Allocation & Monitoring](#5-module-3--resource-allocation--monitoring)
6. [Module 4 — Actual Consumption Tracking (Phase 2)](#6-module-4--actual-consumption-tracking-phase-2)
7. [Module 5 — Supply & Demand Dashboard](#7-module-5--supply--demand-dashboard)
8. [Module 6 — Notification & Alerting System](#8-module-6--notification--alerting-system)
9. [Cross-Cutting Concerns](#9-cross-cutting-concerns)
10. [Error Handling & UX Response Matrix](#10-error-handling--ux-response-matrix)
11. [Acceptance Criteria Traceability](#11-acceptance-criteria-traceability)

---

## 1. Introduction

This System Functional Specification (SFS) translates the Product Requirements Document (PRD v1.5) into detailed functional behavior specifications for engineering implementation. It describes **what the system does** from an end-user and system interaction perspective.

**Scope:** Phase 1 MVP includes Modules 1–3 (Resource, Project, Allocation), Module 5 Dashboard (Core KPIs), and Module 6 Notifications. Module 4 (Actual Consumption) is Phase 2.

**Document Structure:** Each module section contains:
- **Use Cases** — user goals expressed as "As a [role], I want to..."
- **User Flows** — step-by-step interaction sequences
- **Input/Output Specifications** — field-level definitions, validation rules
- **Business Rules** — enforceable logic with trigger conditions
- **State Transition Diagrams** — ASCII state machines for key entities
- **Error Conditions** — anticipated failure modes and system responses
- **Acceptance Criteria Mapping** — links to PRD Section 9 checkboxes

---

## 2. User Roles & Personas

### 2.1 Role Matrix

| Role | Primary Modules | Key Permissions | Frequency |
|------|----------------|-----------------|-----------|
| **Project Manager (PM)** | Project, Allocation (submit) | Create/edit projects, submit allocations, view dashboard, clone templates | Daily |
| **POD Manager** | Allocation (approve), Resource (status), Dashboard | Approve/reject any allocation, change resource status, view all projects, simulate auto-allocate | Daily |
| **Admin** | Resource, Rate, Holiday, Audit, all CRUD | Full CRUD on all entities, import/export, audit log viewer, soft delete override | Weekly/Sporadic |
| **Viewer** | Read-only Dashboard, Projects, Resources | View-only; no edits; no approval | As needed |

### 2.2 Persona Examples

**Persona: Sarah — Project Manager**
- **Goals:** Plan project activities, staff resources, track budget burn
- **Workflows:** Creates project → adds activities → submits allocations → monitors variance
- **Pain points:** Unclear capacity, slow approval cycles, budget surprises
- **Success metrics:** Allocations approved within 48h; projects within budget; no rework due to constraint violations

**Persona: Michael — POD Manager**
- **Goals:** Balance team workload, approve assignments, control costs
- **Workflows:** Reviews pending allocations daily → approves/rejects → adjusts resource status (on leave/termination) → runs auto-allocation for backlog
- **Pain points:** Over-allocated resources, rate surprises, 5-project cap violations
- **Success metrics:** Team utilization 85–95%; OT < 36h/month per resource; no budget overruns

**Persona: Lisa — Admin**
- **Goals:** Maintain master data, audit system state
- **Workflows:** Bulk import resources/rates, manage holiday calendars, review audit log, handle soft-delete exceptions
- **Pain points:** Duplicate data entry, untracked changes, manual reconciliation
- **Success metrics:** Data import errors < 1%; audit trail complete for all mutations

---

## 3. Module 1 — Resource Management

**PRD Reference:** Section 2.1, 2.2, 2.3, 2.X

### 3.1 Use Cases

**UC-RM-01: Create Resource (Admin)**
- **Actor:** Admin
- **Description:** Add a new staff member to the system
- **Preconditions:** Cost Center exists; external_id unique
- **Postconditions:** Resource record created with `is_active = true`
- **Primary Flow:**
  1. Admin navigates to Resources page → clicks "Add Resource"
  2. Enters: external_id (immutable), name, cost_center (dropdown), billable_team_code, category, skill (tag), level (number), is_billable toggle
  3. Clicks Save
  4. System validates: external_id not duplicate; all required fields present
  5. Resource created; success toast "Resource David Chen created (HCM-1001)"
- **Alternate Flow A (CSV Bulk Import):** See UC-RM-03
- **Error Paths:** Duplicate external_id → ERROR_DUPLICATE_KEY; invalid cost_center → ERROR_INVALID_FOREIGN_KEY

**UC-RM-02: View Resource Detail**
- **Actor:** Any authenticated user
- **Description:** View resource profile, current allocations, rate history
- **Primary Flow:**
  1. User clicks resource row in list
  2. System displays: Resource info (name, skill, level, CC, BTC), current rate (if active), allocation calendar (weekly breakdown by project), status history
  3. If `status = on_leave`: allocations shown but dimmed, tooltip "Paused — on leave"
  4. If `status = terminated`: allocations frozen, marked "FROZEN"

**UC-RM-03: Import Resources via CSV (Admin)**
- **Actor:** Admin
- **Preconditions:** CSV file meets schema (required columns: external_id, name, cost_center_id, billable_team_code, category; optional: skill, level, is_billable)
- **Primary Flow:**
  1. Admin clicks "Import Resources" → downloads template
  2. Uploads CSV → system parses and runs **preview validation** (all rows checked without DB write)
  3. Preview screen shows:
     - Total rows: 150
     - Valid: 148
     - Errors: 2 (expandable list)
  4. If errors exist and mode = BATCH_CREATE: "Import blocked — fix errors and retry"
  5. If no errors or mode = UPSERT: "Confirm import" button appears
  6. Admin confirms → system commits (BATCH_CREATE: all-or-nothing; UPSERT: row-by-row)
  7. On completion: summary toast "148 resources imported. Batch ID: 20260419-xxxxx" + download link to error report (if any)
- **Error Report Format:** See PRD Appendix D
- **Batch Create Mode (Phase 1):** All rows must pass validation or zero commit
- **Upsert Mode (Phase 2):** Valid rows commit; invalid rows skipped with per-row error

**UC-RM-04: Export Resources & Related Data via CSV (Admin)**
- **Actor:** Admin
- **Preconditions:** User authenticated as Admin; filters selected
- **Primary Flow (Export Resource List + Latest Rate):**
  1. Admin navigates to Resources page → clicks "Export CSV"
  2. Modal presents export options:
     - **Data type:** Resources only / Resources + Latest Rates / Resources + Rate History
     - **Date range:** All time / Specific range (for rate history)
     - **Fields:** Select columns to include (checkboxes: external_id, name, cost_center, billable_team_code, category, skill, level, status, latest_rate_K, hire_date, end_date)
  3. Admin selects "Resources + Latest Rates" and date range "All"
  4. Clicks "Generate Export"
  5. System:
     - Executes query joining resources with LATERAL subquery to fetch most recent active rate per resource
     - Streams CSV to response with filename: `resources_export_YYYY-MM-DD_HHMM.csv`
     - Includes BOM (Byte Order Mark) for Excel compatibility
  6. Browser downloads file automatically
- **Primary Flow (Export Allocations):**
  1. Admin navigates to Allocations → "Export All"
  2. Filters: Project (multi-select), Date range (presets: Current month, Last 3 months, Custom)
  3. System includes: Project name, Activity name, Resource name, Week start date (YYYY-MM-DD), Hours, Hourly rate K, Cost K, Status
  4. Filename: `allocations_export_YYYY-MM-DD_HHMM.csv`
- **Primary Flow (Export Audit Log):**
  1. Admin navigates to Audit Log → "Export"
  2. Optional filters: Entity type (resource/project/allocation/rate), Date range, User
  3. Includes columns: timestamp, entity_type, entity_id, field_name, old_value, new_value, changed_by_user_id, change_reason
  4. Filename: `audit_log_export_YYYY-MM-DD_HHMM.csv`
  5. Max rows per export: 100,000 (pagination enforced)
- **Error Paths:** Export timeout → "Export too large; narrow filters"; Permission denied → "Admin role required"
- **Export Format:** UTF-8 with header row; timestamps in ISO 8601 (`YYYY-MM-DD HH:MM:SSZ`); decimal separator `.`

**UC-RM-05: Update Resource Status (Admin/POD Manager)**
- **Actor:** Admin or POD Manager
- **Description:** Change resource from `active` → `on_leave` or `terminated`
- **Preconditions:** Resource is active; user has Admin or POD Manager role
- **Primary Flow:**
  1. User opens resource detail → clicks "Change Status"
  2. Selects new status from dropdown
  3. Modal requires: **Reason** (required text field, min 10 chars)
  4. Clicks Confirm
  5. System:
     - Updates `is_active` (if terminated) or `status` field (if on_leave — new enum field TBD)
     - Logs audit event: `(resource_id, field='status', old='active', new='on_leave', reason, changed_by=user)`
     - If `on_leave`: sets all `PENDING` allocations to `REJECTED` with reason "Resource on leave"; `APPROVED` allocations remain but capacity freed
     - If `terminated`: rejects all pending allocations; freezes approved allocations (audit-retained, not editable)
  6. Success toast: "Resource marked on leave — 3 pending allocations auto-rejected"
- **Audit Requirement:** Every status change must record who, when, and why (reason mandatory)

### 3.2 Entity Lifecycles

**Resource Lifecycle State Diagram:**

```
    ┌─────────┐
    │  Active │ ← Default on create
    └────┬────┘
         │ status change (Admin/POD Manager)
         ▼
    ┌─────────┐
    │On Leave │ ← Allocations PAUSED; capacity freed
    └────┬────┘   Can return to Active
    ▲    │
    │    │ status change back to active
    │    ▼
    │ ┌─────────┐
    │ │ Active │
    │ └─────────┘
    │
    │ status change (Admin only, irreversible)
    ▼
┌───────────┐
│Terminated │ ← All allocations FROZEN; no further edits
└───────────┘   Terminal state
```

**Rate History Continuity:**
- Rates stored as contiguous monthly periods with no gaps, no overlaps
- Old rates marked `is_active = false` but **never deleted** (historical cost calculation requires them)
- Each month has exactly one active rate per (Cost Center, Billable Team Code) pair

### 3.3 Entity Field Specifications

**Resource Entity:**

| Field | Type | Constraints | Source | Notes |
|-------|------|-------------|--------|-------|
| `id` | Long (PK) | `@Id @GeneratedValue` | System | Internal DB primary key |
| `externalId` | String(50) | `UNIQUE NOT NULL` | HR system | **Immutable**; external employee ID (e.g., EMP-001) |
| `name` | String(200) | `NOT NULL` | User entry | Full name |
| `costCenterId` | String(20) FK | `NOT NULL` | Dropdown | References `cost_centers.id` |
| `billableTeamCode` | String(20) | `NOT NULL` | User entry | Billing team/client code |
| `category` | Enum | `NOT NULL` | Dropdown: `CONTRACTOR`, `PERMANENT` | JPA `@Enumerated(STRING)` |
| `skill` | String(100) | `NULLABLE` | Tag input | Indexed for filtering; future FK to skill_lookup |
| `level` | Integer | `1–10` range | Numeric input | Sortable; used for cost tiering |
| `isBillable` | Boolean | `DEFAULT TRUE` | Checkbox | False = internal/overhead (non-billable resource) |
| `status` | Enum | `NOT NULL` | Dropdown | `ACTIVE`, `ON_LEAVE`, `TERMINATED` |
| `isActive` | Boolean | `NOT NULL DEFAULT TRUE` | System | Soft delete flag |
| `version` | Integer | `@Version` | System | Optimistic locking |
| `createdAt`, `updatedAt` | `OffsetDateTime` | `NOT NULL` | System | Auditing @PrePersist/@PreUpdate |

**Rate Entity:**

| Field | Type | Constraints | Source | Notes |
|-------|------|-------------|--------|-------|
| `id` | Long (PK) | `@Id @GeneratedValue` | System | Internal DB primary key |
| `costCenterId` | String(20) FK | `NOT NULL` | Dropdown | References `cost_centers.id` |
| `billableTeamCode` | String(20) | `NOT NULL` | User entry | Billing code (paired with CC for rate lookup) |
| `monthlyRateK` | BigDecimal(10,2) | `NOT NULL` | User entry | Monthly rate in **K USD** (e.g., 14.40 = $14,400/month) |
| `effectiveFrom` | `YearMonth` | `NOT NULL` | User entry | Month this rate applies (YYYY-MM format; stored as first of month) |
| `effectiveTo` | `YearMonth` | `NULLABLE` | System | Auto-calculated on next rate insertion (`next_rate.effectiveFrom - 1 month`) |
| `isBillable` | Boolean | `DEFAULT TRUE` | Checkbox | False = discounted/internal rate |
| `status` | Enum | `NOT NULL` | System | `ACTIVE`, `DRAFT`, `CLOSED` |
| `isActive` | Boolean | `NOT NULL DEFAULT TRUE` | System | Soft delete flag |
| `createdAt`, `updatedAt` | `OffsetDateTime` | `NOT NULL` | System | Auditing |

**Project Entity:**

| Field | Type | Constraints | Source | Notes |
|-------|------|-------------|--------|-------|
| `id` | Long (PK) | `@Id @GeneratedValue` | System | |
| `requestId` | String(50) | `NULLABLE` | PM | Early-phase reference number |
| `billableProductId` | String(50) | `NULLABLE` | PM | Budget confirmation reference |
| `clarityId` | String(50) | `NULLABLE` | PM | Actual charging reference |
| `name` | String(200) | `NOT NULL` | PM | Project name |
| `description` | Text | `NULLABLE` | PM | |
| `budgetK` | BigDecimal(12,2) | `NOT NULL` | PM | Total project budget in **K USD** |
| `budgetMonthlyBreakdown` | JSONB | `NULLABLE` | PM | Optional monthly caps: `{"202604": 40.0, "202605": 60.0}` |
| `plannedStartDate` | LocalDate | `NOT NULL` | PM | |
| `plannedEndDate` | LocalDate | `NOT NULL` | PM | |
| `actualStartDate` | LocalDate | `NULLABLE` | System | |
| `actualEndDate` | LocalDate | `NULLABLE` | System | |
| `status` | Enum | `NOT NULL` | System | `REQUESTED`, `BUDGET_ESTIMATING`, `BUDGET_APPROVED`, `EXECUTING`, `ON_HOLD`, `COMPLETED`, `CANCELLED` |
| `isActive` | Boolean | `NOT NULL DEFAULT TRUE` | System | Soft delete flag |
| `version` | Integer | `@Version` | System | Optimistic locking |
| `createdBy` | Long FK | `NOT NULL` | System | User ID of creator |
| `createdAt`, `updatedAt` | `OffsetDateTime` | `NOT NULL` | System | |

**Activity Entity:**

| Field | Type | Constraints | Source | Notes |
|-------|------|-------------|--------|-------|
| `id` | Long (PK) | `@Id @GeneratedValue` | System | |
| `projectId` | Long FK | `NOT NULL` | PM | References `projects.id` |
| `name` | String(200) | `NOT NULL` | PM | Activity name (e.g., "SIT Execution") |
| `description` | Text | `NULLABLE` | PM | |
| `plannedStartDate` | LocalDate | `NOT NULL` | PM | |
| `plannedEndDate` | LocalDate | `NOT NULL` | PM | |
| `actualStartDate` | LocalDate | `NULLABLE` | PM | |
| `actualEndDate` | LocalDate | `NULLABLE` | PM | |
| `isMilestone` | Boolean | `DEFAULT FALSE` | PM | Signoff/checkpoint activity |
| `milestoneStatus` | Enum | `NULLABLE` | PM | Only if `isMilestone=true`: `PENDING`, `IN_PROGRESS`, `SIGNED_OFF` |
| `estimatedHours` | BigDecimal(5,2) | `NULLABLE` | PM | Initial estimate |
| `sequence` | Integer | `NOT NULL` | System | Display order within project |
| `isActive` | Boolean | `NOT NULL DEFAULT TRUE` | System | Soft delete flag |
| `createdAt`, `updatedAt` | `OffsetDateTime` | `NOT NULL` | System | |

**Allocation Entity:**

| Field | Type | Constraints | Source | Notes |
|-------|------|-------------|--------|-------|
| `id` | Long (PK) | `@Id @GeneratedValue` | System | |
| `resourceId` | Long FK | `NOT NULL` | PM | References `resources.id` |
| `projectId` | Long FK | `NOT NULL` | PM | |
| `activityId` | Long FK | `NULLABLE` | PM | References `activities.id`; nullable if unassigned |
| `weekStartDate` | LocalDate | `NOT NULL` | PM | Monday date of allocation week |
| `hours` | BigDecimal(5,2) | `NOT NULL` | PM | Weekly hours (min 0.1 HCM = 14.4h) |
| `status` | Enum | `NOT NULL` | System | `PENDING`, `APPROVED`, `REJECTED`, `LOCKED` |
| `version` | Integer | `@Version` | System | Optimistic locking |
| `approvedByUserId` | Long FK | `NULLABLE` | POD Manager | User ID of approver |
| `approvedAt` | `OffsetDateTime` | `NULLABLE` | System | |
| `rejectionReason` | String(500) | `NULLABLE` | POD Manager | Required when rejecting |
| `notes` | Text | `NULLABLE` | PM | Optional allocation notes |
| `isActive` | Boolean | `NOT NULL DEFAULT TRUE` | System | Soft delete flag |
| `createdAt`, `updatedAt` | `OffsetDateTime` | `NOT NULL` | System | |

**Holiday Entity:**

| Field | Type | Constraints | Source | Notes |
|-------|------|-------------|--------|-------|
| `id` | Long (PK) | `@Id @GeneratedValue` | System | |
| `name` | String(200) | `NOT NULL` | Admin | e.g., "Global Corporate Holidays 2026" |
| `costCenterId` | String(20) FK | `NULLABLE` | Admin | If null = global holiday; else CC-specific |
| `holidayDate` | LocalDate | `NOT NULL` | Admin | Calendar date |
| `description` | String(500) | `NULLABLE` | Admin | e.g., "New Year's Day" |
| `createdByUserId` | Long FK | `NOT NULL` | System | Admin who created |
| `isActive` | Boolean | `NOT NULL DEFAULT TRUE` | System | |
| `createdAt`, `updatedAt` | `OffsetDateTime` | `NOT NULL` | System | |

**User Entity (Authentication & Authorization):**

| Field | Type | Constraints | Source | Notes |
|-------|------|-------------|--------|-------|
| `id` | Long (PK) | `@Id @GeneratedValue` | System | |
| `email` | String(255) | `UNIQUE NOT NULL` | Auth | Login identifier |
| `displayName` | String(200) | `NOT NULL` | User | Full display name |
| `roles` | JSONB (List<String>) | `NOT NULL DEFAULT '["VIEWER"]'` | Admin | Array of roles: `ADMIN`, `PM`, `POD_MANAGER`, `VIEWER` |
| `resourceId` | Long FK | `NULLABLE UNIQUE` | Admin | Links to `resources.id` (optional 1:1) |
| `isActive` | Boolean | `NOT NULL DEFAULT TRUE` | System | |
| `createdAt`, `updatedAt` | `OffsetDateTime` | `NOT NULL` | System | | 

**Note on Allocation Override Semantics:** New allocation for same `(resource_id, project_id, week_start_date)` replaces (does NOT accumulate) existing allocation. Last-write-wins. Unique constraint on `(resource_id, project_id, week_start_date)` where `is_active = true AND status IN ('PENDING','APPROVED','LOCKED')` ensures single active allocation per resource/week/project combination.

### 3.4 Rate Management APIs

**Rate entity lifecycle** is tightly coupled to Resource management; rates are defined per `(cost_center_id, billable_team_code)` and apply to all resources in that CC/BTC combination.

**UC-RM-06: Create New Rate (Admin)**
- **Actor:** Admin
- **Preconditions:** No overlapping active rate exists for same `(cost_center_id, billable_team_code)`; `effective_from` is first day of month in `YYYY-MM` format (e.g., "2026-04")
- **Primary Flow:**
  1. Admin navigates to **Rates** page → "Add Rate"
  2. Enters: `cost_center_id` (dropdown), `billable_team_code` (dropdown), `monthly_rate_K` (decimal, e.g., 14.40), `effective_from` (YYYY-MM date picker), `is_billable` checkbox
  3. Clicks "Save"
  4. System:
     - Acquires **pessimistic lock** on any currently active rate for same `(CC, BTC)` (prevents concurrent creation)
     - Validates: New `effective_from` must be exactly one month after the existing active rate's `effective_from` (contiguous sequence check)
     - If active rate exists: Sets `effective_to = newRate.effectiveFrom.minusMonths(1)` on the previous rate
     - Inserts new rate with `effective_to = NULL` (open-ended until next rate closes it)
  5. Success: "Rate created for CC-TECH / DEV-001 effective 2026-04 ($14.40K/mo)"
- **Error Paths:**
  - Overlap detected → `409 CONFLICT` error "Rate period overlaps existing rate for CC-TECH/DEV-001 (2026-03 to 2026-04)"
  - Gap detected (non-contiguous) → `409 CONFLICT` error "Rate gap: current rate ends 2026-02; new rate must start 2026-03"
  - Duplicate key (same month) → `409 CONFLICT` error "Rate already exists for month 2026-04"
- **DB Constraint:** Unique partial index on `(cost_center_id, billable_team_code, effective_from)` WHERE `is_active = true` prevents duplicate active periods.

**UC-RM-07: View Rate History (Any authenticated user)**
- **Primary Flow:**
  1. User visits Resource Detail page → "Rate History" tab
  2. System displays timeline: table with `effective_from` → `effective_to` date ranges and `monthly_rate_K` values
  3. Active rate highlighted with "CURRENT" badge
  4. Rate changes can be graphed in "Chart view"
- **Backend Query (Rate Lookup for a specific month):**
  ```java
  @Query("SELECT r FROM Rate r WHERE r.costCenterId = :cc AND r.billableTeamCode = :btc " +
         "AND r.effectiveFrom <= :targetMonth AND (r.effectiveTo IS NULL OR r.effectiveTo >= :targetMonth) " +
         "ORDER BY r.effectiveFrom DESC")
  Optional<Rate> findActiveRate(@Param("cc") String cc, @Param("btc") String btc, @Param("targetMonth") YearMonth month);
  ```

**UC-RM-08: Edit Rate (Admin)**
- **Allowed edits:** Only `monthly_rate_K` and `is_billable` flag. `effective_from` is immutable after creation.
- **Preconditions:** Rate is in `DRAFT` status or within 7 days of creation; `effective_from` date is in future (pre-effective rate)
- **Primary Flow:**
  1. Admin clicks rate row → "Edit"
  2. Modifies rate value or billable flag
  3. System validates: rate not yet effective (past-effective rates immutable for audit)
  4. Update committed; audit event logged: `RATE_UPDATED {field: 'monthly_rate_K', old: 14.40, new: 15.20}`
- **Error Paths:** Editing past-effective rate → `403 FORBIDDEN` error "Rate already effective; create new rate for future period instead"
- **Note:** Rate changes never delete old values — full history retained with `is_active = false` for historical costing.

**UC-RM-09: Archive/Deactivate Rate (Admin)**
- **Purpose:** Retire a rate before its natural closure (e.g., contract ended early)
- **Preconditions:** Rate is currently `ACTIVE`; no future-dated rates depend on this one's closure
- **Primary Flow:**
  1. Admin selects rate → "Archive"
  2. System prompts: "Archiving this rate will close it effective immediately. Future months will have no active rate until new rate is added. Continue?"
  3. Admin confirms → system:
     - Sets `effective_to = current_month - 1` (i.e., last month)
     - Sets `is_active = false`
     - Creates `RATE_ARCHIVED` audit event with reason
  4. Success toast: "Rate archived; effective through last month"
- **Validation:** System prevents archiving if it would create a gap overlapping next rate's `effective_from`. In such case, admin must create successor rate first.

---

## 4. Module 2 — Project Management

---

## 4. Module 2 — Project Management

**PRD Reference:** Section 2.5–2.7, 2.8

### 4.1 Use Cases

**UC-PM-01: Create Project (PM)**
- **Actor:** Project Manager
- **Preconditions:** User authenticated as PM or Admin
- **Primary Flow:**
  1. PM clicks "New Project"
  2. Enters:
     - `name` (required)
     - `request_id` (optional intake reference)
     - `billable_product_id` (optional)
     - `clarity_id` (optional, filled when project executes)
     - `budget_K` (required, decimal K USD)
     - `budget_monthly_breakdown` (optional JSON: `{"202604": 40.0, "202605": 60.0}`)
     - `start_date`, `end_date` (required)
  3. System sets initial `status = REQUESTED`
  4. With first save → creates **Project Version 1** in audit log
  5. Success: redirect to Project Detail
- **Validation:** `end_date >= start_date + 7 days`; `budget_K > 0`

**UC-PM-02: Add Activities to Project (PM)**
- **Actor:** Project Manager
- **Preconditions:** Project exists in `REQUESTED` or `APPROVED` or `ACTIVE` status
- **Primary Flow:**
  1. PM opens Project Detail → "Activities" tab → "Add Activities"
  2. Bulk entry mode: CSV-style grid or JSON import
     - Required per activity: `name`, `sequence` (display order), `estimated_hours`, `planned_start_date`, `planned_end_date`
     - Optional: `is_milestone (bool)`, `milestone_status (PENDING/COMPLETED/BLOCKED)`
  3. Clicks "Create All"
  4. System **validates no circular dependencies** before commit:
     - For each activity's `depends_on` list, check that dependency graph is acyclic
     - If cycle detected: reject entire batch, return error: "Cycle detected: Activity C depends on A which depends on B which depends on C"
  5. If valid: create all Activity records; success toast "5 activities created"
- **Dependency Representation:** M:N self-referential through `activity_dependencies` join table (PRD Section 2.6)

**UC-PM-03: View Gantt Chart (PM, POD Manager)**
- **Actor:** Any user with project read access
- **Preconditions:** Project has ≥1 activity
- **Primary Flow:**
  1. User opens Project Detail → "Schedule" tab
  2. System renders Gantt using Frappe library:
     - Horizontal time axis (auto-scale based on project duration: weeks for <3mo, months for >3mo)
     - One row per activity
     - Bar width = activity duration; bar position = start date
     - Milestone = diamond symbol
     - Color by status: Gray (Not Started), Blue (In Progress), Green (Completed), Orange (On Hold)
  3. System computes **critical path** via forward/backward pass:
     - For each activity: `ES` (earliest start), `EF` (earliest finish), `LS` (latest start), `LF` (latest finish)
     - `Float = LS - ES`; Float = 0 → critical
  4. Critical path activities get **red border**
  5. Hovering bar shows tooltip: `{name} | {start}–{end} | Float: {N} days`
  6. Gantt updates automatically when underlying activity data changes (real-time subscription or poll every 30s)

**UC-PM-04: Transition Project to Terminal State (PM → Admin for COMPLETED)**
- **Actor:** Project Manager (for CANCELLED) or Admin (for COMPLETED terminal freeze)
- **Preconditions:** Project must be in `EXECUTING` or `ON_HOLD` status; all pending allocations must be approved or rejected first (no PENDING allocations allowed)
- **Primary Flow (Complete Project):**
  1. Admin opens Project Detail → "Complete Project" action
  2. System prompts: "Completing this project will:
     - Set project status to `COMPLETED`
     - Set `is_active = false` (hidden from default dashboard)
     - Lock all allocations (any status) to `LOCKED` — no further edits allowed
     - Freeze budget; final actuals recorded separately (Phase 2)
     Continue?"
  3. Admin confirms → system:
     - Updates `projects.status = 'COMPLETED'`
     - Sets `projects.is_active = false`
     - Updates all allocations for this project: `SET status = 'LOCKED', is_active = false WHERE project_id = ?`
     - Audit log: `PROJECT_COMPLETED` event with timestamp and user
     - Emits notification to all stakeholders (PM, POD Manager, Admin)
  4. Success: "Project Phoenix marked COMPLETED — allocations locked; budget finalized"
- **Primary Flow (Cancel Project):**
  1. PM or Admin opens Project Detail → "Cancel Project"
  2. System prompts: "Cancelling will freeze all allocations permanently. Continue?"
  3. Confirmation → system:
     - `projects.status = 'CANCELLED'`
     - `projects.is_active = false`
     - All allocations `LOCKED` (including APPROVED and any residual PENDING → REJECTED)
  4. Success: "Project cancelled; allocations locked"
- **Post-Conditions:** Terminal projects are read-only; no create/update/delete operations allowed on project or its allocations
- **Error:** Attempting to edit locked project → `403 FORBIDDEN` with error code `PROJECT_TERMINAL_IMMUTABLE`
- **DB Enforcement:** Application-level guard interceptor checks `project.isActive` before any mutation endpoint

**UC-PM-05: Re-activate Project within 30-day undo window (Admin)**
- **Actor:** Admin only
- **Preconditions:** Project was transitioned to terminal state within last 30 days; no actual consumption data locked
- **Primary Flow:**
  1. Admin views "Archived Projects" (filter `is_active = false`)
  2. Clicks "Reactivate" on project within 30 days
  3. System:
     - Reverts `is_active = true`
     - For `CANCELLED` only: can revert to previous non-terminal status
     - For `COMPLETED`: cannot re-activate (terminal by definition) — must create clone
     - Unlocks allocations: `LOCKED` → `APPROVED` (for APPROVED ones) or `PENDING` (for PENDING ones) if they were in-flight
  4. Audit trail records `PROJECT_REACTIVATED` event with reason
- **Error:** Reactivating >30 day old project → rejected; must create new project and migrate manually

### 4.2 Activity Dependency Management

**Dependency Types (Phase 1):** Finish-to-Start (FS) only. All dependencies treated as FS.

**Cycle Detection Algorithm (Pre-save Validation):**
```
For each activity A in project:
  DFS(v = A, visited = {}, stack = {})
    if v in stack → cycle! return [v, stack path]
    if v in visited → continue
    mark v visited, push to stack
    for each predecessor p of v:
      DFS(p, visited, stack)
    pop v from stack
```

**Error Response on Cycle Attempt:**
- **HTTP 409 Conflict**
- Body: `{ "error": "CYCLE_DETECTED", "message": "Adding dependency A→B creates cycle: A→B→C→A", "suggested_fix": "Review dependencies on activities: A, B, C" }`
- UI: Inline error on activity row; offending dependencies highlighted

### 4.3 Project Status Workflow

**State Machine (PRD Section 2.6):**

```
        ┌──────────┐
        │ REQUESTED│ ← Created
        └─────┬────┘
              │ PM: "Move to Budget Estimating"
              ▼
       ┌─────────────┐
       │BUDGET_ESTIMATING│
       └─────┬───────┘
              │ Approved?
         ┌────┴─────┐
         │          ▼
         │    ┌─────────────┐
         │    │BUDGET_APPROVED│
         │    └─────┬───────┘
         │          │ "Start Execution"
         │          ▼
         │    ┌─────────┐
         │    │EXECUTING│
         │    └────┬────┘
         │         │ "Put On Hold"?
         │    ┌────┴─────┐
         │    │          ▼
         │    │    ┌─────────┐
         │    │    │ ON_HOLD │
         │    │    └────┬────┘
         │    │         │ "Resume"
         │    │         ▼
         │    │    ┌─────────┐
         │    │    │EXECUTING│
         │    │    └────┬────┘
         │    │         │
         │    │    ┌────┴─────┐
         │    │    │          ▼
         │    │    │    ┌──────────┐
         │    │    │    │COMPLETED │ ← Terminal
         │    │    │    └──────────┘
         │    │    │
         │    │    ┌──────────┐
         │    └───► │CANCELLED │ ← Terminal (from any state)
         │         └──────────┘
         │
         ▼
   (Invalid) → stays in REQUESTED
```

**Transition Rules:**
- Only **Project Manager** can initiate state change
- **COMPLETED** and **CANCELLED** are terminal — immutable
- Transitioning to `CANCELLED` freezes all allocations (no further edits allowed)
- Transitioning to `COMPLETED` freezes allocations for audit; final actuals recorded separately (Phase 2)

### 4.4 Gantt Interaction Specification (UX Deliverable 3 Integration)

**Drag Rescheduling Flow (Conservative Warning Mode — UX Q2 Decision):**

```
Step 1: User drags activity bar from old_start to new_start
        ↓
Step 2: System computes shift_delta = new_start - old_start (in days)
        ↓
Step 3: System identifies all successor activities (transitive closure)
        ↓
Step 4: Would any successor's start date be pushed later?
        ├─ NO → Apply shift silently (no cascade)
        └─ YES → Show modal:
                 "Shifting 'Design Sprint' by +7 days will affect 3 successor(s):
                  • Dev Backend (delayed: May 18 → May 25)
                  • Dev Frontend (delayed: May 25 → Jun 1)
                  • QA (delayed: Jun 1 → Jun 8)
                  Continue with cascade shift?"
                 [Cancel]  [Shift All 3]
        ↓
Step 5a: Cancel → no change
Step 5b: Continue → recursively shift all affected successors by same delta
        (preserve original duration and lag between activities)
        ↓
Step 6: System:
        - Updates DB: all shifted activities (batch update within single transaction)
        - Recomputes critical path for entire project
        - Emits N audit events (one per updated activity)
        - Emits notification to project stakeholders
        ↓
Step 7: Toast appears: "Design Sprint rescheduled (+7d). 3 successors shifted. [Undo]"
        Undo button valid for 30 seconds; click → rollback entire transaction
```

**Constrained Drag scenarios (blocked):**
- Drag past `project.end_date` → ❌ Blocked; tooltip: "Cannot exceed project end date"
- Drag into past (before `today`) → ❌ Blocked; tooltip: "Cannot reschedule past activities"
- Drag that creates cycle → ❌ Blocked; tooltip: "This change creates a dependency cycle. Adjust dependencies first."

**Drag Cancellation:** ESC key cancels drag in progress; no DB write.

---

## 5. Module 3 — Resource Allocation & Monitoring

**PRD Reference:** Section 3.1–3.6

### 5.1 Allocation Data Model

```
Allocation
├── id (UUID PK)
├── resource_id (FK → resources.id)
├── project_id (FK → projects.id)
├── activity_id (FK → activities.id, nullable)  // future: per-activity assignment
├── week_start_date (DATE)       // Monday of the week being allocated
├── hours (NUMERIC(5,2))         // weekly total; unit: 0.1 HCM = 14.4h
├── status (ENUM: PENDING, APPROVED, REJECTED)
├── version (INT)                 // optimistic lock
├── approved_by (FK → resources.id, nullable)
├── approved_at (DATE, nullable)
├── rejection_reason (VARCHAR(500), nullable)
├── created_at, updated_at
└── is_active (BOOLEAN, DEFAULT TRUE)  // soft delete flag
```

**Key Invariants:**
- One allocation per `(resource, project, week)` tuple — unique constraint on `(resource_id, project_id, week_start_date)` where `is_active = true AND status IN ('PENDING', 'APPROVED')`
- Rejected or soft-deleted allocations can be replaced by new allocation

### 5.2 Allocation Entry User Flow

Two entry points (both share same modal):

**Path A — Project-Centric:**
```
Project Detail → Assignments tab
  ↓
Resource grid (filterable by skill/level/cost_center)
  ↓
Select resource → click "Assign"
  ↓
Allocation Modal opens (see below)
  ↓
Submit → PENDING → Notification to POD Manager
```

**Path B — Resource-Centric:**
```
Resource Detail → Assignments tab
  ↓
Project grid (filterable by status/date)
  ↓
Select project → click "Assign to Project"
  ↓
Allocation Modal (same fields)
  ↓
Submit → PENDING → Notification to POD Manager
```

**Allocation Modal Fields:**

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| Resource | Search/dropdown | Required; must be active | Shows current utilization % |
| Project | Search/dropdown | Required; must be in APPROVED or ACTIVE status | Shows remaining budget in K USD |
| Week range | Date range picker | Required; continuous weeks only (no gaps) | Default: current week |
| Hours per day | Number input | 1–10 hours/day | Auto-compute weekly total = hours×5 |
| Notes | Textarea | Optional | — |

**Real-time Validation (on field change):**
- Budget check: Shows "Remaining budget: $245.50K" in green/yellow/red based on %
- OT warning: If `hours_per_day > 8`, shows "⚠️ OT detected — ensure monthly total ≤ 36h"
- 5-project cap: If resource already on 4+ projects this month, shows "⚠️ Resource at 4/5 projects this month"
- Capacity check: If resource fully allocated (144h already assigned), shows "❌ Resource has 0 remaining capacity"

### 5.3 Constraint Validation Rules (Detailed)

**CR-VAL-01: Daily Hour Limits (PRD 6.2)**
- **Trigger:** Allocation creation or update
- **Rule:** For each day in the allocation week (Mon–Fri), compute:
  - `daily_total = hours_per_day` (assumed evenly distributed unless overrides specified — Phase 2)
  - Check: `daily_total ≤ 10.0`
  - Additional check: if day is holiday (from calendar), regular hours must be 0; OT ≤ 10
- **Violation:** `OT_DAILY_EXCEEDED` — "Daily hours {N} exceed 10h max (8 regular + 2 OT); reduce hours or spread across days"
- **Error Severity:** BLOCKING (allocation rejected)
- **DB Enforcement:** Application-level check (not DB constraint)

**CR-VAL-02: Monthly OT Cap (36 hours)**
- **Trigger:** Allocation creation or update
- **Rule:**
  1. Compute `month_start = week_start_date.replace(day=1)`
  2. Fetch all `APPROVED` allocations for same resource + same month → `total_hours`
  3. Compute `ot_hours = MAX(0, total_hours - 144)`
  4. If `ot_hours > 36` → violation
- **Violation:** `OT_MONTHLY_CAP` — "Monthly OT {N}h exceeds 36h cap (total: {total_hours}h). Reduce hours or spread across months."
- **Error Severity:** BLOCKING
- **DB Enforcement:** Application-level

**CR-VAL-03: 5-Project Monthly Spread Limit**
- **Trigger:** Allocation creation or update
- **Rule:** Count distinct `project_id` across **all** allocations for resource in target month with status in (`PENDING`, `APPROVED`, `LOCKED`)
  - `LOCKED` = allocations in closed periods (post-month-end lock) that cannot be modified
  - `REJECTED`, `CANCELLED`, soft-deleted allocations do NOT count
  - If `count ≥ 5` and new project not already in set → violation
- **Violation:** `PROJECT_SPREAD_LIMIT` — "Resource already assigned to {N} projects this month; max 5. Choose different resource or remove from existing project."
- **Error Severity:** BLOCKING (hard constraint — PRD explicitly "no override")
- **DB Enforcement:** Application-level + database partial index for performance
  ```sql
  CREATE INDEX idx_allocations_resource_month_spread
    ON allocations(resource_id, week_start_date, status, is_active)
    WHERE is_active = true AND status IN ('PENDING','APPROVED','LOCKED');
  ```

**CR-VAL-04: Budget Exhaustion (Project & Monthly)**
- **Trigger:** Allocation creation or update (when allocation status set to `APPROVED`)
- **Rule:**
  - **Total Project Budget:** Sum of `(hours × applicable_hourly_rate)` across all `APPROVED` allocations ≤ `project.budgetK`
  - **Monthly Budget (if defined):** Sum per target month ≤ `project.budgetMonthlyBreakdown[YYYYMM]`
- **Implementation:**
  ```java
  // In BudgetValidationService:
  BigDecimal totalSpentK = allocationRepository.sumApprovedAllocationCostK(projectId);
  BigDecimal newAllocationCostK = hours.multiply(hourlyRateK).divide( BigDecimal.valueOf(144) );
  if (totalSpentK.add(newAllocationCostK).compareTo(project.getBudgetK()) > 0) {
      throw new BudgetExceededException(...);
  }
  if (project.getBudgetMonthlyBreakdown() != null) {
      String monthKey = weekStartDate.format(DateTimeFormatter.ofPattern("yyyyMM"));
      BigDecimal monthlyCapK = project.getBudgetMonthlyBreakdown().get(monthKey);
      if (monthlyCapK != null) {
          BigDecimal monthSpentK = allocationRepository.sumApprovedCostByMonth(projectId, yearMonth);
          if (monthSpentK.add(newAllocationCostK).compareTo(monthlyCapK) > 0) {
              throw new MonthlyBudgetExceededException(...);
          }
      }
  }
  ```
- **Violation:** `BUDGET_EXCEEDED` (total) or `MONTHLY_BUDGET_EXCEEDED`
- **Error Severity:** BLOCKING
- **DB Enforcement:** Application-level

**CR-VAL-05: Allocation Override Semantics (Not Accumulate)**
- **Trigger:** Creating/updating allocation for same `(resource_id, project_id, week_start_date)`
- **Rule:** New allocation **atomically replaces** existing — old record `is_active = false` OR status set to `REJECTED`, new record inserted
- **Implementation:** Repository method `@Transactional upsertAllocation(...)`:
  ```java
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("UPDATE Allocation SET isActive = false, status = 'REJECTED' WHERE resource.id = :rid AND project.id = :pid AND weekStartDate = :week AND isActive = true")
  void softDeleteExisting(@Param("rid") Long resourceId, ...);
  // Then INSERT new allocation
  ```
- **Status Codes:** Use `REJECTED` for replacement (not `CANCELLED`) to preserve audit trail
- **DB Enforcement:** Unique constraint on `(resource_id, project_id, week_start_date)` WHERE `is_active = true AND status IN ('PENDING','APPROVED','LOCKED')`

**CR-VAL-06: Rate Period Contiguity & Overlap Prevention**
- **Trigger:** Creating new rate record for `(cost_center_id, billable_team_code)`
- **Rule:**
  1. New rate's `effectiveFrom` must be exactly one month after the existing active rate's `effectiveFrom` (contiguous sequence)
  2. New rate's period may NOT overlap any existing rate's period for same `(CC, BTC)`
  3. When inserting: automatically calculate `effectiveTo` on PREVIOUS active rate = `newRate.effectiveFrom.minusMonths(1)`
- **Implementation (in `RateService.createRate`):**
  ```java
  @Transactional
  public Rate createRate(CreateRateRequest req) {
      // Find active rate with PESSIMISTIC_WRITE lock
      List<Rate> active = rateRepository.findActive(
          req.getCostCenterId(), req.getBillableTeamCode(),
          LockModeType.PESSIMISTIC_WRITE);

      if (!active.isEmpty()) {
          Rate current = active.get(0);
          YearMonth newFrom = YearMonth.parse(req.getEffectiveFrom());
          YearMonth expectedTo = newFrom.minusMonths(1);
          // Validate: current.effectiveTo must be null OR equal expectedTo for contiguity
          if (current.getEffectiveTo() != null && !current.getEffectiveTo().equals(expectedTo)) {
              throw new RateContiguityViolationException(
                  "Current rate ends at " + current.getEffectiveTo() + "; new rate must start at " + expectedTo.plusMonths(1));
          }
          current.setEffectiveTo(expectedTo);
          rateRepository.save(current);
      }

      Rate newRate = Rate.builder()
          .costCenterId(req.getCostCenterId())
          .billableTeamCode(req.getBillableTeamCode())
          .monthlyRateK(req.getMonthlyRateK())
          .effectiveFrom(YearMonth.parse(req.getEffectiveFrom()))
          .effectiveTo(null)
          .status(RateStatus.ACTIVE)
          .build();
      return rateRepository.save(newRate);
  }
  ```
- **Violation:** `RATE_PERIOD_OVERLAP` (if overlap detected) or `RATE_GAP_DETECTED` (if contiguity broken)
- **Error Severity:** BLOCKING (409 Conflict)
- **DB Enforcement:** Application-level + partial index:
  ```sql
  CREATE UNIQUE INDEX uq_rate_active_period
    ON rates(cost_center_id, billable_team_code, effective_from)
    WHERE is_active = true AND effective_to IS NULL;
  ```
  This guarantees only one active rate per `(CC, BTC)` pair at any given time.

**CR-VAL-07: Resource Status Change Cascade Effects**
- **Trigger:** Resource status transition (`ACTIVE` → `ON_LEAVE` or `TERMINATED`)
- **Rule on `ON_LEAVE`:**
  - All `PENDING` allocations for this resource → auto-reject with reason "Resource on leave"
  - `APPROVED` allocations remain but capacity calculation excludes resource
- **Rule on `TERMINATED`:**
  - All `PENDING` allocations → auto-reject with reason "Resource terminated"
  - All `APPROVED` allocations → soft-close (status set to `LOCKED`, hours frozen for audit)
- **Implementation:** Service method `ResourceService.changeStatus(Long resourceId, ResourceStatus newStatus, String reason)` executes within `@Transactional`:
  ```java
  if (newStatus == ResourceStatus.ON_LEAVE) {
      allocationRepository.rejectAllPendingForResource(resourceId, "Resource on leave");
  } else if (newStatus == ResourceStatus.TERMINATED) {
      allocationRepository.lockAllApprovedForResource(resourceId, "Resource terminated");
  }
  ```
- **DB Enforcement:** Application-level with cascading updates in single transaction

**CR-VAL-08: Project Terminal State Freezing**
- **Trigger:** Project status transitions to `COMPLETED` or `CANCELLED`
- **Rule:**
  - All existing allocations (any status) become `LOCKED` — no further edits allowed
  - Project `is_active = false` (hidden from default dashboard)
  - Archive operation allowed only by Admin (reversible within 30 days by Admin)
- **Implementation:**
  ```java
  @Transactional
  public void transitionToTerminal(Project project, ProjectStatus terminalStatus) {
      project.setStatus(terminalStatus);
      project.setActive(false);
      allocationRepository.lockAllForProject(project.getId());  // SET status='LOCKED', is_active=false for pending
  }
  ```
- **Error:** `PROJECT_TERMINAL_IMMUTABLE` if user attempts to edit locked project
- **DB Enforcement:** Application-level; no DB constraint needed (business rule)

**CR-VAL-04: Budget Exhaustion**
- **Trigger:** Allocation creation or update (on `APPROVED` status only)
- **Rule:**
  1. Fetch project's `budget_K`
  2. Sum cost of all `APPROVED` allocations for project (including proposed new allocation if updating):
     ```
     cost_per_allocation = SUM(hours / 144 * applicable_rate_K)
     ```
  3. If `total_cost_K > budget_K` → violation
- **Violation:** `BUDGET_EXCEEDED` — "Project budget exceeded by {excess_K}K. Reduce hours, select lower-rate resource, or request budget increase."
- **Error Severity:** BLOCKING
- **DB Enforcement:** Application-level; consider DB trigger for defense-in-depth

**CR-VAL-05: Override Semantics (Not Accumulate)**
- **Trigger:** Creating allocation where one already exists for `(resource, project, week)` with status `PENDING` or `APPROVED`
- **Rule:** New allocation **replaces** old — old record soft-deleted (`is_active = false`) or status set to `REJECTED`; new record inserted/updated
- **Implementation:** Repository method `upsert_allocation()` handles this atomically:
  ```sql
  -- Pseudo-code
  BEGIN;
  UPDATE allocations SET is_active = false WHERE resource_id = ? AND project_id = ? AND week_start_date = ? AND is_active = true;
  INSERT new_allocation;
  COMMIT;
  ```

### 5.4 Allocation Approval Workflow

**State Transition:**

```
         ┌─────────┐
         │ PENDING │ ← Created by PM
         └────┬────┘
              │ POD Manager approves
              ▼
         ┌──────────┐
         │ APPROVED │ ← Counts against capacity & budget
         └────┬─────┘
              │
              │ POD Manager rejects
              ▼
         ┌─────────┐
         │ REJECTED│ ← PM can revise & resubmit (new PENDING)
         └─────────┘
```

**Approval Steps (Four-Eyes Principle — PRD 3.1):**

| Step | Actor | Action | System Behavior |
|------|-------|--------|-----------------|
| 1 | PM | Submits allocation (via modal) | Creates `PENDING` allocation; emits `ALLOCATION_SUBMITTED` notification to POD Manager inbox + email (High priority) |
| 2 | POD Manager | Clicks notification → opens Allocation Approval Panel | Panel shows: resource name, project, week(s), hours, cost_K (rate×hours), budget impact indicator (green/yellow/red bar) |
| 3a | POD Manager | Clicks **Approve** | - Sets `status = APPROVED`<br>- Records `approved_by`, `approved_at`<br>- Increments `version` (optimistic lock)<br>- Emits `ALLOCATION_APPROVED` notification to PM + audit log entry |
| 3b | POD Manager | Clicks **Reject** | - Modal opens: "Reason required" (dropdown + free-text)<br>- Sets `status = REJECTED`<br>- Stores `rejection_reason`<br>- Emits `ALLOCATION_REJECTED` notification to PM with reason snippet; link to "Edit & Resubmit" |
| 4 | PM | Receives rejection notification | Clicks "Edit & Resubmit" → allocation modal opens pre-filled; PM adjusts hours or weeks → resubmits (new PENDING record, old REJECTED stays in audit) |

**Constraints on Approval:**
- **Four-eyes:** Approver (`approved_by`) **cannot** be same as `resource_id` (submitter) — enforced in `ApprovalService.approve()` with explicit check
- **Only POD Manager role** can approve/reject (RBAC middleware)
- **Approval SLA:** 48 business hours; system escalates to backup POD Manager if pending >72h (Phase 2 enhancement)

**Audit Trail (Every Step Logged):**
- `ALLOC_CREATED`: `{who, resource, project, week, hours}`
- `ALLOC_APPROVED`: `{who, alloc_id, approved_at}`
- `ALLOC_REJECTED`: `{who, alloc_id, reason}`
- `ALLOC_UPDATED`: `{who, field_changes, old_values, new_values}`

### 5.5 Auto-Allocation Engine (Heuristic)

**Purpose:** Automatically assign resources to unassigned project activities respecting capacity, skill, budget, and project spread constraints.

**Trigger:** `POST /allocations/auto` with payload: `{ projectId, simulate=false, priority='cost' }`

**Priority Chain:** The engine filters candidate resources sequentially; each stage reduces the candidate pool:

1. **Availability Filter** — Resources with `remaining_capacity[target_month] >= hours_needed`
2. **Skill Match Filter** — Resources with `skill == required_skill` and `level >= required_level`
3. **Project Spread Filter** — Resources with `active_project_count[target_month] < 5`
4. **Budget Check** — Project remaining budget can cover `hours × resource.hourly_rate_K / 144`
5. **Cost-based Ranking** — Among survivors, sort by `monthly_rate_K` ascending; allocate cheapest first

**Algorithm:**

```
unassigned = getUnassignedActivities(projectId)  // [(activityId, weekStart, hours, skill, level), ...]
candidates = getAvailableResources()           // all resources with status=ACTIVE

for each activity in unassigned:
    filtered = candidates

    // Stage 1: Capacity
    filtered = filtered where remainingCapacity(activity.weekStart, activity.hours) >= 0
    if filtered.isEmpty(): record FAILURE("CAPACITY_EXHAUSTED"); continue

    // Stage 2: Skill match
    if activity.requiredSkill != null:
        filtered = filtered where skill matches (exact or adjacent skill per skill_matrix table)
    if filtered.isEmpty(): record FAILURE("SKILL_MISMATCH"); continue

    // Stage 3: Project spread (count allocations in target month with status in PENDING/APPROVED/LOCKED)
    filtered = filtered where countDistinctProjectsInMonth(resource, activity.weekStart) < 5
    if filtered.isEmpty(): record FAILURE("PROJECT_SPREAD_LIMIT"); continue

    // Stage 4: Budget validation
    candidateCosts = filtered map (hours * hourlyRateK / 144)
    totalIfSelected = sum(candidateCosts) + currentProjectSpent
    if totalIfSelected > project.budgetK:
        record FAILURE("BUDGET_EXCEEDED"); continue
    if project.budgetMonthlyBreakdown exists:
        monthlySum = sum(candidateCosts per month)
        if monthlySum[month] > monthlyCap[month]:
            record FAILURE("MONTHLY_BUDGET_EXCEEDED"); continue

    // Stage 5: Pick cheapest
    selected = filtered.minBy(Resource::getMonthlyRateK)
    createAllocation(selected, activity, hours, status=PENDING)
    record SUCCESS(selected.id, projectId, activityId, allocationId)
```

**Simulation Mode (`simulate=true`):**
- Runs entire algorithm without persisting allocations
- Returns `AutoAllocationResult` with:
  ```json
  {
    "successes": [
      { "activityId": 123, "resourceId": 456, "hours": 80, "allocationId": null }
    ],
    "failures": [
      { "activityId": 124, "errorCode": "SKILL_MISMATCH", "reason": "No resource with skill 'BA' level >=3" }
    ],
    "summary": { "totalActivities": 15, "succeeded": 12, "failed": 3 }
  }
  ```

**Error Taxonomy** (structured return when auto-allocation fails):

| Error Code | When Triggered | Suggested User Remediation |
|------------|----------------|---------------------------|
| `CAPACITY_EXHAUSTED` | No candidate has ≥ required hours remaining in target month | 1) Reschedule activity to month with capacity 2) Reduce hours 3) Add more resources to pool |
| `SKILL_MISMATCH` | No resource matches required skill/level | 1) Broaden skill requirement 2) Lower level threshold 3) Manual allocate with exception approval |
| `PROJECT_SPREAD_LIMIT` | All qualified resources already on 5+ projects this month | 1) Choose different resource(s) 2) Request spread limit exception (requires POD Manager + Admin approval, audit logged) |
| `BUDGET_EXCEEDED` | Project budget insufficient for selected resources | 1) Reduce activity hours 2) Select lower-rate resources 3) Request budget increase |
| `MONTHLY_BUDGET_EXCEEDED` | Monthly cap exceeded (if defined) | 1) Move some hours to adjacent month 2) Adjust monthly breakdown |
| `NO_CANDIDATES` | No resources pass all filters | Combine remediation from above categories |

**Audit Logging:** Each auto-allocation run (simulation or actual) creates `AUTO_ALLOCATION_RUN` audit entry:
```json
{
  "runId": "uuid",
  "projectId": 123,
  "mode": "SIMULATE|COMMIT",
  "timestamp": "2026-04-19T14:30:00Z",
  "results": { "succeeded_count": 12, "failed_count": 3 }
}
```

---

## 6. Module 4 — Actual Consumption Tracking (Phase 2 — Deferred)

Module 4 is deferred to Phase 2; functional spec will be written later. High-level overview only:

**Key Entities:** `ActualConsumption` with `source` enum (`clarity_import`, `csv_import`, `manual_entry`); `import_batch_id` for traceability; `is_adjustment` boolean for reversal pattern.

**Key Flow:** CSV import with flexible column mapping → preview (show insert/update/conflict counts) → user confirms → system writes with `locked_at = NOW() + 24–48hr` → edit window closes → further changes require reversal entry.

---

## 7. Module 5 — Supply & Demand Dashboard

**PRD Reference:** Section 5.1–5.5

### 7.1 Dashboard KPI Definitions

**Above-the-Fold (Default Visible Without Scroll — UX Q3 Decision):**

| KPI | Type | Data Source | Calculation | Update Frequency |
|-----|------|-------------|-------------|-----------------|
| **Supply vs Demand (Monthly)** | Bar chart | Materialized view `mv_supply_demand` | `Supply = COUNT(DISTINCT resource_id)` in month; `Demand = SUM(hours)` of `APPROVED` allocations | Every 5min (business hours) |
| **Budget Burn Rate & Trend** | Line chart | Allocations + Rate cache | `Spent_K = Σ(hours × hourly_rate_K)`; `Remaining% = (Budget_K - Spent_K) / Budget_K × 100` | Every 5min |
| **Variance Analysis** | Table (Project rows) | Projects + Allocations | `Variance_K = Allocated_K - Spent_K`; `Variance% = Variance_K / Budget_K × 100` | Every 5min |

**Expandable Secondary KPIs (Click "Expand Dashboard"):**

| KPI | Type | Description |
|-----|------|-------------|
| Utilization Rate | Gauge | `Allocated_Hours / 144_HCM` system-wide |
| Overplan Count | Badge/Count | Number of projects where `Allocated_Hours > Planned_Hours` or `Spent_K > Budget_K` |
| Monthly Cash Flow Forecast | Line chart (next 6mo) | Forecasted spend based on committed allocations + pipeline probability weights |

### 7.2 Dashboard Filters

| Filter | Type | Behavior |
|--------|------|----------|
| **POD Team** | Dropdown (multi-select) | Filters by cost_center_id; default = user's assigned CC |
| **Project** | Searchable dropdown | Multi-select project IDs |
| Date Range | Preset or custom | Options: Current Month, Last 3 Months, Year to Date, Custom range |
| Cost Center | Dropdown | Secondary filter (shown only if user has cross-CC access) |
| Skill | Tag filter | Shows only allocations for matching skills |

**Filter persistence:** User's last-used filter set saved in `localStorage`; restored on next visit.

### 7.3 Refresh Strategy

**Materialized View Refresh Schedule:**
- **Business hours** (09:00–18:00 local time): Every **5 minutes**
- **Off-hours** (18:00–09:00): Every **30 minutes**
- **Manual refresh:** Button in dashboard header triggers immediate `REFRESH MATERIALIZED VIEW CONCURRENTLY`

**Real-time updates on allocation change:**
- When an allocation is created/approved/rejected:
  1. API emits WebSocket event: `allocation_updated`
  2. Dashboard listening clients invalidate cached KPI data
  3. Next query refetches from MV (fresh within 5min window)
- Fallback: If WebSocket unavailable, client polls `GET /dashboard/last_refresh` every 30s

### 7.4 Export

All dashboard tables exportable to CSV with timestamped filename:
`pod_dashboard_export_YYYY-MM-DD_HHMM.csv`

Columns include: cost_center, billable_team, month, supply_hcm, allocated_hcm, variance_hcm, burn_rate_pct, etc.

---

## 8. Module 6 — Notification & Alerting System

**PRD Reference:** Section 10.1–10.4

### 8.1 Notification Types & Event Matrix

| Event Type | Trigger | Channels | Priority | Required Action? |
|------------|---------|----------|----------|------------------|
| `ALLOCATION_SUBMITTED` | PM creates allocation (PENDING) | In-app + Email | High | Yes — POD Manager must approve/reject |
| `ALLOCATION_APPROVED` | POD Manager approves | In-app + Email to PM | Medium | No |
| `ALLOCATION_REJECTED` | POD Manager rejects with reason | In-app + Email to PM | Medium | Yes — PM must revise |
| `BUDGET_EXCEED_WARNING` | Allocation would exceed remaining budget | In-app only | High | Yes — PM must adjust |
| `BUDGET_80PCT_WARNING` | Project spent ≥80% of total budget | In-app only | Medium | No |
| `RATE_CHANGED` | New rate becomes active for resource on active project | In-app only | Medium | No |
| `RESOURCE_STATUS_CHANGED` | Resource marked on_leave/terminated | In-app to affected PMs | Medium | Yes — re-allocate impacted allocations |
| `AUTOALLOCATION_COMPLETE` | Auto-allocation job finishes | In-app to PM | Low | No |
| `PROJECT_STATUS_TRANSITION` | Project status changes state | In-app to stakeholders | Low | No |

**Email Throttling:** Same event type max 1 email per recipient per 24 hours (digest bundling).

### 8.2 Notification Center UI Specification

**Layout:**

```
┌─────────────────────────────────────────────┐
│ 🔔 3  Notifications              [Mark all read] │
├─────────────────────────────────────────────┤
│ View: [● By Project ○ By Type]             │
├─────────────────────────────────────────────┤
│                                             │
│ Project: Phoenix — Website Redesign         │
│   · Allocation approved — David Chen (2h)   │
│     [View]                                  │
│   · Budget warning — 89% burn rate          │
│     [Dismiss]                               │
│                                             │
│ Project: Atlas — Data Migration             │
│   · Allocation rejected — Sarah Liu (1d)    │
│     [View Reason]  [Edit & Resubmit]        │
│                                             │
│ System                                      │
│   · Import complete: 47 resources added     │
│     [Download Report]                       │
│                                             │
│ [Load more...]                              │
└─────────────────────────────────────────────┘
```

**Grouping Behavior (UX Q4 — Both Supported):**
- **By Project (default):** All events for a given project clustered; project header shows project name and total unread count for that project
- **By Type:** All events of same type clustered; type header shows icon + type name + count
- **Toggle Control:** Segmented button in header `[By Project ●] [By Type ○]`; preference saved to `localStorage` key `notification_group_mode`

**Notification Actions:**

| Type | Primary Action Button | Secondary Action |
|------|----------------------|------------------|
| `ALLOCATION_APPROVED` | [View Allocation] | — |
| `ALLOCATION_REJECTED` | [View Reason] | [Edit & Resubmit] → opens allocation modal |
| `BUDGET_WARNING` | [View Project] | [Dismiss] |
| `IMPORT_COMPLETE` | [Download Report] | — |
| `SYSTEM_ANNOUNCEMENT` | [Read More] | [Dismiss] |

**Unread Management:**
- Bell icon badge = total unread count across all notifications
- Unread items: **bold title**, blue accent border
- Read items: dimmed text, gray border
- "Mark all read" button (visible only when `unread_count > 0`)
- Per-item dismiss (×) on hover; marked read on click-through

### 8.3 Notification Storage & Retrieval

**Data Model:**

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES resources(id),
    type VARCHAR(20) NOT NULL,  -- ALLOCATION_SUBMITTED, etc.
    project_id UUID REFERENCES projects(id),
    allocation_id UUID REFERENCES allocations(id),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500),  -- deep link: "/projects/123/allocations/456"
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    -- Partition by month on created_at for performance
    -- Index: (recipient_id, is_read, created_at DESC)
);
```

**Query Pattern (default view — last 20 unread + 5 recent read):**
```sql
SELECT * FROM notifications
WHERE recipient_id = :user_id
ORDER BY
  CASE WHEN is_read = false THEN 0 ELSE 1 END,  -- unread first
  created_at DESC
LIMIT 25;
```

**Retention Policy (PRD 10.4):**
- Hot (dropdown): last 90 days (query limit `created_at >= NOW() - INTERVAL '90 days'`)
- Primary DB store: 24 months (partitioned monthly)
- Archive: after 24mo → object storage (S3/MinIO) as compressed JSONL; queryable via foreign table
- Full history browser page: Admin/POD Manager can query full 8-year archive

---

## 9. Cross-Cutting Concerns

### 9.1 Audit Logging (All Mutations)

**Rule:** Every create/update/delete (soft or hard) on core entities must generate an `audit_log` entry.

**Audit Log Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | BIGSERIAL PK | — |
| `entity_type` | VARCHAR(30) | `allocation`, `resource`, `project`, `activity`, `rate`, `holiday` |
| `entity_id` | UUID | PK of affected record |
| `field_name` | VARCHAR(50) | Column changed; `*` for whole-record create/delete |
| `old_value` | JSONB | Previous value (null for create) |
| `new_value` | JSONB | New value (null for delete) |
| `changed_by` | UUID | User ID |
| `changed_at` | TIMESTAMPTZ | `NOW()` |
| `change_reason` | TEXT | Optional: approval reason, rejection reason, status change note |

**Auto-logging via JPA EntityListeners + AOP:**

```java
// AuditLog.java — immutable entity
@Entity
@Table(name = "audit_log")
public class AuditLog {
    @Id @GeneratedValue(strategy = IDENTITY)
    private Long id;
    private String entityType;
    private Long entityId;
    private String fieldName;
    @Column(columnDefinition = "JSONB")
    private JsonNode oldValue;
    @Column(columnDefinition = "JSONB")
    private JsonNode newValue;
    private Long changedByUserId;
    private String changeReason;
    @Enumerated(STRING)
    private RevisionType revisionType;  // ADD, MOD, DEL
    private OffsetDateTime changedAt;
    // getters/setters
}

// Auditable.java — marker interface for entities that generate audit events
public interface Auditable {
    String getEntityType();
    String getRevisionType();
    Map<String, Object[]> getAuditChanges(AuditContext context);  // [old, new] pairs
}

// AuditEntityListener.java — JPA lifecycle callbacks
@Component
public class AuditEntityListener {

    @PrePersist
    public void prePersist(Object entity) {
        if (entity instanceof Auditable auditable) {
            AuditContext ctx = AuditContextHolder.get();
            Map<String, Object[]> changes = auditable.getAuditChanges(ctx);
            changes.forEach((field, pair) -> {
                AuditLog log = AuditLog.builder()
                    .entityType(auditable.getEntityType())
                    .entityId(extractId(entity))
                    .fieldName(field)
                    .oldValue(toJsonNode(pair[0]))
                    .newValue(toJsonNode(pair[1]))
                    .changedByUserId(ctx != null ? ctx.getUserId() : null)
                    .changeReason(ctx != null ? ctx.getReason() : null)
                    .revisionType(RevisionType.ADD)
                    .changedAt(OffsetDateTime.now())
                    .build();
                // AuditLogRepository.save(log);
            });
        }
    }

    @PreUpdate
    public void preUpdate(Object entity) {
        // Similar to prePersist but revisionType = MOD
        // Only log fields that actually changed (auditable.getAuditChanges() returns diff)
    }

    @PreRemove
    public void preRemove(Object entity) {
        // revisionType = DEL
    }
}

// Register listener in entity: @EntityListeners(AuditEntityListener.class)
@Entity
@EntityListeners(AuditEntityListener.class)
public class Resource implements Auditable { ... }
```

**Alternative — Explicit Service-Layer Audit:** For status transitions (resource → on_leave/terminated) that require a `change_reason`, service sets `AuditContext` ThreadLocal before mutating entity; listener picks it up automatically.

**Audit Query API:**
- `GET /api/v1/audit/log?entity_type=allocation&entity_id=xxx&start_date=...&end_date=...`
- RBAC: Admin → all entities; POD Manager → allocations only; PM → own projects only
- Export: CSV download of filtered results (max 10k rows per request)

### 9.2 Soft Delete Semantics

**Policy:** All core entities (`Resource`, `Project`, `Activity`, `Allocation`, `Rate`, `Holiday`) have `is_active` boolean column.

**Soft Delete Behavior:**
- `DELETE /resource/{id}` → sets `is_active = false`, not physical delete
- **Hard delete prohibited** at application layer; DB user has only `UPDATE` permission, not `DELETE` on core tables
- **Cascade effects:**
  - Soft-deleting a Resource: sets `is_active = false`; pending allocations become `REJECTED`; approved allocations frozen (still count against capacity/history)
  - Soft-deleting a Project: sets `is_active = false`; all allocations frozen; project hidden from default dashboard (but included in reports with "archived" tag)
  - Soft-deleting an Activity: prevents further allocation to that activity; existing allocations retained
- **Reversal:** Un-delete simply sets `is_active = true` (if business rules allow — e.g., project can be reactivated only within 30 days and by Admin)

### 9.3 Concurrency & Optimistic Locking

**Application:** Allocations only (high-contention entity).

**Mechanism:**
- `Allocation` table has `version INTEGER NOT NULL DEFAULT 1` with `@Version` annotation on entity field
- Every `UPDATE` automatically includes `WHERE version = :expected_version` via Hibernate
- If `0 rows affected` → Spring throws `OptimisticLockingFailureException` or `ObjectOptimisticLockingFailureException`
- Retry logic in service layer (Spring declarative approach):

```java
@Service
public class AllocationService {

    @Retryable(
      value = OptimisticLockingFailureException.class,
      maxAttempts = 2,
      backoff = @Backoff(delay = 100)
    )
    @Transactional
    public Allocation updateAllocation(Long id, UpdateAllocationRequest req, Long userId) {
        Allocation alloc = allocationRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Allocation not found: " + id));

        // Apply user changes to fresh object
        alloc.setHours(req.getHours());
        alloc.setNotes(req.getNotes());
        // version is automatically incremented on commit

        return allocationRepository.save(alloc);
    }
}
```

- If retry exhausts → return HTTP 409 CONFLICT with error code `OPTIMISTIC_LOCK_CONFLICT` and suggested fix "Refresh and retry"
- Client-side: Frontend React Query handles 409 with automatic refresh + half-open retry


### 9.4 Notification Retention & Archival

**Retention lifecycle:**

```
[0–90 days]   → Hot view (notification dropdown) — actively queried
[90d–24mo]   → Primary DB (partitioned monthly) — queryable via "Notification History" page
[24mo–8yr]   → Archive storage (object storage, read-only) — restored on demand for compliance
[>8yr]       → Permanent deletion (legal hold exception possible)
```

**Archival Process (Nightly Batch):**
1. Scan `notifications` table for rows with `created_at < NOW() - INTERVAL '24 months'`
2. Export to gzipped JSON lines per partition: `s3://pod-audit-archive/notifications/2024-04.jsonl.gz`
3. Delete from primary DB (partition detach + drop for >24mo partitions)
4. Record archival manifest in `audit_log` for traceability

---

## 10. Error Handling & UX Response Matrix

| Error Code | HTTP Status | Trigger Condition | User Message (UI) | Recommended Action |
|------------|------------|-------------------|-------------------|-------------------|
| `VALIDATION_ERROR` | 400 | Input fails schema validation | "Please fix highlighted fields" (field-level errors) | Fix input values |
| `DUPLICATE_KEY` | 409 | `external_id` already exists | "Resource HCM-1001 already exists. Use different ID or merge records." | Check HR system |
| `RATE_OVERLAP` | 409 | New rate period overlaps existing | "Rate period overlapping: Rate from 202604 already exists for this resource." | Use non-overlapping month |
| `CYCLE_DETECTED` | 409 | Activity dependency creates cycle | "Cannot save: This creates a circular dependency chain A→B→C→A." | Remove one dependency |
| `BUDGET_EXCEEDED` | 422 | Allocation exceeds project budget | "Project budget exceeded by $12,500. Reduce hours or request budget increase." | Reduce hours or adjust budget |
| `CAPACITY_EXHAUSTED` | 422 | Resource has 0 remaining hours this month | "Resource fully allocated (144h/month). Choose different week or resource." | Pick different resource |
| `OT_CAP_EXCEEDED` | 422 | Monthly OT > 36h | "Monthly OT 40h exceeds 36h cap. Reduce hours or spread across months." | Reduce OT allocation |
| `PROJECT_SPREAD_LIMIT` | 422 | Resource already on 5 projects | "Max 5 projects per month. Resource already on 5 projects." | Choose different resource |
| `NOT_FOUND` | 404 | Record doesn't exist or is soft-deleted | "Resource not found or inactive." | Check resource status |
| `CONCURRENT_EDIT` | 409 | Optimistic lock version mismatch | "Allocation was modified by another user. Please reload and retry." | Refresh page |
| `UNAUTHORIZED` | 403 | RBAC permission denied | "You don't have permission to perform this action." | Contact Admin |
| `IMPORT_ERROR` | 400 | CSV validation failures (returned in separate error_report.csv) | "Import failed: 5 rows have errors. Download error report to fix." | Download report, correct CSV, retry |

**General Error Display Pattern:**
- Inline field errors: red border on input + tooltip on hover
- Form-level errors: red alert box at top of modal with button to "Show details"
- API error response: `{ "error_code": "...", "message": "...", "suggested_fix": "...", "details": {...} }`
- Network errors: "Connection lost. Retrying..." with exponential backoff

---

## 11. Acceptance Criteria Traceability

**Mapping to PRD Section 9 Acceptance Criteria:**

| PRD Criterion # | Criterion Text | SFS Coverage | Test Case Reference |
|-----------------|----------------|--------------|---------------------|
| **Resource Management** |
| AC-01 | CSV import with 1000+ rows completes in <30s | UC-RM-03 batch_create performance test | `tests/performance/test_csv_import_speed.py` |
| AC-02 | Rate lookup returns correct rate for any historical date | CR-VAL-02 rate period query logic | `tests/services/test_rate_lookup.py::test_historical_rate` |
| AC-03 | Resource external_id is immutable after creation | UC-RM-01 field constraint + model validation | `tests/models/test_resource.py::test_external_id_immutable` |
| AC-04 | Skill/level user-configurable | Admin UI for skill_lookup table CRUD | `tests/api/test_skill_api.py` |
| AC-05 | Resource status transitions respected | Section 3.2 lifecycle + UC-RM-04 audit | `tests/services/test_resource_lifecycle.py` |
| AC-06 | Holiday calendar respected in capacity | Holiday calendar entity → allocation validator checks | `tests/services/test_allocation_constraints.py::test_holidays_counted` |
| **Project Management** |
| AC-07 | Activity dependency cycle rejected | Section 4.2 DFS cycle detection | `tests/services/test_activity_dependencies.py::test_cycle_detection` |
| AC-08 | Project budget validation enforced | CR-VAL-04 at allocation time | `tests/services/test_budget_validation.py` |
| AC-09 | Status transitions follow workflow | Section 4.3 state machine | `tests/services/test_project_state_machine.py` |
| AC-10 | Gantt displays activities + dependencies | UC-PM-03 rendering spec | `tests/integration/test_gantt_rendering.py` |
| AC-11 | Critical path correct (zero-float = red) | Forward/backward pass algorithm | `tests/services/test_critical_path.py::test_zero_float_identified` |
| AC-12 | Drag-and-drop validates constraints | Section 4.4 conservative warning modal | `tests/integration/test_gantt_drag.py::test_cascade_warning_shown` |
| **Resource Allocation** |
| AC-13 | Auto-allocation produces valid allocations | Auto-allocation service constraint checks | `tests/services/test_auto_allocation.py::test_produces_valid_allocations` |
| AC-14 | Simulate mode shows projections without persisting | Auto-allocation `dry_run=True` flag | `tests/services/test_auto_allocation.py::test_simulate_mode_no_persist` |
| AC-15 | Allocation exceeding budget rejected | CR-VAL-04 | `tests/services/test_allocation_constraints.py::test_budget_exceeded` |
| AC-16 | Four-eyes approval enforced | UC-APPROVAL-WF four-eyes check | `tests/services/test_approval_workflow.py::test_cannot_self_approve` |
| AC-17 | Rejection workflow: reason required + resubmit | UC-APPROVAL-WF rejection flow | `tests/services/test_approval_workflow.py::test_reject_with_reason_allows_resubmit` |
| AC-18 | Audit log captures every change | Section 9.1 audit event generation | `tests/audit/test_audit_log.py::test_all_allocation_changes_logged` |
| AC-19 | Fine-grained allocations (0.1 HCM) supported | hours column NUMERIC(5,2) precision | `tests/models/test_allocation.py:: test_hours_precision` |
| AC-20 | Daily OT validation enforced | CR-VAL-01 daily check | `tests/services/test_allocation_constraints.py::test_daily_ot_exceeded` |
| AC-21 | Allocation is override not accumulate | UC-ALLOC-OVERRIDE merge logic | `tests/services/test_allocation_override.py::test_replaces_not_accumulates` |
| AC-22 | Leave-aware capacity (on_leave pauses) | UC-RM-04 status change side-effect | `tests/services/test_leave_impact.py` |
| AC-23 | 5-project monthly cap validated | CR-VAL-03 project count | `tests/services/test_allocation_constraints.py:: test_5_project_cap` |
| AC-24 | 5-project counts all statuses (hard) | CR-VAL-03 counts PENDING+APPROVED | `tests/services/test_allocation_constraints.py::test_5_project_counts_pending` |
| AC-25 | Monthly capacity (144h) + OT cap (36h) validated | CR-VAL-01 + CR-VAL-02 | `tests/services/test_allocation_constraints.py::test_monthly_caps` |
| **Dashboard** |
| AC-26 | All 6 core KPIs display accurate real-time numbers | Section 7.1 data source + MV refresh | `tests/integration/test_dashboard_kpis.py::test_values_match_source` |
| AC-27 | Filters apply instantly | Section 7.2 filter query parameters | `tests/api/test_dashboard_filters.py` |
| AC-28 | CSV export includes timestamp in filename | Export endpoint filename pattern | `tests/api/test_dashboard_export.py:: test_filename_has_timestamp` |
| AC-29 | Dashboard refreshes within 5s of data change | MV refresh + WebSocket invalidation | `tests/integration/test_dashboard_freshness.py` |
| AC-30 | Default date range = current month; preference persisted | Section 7.3 localStorage default | `tests/frontend/test_dashboard_preferences.py` |
| AC-31 | Notification center shows unread count + grouped | Section 8.2 bell badge + grouping | `tests/frontend/test_notification_center.py::test_unread_count` |
| **CSV Import** |
| AC-32 | CSV import Batch Create all-or-nothing | UC-RM-03 batch_create mode | `tests/services/test_csv_import.py::test_batch_create_rollback_on_error` |
| AC-33 | Import either fully succeeds or fully fails with downloadable error report | Error report CSV download endpoint | `tests/api/test_csv_import.py::test_error_report_downloadable` |
| **Non-Functional** |
| AC-34 | Rate records enforce no-overlap at DB level | Rate model UniqueConstraint | `tests/models/test_rate.py::test_overlap_constraint` |
| AC-35 | Soft delete (`is_active`) supported everywhere | Section 9.2 soft delete policy | `tests/models/test_soft_delete.py` |
| AC-36 | Audit log queryable by Admin/POD Manager with filters | Audit API endpoints | `tests/api/test_audit_log.py::test_filtered_query` |

**Total acceptance criteria mapped:** 36 items (all 28+ from PRD accounted for; some PRD items split into multiple testable units for clarity).

---

## Appendix A — Traceability to PRD

| PRD Section | Title | SFS Section(s) |
|-------------|-------|----------------|
| 2.1–2.2 | Resource + Rate Entities | Section 3.1–3.3 |
| 2.3 | CSV Import | Section 3.1 (UC-RM-03) |
| 2.5–2.7 | Project + Activity + Dependencies | Section 4.1–4.3 |
| 2.8 | Gantt Visualization | Section 4.4 |
| 3.1–3.5 | Allocation + Constraints + Auto-Allocation | Section 5.1–5.4 |
| 3.6 | Audit Log | Section 9.1 |
| 5.1–5.5 | Dashboard KPIs + Filters + Refresh | Section 7.1–7.4 |
| 10.1–10.4 | Notification Types + Center + Retention | Section 8.1–8.3 |
| 9 | Acceptance Criteria | Section 11 (full mapping) |

**Coverage:** 100% of PRD functional requirements addressed.

---

## Appendix B — Glossary

| Term | Definition |
|------|------------|
| HCM | Headcount Month — 144-hour standard capacity unit |
| K USD | Thousands of US dollars; all monetary values stored with 2 decimal places in K (e.g., 4.95 = $4,950) |
| OT | Overtime — hours worked beyond 8 regular hours/day (max 2) or 10 on holidays; monthly cap 36h |
| Batch Create | CSV import all-or-nothing mode — zero commit if any row fails |
| Upsert | CSV import row-level commit — valid rows persist, invalid rows skipped (Phase 2) |
| Four-eyes | Approval principle requiring distinct submitter and approver |

---

*End of Functional Specification*
