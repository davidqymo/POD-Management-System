# Technical Design Document (TDD) — POD Team Management System

**PRD Version:** 1.5
**Functional Spec Reference:** SPEC_FUNCTIONAL.md (SFS v1.0)
**Design Version:** 2.2
**Date:** 2026-04-19
**Status:** Draft — Implementation Ready
**Audience:** Backend Engineers, DevOps, QA, Frontend Engineers

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Data Model &amp; Schema](#4-data-model--schema)
5. [API Design](#5-api-design)
6. [Business Logic &amp; Services](#6-business-logic--services)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Frontend Sequence Diagrams](#8-frontend-sequence-diagrams)
9. [Dashboard &amp; Materialized Views](#9-dashboard--materialized-views)
10. [Security &amp; Authorization](#10-security--authorization)
11. [Concurrency &amp; Consistency](#11-concurrency--consistency)
12. [Audit &amp; Traceability](#12-audit--traceability)
13. [Audit Change Log](#13-audit-change-log)
14. [Notifications](#14-notifications)
15. [Deployment &amp; Operations](#15-deployment--operations)
16. [Implementation Roadmap](#16-implementation-roadmap)
17. [Frontend Pages &amp; View Specifications](#17-frontend-pages--view-specifications)
18. [Frontend Performance &amp; Optimization](#18-frontend-performance--optimization)
19. [Frontend Testing Strategy](#19-frontend-testing-strategy)
20. [Browser Support](#20-browser-support)
21. [Accessibility](#21-accessibility)
22. [Frontend Deployment &amp; Build](#22-frontend-deployment--build)
23. [Frontend Developer Guide](#23-frontend-developer-guide)
24. [End-to-End Flow Reference](#24-end-to-end-flow-reference)
25. [Frontend Known Issues &amp; Future Work](#25-frontend-known-issues--future-work)
26. [API Rate Limiting](#26-api-rate-limiting)
27. [Operational Runbooks](#27-operational-runbooks)

---

## 1. Introduction

This **Technical Design Document (TDD)** translates the System Functional Specification (SPEC_FUNCTIONAL.md) into an implementable technical blueprint.

**Scope (Phase 1 MVP):**

- Resource Management (CRUD + CSV import)
- Project Management (CRUD + activity templates + Gantt visualization)
- Allocation Engine (weekly assignment + constraint validation + approval workflow)
- Supply & Demand Dashboard (6 core KPIs with materialized views)
- Notification System (in-app + email, 9 event types)

**Out of Scope (Phase 2+):**

- Actual Consumption Tracking (variance vs planned)
- Email integration SMTP setup
- Bulk operations
- Advanced auto-allocation (ML-based skill matching)
- What-if Gantt simulation mode

---

## 2. System Architecture

### 2.1 Architecture Style — Three-Tier with Separation of Concerns

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  Frontend: React 18 + TS + Vite                            │
│  Charts: Recharts, Gantt: Frappe, State: React Query       │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS/REST + WS
┌───────────────────────▼─────────────────────────────────────┐
│                 API Layer (Spring Boot MVC)                  │
│  — @RestController @RequestMapping/@GetMapping              │
│  — Jakarta Validation (JSR-380) DTO validation              │
│  — Spring Security + JWT filter chain                        │
│  — @ControllerAdvice → JSON error envelope                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│              Service Layer (Business Logic)                  │
│  ResourceService | ProjectService | AllocationService      │
│  RateService     | ApprovalService | DashboardService      │
│  AutoAllocationService | NotificationService                │
│  — @Transactional                                            │
│  — Domain events (ApplicationEventPublisher)               │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│           Data Access Layer (Spring Data JPA + Hibernate)    │
│  JpaRepository, @Query (JPQL), optimistic locking @Version  │
│  — EntityManager CRUD operations                             │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│              PostgreSQL 15 + Materialized Views              │
│  Core tables + MV refresh every 5min (business hours)       │
└─────────────────────────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    Redis 7 (Cache Layer)                     │
│  Rate cache (TTL 30d), session store, pub/sub               │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer                | Technology                   | Version | Rationale                                    |
| -------------------- | ---------------------------- | ------- | -------------------------------------------- |
| **Language**   | Java                        | 17+    | LTS, virtual threads (Project Loom), strong typing |
| **Framework**  | Spring Boot                 | 3.2.x  | Auto-configuration, Spring MVC, Spring Data JPA, Spring Security |
| **ORM**        | Hibernate (via Spring Data JPA) | 6.x  | JPA 3.1, pessimistic/optimistic locking, Criteria API |
| **Database**   | PostgreSQL                   | 15+     | JSONB, partitioning, materialized views      |
| **Migrations** | Flyway                       | 10.x+   | Versioned SQL migrations                     |
| **Cache**      | Spring Data Redis + Lettuce  | —      | Sub-ms rate lookups, pub/sub                 |
| **Auth**       | Spring Security + JWT (jjwt)| —      | Stateless token authentication               |
| **Scheduler**  | Spring @Scheduled           | —      | Background jobs (MV refresh)                 |
| **Testing**    | JUnit 5 + Testcontainers + Mockito | — | Integration tests for Postgres+Redis         |
| **Frontend**   | React 18 + TypeScript + Vite | —      | Modern reactive UI                           |
| **Build**      | Maven                       | 3.9+   | Dependency management, build lifecycle       |

---

## 4. Data Model & Schema

All tables include `created_at`, `updated_at`, `is_active`. Timestamps in UTC.

### 4.1 Core Table Schemas

#### `resources`

```sql
CREATE TABLE resources (
    id BIGSERIAL PRIMARY KEY,
    external_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    cost_center_id VARCHAR(20) NOT NULL,
    billable_team_code VARCHAR(20) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('contractor','permanent')),
    skill VARCHAR(100),
    level INTEGER CHECK (level BETWEEN 1 AND 10),
    hire_date DATE,
    end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    is_billable BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

**Column Semantics:**
- `is_billable`: Whether this resource can be assigned to billable project work. `FALSE` = internal/bench resource, excluded from allocation eligibility and dashboard billable HCM calculations. Default `TRUE`.
- `is_active`: Soft-delete flag. `FALSE` = resource retired/terminated/archived; excluded from all queries unless explicitly requested. Default `TRUE`.

**Billable Filter:** Resource list endpoints and allocation creation implicitly filter `WHERE is_billable = TRUE AND is_active = TRUE`. Non-billable resources are viewable in Admin management list only.

#### `users`

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    roles JSONB NOT NULL DEFAULT '["VIEWER"]',
    resource_id BIGINT UNIQUE REFERENCES resources(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Rationale:** Separate authentication/authorization identity from resource (employee) records. Allows approvers (POD Managers) without corresponding employee resource profiles. `resource_id` is optional — links to employee record when user is also a billable resource.

#### `rates`

```sql
CREATE TABLE rates (
    id BIGSERIAL PRIMARY KEY,
    cost_center_id VARCHAR(20) NOT NULL,
    billable_team_code VARCHAR(20) NOT NULL,
    monthly_rate_K NUMERIC(10,2) NOT NULL,  -- in K USD (e.g., 14.40 = $14,400/month)
    effective_from CHAR(6) NOT NULL,
    effective_to CHAR(6) NOT NULL,
    is_billable BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_rate_period_unique UNIQUE (cost_center_id, billable_team_code, effective_from),
    CONSTRAINT chk_effective_dates CHECK (effective_to >= effective_from)
);
```

**Column Semantics:**
- `is_billable`: Whether this rate applies to billable project work. `FALSE` = internal/non-billable rate (used for bench or non-customer-facing teams), excluded from cost calculations. Default `TRUE`.
- `is_active`: Soft-delete flag. `FALSE` = rate superseded/retired; preserved for historical allocation audit trail. Default `TRUE`.

Rate queries for allocation cost lookup implicitly filter `WHERE is_billable = TRUE AND is_active = TRUE AND effective_from <= :yyyyMM AND effective_to >= :yyyyMM`.

**Period Contiguity & Auto-Closing Algorithm:**

When inserting a new rate for `(cost_center_id, billable_team_code)`:

1. Find the current active rate (where `effective_to IS NULL` or `effective_to = '999999'` special value)
2. Set its `effective_to` to `NEW.effective_from - INTERVAL '1 month'`
3. Insert the new rate with `effective_to = NULL` (will be closed when next rate arrives)
4. Old rates are preserved (`is_active = FALSE`) for historical calculations

**Java Service Implementation (Spring Data JPA + Transactional):**

```java
// backend/src/main/java/com/pod/service/RateService.java
@Service
@Slf4j
@RequiredArgsConstructor
public class RateService {

    private final RateRepository rateRepository;
    private final EntityManager entityManager;

    @Transactional
    public Rate createRate(CreateRateRequest request) {
        // Find current active rate for this (CC, BTC) with PESSIMISTIC_WRITE lock
        List<Rate> activeRates = rateRepository.findActiveByCostCenterAndTeam(
            request.getCostCenterId(),
            request.getBillableTeamCode(),
            LockModeType.PESSIMISTIC_WRITE
        );

        if (!activeRates.isEmpty()) {
            Rate current = activeRates.get(0);
            // Close current rate: effectiveTo = NEW.effectiveFrom minus 1 month
            YearMonth newEffectiveFrom = YearMonth.parse(request.getEffectiveFrom());
            YearMonth newEffectiveTo = newEffectiveFrom.minusMonths(1);
            current.setEffectiveTo(newEffectiveTo);
            rateRepository.save(current);
        }

        // Insert new rate with NULL effectiveTo (open-ended)
        Rate newRate = Rate.builder()
            .costCenterId(request.getCostCenterId())
            .billableTeamCode(request.getBillableTeamCode())
            .monthlyRateK(request.getMonthlyRateK())
            .effectiveFrom(YearMonth.parse(request.getEffectiveFrom()))
            .effectiveTo(null)
            .isActive(true)
            .build();

        return rateRepository.save(newRate);
    }
}
```

**Concurrency Handling:** `LockModeType.PESSIMISTIC_WRITE` obtains a row-level lock on the active rate. Concurrent requests block at the SELECT, ensuring only one transaction modifies the active rate at a time. After the first transaction commits and sets `effectiveTo`, subsequent transactions see no active rate and insert the new rate correctly.

**Validation Rules:**

- NEW.effective_from must be exactly one month after PREV.effective_from (contiguous)
- No overlapping periods for same `(CC, BTC)` — enforced by unique index on `(CC, BTC, effective_from)` where `is_active = TRUE`
- Gap detection: if `NEW.effective_from` does not equal `PREV.effective_from + 1 month`, raise `RatePeriodGapError`

**Lookup Query (used in allocation cost calculation):**

```sql
SELECT monthly_rate_K
FROM rates
WHERE cost_center_id = :cc
  AND billable_team_code = :btc
  AND effective_from <= :target_YYYYMM
  AND (effective_to IS NULL OR effective_to >= :target_YYYYMM)
  AND is_active = TRUE
ORDER BY effective_from DESC
LIMIT 1;
```

**Indexes Required:**

```sql
CREATE INDEX idx_rates_lookup_active ON rates(cost_center_id, billable_team_code, effective_from)
WHERE is_active = TRUE;

CREATE UNIQUE INDEX uq_rate_period_start ON rates(cost_center_id, billable_team_code, effective_from)
WHERE is_active = TRUE;
```

---

#### `projects`

```sql
CREATE TABLE projects (
    id BIGSERIAL PRIMARY KEY,
    request_id VARCHAR(50),
    billable_product_id VARCHAR(50),
    clarity_id VARCHAR(50),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    budget_total_K NUMERIC(12,2) NOT NULL,
    budget_monthly_breakdown JSONB,
    planned_start_date DATE NOT NULL,
    planned_end_date DATE NOT NULL,
    actual_start_date DATE,
    actual_end_date DATE,
    status VARCHAR(25) NOT NULL DEFAULT 'requested',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    version INTEGER NOT NULL DEFAULT 1,
    created_by BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_project_status CHECK (status IN (
        'requested',      -- initial submission
        'executing',      -- work in progress
        'on_hold',        -- paused
        'completed',      -- finished successfully
        'cancelled'       -- terminated early
    ))
);
```

#### `activities`

```sql
CREATE TABLE activities (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    planned_start_date DATE,
    planned_end_date DATE,
    estimated_hours NUMERIC(6,2),
    is_milestone BOOLEAN NOT NULL DEFAULT FALSE,
    milestone_status VARCHAR(20),
    sequence INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `activity_dependencies`

```sql
CREATE TABLE activity_dependencies (
    predecessor_id BIGINT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    successor_id BIGINT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    dependency_type VARCHAR(20) NOT NULL DEFAULT 'FS',
    PRIMARY KEY (predecessor_id, successor_id),
    CONSTRAINT chk_no_self_dep CHECK (predecessor_id != successor_id)
);
```

#### `allocations`

```sql
CREATE TABLE allocations (
    id BIGSERIAL PRIMARY KEY,
    resource_id BIGINT NOT NULL REFERENCES resources(id),
    project_id BIGINT NOT NULL REFERENCES projects(id),
    activity_id BIGINT REFERENCES activities(id),
    week_start_date DATE NOT NULL,
    hours NUMERIC(5,2) NOT NULL,  -- hours per week within the week_start_date range
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    version INTEGER NOT NULL DEFAULT 1,
    approved_by BIGINT REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason VARCHAR(500),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_active_allocation UNIQUE (resource_id, project_id, week_start_date)
        WHERE is_active = TRUE AND status IN ('pending','approved'),
    CONSTRAINT chk_four_eyes CHECK (approved_by IS NULL OR approved_by != resource_id)
);
```

#### `holidays`

```sql
CREATE TABLE holidays (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    cost_center_filter VARCHAR(20),
    holiday_date DATE NOT NULL,
    description TEXT,
    created_by_user_id BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_holiday_unique UNIQUE (name, holiday_date, cost_center_filter)
);
```

#### `audit_log` (partitioned by month)

```sql
CREATE TABLE audit_log (
    id BIGSERIAL,
    entity_type VARCHAR(30) NOT NULL,
    entity_id BIGINT NOT NULL,
    field_name VARCHAR(50),
    old_value JSONB,
    new_value JSONB,
    changed_by_user_id BIGINT NOT NULL REFERENCES users(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    change_reason TEXT,
    revision_type VARCHAR(20) NOT NULL,
    PRIMARY KEY (id, changed_at)
) PARTITION BY RANGE (changed_at);
```

#### `notifications`

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id BIGINT NOT NULL REFERENCES resources(id),
    type VARCHAR(30) NOT NULL,
    project_id BIGINT REFERENCES projects(id),
    allocation_id BIGINT REFERENCES allocations(id),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);
```

---

## 5. API Design

### 5.1 REST API Conventions

- **Base path:** `/api/v1`
- **Authentication:** `Authorization: Bearer <jwt>`
- **Envelope:** `{"success": true, "data": {...}, "message": "...", "timestamp": "..."}`
- **Errors:** `{"success": false, "error_code": "...", "message": "...", "suggested_fixes": [...]}`

### 5.2 Resource APIs

| Method    | Endpoint                   | Role  | Purpose                                                            |
| --------- | -------------------------- | ----- | ------------------------------------------------------------------ |
| `GET`   | `/api/v1/auth/me`        | Auth  | Return current user profile (id, email, roles, linked_resource_id) |
| `GET`   | `/resources`             | Any   | List with filters (`?skill=backend&level=senior`)                |
| `POST`  | `/resources`             | Admin | Create staff record                                                |
| `GET`   | `/resources/{id}`        | Any   | Detail + current rate                                              |
| `PUT`   | `/resources/{id}`        | Admin | Update mutable fields                                              |
| `PATCH` | `/resources/{id}/status` | Admin | Change status (requires reason; Admin-only per PRD 2.1)            |
| `POST`  | `/resources/import/csv`  | Admin | Upload CSV → preview → confirm                                   |

#### 5.2.1 `/export/resources` Query Implementation

Backend controller: `ExportController.getResourceCsv()` delegates to `ResourceExportService.exportResourcesAsCsv()`. The query fetches active resources with their **latest effective rate** joined via LATERAL subquery to avoid rate-period joins in the main FROM clause.

**SQL implementation (Java Spring `JdbcTemplate` query):**

```sql
-- ResourceExportService.java — exported as CSV stream (no pagination limit)
SELECT
    r.id,
    r.external_id,
    r.name,
    r.cost_center_id,
    r.billable_team_code,
    r.category,
    r.skill,
    r.level,
    r.hire_date,
    r.end_date,
    r.status,
    r.is_billable,
    COALESCE(latest_rate.monthly_rate_K, 0) as latest_monthly_rate_K,
    COALESCE(latest_rate.effective_from, '') as rate_effective_from
FROM resources r
LEFT JOIN LATERAL (
    SELECT rate.monthly_rate_K, rate.effective_from
    FROM rates rate
    WHERE rate.cost_center_id = r.cost_center_id
      AND rate.billable_team_code = r.billable_team_code
      AND rate.is_active = TRUE
      AND rate.is_billable = TRUE
      AND rate.effective_from <= TO_CHAR(CURRENT_DATE, 'YYYYMM')
      AND rate.effective_to >= TO_CHAR(CURRENT_DATE, 'YYYYMM')
    ORDER BY rate.effective_from DESC
    LIMIT 1
) latest_rate ON TRUE
WHERE r.is_active = TRUE
ORDER BY r.cost_center_id, r.billable_team_code, r.name;
```

**CSV column mapping:**

| CSV Column           | Source Field                     | Notes                                       |
| -------------------- | -------------------------------- | ------------------------------------------- |
| `id`                 | `r.id`                          | Internal PK — omitted from public export   |
| `external_id`        | `r.external_id`                 | Employee number / staff ID                 |
| `name`               | `r.name`                        | Full name                                   |
| `cost_center_id`     | `r.cost_center_id`              | Cost center code                            |
| `billable_team_code` | `r.billable_team_code`          | Team code                                   |
| `category`           | `r.category`                    | `contractor` / `permanent`                  |
| `skill`              | `r.skill`                       | e.g., `backend`, `frontend`, `qa`           |
| `level`              | `r.level`                       | 1–10                                        |
| `status`             | `r.status`                      | `active`, `on-leave`, `terminated`          |
| `is_billable`        | `r.is_billable`                 | `true` / `false`                            |
| `monthly_rate_K`     | `latest_rate.monthly_rate_K`    | `0` if no matching active rate (data gap!) |
| `rate_effective_from`| `latest_rate.effective_from`    | YYYYMM string; blank if no rate found       |

**Rate Gap Detection:** If `latest_rate.monthly_rate_K IS NULL` for any billable resource (`is_billable = TRUE`), the service logs an error with code `RATE_GAP_DETECTED` and includes that resource in the `"warnings"` section of the CSV download (separate sheet or footer — client-side decision).

### 5.3 Project & Activity APIs

| Method    | Endpoint                      | Purpose                                        |
| --------- | ----------------------------- | ---------------------------------------------- |
| `GET`   | `/projects`                 | List with status/date/budget filters           |
| `POST`  | `/projects`                 | Create new project (PM only)                   |
| `PATCH` | `/projects/{id}`            | Update mutable fields (not status)             |
| `PATCH` | `/projects/{id}/status`     | Transition via state machine                   |
| `POST`  | `/projects/{id}/activities` | Bulk create (validates cycle)                  |
| `GET`   | `/projects/{id}/gantt`      | Activities + dependencies + critical path JSON |

### 5.4 Allocation APIs

| Method   | Endpoint                 | Purpose                                        |
| -------- | ------------------------ | ---------------------------------------------- |
| `POST` | `/allocations`         | Create allocation (→ PENDING, needs approval) |
| `GET`  | `/allocations`         | Query by resource/project/week                 |
| `POST` | `/allocations/approve` | Approve (POD Manager only)                     |
| `POST` | `/allocations/reject`  | Reject with reason                             |
| `POST` | `/allocations/auto`    | Run auto-allocation engine                     |

### 5.5 Dashboard APIs

| Method  | Endpoint                     | Purpose                                      |
| ------- | ---------------------------- | -------------------------------------------- |
| `GET` | `/dashboard/supply-demand` | Monthly bar chart: capacity vs allocated HCM |
| `GET` | `/dashboard/burn-rate`     | Trend: budget remaining over time            |
| `GET` | `/dashboard/variance`      | Project-level planned vs actual variance     |

### 5.6 Rate APIs

| Method  | Endpoint                      | Purpose                                 |
| ------- | ----------------------------- | --------------------------------------- |
| `GET`  | `/rates`                    | List all rates (filterable by CC, BTC)  |
| `GET`  | `/rates/{id}`               | Detail single rate                      |
| `POST` | `/rates`                    | Create new rate (Admin; handles auto-close of previous active) |
| `PATCH`| `/rates/{id}`               | Update rate (Admin only; no effective date change allowed on closed rates) |
| `DELETE`| `/rates/{id}`              | Soft delete (is_active = false); history retained |
| `GET`  | `/rates/history/{cc}/{btc}` | Full rate history for cost center/team  |

**Validation:** New rate `effectiveFrom` must be exactly +1 month after current active rate's `effectiveFrom`. Overlap prohibited. Contiguous month sequence enforced.

### 5.7 Holiday APIs

| Method  | Endpoint                 | Purpose                                     |
| ------- | ------------------------ | ------------------------------------------- |
| `GET`  | `/holidays`            | List all holidays (optionally by cost_center) |
| `POST` | `/holidays`            | Create single holiday (Admin)               |
| `POST` | `/holidays/batch`      | Bulk import from CSV (Admin)               |
| `PATCH`| `/holidays/{id}`       | Update date/description (Admin)             |
| `DELETE`| `/holidays/{id}`      | Soft delete (Admin)                         |

**Business Rule:** Global holidays (cost_center_id = null) apply to all resources; CC-specific holidays override/union with global.

### 5.8 Export APIs

| Method  | Endpoint                              | Purpose                                           |
| ------- | ------------------------------------- | ------------------------------------------------- |
| `GET`  | `/export/resources`                 | Export resources + latest active rates as CSV     |
| `GET`  | `/export/allocations`               | Export allocations for given filters as CSV       |
| `GET`  | `/export/audit-log`                 | Export audit records with filters (Admin only)    |
| `GET`  | `/export/projects/{id}/gantt`       | Export Gantt chart data as JSON or PDF            |

**Filename format:** `{entity}_export_YYYY-MM-DD_HHMM.csv`. Max rows per export: 100,000.

### 5.9 Report APIs

| Method  | Endpoint                        | Purpose                                         |
| ------- | ------------------------------- | ------------------------------------------------ |
| `GET`  | `/reports/project-budget`     | Budget vs actual spend per project (tabular)     |
| `GET`  | `/reports/utilization`        | Resource utilization heatmap by skill/cost center |
| `GET`  | `/reports/rate-variance`      | Historical rate change analysis across resources |

All report endpoints support date range filters and CSV export.

### 5.6 Rate APIs

| Method  | Endpoint                      | Purpose                                 |
| ------- | ----------------------------- | --------------------------------------- |
| `GET`  | `/rates`                    | List all rates (filterable by CC, BTC)  |
| `GET`  | `/rates/{id}`               | Detail single rate                      |
| `POST` | `/rates`                    | Create new rate (Admin; handles auto-close of previous active) |
| `PATCH`| `/rates/{id}`               | Update rate (Admin only; no effective date change allowed on closed rates) |
| `DELETE`| `/rates/{id}`              | Soft delete (is_active = false); history retained |
| `GET`  | `/rates/history/{cc}/{btc}` | Full rate history for cost center/team  |

**Validation:** New rate `effectiveFrom` must be exactly +1 month after current active rate's `effectiveFrom`. Overlap prohibited. Contiguous month sequence enforced.

### 5.7 Holiday APIs

| Method  | Endpoint                 | Purpose                                     |
| ------- | ------------------------ | ------------------------------------------- |
| `GET`  | `/holidays`            | List all holidays (optionally by cost_center) |
| `POST` | `/holidays`            | Create single holiday (Admin)               |
| `POST` | `/holidays/batch`      | Bulk import from CSV (Admin)               |
| `PATCH`| `/holidays/{id}`       | Update date/description (Admin)             |
| `DELETE`| `/holidays/{id}`      | Soft delete (Admin)                         |

**Business Rule:** Global holidays (cost_center_id = null) apply to all resources; CC-specific holidays override/union with global.

### 5.8 Export APIs

| Method  | Endpoint                              | Purpose                                           |
| ------- | ------------------------------------- | ------------------------------------------------- |
| `GET`  | `/export/resources`                 | Export resources + latest active rates as CSV     |
| `GET`  | `/export/allocations`               | Export allocations for given filters as CSV       |
| `GET`  | `/export/audit-log`                 | Export audit records with filters (Admin only)    |
| `GET`  | `/export/projects/{id}/gantt`       | Export Gantt chart data as JSON or PDF            |

**Filename format:** `{entity}_export_YYYY-MM-DD_HHMM.csv`. Max rows per export: 100,000.

### 5.9 Report APIs

| Method  | Endpoint                        | Purpose                                         |
| ------- | ------------------------------- | ------------------------------------------------ |
| `GET`  | `/reports/project-budget`     | Budget vs actual spend per project (tabular)     |
| `GET`  | `/reports/utilization`        | Resource utilization heatmap by skill/cost center |
| `GET`  | `/reports/rate-variance`      | Historical rate change analysis across resources |

All report endpoints support date range filters and CSV export.

---

### 5.6 API Error Handling Standards

#### 5.6.1 Error Envelope Structure

All error responses follow this envelope:

```json
{
  "success": false,
  "error": {
    "code": "BUDGET_EXCEEDED",
    "message": "Project budget exceeded by $12,500",
    "details": {
      "project_id": "proj-123",
      "budget_remaining_K": -12.5
    },
    "suggested_fixes": ["Reduce hours", "Increase budget"],
    "request_id": "req_abc123",
    "timestamp": "2026-04-19T10:30:00Z"
  }
}
```

**Fields:**

- `code`: Machine-readable error identifier (UPPER_SNAKE_CASE)
- `message`: Human-readable description (max 200 chars)
- `details`: Optional structured data for client debugging
- `suggested_fixes`: Array of actionable remediation steps
- `request_id`: Correlation ID for tracing through logs
- `timestamp`: UTC timestamp of error generation

#### 5.6.2 HTTP Status Code Mapping

| Exception Class              | HTTP Code | When to Use                                          | Example                                                                                          |
| ---------------------------- | --------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `ValidationError`          | 400       | Malformed request body, missing required fields      | `{"error": {"code": "VALIDATION_ERROR", "message": "Missing required field: resource_id"}}`    |
| `AuthorizationError`       | 401       | Missing/invalid JWT token                            | `WWW-Authenticate: Bearer error="invalid_token"`                                               |
| `PermissionError`          | 403       | Authenticated but insufficient role                  | `{"error": {"code": "INSUFFICIENT_PRIVILEGES"}}`                                               |
| `NotFoundError`            | 404       | Resource not found or soft-deleted                   | `{"error": {"code": "RESOURCE_NOT_FOUND", "details": {"id": "unknown"}}}`                      |
| `ConflictError`            | 409       | Concurrent modification, duplicate key, rate overlap | `{"error": {"code": "OPTIMISTIC_LOCK_CONFLICT", "suggested_fixes": ["Refresh and retry"]}}`    |
| `ConstraintViolationError` | 422       | Business rule violation (allocation constraints)     | `{"error": {"code": "MONTHLY_CAP_EXCEEDED", "details": {"current_hours": 150, "limit": 144}}}` |
| `RateLimitError`           | 429       | Too many requests                                    | `Retry-After: 60` header + `{"error": {"code": "RATE_LIMIT_EXCEEDED"}}`                      |
| `ServiceUnavailableError`  | 503       | Database/Redis down, external service failure        | `{"error": {"code": "DEPENDENCY_FAILURE", "details": {"service": "postgres"}}}`                |

**Decision Rationale:**

- Use **400** for syntactic validation (Jakarta Validation `ConstraintViolationException`)
- Use **422** for semantic business rule violations (allocation constraints, budget exceeded)
- Use **409** for uniqueness conflicts and optimistic lock failures
- Always include `request_id` in logs to correlate client error with server-side trace

#### 5.6.3 Global Exception Handler (Spring Boot @ControllerAdvice)

```java
// backend/src/main/java/com/pod/web/exception/GlobalExceptionHandler.java
@RestControllerAdvice
@RequiredArgsConstructor
@Slf4j
public class GlobalExceptionHandler {

    private final ObjectMapper objectMapper;

    // 1. Custom application errors
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiResponse<Object>> handleApiException(
            ApiException ex, HttpServletRequest request) {

        Map<String, Object> errorDetails = Map.of(
            "code", ex.getCode(),
            "message", ex.getMessage(),
            "details", ex.getDetails(),
            "suggestedFixes", ex.getSuggestedFixes(),
            "requestId", RequestContext.getRequestId(),
            "timestamp", OffsetDateTime.now().toString()
        );

        ApiResponse<Object> response = ApiResponse.<Object>builder()
            .success(false)
            .error(ApiResponse.ErrorEnvelope.builder()
                .code(ex.getCode())
                .message(ex.getMessage())
                .details(ex.getDetails())
                .suggestedFixes(ex.getSuggestedFixes())
                .requestId(RequestContext.getRequestId())
                .timestamp(OffsetDateTime.now().toString())
                .build())
            .requestId(RequestContext.getRequestId())
            .timestamp(OffsetDateTime.now().toString())
            .build();

        return ResponseEntity
            .status(HttpStatus.valueOf(ex.getStatus().value()))
            .body(response);
    }

    // 2. JPA/Hibernate exceptions
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Object>> handleDataIntegrity(
            DataIntegrityViolationException ex, HttpServletRequest request) {

        String message = "Database constraint violation";
        String code = "DATABASE_CONSTRAINT_VIOLATION";

        Throwable rootCause = ExceptionUtils.getRootCause(ex);
        if (rootCause != null && rootCause.getMessage() != null) {
            String msg = rootCause.getMessage().toLowerCase();
            if (msg.contains("unique") || msg.contains("duplicate")) {
                code = "DUPLICATE_KEY";
                message = "A record with this identifier already exists";
            }
        }

        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiResponse.error(code, message,
                RequestContext.getRequestId()));
    }

    // 3. Validation (Jakarta Validation) exceptions
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Object>> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest request) {

        List<String> errors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(err -> String.format("%s: %s", err.getField(), err.getDefaultMessage()))
            .toList();

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.error(
                "VALIDATION_FAILED",
                "Request validation failed",
                RequestContext.getRequestId(),
                errors));
    }

    // 4. Entity not found
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiResponse<Object>> handleNotFound(
            EntityNotFoundException ex, HttpServletRequest request) {

        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ApiResponse.error(
                "NOT_FOUND",
                ex.getMessage(),
                RequestContext.getRequestId()));
    }

    // Fallback for unhandled exceptions
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleUnhandled(
            Exception ex, HttpServletRequest request) {

        log.error("Unhandled exception: requestId={}", RequestContext.getRequestId(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiResponse.error(
                "INTERNAL_ERROR",
                "An unexpected error occurred",
                RequestContext.getRequestId()));
    }
}
```

#### 5.6.4 Request ID Propagation (Spring Filter)

Every request gets a unique `X-Request-ID` header via servlet filter:

```java
// backend/src/main/java/com/pod/filter/RequestIdFilter.java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestIdFilter implements Filter {

    private static final String REQUEST_ID_HEADER = "X-Request-ID";
    private static final String REQUEST_ID_MDC_KEY = "requestId";
    private final ThreadLocal<String> requestIdHolder = new ThreadLocal<>();

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest request = (HttpServletRequest) req;
        String requestId = request.getHeader(REQUEST_ID_HEADER);

        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }

        requestIdHolder.set(requestId);
        RequestContext.setRequestId(requestId);  // MDC + ThreadLocal context

        try {
            chain.doFilter(req, res);
        } finally {
            requestIdHolder.remove();
            RequestContext.clear();
        }
    }
}

// RequestContext.java — holds request-scoped ThreadLocal
public class RequestContext {
    private static final ThreadLocal<String> REQUEST_ID = new ThreadLocal<>();

    public static void setRequestId(String id) {
        REQUEST_ID.set(id);
        MDC.put("requestId", id);
    }

    public static String getRequestId() {
        return REQUEST_ID.get();
    }

    public static void clear() {
        REQUEST_ID.remove();
        MDC.remove("requestId");
    }
}

// Logback pattern includes requestId via %X{requestId}
```

**Logback configuration (`logback-spring.xml`):** Includes `%X{requestId}` in pattern so all SLF4J/Logback logs automatically capture the request context:
```xml
<pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} [%X{requestId}] - %msg%n</pattern>
```

**Usage in services/controllers:**
```java
log.info("allocation_created", 
    kv("allocationId", allocation.getId()),
    kv("requestId", RequestContext.getRequestId()));
```

---

    if not filtered:
            allocations.append(AllocationError("NO_CANDIDATE", hours))
            continue

    best = filtered[0]
        if not simulate:
            create_allocation(resource=best, project=project, hours=hours)
        allocations.append(AllocationSuccess(best, hours))

    return allocations

```

---

## 6. Business Logic & Services

### 6.1 Allocation Constraint Validator

Five constraints evaluated per allocation submission:

```java
// backend/src/main/java/com/pod/service/AllocationConstraintValidator.java
@Service
@Slf4j
@RequiredArgsConstructor
public class AllocationConstraintValidator {

    private final AllocationRepository allocationRepository;

    public List<ConstraintViolation> validate(Long resourceId, Long projectId,
                                               LocalDate weekStart, BigDecimal hours) {

        List<ConstraintViolation> violations = new ArrayList<>();
        YearMonth month = YearMonth.from(weekStart);

        // 1. Daily hours avg (5-day week) ≤ 10h/day
        BigDecimal dailyAvg = hours.divide(BigDecimal.valueOf(5), RoundingMode.HALF_UP);
        if (dailyAvg.compareTo(BigDecimal.valueOf(10)) > 0) {
            violations.add(ConstraintViolation.builder()
                .code("DAILY_HOURS_EXCEEDED")
                .message(String.format("Daily avg %.1fh exceeds 10h max", dailyAvg))
                .resourceId(resourceId)
                .projectId(projectId)
                .details(Map.of("daily_avg", dailyAvg, "limit", 10))
                .build());
        }

        // 2. Monthly total cap ≤ 144h (active resources only)
        BigDecimal existing = allocationRepository.sumApprovedHoursForActiveResource(resourceId, month);
        BigDecimal total = existing.add(hours);
        if (total.compareTo(BigDecimal.valueOf(144)) > 0) {
            violations.add(ConstraintViolation.builder()
                .code("MONTHLY_CAP_EXCEEDED")
                .message(String.format("Monthly total %.0fh exceeds 144h cap", total))
                .resourceId(resourceId)
                .projectId(projectId)
                .details(Map.of(
                    "current_hours", existing,
                    "proposed_hours", hours,
                    "total", total,
                    "limit", 144
                ))
                .build());
        }

        // 3. Monthly OT cap ≤ 36h (OT = max(0, total – 144))
        BigDecimal ot = total.subtract(BigDecimal.valueOf(144)).max(BigDecimal.ZERO);
        if (ot.compareTo(BigDecimal.valueOf(36)) > 0) {
            violations.add(ConstraintViolation.builder()
                .code("OT_MONTHLY_CAP")
                .message(String.format("Monthly OT %.0fh exceeds 36h cap", ot))
                .resourceId(resourceId)
                .projectId(projectId)
                .details(Map.of("ot_hours", ot, "limit", 36))
                .build());
        }

        // 4. Project spread limit — ≤ 5 distinct projects/month
        Long projectCount = allocationRepository.countDistinctActiveProjectsInMonth(
            resourceId, month, projectId);
        if (projectCount >= 5) {
            violations.add(ConstraintViolation.builder()
                .code("PROJECT_SPREAD_LIMIT")
                .message(String.format("Resource already on %d projects; max 5", projectCount))
                .resourceId(resourceId)
                .projectId(projectId)
                .details(Map.of("current_project_count", projectCount, "limit", 5))
                .build());
        }

        // Budget validation handled by BudgetValidationService separately
        return violations;
    }
}
```

**Repository helpers (JPA @Query with JPQL/Criteria API):**

```java
// AllocationRepository.java
@Query("SELECT COALESCE(SUM(a.hours), 0) FROM Allocation a " +
       "JOIN Resource r ON a.resource.id = r.id " +
       "WHERE a.resource.id = :resourceId AND a.active = true " +
       "AND a.status = 'APPROVED' AND r.status IN ('ACTIVE') " +
       "AND FUNCTION('DATE_TRUNC', 'month', a.weekStartDate) = :month")
BigDecimal sumApprovedHoursForActiveResource(
    @Param("resourceId") Long resourceId,
    @Param("month") YearMonth month);

@Query("SELECT COUNT(DISTINCT a.project.id) FROM Allocation a " +
       "JOIN Resource r ON a.resource.id = r.id " +
       "WHERE a.resource.id = :resourceId AND a.active = true " +
       "AND a.status = 'APPROVED' AND r.status IN ('ACTIVE') " +
       "AND FUNCTION('DATE_TRUNC', 'month', a.weekStartDate) = :month " +
       "AND a.project.id != :excludeProjectId")
Long countDistinctActiveProjectsInMonth(
    @Param("resourceId") Long resourceId,
    @Param("month") YearMonth month,
    @Param("excludeProjectId") Long excludeProjectId);
```

**Database partial indexes for performance:**

```sql
CREATE INDEX idx_allocations_resource_month_active
    ON allocations(resource_id, week_start_date, is_active, status)
    WHERE is_active = true AND status = 'approved';

CREATE INDEX idx_resources_id_status ON resources(id, status);
```

**ConstraintViolation** is a typed error DTO (similar to TDD's ErrorType V), with fields: `code`, `message`, `resourceId`, `projectId`, `details` (Map<String, Object>).

### 6.2 ResourceService — State Transition Methods

**`changeStatus(Long resourceId, ResourceStatus newStatus, String reason)`**

```java
// backend/src/main/java/com/pod/service/ResourceService.java
@Service
@Slf4j
@RequiredArgsConstructor
public class ResourceService {

    private final ResourceRepository resourceRepository;
    private final AuditService auditService;

    @Transactional
    public ResourceDTO changeStatus(Long resourceId, ResourceStatus newStatus, String reason) {
        Resource resource = resourceRepository.findByIdWithLock(resourceId, LockModeType.PESSIMISTIC_WRITE)
            .orElseThrow(() -> new ResourceNotFoundException(resourceId));

        ResourceStatus oldStatus = resource.getStatus();

        // Validate transition rules
        if (!isValidTransition(oldStatus, newStatus)) {
            throw new InvalidStatusTransitionException(
                String.format("Cannot transition from %s to %s", oldStatus, newStatus));
        }

        resource.setStatus(newStatus);
        resource.setUpdatedAt(Instant.now());
        resourceRepository.save(resource);

        // Audit log
        auditService.logStatusChange(
            AuditEntityType.RESOURCE, resourceId,
            "status", oldStatus.name(), newStatus.name(),
            reason != null ? reason : "Status update via ResourceService.changeStatus()");

        log.info("Resource {} status changed {} → {} by {}",
            resourceId, oldStatus, newStatus, SecurityContextHolder.getContext().getAuthentication().getName());

        return ResourceMapper.toDTO(resource);
    }

    private boolean isValidTransition(ResourceStatus from, ResourceStatus to) {
        // ALLOWED: active → on-leave, on-leave → active, active → terminated
        // DENIED: terminated → any (closed cycle)
        return switch (from) {
            case ACTIVE -> to == ON_LEAVE || to == TERMINATED;
            case ON_LEAVE -> to == ACTIVE;
            case TERMINATED -> false;
            default -> false;
        };
    }
}
```

**Repository helper for PESSIMISTIC_WRITE locking (prevent concurrent status edits):**

```java
// backend/src/main/java/com/pod/repository/ResourceRepository.java
@Repository
public interface ResourceRepository extends JpaRepository<Resource, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Resource r WHERE r.id = :id")
    Optional<Resource> findByIdWithLock(@Param("id") Long id);
}
```

### 6.3 ProjectService — Terminal Status Transitions

**`transitionToTerminal(Long projectId, ProjectStatus targetStatus, String reason)`**

```java
// backend/src/main/java/com/pod/service/ProjectService.java
@Service
@Slf4j
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final AllocationRepository allocationRepository;
    private final AuditService auditService;

    @Transactional
    public ProjectDTO transitionToTerminal(Long projectId, ProjectStatus targetStatus, String reason) {
        Project project = projectRepository.findByIdWithLock(projectId, LockModeType.PESSIMISTIC_WRITE)
            .orElseThrow(() -> new ProjectNotFoundException(projectId));

        ProjectStatus oldStatus = project.getStatus();

        // Only terminal states allowed: COMPLETED, CANCELLED, SUSPENDED
        if (!targetStatus.isTerminal()) {
            throw new IllegalArgumentException("targetStatus must be a terminal state: COMPLETED, CANCELLED, or SUSPENDED");
        }

        // Validate: no PENDING allocations may exist
        Long pendingCount = allocationRepository.countByProjectIdAndStatus(projectId, AllocationStatus.PENDING);
        if (pendingCount > 0) {
            throw new IllegalStateException(
                String.format("Cannot transition to %s: %d pending allocations must be approved or withdrawn first",
                targetStatus, pendingCount));
        }

        // OPTIONAL: soft-close all allocations if transitioning to CANCELLED/SUSPENDED
        if (targetStatus == ProjectStatus.CANCELLED || targetStatus == ProjectStatus.SUSPENDED) {
            allocationRepository.softCloseAllByProject(projectId, targetStatus.name());
            log.info("Soft-closed all allocations for project {} due to status change to {}",
                projectId, targetStatus);
        }

        project.setStatus(targetStatus);
        project.setUpdatedAt(Instant.now());
        projectRepository.save(project);

        // Audit trail
        auditService.logStatusChange(
            AuditEntityType.PROJECT, projectId,
            "status", oldStatus.name(), targetStatus.name(),
            reason != null ? reason : "Terminal transition via ProjectService.transitionToTerminal()");

        log.info("Project {} status {} → {} by {}", projectId, oldStatus, targetStatus,
            SecurityContextHolder.getContext().getAuthentication().getName());

        return ProjectMapper.toDTO(project);
    }
}
```

**Repository helpers:**

```java
// backend/src/main/java/com/pod/repository/ProjectRepository.java
@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Project p WHERE p.id = :id")
    Optional<Project> findByIdWithLock(@Param("id") Long id);
}

// backend/src/main/java/com/pod/repository/AllocationRepository.java
public interface AllocationRepository extends JpaRepository<Allocation, Long> {

    @Modifying
    @Query("UPDATE Allocation a SET a.isActive = false, a.status = :status, a.updatedAt = NOW() " +
           "WHERE a.project.id = :projectId AND a.isActive = true")
    int softCloseAllByProject(@Param("projectId") Long projectId, @Param("status") String status);

    @Query("SELECT COUNT(a) FROM Allocation a WHERE a.project.id = :projectId AND a.status = 'PENDING'")
    long countByProjectIdAndStatus(@Param("projectId") Long projectId, AllocationStatus status);
}
```

**`ProjectStatus.isTerminal()` helper:**

```java
public enum ProjectStatus {
    DRAFT,
    ACTIVE,
    ON_HOLD,
    COMPLETED,   // terminal
    CANCELLED,   // terminal
    SUSPENDED;   // terminal

    public boolean isTerminal() {
        return this == COMPLETED || this == CANCELLED || this == SUSPENDED;
    }
}
```

**Guarded transition plan:** `DRAFT` → `ACTIVE` (no checks), `ACTIVE` → `ON_HOLD` / `COMPLETED` / `CANCELLED` / `SUSPENDED`, `ON_HOLD` → `ACTIVE` only. All other transitions rejected.

---

### 6.2 Critical Path Calculator (PERT/CPM)

**Algorithm:** Topological sort (Kahn's) + forward/backward pass.

```java
// backend/src/main/java/com/pod/service/GanttService.java
@Service
@Slf4j
@RequiredArgsConstructor
public class GanttService {

    private final ActivityRepository activityRepository;

    public CriticalPathResult calculateCriticalPath(Long projectId) {
        List<Activity> activities = activityRepository.findByProjectIdWithDependencies(projectId);

        // Build adjacency list and indegree map
        Map<Long, List<Long>> adj = new HashMap<>();
        Map<Long, Integer> indegree = new HashMap<>();
        for (Activity act : activities) {
            adj.putIfAbsent(act.getId(), new ArrayList<>());
            indegree.put(act.getId(), 0);
        }
        for (Activity act : activities) {
            for (ActivityDependency dep : act.getPredecessors()) {
                Long predId = dep.getPredecessor().getId();
                adj.get(predId).add(act.getId());
                indegree.put(act.getId(), indegree.get(act.getId()) + 1);
            }
        }

        // Topological sort (Kahn's)
        Deque<Long> queue = new ArrayDeque<>();
        for (Map.Entry<Long, Integer> e : indegree.entrySet()) {
            if (e.getValue() == 0) queue.add(e.getKey());
        }
        List<Long> topo = new ArrayList<>();
        while (!queue.isEmpty()) {
            Long node = queue.poll();
            topo.add(node);
            for (Long succ : adj.get(node)) {
                indegree.put(succ, indegree.get(succ) - 1);
                if (indegree.get(succ) == 0) queue.add(succ);
            }
        }
        if (topo.size() != activities.size()) {
            throw new CycleDetectedException("Cycle in activity dependencies");
        }

        // Forward pass (ES/EF)
        Map<Long, Integer> es = new HashMap<>();
        Map<Long, Integer> ef = new HashMap<>();
        for (Long node : topo) {
            Activity act = findById(activities, node);
            int predEfMax = act.getPredecessors().stream()
                .mapToInt(d -> ef.get(d.getPredecessor().getId()))
                .max()
                .orElse(0);
            es.put(node, predEfMax);
            long durationDays = ChronoUnit.DAYS.between(
                act.getPlannedStartDate(), act.getPlannedEndDate()) + 1;
            ef.put(node, predEfMax + (int)durationDays);
        }
        int projectDuration = ef.values().stream().mapToInt(Integer::intValue).max().orElse(0);

        // Backward pass (LF/LS)
        Map<Long, Integer> lf = new HashMap<>();
        Map<Long, Integer> ls = new HashMap<>();
        List<Long> reversed = new ArrayList<>(topo);
        Collections.reverse(reversed);
        for (Long node : reversed) {
            Activity act = findById(activities, node);
            List<Integer> succLs = act.getSuccessors().stream()
                .map(s -> ls.get(s.getSuccessor().getId()))
                .toList();
            int lfVal = succLs.isEmpty() ? projectDuration : Collections.min(succLs);
            lf.put(node, lfVal);
            long durationDays = ChronoUnit.DAYS.between(
                act.getPlannedStartDate(), act.getPlannedEndDate()) + 1;
            ls.put(node, lfVal - (int)durationDays);
        }

        // Critical path = zero float activities
        List<Activity> criticalPath = activities.stream()
            .filter(a -> Math.abs(ls.get(a.getId()) - es.get(a.getId())) < 0.5)
            .toList();

        return CriticalPathResult.builder()
            .criticalActivities(criticalPath)
            .totalDurationDays(projectDuration)
            .earliestStart(es)
            .latestFinish(lf)
            .build();
    }

    private Activity findById(List<Activity> activities, Long id) {
        return activities.stream()
            .filter(a -> a.getId().equals(id))
            .findFirst()
            .orElseThrow(() -> new EntityNotFoundException("Activity not found: " + id));
    }
}
```

---

### 6.3 Auto-Allocation Engine (Heuristic)

**Priority order:** Availability → Skill Match → Cost (hourly rate ascending)

```java
// backend/src/main/java/com/pod/service/AutoAllocationService.java
@Service
@Slf4j
@RequiredArgsConstructor
public class AutoAllocationService {

    private final ResourceRepository resourceRepository;
    private final ActivityRepository activityRepository;
    private final AllocationService allocationService;
    private final DashboardService dashboardService;

    @Transactional
    public AutoAllocationResult autoAllocate(Long projectId, boolean simulate) {
        List<Activity> unassigned = activityRepository.findUnassignedByProjectId(projectId);
        List<Resource> candidates = resourceRepository.findAvailableForAllocation();

        List<AutoAllocationSuccess> successes = new ArrayList<>();
        List<AutoAllocationFailure> failures = new ArrayList<>();

        for (Activity activity : unassigned) {
            Long activityId = activity.getId();
            BigDecimal hours = activity.getEstimatedHours();

            // Step 1: skill match (minimum level threshold)
            String requiredSkill = activity.getRequiredSkill();
            Integer requiredLevel = activity.getRequiredLevel();
            List<Resource> skillMatches = candidates.stream()
                .filter(r -> matchesSkill(r, requiredSkill, requiredLevel))
                .toList();

            if (skillMatches.isEmpty()) {
                failures.add(AutoAllocationFailure.builder()
                    .activityId(activityId)
                    .errorCode("SKILL_MISMATCH")
                    .hours(hours)
                    .reason("No resource matches required skill/level")
                    .build());
                continue;
            }

            // Step 2: capacity filter (available capacity in target month >= hours)
            YearMonth targetMonth = YearMonth.from(activity.getPlannedStartDate());
            List<Resource> capacityOk = skillMatches.stream()
                .filter(r -> r.getRemainingCapacity(targetMonth).compareTo(hours) >= 0)
                .toList();

            if (capacityOk.isEmpty()) {
                failures.add(AutoAllocationFailure.builder()
                    .activityId(activityId)
                    .errorCode("NO_CAPACITY")
                    .hours(hours)
                    .reason("No resource has sufficient capacity in target month")
                    .build());
                continue;
            }

            // Step 3: project count cap (< 5 distinct projects in target month)
            List<Resource> projCountOk = capacityOk.stream()
                .filter(r -> r.getActiveProjectCount(targetMonth) < 5)
                .toList();

            if (projCountOk.isEmpty()) {
                failures.add(AutoAllocationFailure.builder()
                    .activityId(activityId)
                    .errorCode("PROJECT_SPREAD_LIMIT")
                    .hours(hours)
                    .reason("All candidates already assigned to 5+ projects")
                    .build());
                continue;
            }

            // Step 4: budget check
            BigDecimal rateCost = dashboardService.calculateRateCost(projectId);
            BigDecimal budgetRemaining = activity.getProject().getBudgetRemainingK();
            List<Resource> budgetOk = projCountOk.stream()
                .filter(r -> budgetRemaining.compareTo(hours.multiply(r.getHourlyRateK()).divide(
                    BigDecimal.valueOf(144), RoundingMode.HALF_UP)) >= 0)
                .toList();

            if (budgetOk.isEmpty()) {
                failures.add(AutoAllocationFailure.builder()
                    .activityId(activityId)
                    .errorCode("BUDGET_EXCEEDED")
                    .hours(hours)
                    .reason("Project budget exhausted for all candidate resources")
                    .build());
                continue;
            }

            // Step 5: sort by rate ascending, pick cheapest
            Resource selected = budgetOk.stream()
                .min(Comparator.comparing(Resource::getHourlyRateK))
                .orElseThrow();

            if (!simulate) {
                Allocation allocation = allocationService.createAllocation(
                    selected.getId(), projectId, activityId, hours
                );
                successes.add(AutoAllocationSuccess.builder()
                    .resourceId(selected.getId())
                    .projectId(projectId)
                    .activityId(activityId)
                    .hours(hours)
                    .allocationId(allocation.getId())
                    .build());
            } else {
                successes.add(AutoAllocationSuccess.builder()
                    .resourceId(selected.getId())
                    .projectId(projectId)
                    .activityId(activityId)
                    .hours(hours)
                    .allocationId(null)  // simulate mode
                    .build());
            }
        }

        return AutoAllocationResult.builder()
            .successes(successes)
            .failures(failures)
            .build();
    }

    private boolean matchesSkill(Resource r, String requiredSkill, Integer requiredLevel) {
        return requiredSkill == null || (r.getSkill() != null && r.getSkill().equals(requiredSkill))
            && (requiredLevel == null || r.getLevel() != null && r.getLevel() >= requiredLevel);
    }
}
```
        budget_ok.sort(key=lambda r: r.hourly_rate_K)

        if not budget_ok:
            failures.append(AutoAllocationFailure(
                activity_id=activity_id,
                error_code="NO_CANDIDATE",
                hours=hours,
                reason="No resource satisfies all constraints (skills, capacity, project cap, budget)"
            ))
            continue

        best = budget_ok[0]
        if not simulate:
            # Create allocation (PENDING; requires approval)
            alloc = AllocationService.create(
                resource_id=best.id,
                project_id=project_id,
                activity_id=activity_id,
                hours=hours,
                week_start=activity.week_start
            )
            successes.append(AutoAllocationSuccess(
                resource_id=best.id, project_id=project_id,
                activity_id=activity_id, hours=hours, allocation_id=alloc.id
            ))
        else:
            successes.append(AutoAllocationSuccess(
                resource_id=best.id, project_id=project_id,
                activity_id=activity_id, hours=hours, allocation_id=None  # simulated
            ))

    return AutoAllocationResult(
        successful=successes,
        failed=failures,
        total_requested=len(unassigned),
        total_created=len(successes)
    )
```

**API Response mapping:** See Appendix C for example JSON envelope.

---

### 6.4 Rate Lookup & Caching

**Rate Query Pattern:**

```sql
SELECT monthly_rate_K
FROM rates
WHERE cost_center_id = :cc
  AND billable_team_code = :btc
  AND effective_from <= :YYYYMM
  AND effective_to >= :YYYYMM
  AND is_active = TRUE
ORDER BY effective_from DESC
LIMIT 1;
```

**Redis Cache Key:** `rate:{cost_center}:{billable_team}:{YYYYMM}` — TTL 30 days.

Cache warming on new rate creation: prefetch next 12 months for affected (CC, BTC).

---

## 7. Frontend Architecture

### 7.1 Tech Stack

| Technology       | Version | Purpose                 |
| ---------------- | ------- | ----------------------- |
| React            | 18.3+   | UI framework            |
| TypeScript       | 5.4+    | Type safety             |
| Vite             | 5.4+    | Build + HMR             |
| React Router     | 6.22+   | Client-side routing     |
| TanStack Query   | 5.45+   | Server state management |
| Axios            | 1.7+    | HTTP client             |
| Recharts         | 2.12+   | Dashboard charts        |
| Frappe Gantt     | 0.6.1+  | Timeline visualization  |
| React Hook Form  | 7.52+   | Form state              |
| Zod              | 3.23+   | Runtime validation      |
| Tailwind CSS     | 3.4+    | Styling                 |
| Socket.io Client | 4.7+    | Real-time updates       |

### 7.2 Component Hierarchy

```
src/
├── main.tsx                 # React Query + Router providers
├── App.tsx                  # Layout + routes
├── api/
│   ├── client.ts            # axios with JWT interceptor
│   ├── resources.ts
│   ├── projects.ts
│   ├── allocations.ts
│   └── dashboard.ts
├── components/
│   ├── common/              # Button, Modal, DataTable, DatePicker, KPICard
│   ├── layout/              # Header, Sidebar, Layout
│   ├── resource/            # ResourceList, ResourceDetail, ResourceForm, ImportModal
│   ├── project/             # ProjectList, ProjectDetail, ProjectForm, GanttChart
│   ├── allocation/          # AllocationModal, AllocationList, AllocationApprovalPanel
│   ├── dashboard/           # DashboardPage, KPIGrid, SupplyDemandChart, BurnRateChart
│   └── notification/        # NotificationCenter, NotificationBadge
├── hooks/
│   ├── useAuth.ts
│   ├── useResources.ts
│   ├── useProjects.ts
│   ├── useAllocations.ts
│   ├── useDashboard.ts
│   └── useNotifications.ts
├── contexts/
│   ├── AuthContext.tsx
│   └── NotificationContext.tsx
└── utils/
    ├── api.ts
    ├── dateUtils.ts
    └── validators.ts
```

### 7.3 State Management & Data Flow

**React Query Configuration** — default options set globally:

```typescript
// src/api/client.ts or src/main.tsx
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes — consider data fresh
      cacheTime: 10 * 60 * 1000,     // 10 minutes — keep unused data in cache
      retry: 1,                      // retry transient failures once
      refetchOnWindowFocus: false,   // avoid unnecessary refetches
      refetchOnMount: true,
    },
  },
});
```

**Authentication Interceptor** — injects `Authorization: Bearer ${token}` header, redirects to `/login` on 401.

**Real-time Updates via WebSocket** — injects `Authorization: Bearer ${token}` header, redirects to `/login` on 401.

**Real-time Updates via WebSocket** — subscribe to:

- `dashboard:refresh` → invalidate dashboard queries
- `allocation:submitted` → refresh allocation list + notification badge
- `allocation:approved` → update allocation status

---

## 8. Frontend Sequence Diagrams

### 8.1 User Authentication Flow

```
User                      Frontend (React)          Backend (API)          Database
 |                             |                         |                      |
 | Click "Login"               |                         |                      |
 |---------------------------> |                         |                      |
 |                             | Navigate to /login      |                      |
 |                             |------------------------>|                      |
 |                             |                         |                      |
 | Enter credentials           |                         |                      |
 | (username, password)        |                         |                      |
 |---------------------------> |                         |                      |
 |                             | POST /api/v1/auth/login |                      |
 |                             | {username, password}    |                      |
 |                             |------------------------>|                      |
 |                             |                         | -- Validate user     |
 |                             |                         | -- Check password    |
 |                             |                         | -- Generate JWT      |
 |                             |                         | -- Store session     |
 |                             |                         |<-------------------- |
 |                             |                         |                      |
 |                             | 200 OK                  |                      |
 |                             | {token, user, roles}    |                      |
 |<--------------------------- |                         |                      |
 |                             |                         |                      |
 | Store token in localStorage |                         |                      |
 | Redirect to /dashboard      |                         |                      |
 |                             |                         |                      |
 |                             | router.push('/')        |                      |
 |                             |------------------------>|                      |
 |                             |                         |                      |
 |                             | Store token in interceptor              |
 |                             | Fetch user profile (GET /me)            |
 |                             |---------------------------------------> |
 |                             |                         |                      |
 |                             |                         | SELECT * FROM        |
 |                             |                         | resources WHERE ...  |
 |                             |                         |<-------------------- |
 |                             |                         |                      |
 |                             | 200 OK {user}                          |
 |                             |<--------------------------------------- |
 |                             |                         |                      |
 | Render dashboard              |                         |                      |
 |<----------------------------- |                         |                      |
 |                             |                         |                      |
```

### 8.2 Resource List & Filter Flow

```
User (PM)                   Frontend                   Backend                    DB
   |                            |                          |                       |
   | Navigate to /resources      |                          |                       |
   |---------------------------->|                          |                       |
   |                            | Route load               |                       |
   |                            |------------------------->|                       |
   |                            |                          |                       |
   |                            | GET /api/v1/resources?   |                       |
   |                            |   skill=backend&level=3  |                       |
   |                            |------------------------->|                       |
   |                            |                          | SELECT r.*,           |
   |                            |                          |   rates.monthly_rate  |
   |                            |                          | FROM resources r       |
   |                            |                          | LEFT JOIN rates ...   |
   |                            |                          | WHERE skill = ?       |
   |                            |                          |   AND level >= ?      |
   |                            |                          |<----------------------|
   |                            |                          |                       |
   |                            | 200 OK [{id, name, ...}]                       |
   |                            |<-------------------------|                       |
   |                            |                          |                       |
   |                            | Render ResourceTable     |                       |
   |<---------------------------|                          |                       |
   |                            |                          |                       |
   | Change skill filter         |                          |                       |
   |---------------------------->|                          |                       |
   |                            | Debounced re-fetch (300ms)                     |
   |                            |------------------------->|                       |
   |                            |                          | New query with new skill
 |                            |                          |<----------------------|
   |                            |                          |                       |
   |                            |< Updated table displayed |                       |
   |<---------------------------|                          |                       |
```

### 8.3 Resource Import CSV (Admin Flow)

```
Admin                      Frontend              Backend                 DB
   |                            |                     |                      |
   | Click "Import Resources"   |                     |                      |
   |---------------------------->|                     |                      |
   |                            | Open ImportModal    |                      |
   |<---------------------------|<--------------------|                      |
   |                            |                     |                      |
   | Select CSV file            |                     |                      |
   |--------------------------->|                     |                      |
   |                            | POST /import/csv    |                      |
   |                            | (multipart/form-data)|                     |
   |                            |-------------------->|                      |
   |                            |                     |                      |
   |                            |                     | Parse CSV → validate |
 |                            |                     | Build preview         |
 |                            |                     | Store snapshot in Redis
 |                            |                     |                      |
   |                            |                     | 200 OK {preview: [...]}
 |                            |<--------------------|                      |
   |                            |                     |                      |
   |                            | Show preview table  |                      |
   |<---------------------------|< Show preview ------|                      |
   |                            |                     |                      |
   | Click "Confirm Import"     |                     |                      |
   |---------------------------->|                     |                      |
   |                            | POST /import/confirm                     |
   |                            |-------------------->|                      |
   |                            |                     |                      |
   |                            |                     | BEGIN TRANSACTION     |
 |                            |                     | Insert resources       |
 |                            |                     | Insert audit_log       |
 |                            |                     | COMMIT                |
 |                            |                     |                      |
   |                            |                     | 201 Created           |
   |                            |<--------------------|                      |
   |                            |                     |                      |
   |                            | Toast "142 imported"                      |
   |<---------------------------|< Success feedback ---|                      |
```

### 8.4 Allocation Submission (Project Manager)

```
PM                        Frontend              AllocationService         DB
   |                            |                          |                      |
   | Navigate to Project Detail  |                          |                      |
   | → "Assign Resource"        |                          |                      |
   |---------------------------->|                          |                      |
   |                            | Open AllocationModal     |                      |
   |<---------------------------|<-------------------------|                      |
   |                            |                          |                      |
   | Select resource, enter 40h |                          |                      |
   | week range, notes          |                          |                      |
   |--------------------------->|                          |                      |
   |                            | Real-time validation     |                      |
   |                            | (triggers on each change)|                      |
   |                            |                          |                      |
   |                            | POST /api/v1/allocations |                      |
   |                            | {resourceId, projectId,  |                      |
   |                            |  weekStart, hours}       |                      |
   |                            |------------------------->|                      |
   |                            |                          |                      |
   |                            |                          | AllocationService     |
   |                            |                          | .createAllocation()   |
   |                            |                          |--------------------->|
   |                            |                          |                      |
   |                            |                          | 1. Validate 5 constraints
 |                            |                          | 2. Find overlapping  |
 |                            |                          | 3. @Transactional:    |
 |                            |                          |    a) Deactivate old  |
 |                            |                          |    b) INSERT new (PENDING)
 |                            |                          |    c) INSERT audit_log
 |                            |                          |    d) Publish event   |
 |                            |                          |                      |
   |                            | 201 Created { allocation }                       |
   |                            |<-------------------------|                      |
   |                            |                          |                      |
   |                            | Invalidate queries:      |                      |
   |                            |   - allocations          |                      |
   |                            |   - dashboard            |                      |
   |<---------------------------|< "Submitted" toast ------|                      |
```

### 8.5 Allocation Approval (POD Manager)

```
POD Manager        Frontend         ApprovalService     AuditService        DB        WS/Redis
   |                  |                   |                  |               |           |
   | Navigate to      |                   |                  |               |           |
   | /approvals       |                   |                  |               |           |
   |----------------->|                   |                  |               |           |
   |                  | GET /allocations?status=PENDING
   |                  |----------------------------------------->|               |           |
   |                  |                   |                  |               |           |
   |                  |                   | Load allocations               |           |
   |                  |                   | SELECT * ...                   |           |
   |                  |                   |<-------------------------------|           |
   |                  |                   |                  |               |           |
   |                  | Return 5 pending  |                  |               |           |
   |<-----------------|<------------------|                  |               |           |
   |                  |                   |                  |               |           |
   | Click "Approve"  |                   |                  |               |           |
   | on allocation    |                   |                  |               |           |
   |----------------->|                   |                  |               |           |
   |                  | POST /allocations/approve
   |                  | {id, reason}      |                  |               |           |
   |                  |------------------->|                  |               |           |
   |                  |                   |                  |               |           |
   |                  |                   | Four-eyes check  |               |           |
   |                  |                   | (resource != approver)
 |                  |                   |                  |               |           |
   |                  |                   | UPDATE alloc      |               |           |
   |                  |                   | SET status=APPROVED
 |                  |                   |                  |               |           |
   |                  |                   | AuditListener    |               |           |
   |                  |                   | captures change  |               |           |
   |                  |                   | → audit_log INSERT
 |                  |                   |                  |               |           |
   |                  |                   | Publish event     |               |           |
   |                  |                   | NotificationService.create()
 |                  |                   |                  |               |           |
   |                  |                   |                  | INSERT INTO notifications
 |                  |                   |                  |               |           |
   |                  |                   | Redis pub         |               |           |
   |                  |                   | "allocations:new" |               |           |
   |                  |                   |----------------->|               |           |
   |                  |                   |                   | WS broadcast   |           |
   |                  |                   |                   |--------------->|           |
   |                  |                   |                   |                |           |
   |                  | 200 OK            |                   |                |           |
   |<-----------------|<------------------|                   |                |           |
   |                  |                   |                   |                |           |
   | PM gets WS event |                   |                   |                |           |
   | "allocation:approved"      |                   |                |           |
   |<-------------------------------------------------------------|                |           |
   |                  |                   |                   |                |           |
   | Refresh UI, toast "Approved!"              |                |           |
   |<--------------------------------------------|                               |
```

### 8.6 Auto-Allocation Engine Run

```
PM                Frontend        AutoAllocationService       DB
   |                  |                      |                      |
   | Click "Auto-Allocate"                  |                      |
   |----------------->|                      |                      |
   |                  | POST /allocations/auto {projectId}
   |                  |--------------------->|                      |
   |                  |                      |                      |
   |                  |                      | Fetch activities      |
   |                  |                      | SELECT * FROM activities
 |                  |                      |                      |
   |                  |                      | For each unassigned hour:
   |                  |                      |   Filter resources:   |
   |                  |                      |   - skill_match       |
   |                  |                      |   - capacity >= hours |
   |                  |                      |   - proj_count < 5    |
   |                  |                      |   - rate ascending    |
   |                  |                      |                      |
   |                  |                      | Try allocate          |
   |                  |                      | Validate budget       |
   |                  |                      | Insert in transaction |
   |                  |                      |                      |
   |                  |                      | Accumulate results    |
   |                  |                      |                      |
   |                  | 200 OK {allocated, errors}                     |
   |<-----------------|<---------------------|                      |
   |                  |                      |                      |
   | Show summary:    |                      |                      |
   | "Created 12, failed 3"                 |                      |
   |<-----------------|                      |                      |
```

### 8.7 Dashboard Real-time Refresh (WebSocket)

```
Backend Scheduler   AllocationService        Redis Pub/Sub          WebSocket      Frontend
       |                   |                         |                 |              |
       | MV refresh cron   |                         |                 |              |
       |------------------>|                         |                 |              |
       |                   | REFRESH CONCURRENTLY    |                 |              |
       |                   | mv_supply_demand        |                 |              |
       |                   |------------------------>|                 |              |
       |                   |                         |                 |              |
       |                   |                         | dashboard:refresh|              |
       |                   |                         | broadcast        |              |
       |                   |                         |----------------->|              |
       |                   |                         |                 |              |
       |                   |                         |                 | queryClient  |
       |                   |                         |                 | invalidate   |
       |                   |                         |                 |--------------->|
       |                   |                         |                 |              |
       |                   |                         |                 | Re-fetch data |
       |                   |                         |                 |<--------------|
       |                   |                         |                 |              |
       |                   |                         |                 | 200 OK {data} |
       |                   |                         |                 |--------------->|
       |                   |                         |                 | Charts update  |
       |<------------------|-------------------------|-----------------| < Re-render   |
```

### 8.8 Project Gantt + Critical Path Loading

```
User                      Frontend              Backend               GanttService      DB
   |                            |                      |                    |                  |
   | Navigate to /projects/:id   |                      |                    |                  |
   |---------------------------->|                      |                    |                  |
   |                            | GET /projects/:id/gantt
   |                            |--------------------->|                    |                  |
   |                            |                      |                    |                  |
   |                            |                      | GanttService.get() |                  |
   |                            |                      |------------------->|                  |
   |                            |                      |                    |                  |
   |                            |                      |                    | SELECT project   |
   |                            |                      |                    | SELECT activities |
   |                            |                      |                    | SELECT dependencies
 |                            |                      |                    |<----------------- |
   |                            |                      |                    |                  |
   |                            |                      | Calculate critical path
 |                            |                      | (topological sort) |                  |
   |                            |                      |                    |                  |
   |                            |                      | Return:            |                  |
   |                            |                      | {activities[{id,name,start,end,isCritical,floatDays}],
   |                            |                      |  dependencies[{from,to}]}
 |                            |                      |<-------------------|                  |
   |                            | 200 OK {ganttData}   |                    |                  |
   |<---------------------------|<---------------------|                    |                  |
   |                            |                      |                    |                  |
   | Initialize Frappe Gantt    |                      |                    |                  |
   | with tasks + critical path |                      |                    |                  |
   |<---------------------------| < Display Gantt -----|                    |                  |
```

### 8.9 Notification Center Real-time

```
Backend Event        WebSocket        Frontend              GET /notifications   DB
       |                  |                 |                        |                  |
 AllocationSubmitted    |                 |                        |                  |
 (AllocationService) ──>| WS broadcast    |                        |                  |
       |               | "notif:new" ────>|                        |                  |
       |               |                 | Badge increment         |                  |
       |               |                 |<-----------------------|                  |
       |               |                 |                        |                  |
       |               |                 | User clicks bell icon   |                  |
       |               |                 |------------------------>|                  |
       |               |                 |                        |                  |
       |               |                 | GET /notifications?unread=true
 |               |                 |------------------------------------------------>|
       |               |                 |                        |                  |
       |               |                 |                        | SELECT * FROM    |
       |               |                 |                        | notifications    |
       |               |                 |                        | WHERE is_read=false
 |               |                 |                        |<----------------- |
       |               |                 |                        |                  |
       |               |                 | 200 OK [{notif}]        |                  |
       |               |                 |<------------------------------------------------|
       |               |                 |                        |                  |
       |               |                 | Render dropdown list    |                  |
       |<------------------------------------------------|                        |                  |
       |               |                 |                        |                  |
 User clicks notif   |                 |                        |                  |
 ───────────────────>|                 |                        |                  |
       |               |                 |                        |                  |
       |               | POST /notifications/:id/read
 |               |                 |                        |                  |
       |               |----------------->|                        |                  |
       |               |                 |                        |                  |
       |               |                 | UPDATE notifications    |                  |
       |               |                 | SET is_read=true        |                  |
       |               |                 | WHERE id=?              |                  |
       |               |                 |                        |                  |
       |               | 200 OK           |                        |                  |
       |<---------------|<----------------|                        |                  |
       |               |                 |                        |                  |
       |               | Badge decrement  |                        |                  |
       |<------------------------------------------------|                        |
```

---

## 9. Dashboard & Materialized Views

### 9.1 Materialized View Definitions

**`mv_supply_demand_monthly`:**

```sql
CREATE MATERIALIZED VIEW mv_supply_demand_monthly AS
SELECT
    DATE_TRUNC('month', a.week_start_date) as month,
    r.cost_center_id,
    r.billable_team_code,
    COUNT(DISTINCT r.id) as supply_hcm,
    COALESCE(SUM(a.hours), 0) as allocated_hours,
    COALESCE(SUM(a.hours) / 144.0, 0) as allocated_hcm,
    COALESCE(SUM(a.hours * (rate.monthly_rate_K / 144.0)), 0) as allocated_cost_K
FROM resources r
LEFT JOIN allocations a ON r.id = a.resource_id
    AND a.is_active = TRUE AND a.status = 'approved'
LEFT JOIN LATERAL (
    SELECT monthly_rate_K FROM rates rate
    WHERE rate.cost_center_id = r.cost_center_id
      AND rate.billable_team_code = r.billable_team_code
      AND rate.effective_from <= TO_CHAR(a.week_start_date, 'YYYYMM')
      AND rate.effective_to >= TO_CHAR(a.week_start_date, 'YYYYMM')
      AND rate.is_active = TRUE LIMIT 1
) rate ON true
WHERE r.is_active = TRUE
GROUP BY DATE_TRUNC('month', a.week_start_date), r.cost_center_id, r.billable_team_code
ORDER BY month DESC, cost_center_id, billable_team_code;

CREATE UNIQUE INDEX idx_mv_supply_demand_monthly
    ON mv_supply_demand_monthly(month, cost_center_id, billable_team_code);
```

**`mv_project_burn`:**

```sql
CREATE MATERIALIZED VIEW mv_project_burn AS
SELECT
    p.id as project_id,
    p.name as project_name,
    p.budget_total_K,
    COALESCE(SUM(CASE WHEN a.status = 'approved'
        THEN a.hours * (rate.monthly_rate_K / 144.0) ELSE 0 END), 0) as spent_K,
    COALESCE(SUM(a.hours), 0) as allocated_hours,
    ROUND(COALESCE(SUM(CASE WHEN a.status = 'approved'
        THEN a.hours * (rate.monthly_rate_K / 144.0) ELSE 0 END), 0)
        / p.budget_total_K * 100, 2) as burn_rate_pct
FROM projects p
LEFT JOIN allocations a ON p.id = a.project_id AND a.is_active = TRUE
LEFT JOIN resources r ON a.resource_id = r.id
LEFT JOIN LATERAL (
    SELECT monthly_rate_K FROM rates rate
    WHERE rate.cost_center_id = r.cost_center_id
      AND rate.billable_team_code = r.billable_team_code
      AND rate.effective_from <= TO_CHAR(a.week_start_date, 'YYYYMM')
      AND rate.effective_to >= TO_CHAR(a.week_start_date, 'YYYYMM')
      AND rate.is_active = TRUE LIMIT 1
) rate ON true
WHERE p.is_active = TRUE
GROUP BY p.id, p.name, p.budget_total_K
ORDER BY p.id;

CREATE INDEX idx_mv_project_burn ON mv_project_burn(project_id);
```

**`mv_utilization_monthly`:**

```sql
CREATE MATERIALIZED VIEW mv_utilization_monthly AS
SELECT
    DATE_TRUNC('month', a.week_start_date) as month,
    r.id as resource_id,
    r.name as resource_name,
    r.cost_center_id,
    r.billable_team_code,
    COALESCE(SUM(a.hours), 0) as assigned_hours,
    ROUND(
      COALESCE(SUM(a.hours) / (CASE
        WHEN EXISTS (
          SELECT 1 FROM holidays h
          WHERE h.cost_center_filter @> r.cost_center_id::jsonb
            AND EXTRACT(MONTH FROM h.holiday_date) = EXTRACT(MONTH FROM a.week_start_date)
        ) THEN 144.0 - 20.0
        ELSE 144.0
      END) * 100, 2)
    ) as utilization_pct
FROM resources r
LEFT JOIN allocations a ON r.id = a.resource_id
    AND a.is_active = TRUE AND a.status = 'approved'
    AND EXTRACT(YEAR FROM a.week_start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
WHERE r.is_active = TRUE
GROUP BY DATE_TRUNC('month', a.week_start_date), r.id, r.name, r.cost_center_id, r.billable_team_code
ORDER BY month DESC, resource_id;

CREATE UNIQUE INDEX idx_mv_utilization_monthly
    ON mv_utilization_monthly(month, resource_id);
```

**`mv_overplan_conflicts`:**

```sql
CREATE MATERIALIZED VIEW mv_overplan_conflicts AS
SELECT
    DATE_TRUNC('month', a.week_start_date) as month,
    r.id as resource_id,
    r.name as resource_name,
    COUNT(DISTINCT p.id) as project_count,
    CASE
        WHEN COUNT(DISTINCT p.id) > 5 THEN 'OVERPLAN_DETECTED'
        ELSE 'OK'
    END as status
FROM resources r
JOIN allocations a ON r.id = a.resource_id AND a.is_active = TRUE AND a.status = 'approved'
JOIN projects p ON a.project_id = p.id AND p.is_active = TRUE
WHERE EXTRACT(YEAR FROM a.week_start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY DATE_TRUNC('month', a.week_start_date), r.id, r.name
HAVING COUNT(DISTINCT p.id) > 5
ORDER BY month DESC, resource_id;

CREATE INDEX idx_mv_overplan_conflicts ON mv_overplan_conflicts(month, resource_id, status);
```

**`mv_cash_flow_forecast`:**

```sql
CREATE MATERIALIZED VIEW mv_cash_flow_forecast AS
SELECT
    DATE_TRUNC('month', a.week_start_date) as month,
    COALESCE(SUM(
      a.hours * (rate.monthly_rate_K / 144.0)
    ), 0) as committed_cash_flow_K,
    COUNT(DISTINCT a.resource_id) as committed_hcm
FROM allocations a
JOIN resources r ON a.resource_id = r.id
LEFT JOIN LATERAL (
    SELECT monthly_rate_K FROM rates rate
    WHERE rate.cost_center_id = r.cost_center_id
      AND rate.billable_team_code = r.billable_team_code
      AND rate.effective_from <= TO_CHAR(a.week_start_date, 'YYYYMM')
      AND rate.effective_to >= TO_CHAR(a.week_start_date, 'YYYYMM')
      AND rate.is_active = TRUE LIMIT 1
) rate ON true
WHERE a.is_active = TRUE AND a.status = 'approved'
GROUP BY DATE_TRUNC('month', a.week_start_date)
ORDER BY month DESC;

CREATE UNIQUE INDEX idx_mv_cash_flow_forecast ON mv_cash_flow_forecast(month);
```

These four materialized views underpin the Dashboard KPIs:
- `mv_supply_demand_monthly`: headcount + allocated HCM per cost center/team per month
- `mv_project_burn`: budget vs actual spend per project
- `mv_utilization_monthly`: per-resource monthly utilization rate (billable hours ÷ 144 – holiday-adjusted)
- `mv_overplan_conflicts`: resources assigned to >5 projects in a month (preemptive warning)
- `mv_cash_flow_forecast`: forward-looking committed cash outflow based on approved allocations

### 9.2 Refresh Strategy

**Business Hours (09:00–18:00):** Every **5 minutes**
**Off-hours (18:00–09:00):** Every **30 minutes**

**Locking to Prevent Overlap:** Use a distributed lock (Redis-based) to ensure only one refresh job runs at a time in a multi-replica deployment.

```java
// backend/src/main/java/com/pod/task/MaterializedViewRefreshTask.java
@Component
@Slf4j
@RequiredArgsConstructor
public class MaterializedViewRefreshTask {

    private final JdbcTemplate jdbcTemplate;
    private final RedisTemplate<String, String> redisTemplate;
    private final ApplicationEventPublisher eventPublisher;

    // Business hours (09:00–18:00): every 5 minutes
    @Scheduled(cron = "0 */5 9-17 ? * MON-FRI")
    @SchedulerLock(name = "refreshMVBusinessHours", lockAtMostFor = "4m", lockAtLeastFor = "5m")
    public void refreshMVBusinessHours() {
        String lockKey = "lock:refresh_mv";
        String instanceId = InetAddress.getLocalHost().getHostName();

        Boolean acquired = redisTemplate.opsForValue()
            .setIfAbsent(lockKey, instanceId, Duration.ofMinutes(5));

        if (Boolean.FALSE.equals(acquired)) {
            log.warn("Refresh job skipped - another instance is already running");
            return;
        }

        try {
            jdbcTemplate.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_supply_demand_monthly");
            jdbcTemplate.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_project_burn");
            jdbcTemplate.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_utilization_monthly");
            jdbcTemplate.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_overplan_conflicts");
            jdbcTemplate.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cash_flow_forecast");

            // Broadcast via Redis pub/sub to WebSocket handlers
            redisTemplate.convertAndSend("dashboard:refresh", Map.of("type", "DASHBOARD_REFRESHED"));

            log.info("MV refresh completed successfully");
        } finally {
            // Atomic delete via Lua script
            String luaScript = "if redis.call(\"GET\", KEYS[1]) == ARGV[1] then return redis.call(\"DEL\", KEYS[1]) else return 0 end";
            redisTemplate.execute(new DefaultRedisScript<>(luaScript, Long.class),
                List.of(lockKey), instanceId);
        }
    }

    // Off-hours (18:00–09:00): every 30 minutes
    @Scheduled(cron = "0 0/30 18-23,0-8 ? * *")
    @SchedulerLock(name = "refreshMVOffHours", lockAtMostFor = "25m", lockAtLeastFor = "30m")
    public void refreshMVOffHours() {
        refreshMVBusinessHours();
    }
}
```

**Alternative (ShedLock library):** Use `@SchedulerLock` annotation from `net.javacrumbs.shedlock` Spring Boot starter — provides distributed locking with Redis/JDBC backing store automatically. Add Maven dependencies:

```xml
<dependency>
    <groupId>net.javacrumbs.shedlock</groupId>
    <artifactId>shedlock-spring</artifactId>
    <version>5.10.0</version>
</dependency>
<dependency>
    <groupId>net.javacrumbs.shedlock</groupId>
    <artifactId>shedlock-provider-redis-spring</artifactId>
    <version>5.10.0</version>
</dependency>
```

**Monitoring:**

- Emit metric `mv_refresh_duration_seconds` for each refresh
- Alert if duration > 30s (indicates MV is too large or under-provisioned)
- Track skipped runs due to lock contention (should be near-zero)

**Real-time Invalidation:** Allocation changes → publish Redis message → WebSocket → frontend React Query `queryClient.invalidateQueries(['dashboard'])`.

---

## 10. Security & Authorization

---

### 10.1 Authentication (JWT)

**Login:** `POST /api/v1/auth/login` → `{access_token, expires_in: 86400}`

**Token payload:**

```json
{ "sub": "user-id", "roles": ["PM"], "cost_center_id": "CC-TECH", "exp": 1713465600 }
```

### 10.2 RBAC Matrix

| Endpoint                         | Method | Role Required                |
| -------------------------------- | ------ | ---------------------------- |
| `POST /resources`              | POST   | `ADMIN`                    |
| `PATCH /resources/{id}/status` | PATCH  | `ADMIN` \| `POD_MANAGER` |
| `POST /projects`               | POST   | `PM` \| `ADMIN`          |
| `PATCH /projects/{id}/status`  | PATCH  | `PM`                       |
| `POST /allocations`            | POST   | `PM` \| `ADMIN`          |
| `POST /allocations/approve`    | POST   | `POD_MANAGER`              |

**Four-Eyes Enforcement:** Allocation approval fails if `resource_id == approver_id`.

---

## 11. Concurrency & Consistency

### 11.1 Optimistic Locking

All allocation/project/resource updates use `version` field:

```sql
UPDATE allocations SET hours = :h, version = version + 1
WHERE id = :id AND version = :expected_version;
```

If affected rows = 0 → `OptimisticLockError` → retry once with refreshed version.

### 11.2 Rate Period Overlap Prevention

```sql
CREATE UNIQUE INDEX uq_rate_period_start
    ON rates (cost_center_id, billable_team_code, effective_from)
    WHERE is_active = TRUE;
```

### 11.3 5-Project Cap Enforcement

**Problem**: Two concurrent transactions allocating to the same resource in the same month could both read count=4, both insert, resulting in 6 projects. Locking only the `resources` row is insufficient because the count query reads from `allocations`.

**Solution A — Pessimistic Lock on Allocations (Recommended):**

```sql
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Lock all active allocations for this resource in the target month
SELECT COUNT(DISTINCT project_id) as project_count
FROM allocations
WHERE resource_id = :resource_id
  AND is_active = TRUE
  AND status = 'approved'
  AND DATE_TRUNC('month', week_start_date) = :target_month
FOR UPDATE;  -- Locks matching rows, prevents concurrent inserts

-- Check count < 5
-- If OK, proceed to INSERT allocation
INSERT INTO allocations (...) VALUES (...);

COMMIT;
```

**Why this works:** The `FOR UPDATE` acquires exclusive locks on allocation rows being counted. Concurrent transactions will block, ensuring atomic check-and-insert.

**Required Index:**

```sql
CREATE INDEX idx_allocations_resource_month_active
    ON allocations(resource_id, week_start_date, is_active, status)
    WHERE is_active = TRUE AND status = 'approved';
```

**Alternative — SERIALIZABLE Isolation:**
Use `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE` and retry on `SerializationError`. This provides full serializability but may have higher abort rates under contention. Use exponential backoff (max 3 retries).

**Recommendation:** Use **pessimistic lock (Solution A)** for its simplicity and predictability.

---

## 12. Audit & Traceability

### 12.1 Audit Capture

Every create/update/delete on core entities writes to `audit_log` with:

- `entity_type`, `entity_id`, `field_name`, `old_value`, `new_value`
- `changed_by_user_id` (from JWT), `changed_at` (UTC), `change_reason`
- `revision_type` (ADD/MOD/DEL)

**Implementation (Spring Data JPA EntityListeners + AOP):** Use JPA `@EntityListeners` for automatic audit capture, plus Spring AOP `@AfterReturning` advice for status transitions requiring change reason.

```java
// backend/src/main/java/com/pod/entity/AuditLog.java
@Entity
@Table(name = "audit_log")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "entity_type", nullable = false, length = 50)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private Long entityId;

    @Column(name = "field_name", length = 100)
    private String fieldName;

    @Column(name = "old_value", columnDefinition = "JSONB")
    private JsonNode oldValue;

    @Column(name = "new_value", columnDefinition = "JSONB")
    private JsonNode newValue;

    @Column(name = "changed_by_user_id")
    private Long changedByUserId;

    @Column(name = "change_reason", length = 500)
    private String changeReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "revision_type", nullable = false, length = 10)
    private RevisionType revisionType;

    @Column(name = "changed_at", nullable = false)
    private OffsetDateTime changedAt;
}

// Auditable.java — base interface for entities
public interface Auditable {
    String getEntityType();
    String getRevisionType();
    Map<String, Object> getAuditChanges(AuditContext context);
}

// AuditEntityListener.java — JPA callback interceptor
@Component
public class AuditEntityListener {

    @PrePersist
    public void prePersist(Object entity) {
        if (entity instanceof Auditable auditable) {
            AuditContext context = AuditContextHolder.getContext();
            Long userId = context != null ? context.getUserId() : null;
            String reason = context != null ? context.getChangeReason() : null;

            Map<String, Object> changes = auditable.getAuditChanges(context);
            changes.forEach((field, valuePair) -> {
                Map<String, Object> change = (Map<String, Object>) valuePair;
                AuditLog log = AuditLog.builder()
                    .entityType(auditable.getEntityType())
                    .entityId(extractId(entity))
                    .fieldName(field)
                    .oldValue(toJsonNode(change.get("old")))
                    .newValue(toJsonNode(change.get("new")))
                    .changedByUserId(userId)
                    .changeReason(reason)
                    .revisionType(RevisionType.ADD)
                    .changedAt(OffsetDateTime.now())
                    .build();
                // Persist via AuditLogRepository
            });
        }
    }

    // Similar @PreUpdate and @PreRemove
}

// AuditContext via ThreadLocal (Spring RequestContext)
public class AuditContext {
    private Long userId;
    private String changeReason;
}

// Usage in ResourceService:
@Transactional
public Resource updateResource(Long id, UpdateResourceRequest req) {
    Resource resource = resourceRepository.findById(id).orElseThrow(...);
    AuditContextHolder.setContext(AuditContext.builder()
        .userId(currentUser.getId())
        .changeReason("Updated skill level as part of FY2026 review")
        .build());

    resource.setSkill(req.getSkill());
    resource.setLevel(req.getLevel());
    return resourceRepository.save(resource);
}
```

**Entities to Audit:** `resources`, `projects`, `activities`, `allocations`, `rates`, `holidays`, `activity_dependencies`.

**Performance:** Audit entries are inserted within the same transaction as the business operation (atomic). For bulk operations, use `after_bulk_update` to batch-insert audit rows.

**Alternative (explicit):** For actions that don't map cleanly to entity changes (e.g., "allocation approved" without field changes), create audit entries manually in the service layer.

### 12.2 Audit Query

`GET /api/v1/audit/log` with filters: `entity_type`, `entity_id`, `changed_by_user_id` (maps to `changed_by`), `start_date`, `end_date`. Results paginated, exportable to CSV.

---

## 13. Audit Change Log

**Scope:** Allocation, Project, Activity, Resource, Rate, Holiday, ActivityDependencies.

**Immutability:** `audit_log` is write-once. Retained 0–24 months in primary DB, 24mo–8yr in S3 archive, >8yr deleted.

---

## 14. Notifications

### 14.1 Event Matrix

| Event Type                       | Trigger                                                              | Channel        | Priority  |
| -------------------------------- | -------------------------------------------------------------------- | -------------- | --------- |
| `ALLOCATION_SUBMITTED`           | PM creates an allocation with `PENDING` status                       | In-app + Email | High      |
| `ALLOCATION_APPROVED`            | POD Manager approves allocation (status → `APPROVED`)                | In-app         | Medium    |
| `ALLOCATION_REJECTED`            | POD Manager rejects allocation (status → `REJECTED`)                 | In-app + Email | High      |
| `BUDGET_EXCEED_WARNING`          | Project burn rate ≥ budget threshold (configurable, default 80%)     | In-app         | High      |
| `PROJECT_STATUS_TRANSITION`      | Project status changes (DRAFT → ACTIVE, ACTIVE → COMPLETED, etc.)    | In-app         | Low       |
| `AUTO_ALLOCATION_FAILED`         | Auto-allocation engine could not satisfy constraint (5-project cap, no availability) | In-app         | Medium    |
| `AUTO_ALLOCATION_SUCCEEDED`      | Auto-allocation engine successfully assigned resource               | In-app         | Low       |
| `PROJECT_VERSION_MAJOR`          | Major version change detected on critical task                       | In-app + Email | High      |
| `HOLIDAY_CALENDAR_UPDATED`       | Admin adds/updates regional holiday affecting capacity calculation  | In-app         | Low       |

**Default Notification Distribution Rules:**

| Event Type               | Recipient(s)                                  | Email?      |
| ------------------------ | --------------------------------------------- | ----------- |
| ALLOCATION_SUBMITTED     | Assigned POD Manager                          | ✅ Yes      |
| ALLOCATION_APPROVED      | Submitting Project Manager + Resource         | ✅ Yes      |
| ALLOCATION_REJECTED      | Submitting Project Manager + Resource         | ✅ Yes      |
| BUDGET_EXCEED_WARNING    | Project Owner + Finance Lead                  | ✅ Yes      |
| PROJECT_STATUS_TRANSITION| Project Team (all assigned PMs and Resources) | ❌ In-app only |
| AUTO_ALLOCATION_FAILED   | POD Manager + System Admin                    | ✅ Yes      |
| AUTO_ALLOCATION_SUCCEEDED| POD Manager                                   | ❌ In-app only | 
| PROJECT_VERSION_MAJOR    | All stakeholders (PM, POD, Architect)         | ✅ Yes      |
| HOLIDAY_CALENDAR_UPDATED | All POD Managers                              | ❌ In-app only |

**Email Template Variables:** `{project_name}`, `{resource_name}`, `{allocated_hours}`, `{week_start_date}`, `{approver_name}`, `{rejection_reason}`, `{triggering_field}`, `{old_value}`, `{new_value}`.

**Grouping Logic (in-app notifications):**
- Allocations submitted/rejected in same 24h window → grouped into a single notification e.g., "3 allocation updates require your attention"
- Budget warnings aggregated per project (no spam if 5x warnings within 24h)

### 14.2 Notification Center UI Specification

The Notification Center implementation is specified in Section 19.6.

Notifications stored in `notifications` table, partitioned by month.

---

## 15. Deployment & Operations

### 15.1 Local Development

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15-alpine
  redis:
    image: redis:7-alpine
  backend:
    build: .
    ports: ["8080:8080"]
```

### 15.2 CI/CD (GitHub Actions)

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env: { POSTGRES_PASSWORD: test, POSTGRES_DB: pod_test }
      redis:
        image: redis:7-alpine
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
      - name: Run unit & integration tests
        run: mvn -B test
      - name: Generate coverage report
        run: mvn -B jacoco:report
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
```

### 15.3 Kubernetes Production

```yaml
replicas: 3
env:
  - name: DATABASE_URL
    valueFrom: { secretKeyRef: { name: pod-secrets, key: database-url } }
readinessProbe: { httpGet: { path: /health/ready, port: 8080 } }
livenessProbe: { httpGet: { path: /health/live, port: 8080 } }
```

### 15.4 Monitoring

- **Metrics:** `/actuator/prometheus` — `allocation_created_total`, `dashboard_mv_refresh_duration_seconds`
- **Alerts:** APIHighErrorRate (5xx > 5%), PostgreSQLDown, BudgetBurnAlert (≥90%)

---

## 16. Non-Functional Requirements

### 15.1 Performance

| Metric                                  | Target          | Measurement                           |
| --------------------------------------- | --------------- | ------------------------------------- |
| API P95 response time (simple GET)      | < 200ms         | `/resources`, `/projects` queries |
| API P95 response time (complex)         | < 500ms         | `/dashboard/*` with joins           |
| Frontend LCP (Largest Contentful Paint) | < 2.5s          | Dashboard page                        |
| Bundle size (initial)                   | < 200KB gzipped | main.js + vendor                      |
| Database query time (indexed)           | < 50ms          | All production queries                |

**Caching:**

- Rate lookups: Redis cache, 30-day TTL, warmed on rate creation
- Dashboard MVs: refreshed every 5min, real-time invalidation on allocation changes
- Static assets: CDN with 1-year cache hash

### 15.2 Availability & Reliability

- **Uptime target:** 99.5% (allowing 3.65 days downtime/year, excludes scheduled maintenance)
- **Backup strategy:** Daily full backups, WAL archiving for point-in-time recovery
- **DR:** Cross-region read replica failover within 5 minutes (RTO)
- **Data durability:** PostgreSQL replication factor 3, Redis AOF persistence

### 15.3 Scalability

- **Concurrent users:** Support 500 active sessions
- **Data growth:** Design for 10k resources, 500 active projects, 50k allocations/month
- **Horizontal scaling:** Spring Boot app behind load balancer (stateless), DB connection pool (HikariCP 20-50 connections)
- **Cache sizing:** Redis with 4GB memory (rate cache ~100MB, session store ~50MB)

### 15.4 Security

- **Encryption:** TLS 1.3 for all external traffic; AES-256 at rest for DB backups
- **Password storage:** BCrypt with cost factor 12
- **JWT:** HS256 with 256-bit secret, 24h expiry, stored in `localStorage` (XSS mitigation via CSP)
- **Rate limiting:** 100 req/min per IP, 500 req/min per user (token bucket in Redis)
- **Audit retention:** 8 years immutable (compliance)

### 15.5 Data Retention

| Data Store         | Retention                                | Archival Strategy                                      |
| ------------------ | ---------------------------------------- | ------------------------------------------------------ |
| `audit_log`      | 8 years (0–24mo hot, 24mo–8yr archive) | Monthly S3 export (gzipped JSONL), then partition DROP |
| `notifications`  | 24 months (partitioned monthly)          | After 24mo: delete (no archive)                        |
| `allocations`    | Indefinite (soft delete = false)         | No archival                                            |
| `holidays`       | Indefinite                               | No archival                                            |
| Materialized Views | Transient (refreshed)                    | Rebuilt from base tables                               |

---

## 17. API Versioning & Lifecycle Management

### 17.1 Versioning Strategy

- **Base path:** `/api/v1/`, `/api/v2/` (when applicable)
- **Backward compatibility:** v1 endpoints remain stable for **24 months** after v2 GA
- **Deprecation notices:** Include `X-API-Deprecated: true` and `X-API-Sunset-Date` headers 6 months before removal
- **Version negotiation:** Header-based (Accept: `application/vnd.pod.v1+json`) or URL-based (preferred: `/api/v1/resource`)

### 17.2 Change Types

| Change Type            | Compatible?                      | Example                             |
| ---------------------- | -------------------------------- | ----------------------------------- |
| Add new optional field | ✅ (forward/backward compatible) | Add `notes` to Resource response  |
| Add new endpoint       | ✅                               | `GET /api/v1/health`              |
| Remove field           | ❌ (breaking)                    | —                                  |
| Change field type      | ❌ (breaking)                    | `level: int` → `level: string` |
| Change semantics       | ❌ (breaking)                    | Different default filter behavior   |

### 17.3 Version Migration Path

When introducing v2:

1. **Phase 1 (Month 1–3):** Build v2 alongside v1, feature flags for gradual rollout
2. **Phase 2 (Month 4):** Announce v1 deprecation, shadow v2 traffic (no cut-over)
3. **Phase 3 (Month 7):** Disable v1 endpoints, return `410 Gone` with migration guide
4. **Phase 4 (Month 9):** Remove v1 code from codebase

---

## 18. Implementation Roadmap

| Sprint | Goal                                                        |
| ------ | ----------------------------------------------------------- |
| 1      | Foundation: project setup, domain model, Flyway migrations  |
| 2      | Resource APIs: CRUD + CSV import                            |
| 3      | Project & Activity: CRUD + cycle detection + Gantt          |
| 4      | Allocation Engine: submit + constraints + approval workflow |
| 5      | Auto-allocation + Dashboard + WebSocket                     |
| 6      | Security, RBAC, rate limiting, integration tests, docs      |

---

## Appendix A — Error Code Reference

| Code                     | HTTP | Condition                      |
| ------------------------ | ---- | ------------------------------ |
| `VALIDATION_ERROR`     | 400  | Input data invalid             |
| `DUPLICATE_KEY`        | 409  | `external_id` already exists |
| `RATE_OVERLAP`         | 409  | Rate period overlaps           |
| `CYCLE_DETECTED`       | 409  | Activity dependency cycle      |
| `BUDGET_EXCEEDED`      | 422  | Project budget over            |
| `MONTHLY_CAP`          | 422  | Monthly 144h exceeded          |
| `OT_MONTHLY_CAP`       | 422  | Monthly OT 36h exceeded        |
| `PROJECT_SPREAD_LIMIT` | 422  | Max 5 projects/month           |
| `CONCURRENT_EDIT`      | 409  | Optimistic lock conflict       |
| `UNAUTHORIZED`         | 403  | RBAC permission denied         |

---

## Appendix B — Traceability Matrix

| PRD Section               | SFS Section | TDD Section | Test File                                      |
| ------------------------- | ----------- | ----------- | ---------------------------------------------- |
| 2.1 Resource Entity       | 3.1         | 4.2         | `tests/unit/test_resource.py`                |
| 2.2 Rate Schema           | 3.1         | 4.2         | `tests/unit/test_rate.py`                    |
| 3.3 Constraints           | 5.3         | 6.1         | `tests/service/test_allocation_validator.py` |
| 2.8 Gantt + Critical Path | 4.2–4.3    | 6.2         | `tests/service/test_critical_path.py`        |
| 5.1 Dashboard KPIs        | 7.1         | 9           | `tests/integration/test_dashboard.py`        |
| 10.1 Notifications        | 8.1         | 14          | `tests/test_notifications.py`                |

---

## Appendix C — API Contract Examples

This appendix provides concrete request/response examples for key endpoints.

### C.1 Create Resource (`POST /api/v1/resources`)

**Request Body:**

```json
{
  "external_id": "EMP-001",
  "name": "Sarah Liu",
  "cost_center_id": "ENG-CC1",
  "billable_team_code": "BTC-API",
  "category": "permanent",
  "skill": "backend",
  "level": 5,
  "hire_date": "2023-06-01"
}
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "external_id": "EMP-001",
    "name": "Sarah Liu",
    "cost_center_id": "ENG-CC1",
    "billable_team_code": "BTC-API",
    "category": "permanent",
    "skill": "backend",
    "level": 5,
    "status": "active",
    "created_at": "2026-04-19T10:30:00Z"
  }
}
```

**Error Response (409 Conflict):**

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_KEY",
    "message": "external_id 'EMP-001' already exists",
    "details": { "field": "external_id" },
    "suggested_fixes": ["Use a different external_id", "Check for existing record"],
    "request_id": "req_abc123"
  }
}
```

### C.2 Submit Allocation (`POST /api/v1/allocations`)

**Request Body:**

```json
{
  "resource_id": "123e4567-e89b-12d3-a456-426614174000",
  "project_id": "223e4567-e89b-12d3-a456-426614174001",
  "week_start_date": "2026-04-21",
  "hours": 40,
  "notes": "Phase 1 implementation"
}
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "323e4567-e89b-12d3-a456-426614174002",
    "resource_id": "123e4567-e89b-12d3-a456-426614174000",
    "project_id": "223e4567-e89b-12d3-a456-426614174001",
    "week_start_date": "2026-04-21",
    "hours": 40,
    "status": "pending",
    "version": 1,
    "created_at": "2026-04-19T10:35:00Z"
  }
}
```

**Error Response (422 Unprocessable Entity):**

```json
{
  "success": false,
  "error": {
    "code": "MONTHLY_CAP_EXCEEDED",
    "message": "Monthly total 150h exceeds 144h limit",
    "details": {
      "resource_id": "123e4567-e89b-12d3-a456-426614174000",
      "current_hours": 110,
      "proposed_hours": 40,
      "total": 150,
      "limit": 144
    },
    "suggested_fixes": [
      "Reduce hours to 34 or less",
      "Shift some work to next month",
      "Use a different resource"
    ],
    "request_id": "req_def456"
  }
}
```

### C.3 List Resources (`GET /api/v1/resources`)

**Query Parameters:**

```
GET /api/v1/resources?
  skill=backend,frontend&
  level_min=3&
  level_max=6&
  cost_center=ENG-CC1&
  status=active&
  page=1&
  size=50
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Sarah Liu",
      "external_id": "EMP-001",
      "skill": "backend",
      "level": 5,
      "monthly_rate_K": 14.40,
      "allocated_hours": 110
    }
  ],
  "pagination": {
    "total": 42,
    "page": 1,
    "size": 50,
    "pages": 1
  }
}
```

### C.4 Get Dashboard Supply-Demand (`GET /api/v1/dashboard/supply-demand`)

**Query Parameters:**

```
GET /api/v1/dashboard/supply-demand?
  month=202604&
  cost_center=ENG-CC1,BTC-ENG
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "month": "2026-04",
      "cost_center_id": "ENG-CC1",
      "billable_team_code": "BTC-API",
      "supply_hcm": 8.0,
      "allocated_hcm": 6.2,
      "allocated_cost_K": 89.28
    }
  ]
}
```


---

## 19. Frontend Pages & View Specifications

### 19.1 Dashboard Page

**Path:** `/dashboard`

**Above-the-fold KPIs (default 3):**

1. Supply vs Demand (Monthly Bar Chart) — Capacity vs Allocated HCM
2. Budget Burn Rate & Trend — Line chart with ▲/▼ arrows
3. Variance Analysis — Project-by-project planned vs actual table

**Secondary KPIs** (hidden until "Expand Dashboard" clicked):
4. Utilization Rate — Gauge
5. Overplan Count — Number of over-budget projects
6. Monthly Cash Flow Forecast — 6-month projection

**Filters:** POD Team, Project (primary); Cost Center, Skill, Time Range (secondary).

### 19.2 Resource Management Pages

#### Resource List (`/resources`)

**Filters:** Skill (multi-select), Level range slider, Cost Center, Status (Active/On Leave/Terminated/All).

**Table columns:** Name, External ID, Cost Center, Team Code, Skill, Level, Status, Current Rate, Util%.

**Bulk actions:** Import CSV (Admin), Export CSV, Batch status change.

**CSV Import Flow (Admin-only):**

1. **Upload step** — Click "Import CSV" → choose file → file shows in dropdown
2. **Preview step** — System parses header + first 10 rows, displays column mapping UI:
   ```
   CSV Column            →  Mapped Field
   ──────────────────────────────────────────
   external_id           →  ✓ External ID
   name                  →  ✓ Name
   cost_center_id        →  ✓ Cost Center
   billable_team_code    →  ✓ Team Code
   category              →  ? Category (dropdown: contractor/permanent)
   skill                 →  ◯ Skill (unmapped — optional)
   ```
3. **Import mode selector** — Radio buttons (default: `PREVIEW`):
   - `PREVIEW` — Read-only parse; shows "X records would be imported, Y skipped, Z errors"
   - `CONFIRM` — Actual write; requires Admin password re-auth
   - `DRY_RUN` — Simulates full import, rolls back transaction, returns statistics only
4. **Confirm step** — If `CONFIRM` mode selected: Admin enters password → `POST /api/v1/resources/import/csv?mode=CONFIRM` → `import_batch_id` UUID generated → rows inserted in single transaction, errors recorded but don't block entire batch → success toast "142 imported, 3 skipped (see error log)"

**`import_batch_id` tracking:** Every successful import generates a UUID used for idempotency. Re-submitting same CSV with same UUID is a no-op with HTTP 200 + message "already processed". Admin can view import history table (Admin Console) listing `import_batch_id`, `row_count`, `success_count`, `error_count`, `imported_by`, `imported_at`.

#### Resource Detail (`/resources/:id`)

**Tabs:** Overview (profile, rate, capacity summary), Allocation Calendar (weekly grid), History (audit entries).

### 19.3 Project Management Pages

#### Project List (`/projects`)

**Filters:** Status, Date range, Budget range, PM owner.

**Table columns:** Name, Request ID, Billable Product ID, Status, PM, Budget, Burn %, Start | End, Activity count.

#### Project Detail (`/projects/:id`)

**Tabs:** Overview, Activities (bulk create, reorder), Gantt (Frappe Gantt with critical path), Dependency Graph (DAG), Allocations (resource assignments), Variance (Phase 2).

### 19.4 Allocation Management

#### Allocation Modal (Shared)

Shared by both project-centric and resource-centric flows:

```
┌─────────────────────────────────────────────────────────────┐
│  Assign Resource to Project                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Resource *   [🔍 ─────────┐]  (search dropdown)          │
│  Project *    [🔍 ─────────┐]  (search dropdown)          │
│  Week Range   [2026-04-20] → [2026-05-17]  [📅]          │
│  Hours/Week   [──── 40 ────]     (1–80)                   │
│  Notes        [───────────────────────]                     │
│                                                             │
│  ┌───────────────────────────────────────────────────┐   │
│  │ Real-time Validation                              │   │
│  │ ● Budget remaining: $45K (65% used)               │   │
│  │ ⚠️  OT warning: daily avg > 8h (9.2h/day)        │   │
│  │ ✓  Project count: 4/5                              │   │
│  └───────────────────────────────────────────────────┘   │
│                                                             │
│              [Cancel]        [Submit for Approval]         │
└─────────────────────────────────────────────────────────────┘
```

#### Allocation Approval Panel (`/allocations/approvals`)

Table showing pending allocations with Resource, Project, Week Range, Hours, Submitted At. Bulk approve/reject. Reject requires reason.

---

### 19.5 Notification Center Page (`/notifications`)

**Route:** `/notifications` — accessible to all authenticated users.

**Layout (`NotificationCenter.tsx`):**

| Region               | Content                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| Header               | "Notifications" title + badge count + Mark All Read button             |
| Filter toolbar       | Filter by: `read` / `unread` / `all` (default: unread). Clear filters  |
| Group toggle (ON)    | "Group by event type" checkbox — ON by default                         |
| Notification list    | Virtual-scroll list (`react-window`); each item: icon + headline + body + timestamp + Mark Read button |
| Empty state          | "No notifications — you're all caught up!" (when filtered list empty)  |

**Notification Item Render:**

```typescript
// frontend/src/components/NotificationCenter.tsx
interface NotificationItemProps {
  notification: NotificationDTO;  // { id, eventType, title, body, createdAt, read, entityRef }
}

const NotificationItem = ({ notification }: NotificationItemProps) => {
  const iconMap = {
    ALLOCATION_SUBMITTED: '📤',
    ALLOCATION_APPROVED:  '✅',
    ALLOCATION_REJECTED:  '❌',
    BUDGET_EXCEED_WARNING: '⚠️',
    PROJECT_STATUS_TRANSITION: '🔄',
    AUTO_ALLOCATION_FAILED: '🤖',
    AUTO_ALLOCATION_SUCCEEDED: '✨',
    PROJECT_VERSION_MAJOR: '📌',
    HOLIDAY_CALENDAR_UPDATED: '📅',
  };

  return (
    <div className={`notif-item ${notification.read ? 'read' : 'unread'}`}>
      <span className="notif-icon">{iconMap[notification.eventType]}</span>
      <div className="notif-content">
        <div className="notif-title">{notification.title}</div>
        <div className="notif-body">{notification.body}</div>
        <div className="notif-meta">
          {formatRelativeTime(notification.createdAt)} · {notification.entityRef ? 'View details →' : ''}
        </div>
      </div>
      {!notification.read && (
        <button onClick={() => markAsRead(notification.id)} aria-label="Mark as read">×</button>
      )}
    </div>
  );
};
```

**API Contract (`NotificationDTO`):**

```typescript
type NotificationDTO = {
  id: string;
  eventType: string;           // e.g., 'ALLOCATION_SUBMITTED'
  title: string;               // e.g., 'Allocation submitted for approval'
  body: string;                // e.g., 'Sarah Johnson submitted 40 hours for Phoenix (Week of Apr 7)'
  createdAt: string;           // ISO 8601
  read: boolean;
  entityRef?: {               // Optional link to related entity
    type: 'allocation' | 'project' | 'resource';
    id: string;
  } | null;
};
```

**Mark-as-Read Flow:**

1. Single item click "×" → `PATCH /api/v1/notifications/{id}/read` with `{ read: true }`
2. Bulk "Mark all read" (checkbox + button) → `PATCH /api/v1/notifications/bulk-read` body: `{ ids: string[], read: boolean } = true`
3. Unread badge updated via WebSocket event `NOTIFICATION_READ` (see Section 14.2 real-time)

**WebSocket Push Model (Real-time):**

| Event                            | Payload                                      | Client Action                               |
| -------------------------------- | -------------------------------------------- | ------------------------------------------- |
| `NOTIFICATION_CREATED`          | `{ id, eventType, title, body, createdAt }`  | Prepend to list (or add to grouped bucket)  |
| `NOTIFICATION_READ`            | `{ id, read: true }`                         | Remove from unread count; strikethrough UI  |
| `NOTIFICATION_BATCH`           | `{ notifications: [...] }`                   | Initial page load or pull-to-refresh result |

**Grouping UI Spec:**

Grouping is enabled by default. Group definition criteria:
1. Same `eventType`
2. `createdAt` truncated to the same hour (e.g., 2025-04-19 14:00–14:59)

Within each group:
- Most recent notification's `title` + `body` shown as group header
- Collapsed by default (max 5 items visible, "Show N more" expands)
- Group-level "Mark all read" action applies to all items in bucket

API unchanged — grouping is client-side only. Responses arrive unsorted; client performs `Array.groupBy()` equivalent.

**End-to-end Mockup (visual reference for frontend devs):**

```
┌─────────────────────────────────────────────────────────────────┐
│ Notifications (12)                                   [ Mark All Read ]  [o] Group by type
├─────────────────────────────────────────────────────────────────┤
│ [📤] Allocation submitted for approval                          unread
│     Sarah Johnson submitted 40 hours for Phoenix (Wk Apr 7)    2m ago
│                                                                  [×]
├─────────────────────────────────────────────────────────────────┤
│ [📤] Allocation submitted for approval                          unread  (grouped)
│     Mike Chen submitted 32 hours for Mercury (Wk Apr 7)         5m ago
│     + 2 more                                                     [Mark group read]
├─────────────────────────────────────────────────────────────────┤
│ [⚠️] Budget warning: Phoenix at 82% utilization                 unread
│     Allocated $81K of $98.5K budget                             1h ago   [×]
└─────────────────────────────────────────────────────────────────┘
```

---

### 19.6 Notification Grouping Toggle Component

**File location:** `frontend/src/components/NotificationGroupingToggle.tsx`

```typescript
// NotificationGroupingToggle.tsx
import { useStorage } from '@plasmohq/storage'; // or Zustand store

export const NotificationGroupingToggle = () => {
  const [groupingEnabled, setGroupingEnabled] = useStorage<boolean>(
    'notification-grouping-enabled',
    { defaultValue: true }
  );

  return (
    <label className="notification-grouping-toggle">
      <input
        type="checkbox"
        checked={groupingEnabled}
        onChange={(e) => setGroupingEnabled(e.target.checked)}
      />
      Group by event type
      <Tooltip content="When enabled, notifications of the same type from the last hour are grouped together">
        <InfoIcon size={14} />
      </Tooltip>
    </label>
  );
};
```

**State persistence:** User preference persisted to `localStorage` key `notification-grouping-enabled` (default: `true`). Toggle applies immediately to current list via re-aggregation.

---

### 19.5 Notification Center Page (`/notifications`)

**Route:** `/notifications` — accessible to all authenticated users.

**Layout (`NotificationCenter.tsx`):**

| Region               | Content                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| Header               | "Notifications" title + badge count + Mark All Read button             |
| Filter toolbar       | Filter by: `read` / `unread` / `all` (default: unread). Clear filters  |
| Group toggle (ON)    | "Group by event type" checkbox — ON by default                         |
| Notification list    | Virtual-scroll list (`react-window`); each item: icon + headline + body + timestamp + Mark Read button |
| Empty state          | "No notifications — you're all caught up!" (when filtered list empty)  |

**Notification Item Render:**

```typescript
// frontend/src/components/NotificationCenter.tsx
interface NotificationItemProps {
  notification: NotificationDTO;  // { id, eventType, title, body, createdAt, read, entityRef }
}

const NotificationItem = ({ notification }: NotificationItemProps) => {
  const iconMap = {
    ALLOCATION_SUBMITTED: '📤',
    ALLOCATION_APPROVED:  '✅',
    ALLOCATION_REJECTED:  '❌',
    BUDGET_EXCEED_WARNING: '⚠️',
    PROJECT_STATUS_TRANSITION: '🔄',
    AUTO_ALLOCATION_FAILED: '🤖',
    AUTO_ALLOCATION_SUCCEEDED: '✨',
    PROJECT_VERSION_MAJOR: '📌',
    HOLIDAY_CALENDAR_UPDATED: '📅',
  };

  return (
    <div className={`notif-item ${notification.read ? 'read' : 'unread'}`}>
      <span className="notif-icon">{iconMap[notification.eventType]}</span>
      <div className="notif-content">
        <div className="notif-title">{notification.title}</div>
        <div className="notif-body">{notification.body}</div>
        <div className="notif-meta">
          {formatRelativeTime(notification.createdAt)} · {notification.entityRef ? 'View details →' : ''}
        </div>
      </div>
      {!notification.read && (
        <button onClick={() => markAsRead(notification.id)} aria-label="Mark as read">×</button>
      )}
    </div>
  );
};
```

**API Contract (`NotificationDTO`):**

```typescript
type NotificationDTO = {
  id: string;
  eventType: string;           // e.g., 'ALLOCATION_SUBMITTED'
  title: string;               // e.g., 'Allocation submitted for approval'
  body: string;                // e.g., 'Sarah Johnson submitted 40 hours for Phoenix (Week of Apr 7)'
  createdAt: string;           // ISO 8601
  read: boolean;
  entityRef?: {               // Optional link to related entity
    type: 'allocation' | 'project' | 'resource';
    id: string;
  } | null;
};
```

**Mark-as-Read Flow:**

1. Single item click "×" → `PATCH /api/v1/notifications/{id}/read` with `{ read: true }`
2. Bulk "Mark all read" (checkbox + button) → `PATCH /api/v1/notifications/bulk-read` body: `{ ids: string[], read: boolean } = true`
3. Unread badge updated via WebSocket event `NOTIFICATION_READ` (see Section 14.2 real-time)

**WebSocket Push Model (Real-time):**

| Event                            | Payload                                      | Client Action                               |
| -------------------------------- | -------------------------------------------- | ------------------------------------------- |
| `NOTIFICATION_CREATED`          | `{ id, eventType, title, body, createdAt }`  | Prepend to list (or add to grouped bucket)  |
| `NOTIFICATION_READ`            | `{ id, read: true }`                         | Remove from unread count; strikethrough UI  |
| `NOTIFICATION_BATCH`           | `{ notifications: [...] }`                   | Initial page load or pull-to-refresh result |

**Grouping UI Spec:**

Grouping is enabled by default. Group definition criteria:
1. Same `eventType`
2. `createdAt` truncated to the same hour (e.g., 2025-04-19 14:00–14:59)

Within each group:
- Most recent notification's `title` + `body` shown as group header
- Collapsed by default (max 5 items visible, "Show N more" expands)
- Group-level "Mark all read" action applies to all items in bucket

API unchanged — grouping is client-side only. Responses arrive unsorted; client performs `Array.groupBy()` equivalent.

**End-to-end Mockup (visual reference for frontend devs):**

```
┌─────────────────────────────────────────────────────────────────┐
│ Notifications (12)                                   [ Mark All Read ]  [o] Group by type
├─────────────────────────────────────────────────────────────────┤
│ [📤] Allocation submitted for approval                          unread
│     Sarah Johnson submitted 40 hours for Phoenix (Wk Apr 7)    2m ago
│                                                                  [×]
├─────────────────────────────────────────────────────────────────┤
│ [📤] Allocation submitted for approval                          unread  (grouped)
│     Mike Chen submitted 32 hours for Mercury (Wk Apr 7)         5m ago
│     + 2 more                                                     [Mark group read]
├─────────────────────────────────────────────────────────────────┤
│ [⚠️] Budget warning: Phoenix at 82% utilization                 unread
│     Allocated $81K of $98.5K budget                             1h ago   [×]
└─────────────────────────────────────────────────────────────────┘
```

---

### 19.6 Notification Grouping Toggle Component

**File location:** `frontend/src/components/NotificationGroupingToggle.tsx`

```typescript
// NotificationGroupingToggle.tsx
import { useStorage } from '@plasmohq/storage'; // or Zustand store

export const NotificationGroupingToggle = () => {
  const [groupingEnabled, setGroupingEnabled] = useStorage<boolean>(
    'notification-grouping-enabled',
    { defaultValue: true }
  );

  return (
    <label className="notification-grouping-toggle">
      <input
        type="checkbox"
        checked={groupingEnabled}
        onChange={(e) => setGroupingEnabled(e.target.checked)}
      />
      Group by event type
      <Tooltip content="When enabled, notifications of the same type from the last hour are grouped together">
        <InfoIcon size={14} />
      </Tooltip>
    </label>
  );
};
```

**State persistence:** User preference persisted to `localStorage` key `notification-grouping-enabled` (default: `true`). Toggle applies immediately to current list via re-aggregation.

---

## 20. Frontend Performance & Optimization

### 20.1 Code Splitting

```typescript
const Dashboard = lazy(() => import('./pages/DashboardPage'));
const ProjectDetail = lazy(() => import('./pages/project/ProjectDetail'));

<Suspense fallback={<LoadingSpinner fullPage />}>
  <Outlet />
</Suspense>
```

### 20.2 Query Optimization

```typescript
const { data: project } = useQuery({ queryKey: ['project', id], queryFn: () => fetchProject(id) });
const { data: activities } = useQuery({
  queryKey: ['activities', id],
  queryFn: () => fetchActivities(id),
  enabled: !!project,  // Wait for project
});
```

### 20.3 Virtual Scrolling

- Resource list >50 items → `react-window`
- Allocation table → windowed rendering
- Notification center → paginated virtual scroll

### 20.4 Memoization

- `React.memo()` for KPICard, AllocationRow, ProjectTableRow
- `useMemo()` for capacity/burn rate calculations
- `useCallback()` for event handlers

---

## 21. Frontend Testing Strategy

### 21.1 Unit Tests (Vitest)

```typescript
describe('AllocationModal', () => {
  it('shows constraint violations when budget exceeded', async () => {
    render(<AllocationModal projectId="p1" />);
    await userEvent.type(screen.getByLabelText('Hours'), '200');
    expect(screen.getByText('Monthly cap 144h exceeded')).toBeInTheDocument();
  });
});
```

### 21.2 Integration Tests (RTL + MSW)

```typescript
test('PM submits allocation → appears in approval queue', async () => {
  server.use(rest.post('/api/v1/allocations', (req, res, ctx) => {
    return res(ctx.status(201), ctx.json({ id: 'alloc-123', status: 'PENDING' }));
  }));
  render(<App />);
  // Navigate, fill form, submit
  await waitFor(() => expect(screen.getByText('Submitted for approval')).toBeVisible());
});
```

### 21.3 E2E Tests (Playwright)

```typescript
describe('Allocation workflow', () => {
  it('PM allocates resource and POD manager approves', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name=username]', 'pm@company.com');
    await page.click('button:has-text("Login")');
    await page.click('text=Projects');
    await page.click('text=Phoenix');
    await page.click('button:has-text("Assign Resource")');
    await page.selectOption('select[name=resource]', 'Sarah Liu');
    await page.fill('input[name=hours]', '40');
    await page.click('button:has-text("Submit")');
  });
});
```

---

## 22. Browser Support

| Browser | Minimum Version |
| ------- | --------------- |
| Chrome  | 100+            |
| Firefox | 98+             |
| Safari  | 16.4+           |
| Edge    | 100+            |

---

## 23. Accessibility (WCAG 2.1 AA)

- **Keyboard:** Tab order, focus trap in modals, ESC to close
- **Screen Reader:** `aria-live` for toasts, `aria-label` on icon-only buttons
- **Contrast:** Ratio ≥ 4.5:1 (axe-core verified)
- **Focus:** Visible 2px ring (color #0066cc)
- **Forms:** Labels always visible, `aria-describedby` for errors
- **Reduced Motion:** Respect `prefers-reduced-motion`

---

## 24. Frontend Deployment & Build

### 22.1 Build Configuration (Vite)

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2022',
    rollupOptions: { output: { manualChunks: { vendor: ['react','react-dom'] } } },
  },
  define: {
    __API_URL__: JSON.stringify(process.env.VITE_API_URL),
  },
});
```

### 24.2 Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

### 24.3 CI/CD

```yaml
# .github/workflows/frontend.yml
- run: npm ci
- run: npm run test:coverage
- run: npm run lint
- run: npm run build
```

---

## 25. Frontend Developer Guide

### 25.1 Adding a New Page

1. Create component in `src/pages/`
2. Add route in `src/App.tsx`
3. Wrap with `<AuthGuard>` if needed
4. Add role-based access: `<AuthGuard role="ADMIN">`
5. Update sidebar navigation
6. Write unit + integration tests

### 25.2 Adding API Integration

1. Add endpoint to `src/api/client.ts`
2. Create types in `src/types/api.ts`
3. Write custom hook in `src/hooks/`
4. Use hook in component
5. Handle loading, error, success states
6. Add error mapping in `utils/api.ts`

### 25.3 Styling Guidelines

- Tailwind utility classes only
- Mobile-first breakpoints
- Color palette in `tailwind.config.js`
- No dark mode in MVP

---

## 26. End-to-End Flow Reference

| User Journey       | Start Page                 | Intermediate Steps                     | End State                   |
| ------------------ | -------------------------- | -------------------------------------- | --------------------------- |
| Login              | `/login`                 | Enter creds → validate → store token | Dashboard                   |
| Create resource    | `/resources`             | Import CSV → preview → confirm       | Resource visible            |
| Create project     | `/projects`              | Fill form → create activities         | Project detail              |
| Assign resource    | `/projects/:id`          | Modal → submit → PENDING             | Approval needed             |
| Approve allocation | `/allocations/approvals` | Select → approve                      | PM notified                 |
| View Gantt         | `/projects/:id`          | Gantt tab                              | Timeline with critical path |
| Auto-allocate      | `/projects/:id`          | Confirm → allocations created         | Auto-assigned               |
| View dashboard     | `/dashboard`             | Change date range                      | Charts update               |

---

## 27. Frontend Known Issues & Future Work

### 29.1 MVP Limitations

- Offline mode not supported
- PWA not enabled
- Dark mode deferred
- Internationalization Phase 2
- Skill-matching auto-allocation (ML) deferred
- Gantt drag-resize shows warnings only (non-blocking)

### 29.2 Phase 2 Enhancements

- Actual consumption entry form + CSV import
- What-if Gantt simulation
- Skill Gap heatmap
- Advanced export (PDF)
- Bulk operations (multi-select + action dropdown)
- Email digest preferences
- Two-factor authentication

---

## 28. API Rate Limiting

### 30.1 Design Goals & Rationale

Rate limiting serves three objectives:

1. **Protect Backend Services** — Guard single-tenant resource exhaustion (cpu/memory/db connections).
2. **Enforce Fair Use** — Prevent runaway clients from starving others.
3. **Mitigate Abuse** — Throttle automated scraping, credential stuffing, and DoS attempts.

The system applies **multi-tiered limits** (IP + authenticated identity) with **Redis-backed token bucket** algo for burst toleration and Redis' single-threaded execution ensures atomic counter updates without race conditions.

### 28.2 Rate Limiting Strategy

#### 28.2.1 Limits

| Tier     | Scope                  | Rate        | Burst | Enforcement Point  | Example                      |
| -------- | ---------------------- | ----------- | ----- | ------------------ | ---------------------------- |
| Default  | Anonymous IP           | 100 req/min | 120   | Spring Filter     | `/api/v1/public/*`         |
| Standard | Authenticated user     | 500 req/min | 600   | Spring Filter     | `/api/v1/resources`        |
| Heavy    | Auto-allocate endpoint | 10 req/min  | 15    | Spring Filter     | `/api/v1/allocations/auto` |
| Strict   | Login endpoint         | 5 req/min   | 5     | Spring Filter     | `/api/v1/auth/login`       |

**Production systems should use the distributed sliding window implementation (Spring RedisRateLimiter).**

#### 28.2.2 Implementation

**Backend (Spring Boot Filter)**

```java
// backend/src/main/java/com/pod/filter/RateLimitFilter.java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final RedisTemplate<String, String> redisTemplate;
    private final TokenBucketService tokenBucketService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        String identifier = resolveIdentifier(request);
        RateLimitConfig config = RateLimitConfig.forPath(path);

        boolean allowed = tokenBucketService.tryConsume(
            identifier, config.getPath(), config.getCapacity(), config.getRefillRate());

        if (!allowed) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf(config.getRetryAfterSeconds()));
            response.getWriter().write("{\"error\":{\"code\":\"RATE_LIMIT_EXCEEDED\"}}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String resolveIdentifier(HttpServletRequest request) {
        // Extract from JWT token if authenticated, else use IP
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            return "user:" + jwt.getSubject();
        }
        return "ip:" + request.getRemoteAddr();
    }
}

// TokenBucketService.java
@Service
@RequiredArgsConstructor
public class TokenBucketService {
    private final RedisTemplate<String, String> redisTemplate;

    // Redis Lua script for atomic token bucket refill + consume
    private static final String LUA_SCRIPT = """
        local tokens = tonumber(redis.call('GET', KEYS[1])) or ARGV[1]
        local lastRefill = tonumber(redis.call('GET', KEYS[2])) or 0
        local now = tonumber(ARGV[3])
        local refillRate = tonumber(ARGV[4])
        local limit = tonumber(ARGV[5])

        tokens = tokens + math.floor((now - lastRefill) * refillRate)
        if tokens > limit then tokens = limit end

        if tokens >= 1 then
            tokens = tokens - 1
            redis.call('SET', KEYS[1], tokens)
            redis.call('SET', KEYS[2], now)
            return 1
        else
            redis.call('SET', KEYS[1], tokens)
            return 0
        end
        """;

    public boolean tryConsume(String identifier, String path, int capacity, double refillRatePerMs) {
        String keyTokens = String.format("rl:tokens:%s:%s", path, identifier);
        String keyLastRefill = String.format("rl:last:%s:%s", path, identifier);
        long now = System.currentTimeMillis();

        Long result = redisTemplate.execute(
            new DefaultRedisScript<>(LUA_SCRIPT, Long.class),
            List.of(keyTokens, keyLastRefill),
            String.valueOf(capacity), String.valueOf(now),
            String.valueOf(refillRatePerMs), String.valueOf(capacity)
        );
        return result != null && result == 1L;
    }
}
```

**RateLimitConfig.java — endpoint-to-config mapping:**
```java
@Component
@ConfigurationProperties(prefix = "app.rate-limits")
@Data
public class RateLimitConfig {
    private Map<String, LimitConfig> endpoints = new HashMap<>();

    public static RateLimitConfig forPath(String path) {
        // Pattern match: /api/v1/resources → Standard tier
        if (path.startsWith("/api/v1/public/")) return RateLimitConfig.DEFAULT;
        if (path.startsWith("/api/v1/resources")) return RateLimitConfig.STANDARD;
        if (path.startsWith("/api/v1/allocations/auto")) return RateLimitConfig.HEAVY;
        if (path.equals("/api/v1/auth/login")) return RateLimitConfig.STRICT;
        return RateLimitConfig.DEFAULT;
    }

    public static final RateLimitConfig DEFAULT =
        new RateLimitConfig(100, 120, 60);
    public static final RateLimitConfig STANDARD =
        new RateLimitConfig(500, 600, 60);
    public static final RateLimitConfig HEAVY =
        new RateLimitConfig(10, 15, 60);
    public static final RateLimitConfig STRICT =
        new RateLimitConfig(5, 5, 60);
}
```

**Distributed Rate Limiting (Multi-Replica)**

Spring Boot 3.2 with Spring Security provides `ReactiveRedisTokenBucket` for distributed sliding-window rate limiting across Kubernetes replicas. Use Redis sorted sets for sliding-window:

```java
// SlidingWindowRateLimiter.java
@Service
@RequiredArgsConstructor
public class SlidingWindowRateLimiter {
    private final RedisTemplate<String, String> redisTemplate;

    public boolean allow(String identifier, int limit, Duration window) {
        String key = "rl:sw:" + identifier;
        long now = System.currentTimeMillis();
        long cutoff = now - window.toMillis();

        // Lua script: atomic trim + count + add
        String script = """
            local cutoff = tonumber(ARGV[1])
            local now = tonumber(ARGV[2])
            local limit = tonumber(ARGV[3])

            redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, cutoff)
            local count = redis.call('ZCARD', KEYS[1])

            if count < limit then
                redis.call('ZADD', KEYS[1], now, tostring(now) .. ':' .. math.random())
                redis.call('EXPIRE', KEYS[1], ARGV[4])
                return 1
            else
                return 0
            end
            """;

        Long result = redisTemplate.execute(
            new DefaultRedisScript<>(script, Long.class),
            List.of(key),
            String.valueOf(cutoff), String.valueOf(now), String.valueOf(limit),
            String.valueOf(window.toSeconds() * 2)
        );
        return result != null && result == 1L;
    }
}
```

**Frontend Handling**

Respect `Retry-After` header on 429 responses:

```typescript
// frontend/src/api/client.ts
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after']
      if (retryAfter) {
        await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000))
        return axios(error.config)  // retry once
      }
    }
    return Promise.reject(error)
  }
);
```

Display friendly message: "You've made too many requests. Please wait 60 seconds and try again."

#### 28.2.3 Monitoring & Alerting

**Metrics (Prometheus-compatible):**

| Metric Name                  | Type    | Labels                         | Description              |
| ---------------------------- | ------- | ------------------------------ | ------------------------ |
| `rate_limit_allowed_total` | Counter | `scope`, `identifier_type` | Total requests allowed   |
| `rate_limit_limited_total` | Counter | `scope`, `identifier_type` | Total requests rejected  |
| `rate_limit_bucket_tokens` | Gauge   | `scope`, `identifier`      | Current tokens remaining |

**Alert rules:**

```yaml
# Alert if any endpoint exceeds 80% of its rate limit
- alert: HighRateLimitRejection
  expr: rate(rate_limit_limited_total[5m]) > 0.2 * rate(rate_limit_allowed_total[5m])
  for: 5m
  annotations:
    summary: "High rate limit rejection rate for {{ $labels.scope }}"
```

**Grafana dashboard** — visualize per-endpoint request rates, allowed vs rejected counts.

#### 28.2.4 Per-User vs Per-IP Trade-offs

| Strategy                       | Pros                       | Cons                                                                       |
| ------------------------------ | -------------------------- | -------------------------------------------------------------------------- |
| Per-IP (default for anonymous) | Simple, blocks IP flooding | Shared NAT (office, mobile carrier) penalizes groups; IP rotation bypasses |
| Per-User (authenticated)       | Fair per-account billing   | Requires JWT validation; still vulnerable to token theft                   |

**Recommended:** Authenticated → user-based; Anonymous → IP-based. Rate limits should be configurable via environment variables (no code change):

```bash
RATE_LIMIT_DEFAULT=100
RATE_LIMIT_DEFAULT_BURST=120
RATE_LIMIT_AUTO_ALLOCATE=10
RATE_LIMIT_LOGIN=5
```

#### 28.2.5 Edge Cases & Pitfalls

| Fallacy                    | Why it's wrong                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------- |
| Exponential backoff on 429 | Doesn't help — server already rejects; client must wait `Retry-After`           |
| Client-side delay          | Inefficient — reject fast, don't slow down                                        |
| Rate limiting only on POST | Attackers can spam GET too (enumerate resources); rate limit all methods uniformly |

---

## 29. Operational Runbooks

### 29.1 Service Health & Alert Response

#### 29.1.1 Incident Severity Levels

| Severity    | Definition                         | Response          | Example                                       |
| ----------- | ---------------------------------- | ----------------- | --------------------------------------------- |
| P0-Critical | System unavailable, data loss risk | All-hands, <15min | DB down, 5xx error rate >50%                  |
| P1-High     | Major feature degraded             | 1h response       | Allocation engine failing, dashboard stale    |
| P2-Medium   | Minor feature degraded             | 4h response       | CSV import slow (>30s), notifications delayed |
| P3-Low      | Cosmetic/non-blocking              | Next business day | Missing favicon, scroll jank                  |

#### 29.1.2 Common Alerts & Runbook Steps

**Alert: `APIHighErrorRate` — P0**

> Condition: `rate(http_server_requests_seconds_count{status=~"5.."}[5m]) > 0.05 * rate(http_server_requests_seconds_count[5m])`

Runbook:

1. Acknowledge alert in PagerDuty/Opsgenie
2. Check aggregate dashboard: `http://grafana.internal/d/api-errors`
   - Is error isolated to specific endpoint? Filter by route.
   - Is error isolated to specific user/tenant? Check `user_id` label.
3. Check recent deployments: `kubectl rollout history deployment/pod-backend -n prod`
   - If deployed <30min ago: suspect code change → rollback to previous: `kubectl rollout undo ...`
4. Check exception logs: `journalctl -u pod-backend -n 200 | grep -i "exception\|traceback"`
5. Check DB connectivity: `kubectl exec pod/pod-backend-xxxx -- pg_isready -h $DATABASE_URL`
6. If DB connection pool exhausted: increase `SPRING_DATASOURCE_HIKARI_MAXIMUM-POOL-SIZE` in config map, restart pods.
7. Escalate to DBA if database-related errors (constraint violations, deadlocks).

**Alert: `PostgreSQLDown` — P0**

> Condition: `pg_up == 0` OR `pg_stat_activity == 0`

Runbook:

1. Check primary pod health: `kubectl get pods -l app=postgres -n prod`
   - If CrashLoopBackOff: `kubectl logs pod/postgres-primary-xxxx -n prod --tail=50`
2. Check disk space: `kubectl exec pod/postgres-primary-xxxx -- df -h /var/lib/postgresql/data`
   - If >90%: coordinate with infra for volume expansion.
3. Check replication lag: `SELECT * FROM pg_stat_replication;`
   - If `state = 'catchup'` and `pg_wal_lsn_diff('pg_current_wal_lsn()', 'replay_lsn') > 100MB`: failover might be needed.
4. If primary down: promote read replica as new primary (procedure in section 27.2.1).

**Alert: `BudgetBurnAlert` — P1**

> Condition: `mv_project_burn.burn_rate_pct > 90` for >24h

Runbook:

1. Verify MV is fresh: `SELECT last_refresh FROM mv_refresh_metadata;`
   - If stale: manually trigger `REFRESH MATERIALIZED VIEW mv_project_burn;`
2. Identify over-burning projects: `SELECT * FROM mv_project_burn WHERE burn_rate_pct >= 90 ORDER BY burn_rate_pct DESC;`
3. Check actual allocations: Pull detailed allocation breakdown from `allocations` table.
4. Notify PM and Finance via Slack (#budget-alerts).
5. Freeze new allocations to affected projects via feature flag `BUDGET_FREEZE_<PROJECT_ID>`.

**Alert: `RateLimitExceeded spike` — P2**

> Condition: `rate(rate_limit_limited_total[5m]) > 1000`

Runbook:

1. Check `scope` label to identify limiter: is it `default`, `auto_allocate`, or `login`?
2. If `login` scope spike: Likely credential stuffing attack.
   - Check source IPs: `redis-cli --scan --pattern "rate_limit:login:ip:*" | head -20`
   - If concentrated from few IPs: block via `iptables` or cloud firewall (infra).
3. If `auto_allocate` spike: User may be hammering refresh; reach out to user.
4. If `default` spike: Review if legitimate traffic surge (new onboarding). Consider raising limit for affected `user_id`.

**Alert: `MVStale` — P2**

> Condition: `time() - mv_supply_demand_monthly.last_refresh > 600` (10 min)

Runbook:

1. Check scheduler health: `kubectl logs deployment/mv-refresh-scheduler -n prod`
2. Check Redis lock status: `redis-cli GET lock:refresh_mv`
   - If lock held >300s: another instance stuck; kill stale lock only if no active refresh running.
3. Manually trigger refresh: `kubectl exec -it pod/pod-backend-xxxx -- 
   java -cp /app/lib/*:/app/app.jar com.pod.task.MaterializedViewRefreshTask`
4. If scheduler pod crashed: `kubectl rollout restart deployment/mv-refresh-scheduler`

**Alert: `AllocationConstraintViolationHigh` — P2**

> Condition: `rate(allocation_constraint_violation_total[5m]) > 0.5 * rate(allocation_create_total[5m])` (rejection rate > 50%)

Runbook:

1. Query recent violations with field `ALLOCATION_CONSTRAINT_VIOLATION` from audit_log.
2. Identify most common violation type: `SELECT details->>'code', COUNT(*) FROM audit_log WHERE ...`
3. If `PROJECT_SPREAD_LIMIT`: Review resource assignment policy with PMs.
4. If `MONTHLY_CAP_EXCEEDED`: Validate rate table data accuracy.
5. Document patterns in knowledge base.

### 29.2 Database Maintenance

#### 29.2.1 Failover Procedure (Primary PostgreSQL Down)

**Prerequisites:** Read replica already configured (streaming replication).

Steps:

1. Promote replica: `kubectl exec -it pod/postgres-replica-xxxx -- pg_ctl promote -D /var/lib/postgresql/data`
2. Update application config: Change `DATABASE_URL` to point to promoted replica.
   - Config map: `kubectl edit configmap pod-backend-config -n prod` → update env `DATABASE_HOST`
3. Restart backend pods: `kubectl rollout restart deployment/pod-backend -n prod`
4. Verify: Application health checks pass, new allocations succeed.
5. Rebuild former primary as replica: Point at new primary, reinitialize.

#### 29.2.2 Long-Running Query Termination

Query consuming > 5s CPU:

```sql
-- Identify
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > interval '5 seconds'
ORDER BY duration DESC;

-- Terminate (careful!)
SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE ...;
-- If that fails, use pg_terminate_backend(pid) as last resort.
```

#### 29.2.3 Partition Management (audit_log)

Monthly partition creation (via cron):

```sql
-- Create next month's partition (runs 1st of each month)
CREATE TABLE audit_log_202605 PARTITION OF audit_log
FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
```

Drop partitions >8yr old (after S3 archive export confirmed):

```sql
DROP TABLE audit_log_201801;
```

#### 29.2.4 Partition Automation (Cron + Liquibase Flyway)

**Partition creation:** Backend application includes `PartitionMaintenanceTask` that runs at 00:05 UTC on the 1st of each month to create the next month's partition:

```java
// backend/src/main/java/com/pod/task/PartitionMaintenanceTask.java
@Component
@Slf4j
@RequiredArgsConstructor
public class PartitionMaintenanceTask {

    private final JdbcTemplate jdbcTemplate;

    // Run 5 min after midnight on the 1st of each month
    @Scheduled(cron = "0 5 0 1 * ?")
    public void createNextMonthPartition() {
        YearMonth nextMonth = YearMonth.now().plusMonths(1);
        String partitionName = "audit_log_" + nextMonth.format(DateTimeFormatter.ofPattern("yyyyMM"));
        String from = nextMonth.atDay(1).toString();
        String to = nextMonth.plusMonths(1).atDay(1).toString();

        String sql = String.format(
            "CREATE TABLE IF NOT EXISTS %s PARTITION OF audit_log " +
            "FOR VALUES FROM ('%s') TO ('%s')",
            partitionName, from, to);

        jdbcTemplate.execute(sql);
        log.info("Created audit_log partition {}", partitionName);
    }

    // Run weekly: find partitions >8yr old where S3 archive confirmed, then DROP
    @Scheduled(cron = "0 0 2 ? * SUN")  // Sunday 02:00 UTC
    public void dropExpiredPartitions() {
        // Query table list: SELECT tablename FROM pg_tables WHERE tablename LIKE 'audit_log_%'
        // For each: extract year-month, compare to cutoff = now() - 8 years
        // Verify S3 archive exists (head_object S3 key audit_log/YYYY/MM/log.jsonl.gz)
        // If confirmed: DROP TABLE tablename
        // Else: log warning "Archive missing for {partition} — retention extended"
    }
}
```

**Migration tooling:** Use Flyway or Liquibase to define the base `audit_log` parent table with `PARTITION BY RANGE (created_at)`. Partition DDL is executed dynamically by the maintenance task; no versioned migration needed for each month.

### 29.3 Backup & Restore

#### 27.3.1 Backup Schedule

| Backup Type            | Frequency       | Retention | Location                       |
| ---------------------- | --------------- | --------- | ------------------------------ |
| Full dump              | Daily 02:00 UTC | 30 days   | S3:`s3://pod-backups/daily/` |
| WAL archiving          | Continuous      | -         | S3:`s3://pod-backups/wal/`   |
| Point-in-time recovery | Configurable    | 90 days   | WAL + base backup              |

**Verification:** Monthly restore test to staging cluster.

#### 27.3.2 Restore Procedure

1. Create new empty cluster (staging).
2. Download latest base backup + all WAL segments.
3. `pg_restore --dbname=pod_restored -Fc latest.dump`
4. Apply WAL to desired timestamp: `pg_waldump` + `pg_rewind` if needed.
5. Validate row counts: `SELECT COUNT(*) FROM resources, allocations, projects;`
6. DNS cutover: update read replica connection strings.

### 29.4 Scaling Procedures

#### 27.4.1 Horizontal Scaling (Backend)

Add replica:

```bash
kubectl scale deployment pod-backend --replicas=5
```

Verify distribution:

```bash
kubectl get pods -l app=pod-backend -o wide
```

Check load balancer metrics: `kubectl top nodes`

#### 27.4.2 Database Read Scaling

Add read replica:

```sql
-- On primary: ensure wal_level = replica, max_replication_slots >= 2
SELECT pg_create_physical_replication_slot('replica_slot_1');

-- On replica: set primary_conninfo = 'host=<primary_ip> port=5432 user=replicator password=... slot=replica_slot_1'
```

Update application: Direct read-only queries (`SELECT ...`) to replica via Spring's `AbstractRoutingDataSource` or separate `JdbcTemplate`/`EntityManager` configured for read-replica:

```java
// ReadReplicaRoutingDataSource.java
@Component
public class ReadReplicaRoutingDataSource extends AbstractRoutingDataSource {
    @Override
    protected Object determineCurrentLookupKey() {
        return ReadOnlyModeContext.isReadOnly() ? "replica" : "primary";
    }
}

// Usage in DashboardService:
@Transactional(readOnly = true)
public DashboardDto getMonthlyMetrics(YearMonth month) {
    // Query routed automatically to replica via routing datasource
    return jdbcTemplate.queryForObject(...);
}
```

#### 27.4.3 Redis Cluster Scaling

Single Redis node → Redis Cluster (sharded):

```bash
redis-cli --cluster create \
  node1:6379 node2:6379 node3:6379 node4:6379 node5:6379 node6:6379 \
  --cluster-replicas 1
```

Backend code change: Enable cluster mode (`Redis.from_url(..., decode_responses=True)` with `retry_on_timeout=True`).

### 29.5 Security Incident Response

**Scenario: Token Compromise**

1. Revoke JWT globally: Update `JWT_SECRET_KEY` in Kubernetes secret.
2. All existing tokens invalid — users must re-login.
3. Review audit_log for suspicious activity: `SELECT * FROM audit_log WHERE changed_at > NOW() - interval '1 day' AND change_reason ILIKE '%token%';`
4. Enforce MFA for all admin accounts (temporary).

**Scenario: Rate limit bypass attempt**

1. Identify user: `redis-cli KEYS "rate_limit:*" | grep <suspicious_pattern>`
2. Suspend user account: `PATCH /api/v1/users/{id}/status` → `suspended`
3. Notify security team via Slack @security.

### 29.6 Capacity Planning

**Quarterly Review Checklist:**

- [ ] DB size growth rate: `SELECT pg_size_pretty(pg_database_size('pod_db'));` YoY trend
- [ ] Query performance: Slowest 5 queries from `pg_stat_statements`
- [ ] Index bloat: `SELECT * FROM pg_stat_user_indexes WHERE idx_scan < 100 AND idx_tup_read > 10000;`
- [ ] Redis memory: `INFO memory` → used_memory_human
- [ ] Kubernetes resource requests: monitor CPU throttling (`container_cpu_cfs_throttled_seconds_total`)

**Rule of thumb:** Provision 2x expected peak load. Schedule capacity reviews before major hiring cycles.

### 29.7 Operational Checklist

**Pre-Deploy (Daily)**

- [ ] Smoke test on staging: `curl -f https://staging.pod.company.com/health/ready`
- [ ] Backup verification: Last backup confirmed in S3 (file exists, size > 0)
- [ ] MV Refresh test: Manual refresh → data returned
- [ ] Review alert fatigue: Are any alerts firing repeatedly without action?

**Post-Deploy (After Each Release)**

- [ ] Verify pod rollout complete: `kubectl rollout status deployment/pod-backend`
- [ ] Check error rate: `rate(http_server_requests_seconds_count{status=~"5.."}[5m]) == 0`
- [ ] Check 200 rate: Should be stable or increasing
- [ ] Dashboard loads under 2s LCP (Chrome DevTools audit)
- [ ] Confirm new feature flag states (if feature-flagged rollout)

**Monthly**

- [ ] Run DB consistency check: `SELECT COUNT(*) FROM allocations a JOIN resources r ON a.resource_id = r.id WHERE r.is_active = false AND a.is_active = true;`
- [ ] Rotate secrets: `kubectl create secret generic pod-secrets --from-file=...`
- [ ] Security patch roll-out (OS, Java, Node)
- [ ] Load test staging (using Locust): simulate 500 concurrent users
- [ ] Incident post-mortem review (any P0/P1 in last month)

---

## Change Log

| Version | Date       | Author   | Changes                                                                 |
| ------- | ---------- | -------- | ----------------------------------------------------------------------- |
| v2.2    | 2026-04-19 | Claude   | TDD v2.1 remediation complete: 5 P0 critical gaps fixed + 5 polish     |
|         |            |          | 1. Added 3 missing MVs (`mv_utilization_monthly`, `mv_overplan_conflicts`, `mv_cash_flow_forecast`) to Section 9.1; updated refresh task to include all 5 views in batch |
|         |            |          | 2. Expanded Notification Section 14 event matrix from 4→9 events; added distribution rules, email template variables, grouping logic |
|         |            |          | 3. Fixed `resources` table: added explicit `is_billable` column separate from `is_active`; added column semantics blueprint |
|         |            |          | 4. Fixed `rates` table: added `is_billable` column; defined its separation from `is_active` |
|         |            |          | 5. Added concrete Java method signatures for `ResourceService.changeStatus()` and `ProjectService.transitionToTerminal()`, including repository `@Modifying` queries |
|         |            |          | 6. Added `RATE_GAP_DETECTED` error code to new Appendix A error matrix |
|         |            |          | 7. Added Section 5.2.1: LATERAL join SQL implementation for `/export/resources` endpoint, including CSV column mapping and gap-handling semantics |
|         |            |          | 8. Added Section 19.5: Notification Center page full UX spec (header, filter, grouping toggle, item render, WebSocket push model, mockup) |
|         |            |          | 9. Added Section 19.6: Notification Grouping Toggle component spec with storage persistence |
|         |            |          | 10. Added Appendix B for Notification Center; added Section 29.2.4 for audit partition automation task |
| v2.1    | 2026-04-18 | Claude   | TDD v2.0 validated against 15 dependency gaps: fixed 3x duplicate sections, renamed FK columns (holidays/audit_log/allocations → `{x}_user_id`), removed false UNIQUE constraint on `resources(cost_center_id,billable_team_code)`, removed allocations four-eyes CHECK, updated schema/user-guide absence flag |
| v2.0    | 2026-04-17 | Pod Team | Initial TDD draft per TDD_REMEDIATION_PLAN v2.1 input                         |

---

## Change Log

| Version | Date       | Author   | Changes                                                                 |
| ------- | ---------- | -------- | ----------------------------------------------------------------------- |
| v2.2    | 2026-04-19 | Claude   | TDD v2.1 remediation complete: 5 P0 critical gaps fixed + 5 polish     |
|         |            |          | 1. Added 3 missing MVs (`mv_utilization_monthly`, `mv_overplan_conflicts`, `mv_cash_flow_forecast`) to Section 9.1; updated refresh task to include all 5 views in batch |
|         |            |          | 2. Expanded Notification Section 14 event matrix from 4→9 events; added distribution rules, email template variables, grouping logic |
|         |            |          | 3. Fixed `resources` table: added explicit `is_billable` column separate from `is_active`; added column semantics blueprint |
|         |            |          | 4. Fixed `rates` table: added `is_billable` column; defined its separation from `is_active` |
|         |            |          | 5. Added concrete Java method signatures for `ResourceService.changeStatus()` and `ProjectService.transitionToTerminal()`, including repository `@Modifying` queries |
|         |            |          | 6. Added `RATE_GAP_DETECTED` error code to new Appendix A error matrix |
|         |            |          | 7. Added Section 5.2.1: LATERAL join SQL implementation for `/export/resources` endpoint, including CSV column mapping and gap-handling semantics |
|         |            |          | 8. Added Section 19.5: Notification Center page full UX spec (header, filter, grouping toggle, item render, WebSocket push model, mockup) |
|         |            |          | 9. Added Section 19.6: Notification Grouping Toggle component spec with storage persistence |
|         |            |          | 10. Added Appendix B for Notification Center; added Section 29.2.4 for audit partition automation task |
| v2.1    | 2026-04-18 | Claude   | TDD v2.0 validated against 15 dependency gaps: fixed 3x duplicate sections, renamed FK columns (holidays/audit_log/allocations → `{x}_user_id`), removed false UNIQUE constraint on `resources(cost_center_id,billable_team_code)`, removed allocations four-eyes CHECK, updated schema/user-guide absence flag |
| v2.0    | 2026-04-17 | Pod Team | Initial TDD draft per TDD_REMEDIATION_PLAN v2.1 input                         |

---

## Appendices

### A. Error Code Matrix

All service layers return structured error responses with a canonical error code. These codes power the frontend error display (toast/alert) and audit log `details->'code'` field.

| Code                         | HTTP Status | Component               | Description                                                                 |
| ---------------------------- | ----------- | ----------------------- | --------------------------------------------------------------------------- |
| `ALLOCATION_CONFLICT`        | 409         | Allocation Service      | Optimistic lock version mismatch; concurrent edit detected                 |
| `DAILY_HOURS_EXCEEDED`      | 400         | ConstraintValidator     | Proposed daily avg > 10h                                                    |
| `MONTHLY_CAP_EXCEEDED`      | 400         | ConstraintValidator     | Total monthly hours > 144h                                                  |
| `OT_MONTHLY_CAP`            | 400         | ConstraintValidator     | Monthly OT (total – 144) > 36h                                              |
| `PROJECT_SPREAD_LIMIT`      | 400         | ConstraintValidator     | Resource already assigned to 5 distinct projects in target month           |
| `BUDGET_EXCEEDED`           | 400         | BudgetValidator         | Allocated cost > project budget (threshold configurable, default 80% warning) |
| `RATE_PERIOD_OVERLAP`       | 409         | RateService             | Overlapping effective_from period for (cost_center_id, billable_team_code)  |
| `RATE_GAP_DETECTED`         | 400         | RateService             | No rate found for cost_center/team/month — rate table has coverage hole    |
| `UNAUTHORIZED_STATUS_TRANSITION` | 403     | ResourceService / ProjectService | Invalid state machine transition (e.g., terminated → active)               |
| `PENDING_ALLOCATIONS_EXIST` | 400         | ProjectService          | Cannot close/complete project while PENDING allocations remain            |
| `CSV_IMPORT_BATCH_DUPLICATE`| 409         | CSV Import Controller   | import_batch_id already processed; idempotent skip                         |
| `INVALID_IMPORT_MODE`       | 400         | CSV Import Controller   | import_mode not in [`PREVIEW`, `CONFIRM`, `DRY_RUN`]                       |
| `MATERIALIZED_VIEW_STALE`   | 503         | Scheduler / MVTasks     | Dashboard MV not refreshed within SLA (10 min threshold)                   |

### B. Notification Center Page — Section 19 Expansion

Section 19.6 introduces the NotificationCenter component (NotificationCenter.tsx) and its routing configuration in App.tsx. Key behaviors:

| Behavior                         | Implementation Detail                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| Pull-to-refresh                  | OnRefresh handler triggers `NotificationService.list({ page, size })` API call       |
| Grouping toggle (ON by default) | Group by: `eventType` + `(created_at truncated to hour)`; max 5 items per group     |
| Mark-as-read bulk action         | PATCH `/api/v1/notifications/bulk-read` with `{ ids: [...], read: true }`           |
| Unread badge                     | Header badge count derived from `NOTIFICATION_BADGE_UNREAD` Redis key (WebSocket push) |

See Section 19.6 for full frontend component specification.

---

## Appendices

### A. Error Code Matrix

All service layers return structured error responses with a canonical error code. These codes power the frontend error display (toast/alert) and audit log `details->'code'` field.

| Code                         | HTTP Status | Component               | Description                                                                 |
| ---------------------------- | ----------- | ----------------------- | --------------------------------------------------------------------------- |
| `ALLOCATION_CONFLICT`        | 409         | Allocation Service      | Optimistic lock version mismatch; concurrent edit detected                 |
| `DAILY_HOURS_EXCEEDED`      | 400         | ConstraintValidator     | Proposed daily avg > 10h                                                    |
| `MONTHLY_CAP_EXCEEDED`      | 400         | ConstraintValidator     | Total monthly hours > 144h                                                  |
| `OT_MONTHLY_CAP`            | 400         | ConstraintValidator     | Monthly OT (total – 144) > 36h                                              |
| `PROJECT_SPREAD_LIMIT`      | 400         | ConstraintValidator     | Resource already assigned to 5 distinct projects in target month           |
| `BUDGET_EXCEEDED`           | 400         | BudgetValidator         | Allocated cost > project budget (threshold configurable, default 80% warning) |
| `RATE_PERIOD_OVERLAP`       | 409         | RateService             | Overlapping effective_from period for (cost_center_id, billable_team_code)  |
| `RATE_GAP_DETECTED`         | 400         | RateService             | No rate found for cost_center/team/month — rate table has coverage hole    |
| `UNAUTHORIZED_STATUS_TRANSITION` | 403     | ResourceService / ProjectService | Invalid state machine transition (e.g., terminated → active)               |
| `PENDING_ALLOCATIONS_EXIST` | 400         | ProjectService          | Cannot close/complete project while PENDING allocations remain            |
| `CSV_IMPORT_BATCH_DUPLICATE`| 409         | CSV Import Controller   | import_batch_id already processed; idempotent skip                         |
| `INVALID_IMPORT_MODE`       | 400         | CSV Import Controller   | import_mode not in [`PREVIEW`, `CONFIRM`, `DRY_RUN`]                       |
| `MATERIALIZED_VIEW_STALE`   | 503         | Scheduler / MVTasks     | Dashboard MV not refreshed within SLA (10 min threshold)                   |

### B. Notification Center Page — Section 19 Expansion

Section 19.6 introduces the NotificationCenter component (NotificationCenter.tsx) and its routing configuration in App.tsx. Key behaviors:

| Behavior                         | Implementation Detail                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| Pull-to-refresh                  | OnRefresh handler triggers `NotificationService.list({ page, size })` API call       |
| Grouping toggle (ON by default) | Group by: `eventType` + `(created_at truncated to hour)`; max 5 items per group     |
| Mark-as-read bulk action         | PATCH `/api/v1/notifications/bulk-read` with `{ ids: [...], read: true }`           |
| Unread badge                     | Header badge count derived from `NOTIFICATION_BADGE_UNREAD` Redis key (WebSocket push) |

See Section 19.6 for full frontend component specification.

---
