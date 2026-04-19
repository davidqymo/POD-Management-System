# Test Plan — POD Team Management System

**Version:** 1.0
**Date:** 2026-04-19
**Related Documents:**
- `SPEC_FUNCTIONAL.md` v1.0 (System Functional Specification)
- `TEST_STRATEGY.MD` v1.0 (Test Strategy)
- `PRODUCT_REQUIREMENTS.md` v1.5 (PRD)
**Status:** Draft — Under Review

---

## Table of Contents

1. [Test Plan Overview](#1-test-plan-overview)
2. [Test Items & Features](#2-test-items--features)
3. [Features to Be Tested](#3-features-to-be-tested)
4. [Features NOT to Be Tested](#4-features-not-to-be-tested)
5. [Test Approach](#5-test-approach)
6. [Test Environments & Configuration](#6-test-environments--configuration)
7. [Test Data Requirements](#7-test-data-requirements)
8. [Test Schedule](#8-test-schedule)
9. [Test Deliverables](#9-test-deliverables)
10. [Pass/Fail Criteria](#10-passfail-criteria)
11. [Test Risks & Mitigations](#11-test-risks--mitigations)
12. [Test Team & Responsibilities](#12-test-team--responsibilities)
13. [Approval Sign-off](#13-approval-sign-off)

---

## 1. Test Plan Overview

This test plan details the **execution-level activities** for validating the POD Team Management System MVP (Phase 1). It translates the test strategy into actionable test cases, schedules, and responsibilities.

**Scope:** Modules 1–3, 5, 6 (Resource, Project, Allocations, Dashboard, Notifications). Module 4 (Actual Consumption) excluded — Phase 2.

**Approach:** Risk-based test prioritization. High-risk areas (constraint validation, data integrity, concurrent edits) receive more test depth. Business-critical flows (approval workflow, CSV import) get full E2E coverage.

---

## 2. Test Items & Features

### 2.1 Module Breakdown

| Module | Primary Features | Secondary Features |
|--------|------------------|-------------------|
| **Module 1 — Resource Management** | Resource CRUD, Rate lifecycle (contiguous periods), CSV bulk import/export, Status transitions (active → on_leave/terminated), Holiday calendar | Skill/level lookup CRUD, Soft-delete behavior, Audit trail |
| **Module 2 — Project Management** | Project CRUD, Activity CRUD + M:N dependencies, Cycle detection, Gantt (critical path), State machine (REQUESTED → EXECUTING → COMPLETED/CANCELLED), Terminal freeze | Project reactivation (30-day window), Activity dependency graph updates |
| **Module 3 — Resource Allocation** | Allocation modal (weekly hours), Approval workflow (4-eyes), Constraint validation (OT, budget, 5-project), Auto-allocation engine (5-stage filter), Override semantics (replace not accumulate) | Allocation export, Allocation notes, Approver cannot self-approve check |
| **Module 5 — Dashboard** | Materialized view KPIs (supply/demand, budget burn, variance), Filters (POD/CC/Skill/Date), Refresh strategy (5min MV + WebSocket invalidation), CSV export | Secondary KPIs (utilization rate, overplan count) |
| **Module 6 — Notifications** | Event types (12 notification types), Inbox grouping (by Project/by Type), Action buttons (View/Edit/Dismiss/Bulk dismiss), Audit trail | Email digest (daily batch), Retention policy (90d hot / 24mo DB / 8yr archive) |

### 2.2 Priority Matrix

| Priority (P0/P1/P2/P3) | Count | Rationale |
|------------------------|-------|-----------|
| **P0 — Critical Path** | 18 | Core MVP flows: allocation approval, constraint validation, CSV import, budgeting, dashboard KPIs |
| **P1 — Important** | 24 | Non-critical flows: reactivation, export, notification grouping, Gantt edge cases |
| **P2 — Nice-to-Have** | 8 | Performance optimizations, UI polish, alternate workflows |
| **P3 — Deferred** | 0 | Phase 2 features explicitly excluded |

---

## 3. Features to Be Tested

### 3.1 Resource Management (Module 1)

| Feature | Test Type | Priority | Test Count |
|---------|-----------|----------|------------|
| **UC-RM-01: Create Resource** | Unit + Integration + E2E | P0 | 8 |
| Validation: unique external_id, non-null required fields | Unit | P0 | 4 |
| CSV bulk import (BATCH_CREATE mode) | Integration + Performance | P0 | 6 |
| CSV bulk import error report generation | Integration | P0 | 3 |
| Export Resources/Allocations/Audit as CSV | Integration | P1 | 5 |
| **UC-RM-04: Update Resource Status** | Integration + E2E | P0 | 8 |
| ON_LEAVE: auto-reject PENDING allocations | Integration | P0 | 3 |
| TERMINATED: lock APPROVED allocations | Integration | P0 | 3 |
| **Rate Management (UC-RM-06–09)** | Unit + Integration | P0 | 16 |
| Rate period contiguity validation (including year-boundary edge) | Unit | P0 | 6 |
| Rate overlap prevention (DB unique index) | Integration | P0 | 2 |
| Rate archival before successor exists | Integration | P1 | 2 |
| Historical rate lookup by month | Integration | P1 | 3 |
| Rate edit — pre-effective allowed (within 7 days, future date) | Integration | P0 | 2 |
| Rate edit — post-effective forbidden (403) | Integration | P0 | 2 |
| **CR-VAL-06: Rate Period Contiguity** | Unit | P0 | 5 |
| Total tests for Module 1 | | | **51** |

### 3.2 Project Management (Module 2)

| Feature | Test Type | Priority | Test Count |
|---------|-----------|----------|------------|
| **UC-PM-01: Create Project** | Unit + Integration | P0 | 4 |
| Budget validation (budget_K > 0, end ≥ start + 7d) | Unit | P0 | 3 |
| **UC-PM-02: Add Activities** | Integration | P0 | 8 |
| Circular dependency DFS cycle detection | Unit + Integration | P0 | 8 |
| M:N self-referential dependency graph | Integration | P0 | 5 |
| **UC-PM-03: Gantt Chart** | Integration + E2E | P1 | 10 |
| Critical path (forward/backward pass, zero-float) | Unit | P0 | 6 |
| Gantt rendering (bar color by status, milestone diamond) | E2E | P1 | 4 |
| Drag-reschedule with cascade warning modal | E2E | P1 | 4 |
| Drag constraints: past date, beyond end_date, cycle-creating | E2E | P1 | 6 |
| **UC-PM-04: Transition to Terminal State** | Integration + E2E | P0 | 10 |
| COMPLETED freeze: allocations LOCKED, project hidden | Integration | P0 | 4 |
| CANCELLED freeze: all allocations LOCKED | Integration | P0 | 3 |
| Edit locked project → 403 PROTECTED error | Integration | P0 | 2 |
| **UC-PM-05: Re-activate within 30 days** | Integration | P1 | 5 |
| Project optimistic locking (concurrent edit detection) | Integration | P0 | 3 |
| Total tests for Module 2 | | | **66** |

### 3.3 Resource Allocation (Module 3)

| Feature | Test Type | Priority | Test Count |
|---------|-----------|----------|------------|
| **Allocation Entry (UC-ALLOC-ENTRY)** | Integration + E2E | P0 | 12 |
| Real-time validation UI: budget remaining %, OT warning, 5-project warning, capacity 0 | E2E | P1 | 6 |
| **CR-VAL-01: Daily hour limits (≤10h/day)** | Unit + Integration | P0 | 10 |
| Holiday-constrained day: regular hours 0, OT ≤10 | Integration | P0 | 4 |
| **CR-VAL-02: Monthly OT cap (≤36h)** | Unit + Integration | P0 | 12 |
| Weekly allocation exceeding 144h total | Integration | P0 | 4 |
| **CR-VAL-03: 5-Project monthly spread limit** | Unit + Integration | P0 | 14 |
| Counts PENDING+APPROVED+LOCKED (excludes REJECTED) | Unit | P0 | 5 |
| Hard constraint: cannot override | Integration | P0 | 4 |
| **CR-VAL-04: Budget exhaustion** | Unit + Integration | P0 | 12 |
| Total project budget check | Integration | P0 | 6 |
| Monthly budget breakdown check | Integration | P0 | 4 |
| **CR-VAL-05: Allocation Override Semantics** | Integration | P0 | 8 |
| New allocation replaces old (not accumulate) | Integration | P0 | 5 |
| PENDING→REJECTED soft-delete pattern | Integration | P0 | 3 |
| **Allocation Approval Workflow** | Integration + E2E | P0 | 16 |
| Four-eyes: approver ≠ submitter enforced | Integration | P0 | 4 |
| POD Manager can approve/assign reason for reject | Integration | P0 | 4 |
| Rejection allows "Edit & Resubmit" flow | E2E | P1 | 4 |
| Approval SLA escalation (72h → backup) — **Phase 2**, excluded | – | – | – |
| **CR-VAL-07: Resource Status Cascade** | Integration | P0 | 8 |
| ON_LEAVE → reject all PENDING | Integration | P0 | 3 |
| TERMINATED → lock all APPROVED | Integration | P0 | 3 |
| **Auto-Allocation Engine (UC-AUTO-ALLOC)** | Integration | P0 | 20 |
| 5-stage filter chain: Capacity → Skill → Spread → Budget → Cost-rank | Unit | P0 | 10 |
| Simulate mode (dry-run) returns predictions without persisting | Integration | P0 | 4 |
| Error taxonomy: CAPACITY_EXHAUSTED, SKILL_MISMATCH, etc. | Integration | P0 | 6 |
| Total tests for Module 3 | | | **130** |

### 3.4 Dashboard (Module 5)

| Feature | Test Type | Priority | Test Count |
|---------|-----------|----------|------------|
| **KPI Definitions** | Integration | P0 | 8 |
| Supply vs Demand (materialized view query) | Integration | P0 | 3 |
| Budget Burn Rate & Trend | Integration | P0 | 3 |
| Variance Analysis table | Integration | P0 | 2 |
| **Refresh Strategy** | Integration + E2E | P0 | 10 |
| MV refresh every 5min (business hours) — simulated | Integration | P0 | 3 |
| WebSocket invalidation on allocation change | Integration (Awaitility) | P0 | 4 |
| Manual refresh button (REFRESH MATERIALIZED VIEW CONCURRENTLY) | E2E | P1 | 3 |
| **Filters** | Integration | P0 | 8 |
| POD Team multi-select + cost_center secondary | Integration | P0 | 3 |
| Date range presets (current month, Last 3mo, YTD, custom) | E2E | P1 | 3 |
| Skill tag filter | Integration | P1 | 2 |
| **CSV Export** | Integration | P1 | 6 |
| Timestamp in filename (YYYY-MM-DD_HHMM) | Integration | P1 | 3 |
| BOM (Byte Order Mark) for Excel compatibility | Integration | P1 | 2 |
| Total tests for Module 5 | | | **32** |

### 3.5 Notification & Alerting (Module 6)

| Feature | Test Type | Priority | Test Count |
|---------|-----------|----------|------------|
| **Notification Types & Event Matrix** | Integration | P0 | 16 |
| ALLOCATION_SUBMITTED → inbox + email (High) | Integration | P0 | 3 |
| ALLOCATION_APPROVED → inbox + email (Medium) | Integration | P0 | 3 |
| ALLOCATION_REJECTED with reason → inbox + email (Medium) | Integration | P0 | 3 |
| BUDGET_EXCEED_WARNING → inbox only (High, requires action) | Integration | P0 | 2 |
| BUDGET_80PCT_WARNING → inbox only (Medium) | Integration | P1 | 2 |
| RESOURCE_STATUS_CHANGED → notify affected PMs | Integration | P1 | 3 |
| **Email Throttling & Digest** | Integration | P1 | 3 |
| Max 1 email per recipient per 24h per event type | Integration | P1 | 3 |
| **Email Throttling & Digest** | Integration | P1 | 3 |
| Max 1 email per recipient per 24h per event type | Integration | P1 | 3 |
| **Notification Center UI** | E2E | P1 | 12 |
| Bell icon badge unread count | E2E | P1 | 3 |
| Grouping: "By Project" (default) vs "By Type" toggle | E2E | P1 | 4 |
| Mark all read button | E2E | P1 | 2 |
| Per-item dismiss (×) + click-through read status | E2E | P1 | 3 |
| **Notification Actions** | E2E | P1 | 8 |
| ALLOCATION_REJECTED → "View Reason" + "Edit & Resubmit" | E2E | P0 | 4 |
| BUDGET_WARNING → [View Project] + [Dismiss] | E2E | P1 | 2 |
| IMPORT_COMPLETE → [Download Report] | E2E | P2 | 2 |
| **Retention & Archival** | Integration | P1 | 6 |
| Hot view: last 90 days only | Integration | P1 | 2 |
| Archive batch: 24mo → object storage (simulated) | Integration | P2 | 2 |
| Full 8yr history queryable (Admin view) | Integration | P2 | 2 |
| **Email Throttling (SFS 8.1)** | Integration | P1 | 3 |
| Same event type max 1 email per recipient per 24h digest | Integration | P1 | 3 |
| **Notification Read-Status Atomicity** | Integration | P2 | 2 |
| Concurrent read → mark read race condition safe | Integration | P2 | 2 |
| Total tests for Module 6 | | | **47** |

### 3.6 Cross-Cutting Concerns

| Feature | Test Type | Priority | Test Count |
|---------|-----------|----------|------------|
| **Audit Logging** | Unit + Integration | P0 | 20 |
| Every CRUD mutation generates entry | Integration | P0 | 12 |
| Field-level old_value/new_value captured | Integration | P0 | 4 |
| change_reason recorded for status transitions | Integration | P0 | 2 |
| Audit query API with filters (RBAC-based) | Integration | P0 | 2 |
| **Soft Delete** | Integration | P0 | 10 |
| Soft-deleting resource → status change cascade | Integration | P0 | 3 |
| Soft-deleting project → allocations frozen | Integration | P0 | 3 |
| Undelete within business window (30d for projects) | Integration | P1 | 2 |
| Reactivate project within 30d window | Integration | P1 | 2 |
| **Optimistic Locking** | Integration | P0 | 8 |
| Concurrent allocation edits: last writer gets conflict | Integration | P0 | 4 |
| Retry logic resolves transient conflicts | Integration | P1 | 2 |
| HTTP 409 CONFLICT returned with `OPTIMISTIC_LOCK_CONFLICT` | Integration | P0 | 2 |
| **Hard Constraints (DB-level)** | Integration | P0 | 6 |
| Unique index `(resource, project, week)` prevents duplicates | Integration | P0 | 2 |
| Rate unique index `(CC, BTC, effective_from) WHERE active` | Integration | P0 | 2 |
| Check constraints (hours ≥ 0.1, level 1–10) | Integration | P1 | 2 |
| Total tests for Cross-Cutting | | | **44** |

### 3.7 End-to-End User Journeys

| User Journey | Priority | Test Count | Duration |
|--------------|----------|------------|----------|
| **PM: Submit allocation → View on dashboard** | P0 | 1 | 5min |
| **POD Manager: Approve allocation → Verify budget recalc** | P0 | 1 | 5min |
| **Admin: Import 500-resource CSV → Confirm success** | P0 | 1 | 10min |
| **PM: Create project → Add activities → View Gantt** | P0 | 1 | 8min |
| **POD Manager: Auto-allocate backlog project** | P1 | 1 | 6min |
| **Viewer: Filter dashboard → Export CSV** | P1 | 1 | 4min |
| **Admin: Complete project → Verify allocations locked** | P0 | 1 | 5min |
| **PM + POD Manager: Reject → Resubmit allocation** | P0 | 1 | 6min |
| **Resource: ON_LEAVE status → Capacity recalculated** | P0 | 1 | 4min |
| Total E2E Journeys | | **10** | **~53min** |

---

## 4. Features NOT to Be Tested

**Explicitly out-of-scope for Phase 1:**

| Feature | Reason Excluded | Future Test Plan |
|---------|-----------------|-----------------|
| **Module 4: Actual Consumption Tracking** | PRD Phase 2 deferred | `TEST_PLAN_V2.MD` |
| Advanced skill matching (adjacent skill lookup) | UX Q2 decision pending | Phase 2 |
| What-if Gantt simulation | UX Q4 enhancement | Phase 2 |
| Auto-allocation exception workflows (spread limit override) | P1 requirement but low risk | Phase 2 |
| Email digest throttling (24h coalescing) | Notification infra only | Phase 2 |
| Rate import performance (thousands of months) | Not in scope for v1 | Phase 2 |
| Multi-cost-center allocation splits | Not in PRD v1.5 | Never |

**Not tested due to negligible risk:**
- Static HTML pages (About, Help — no logic)
- Third-party auth provider integration (covered by separate IdP team)
- Database backups/restore (covered by DevOps runbooks)

---

## 5. Test Approach

### 5.1 Static Testing (Before Code)

**Step 1 — Specification Review:**
- QA lead reviews `SPEC_FUNCTIONAL.md` and `PRODUCT_REQUIREMENTS.md` against PRD `Section 9` acceptance criteria.
- Identifies ambiguities, missing edge cases, non-testable requirements.
- Output: `QA_Issues.md` list of 8 clarifications (examples below):
  - "CR-VAL-03: Does 5-project cap count LOCKED allocations from closed months?" → Yes, per SFS footnote.
  - "UC-PM-05: Can REACTIVATED project change status back to BUDGET_ESTIMATING?" → Yes, revert to previous non-terminal.

**Step 2 — Testability Review:**
- Peer review of test cases with product owner to confirm business logic captured.
- Walk through each acceptance criterion with concrete scenario.

**Step 3 — Code Review Gate (TDD workflow):**
Every PR must include:
1. Failing unit test(s) demonstrating intended behavior (Red phase)
2. Minimal code changes making test pass (Green phase)
3. Refactoring with no behavior change (Refactor phase)
4. All existing tests still passing (no regressions)

### 5.2 Dynamic Testing (At Runtime)

**Unit Test Focus:**
- Business logic pure functions (no JPA/database)
- Edge case coverage: null inputs, boundary values, illegal state transitions
- Mocked collaborators (Repository, External services)
- 80%+ line coverage minimum (JaCoCo enforces in CI)

**Integration Test Focus:**
- Real database (PostgreSQL via Testcontainers) for transaction/constraint validation
- Spring context loads full configuration (JPA, Redis, Security)
- Cross-service interactions (Rate service → Allocation cascade)
- Database constraint verification (unique indexes, foreign keys)

**E2E Test Focus:**
- Full browser automation (Playwright)
- User journey validation (login → action → verify outcome)
- Visual regression screenshots (pixel diff baseline stored)
- Accessibility checks (AXE core, per WCAG 2.1 AA)

**Performance Test Focus:**
- Load testing with k6/JMeter (ramp-up/steady-state/ramp-down)
- Database connection pool saturation monitoring
- Redis memory eviction checks
- Materialized view refresh duration under load

**Security Test Focus:**
- RBAC enforcement: attempt privileged action with non-privileged JWT
- Input validation: malicious payloads (SQL injection chars, XSS scripts)
- Sensitive data: no leaks in logs, audit entries, error messages

### 5.3 Acceptance Testing (UAT Phase)

**UAT Entry Criteria:**
- All P0 test cases passed (unit + integration + E2E)
- Zero P0 defects open
- Performance tests meet thresholds
- Security scan completed (0 critical/high findings)

**UAT Scenario Execution:**
- Business users (PMs, POD Managers, Admins) execute `doc/UAT_SCRIPTS.md` scenarios.
- Each scenario signed off with "Pass" or "Fail with [defect ID]".
- Test manager compiles UAT sign-off document.

---

## 6. Test Environments & Configuration

### 6.1 Environment Matrix

| Environment | DB | Redis | External Services | Purpose |
|-------------|----|-------|-----------------|----------|
| **Local (dev)** | Docker Compose PostgreSQL 15 | Docker Compose Redis 7 | MailHog, Mock Auth server | Developer unit tests, local integration |
| **CI** | Testcontainers PostgreSQL 15 | Testcontainers Redis 7 | No external calls | PR validation — unit + integration |
| **Staging** | CloudSQL PostgreSQL 15 (1 vCPU) | Redis Cloud (dev tier) | Real email sandbox (SendGrid test mode) | QA E2E, performance, security scans |
| **Production** | CloudSQL PostgreSQL 15 (4 vCPU HA) | Redis Cloud (prod tier) | Real email (SendGrid), real Keycloak | Live system |

### 6.2 Configuration Parameters

**Test-specific Spring profiles:**
- `test` — H2 DB, in-memory Redis, disabled email
- `integration` — Testcontainers DB + Redis, MailHog
- `staging` — Real services, test data only

**Feature flags for testing:**
```yaml
test:
  features:
    csv-import-mode: BATCH_CREATE_ONLY    # Phase 1 only
    allocation-simulate-mode: true        # Auto-alloc default to simulate first
    notification-email-digest: false      # Instant email in test
```

---

## 7. Test Data Requirements

### 7.1 Fixtures Needed

**Baseline data (preloaded before each test class):**
- Cost centers: `CC-TECH`, `CC-BIZ`, `CC-OPS` (3 entries)
- Billable team codes: `DEV-001`, `BA-002`, `QA-003` (5 entries)
- Holiday calendar: Global holidays 2026 (10 entries)
- Users: Test users (PM, POD Manager, Admin, Viewer) — 4 entries

**Per-test dynamic data:**
- Resources: Created via factory (configurable skill/level/rate)
- Rates: Based on `YearMonth` fixture generator
- Projects: Fixed budget/date windows
- Activities: Sequenced with optional dependencies

### 7.2 Data Volume Targets

| Entity | Small dataset | Medium dataset | Large dataset |
|--------|---------------|----------------|---------------|
| Resources | 10 | 100 | 1000+ |
| Projects | 5 | 20 | 100+ |
| Allocations | 50 | 500 | 50,000+ (performance) |
| CSV Import | 50 rows | 500 rows | 5000+ rows |

**Why:**
- Small: Unit test speed (<5s)
- Medium: Integration test realism (<30s)
- Large: Performance/load testing (>30s)

### 7.3 Test Data Lifecycle

- **Testcontainers:** Fresh DB per test class (JUnit `@TestInstance(PER_CLASS)` + `@BeforeAll` truncates)
- **CI:** Each GitHub Actions job gets isolated container; destroyed after job
- **Staging:** Nightly purge at 02:00 UTC; test data labeled with `source='test_harness'` traceable tag

---

## 8. Test Schedule

### 8.1 Sprint-by-Sprint Execution Plan

**Sprint 1 (Days 1–3): Resource Module Foundation**
- Day 1: Unit tests for Resource entity + Rate contiguity validator
- Day 2: Integration tests: CRUD, CSV import, status transitions
- Day 3: E2E tests for resource listing + CSV import (Playwright)

**Sprint 2 (Days 4–6): Project + Activity + Gantt**
- Day 4: Unit tests: cycle detection DFS, critical path calculator
- Day 5: Integration tests: project state machine, activity dependency M:N
- Day 6: E2E tests: Gantt rendering, drag-reschedule cascade warning

**Sprint 3 (Days 7–10): Allocation Engine — Core**
- Day 7: Unit tests: 5 constraint validators (CR-VAL-01–05)
- Day 8: Integration tests: allocation CRUD + override semantics
- Day 9: Integration tests: approval workflow (4-eyes), rejection → resubmit
- Day 10: E2E tests: full PM → POD Manager allocation approval journey

**Sprint 4 (Days 11–13): Auto-Allocation + Dashboard + Notifications**
- Day 11: Unit + Integration: auto-allocation 5-stage filter
- Day 12: Integration: Dashboard MV refresh, filters, WebSocket invalidation
- Day 13: Integration + E2E: Notification center grouping, actions, retention queries

**Sprint 5 (Days 14–18): Performance + Security (Parallel)**
- Day 14: Load test: CSV import bulk, dashboard concurrent users
- Day 15: Load test: auto-allocation engine throughput
- Day 16: Security scan: OWASP ZAP baseline + RBAC validation
- Day 17: Manual pen test checklist
- Day 18: Fix all P0/P1 defects found in Sp5; re-run affected tests

**Sprint 6 (Days 19–22): UAT + Release Prep**
- Day 19: Deploy RC to staging; smoke test
- Day 20–21: UAT execution + defect log review
- Day 22: Regression re-run on fixed defects; final sign-off

### 8.2 Entry/Exit Gates per Sprint

| Sprint | Entry Criteria (Start) | Exit Criteria (Complete) |
|--------|------------------------|--------------------------|
| Sp1 | DB schema migrated; ResourceController scaffolded | All P0 Resource tests pass; no open P0 bugs |
| Sp2 | Project+Activity entities + repositories done | All P0 Project tests pass; cycle detection validated |
| Sp3 | Allocation entity + services scaffolded | All P0 Allocation tests pass; constraint validation green |
| Sp4 | Dashboard MV + Notification service scaffolded | All P0 Dashboard/Notification tests pass |
| Sp5 | Staging RC deployed after Sp4 | Performance & security gates passed |
| Sp6 | RC build promoted to staging UAT | UAT signoff; all P0 bugs closed; go-live approved |

---

## 9. Test Deliverables

### 9.1 By Test Phase

| Phase | Deliverable | Format | Due Date |
|-------|-------------|--------|----------|
| **Test Planning** | Test Strategy (`TEST_STRATEGY.MD`) | Markdown | Day 0 |
| | Test Plan (`TEST_PLAN.MD`) | Markdown | Day 1 |
| | Traceability Matrix (`TRACEABILITY_MATRIX.xlsx`) | Excel | Day 2 |
| **Sprint Execution** | Unit test source files | Java (`.java`) | Per-sprint |
| | Integration test source files | Java (`.java`) | Per-sprint |
| | E2E test scripts | TypeScript (`.spec.ts`) | Per-sprint |
| | Performance test scripts | JMeter `.jmx` / k6 `.js` | Sprint 5 |
| **Release Verification** | Regression test report (HTML) | JUnit XML → HTML | Day 22 |
| | Code coverage report | JaCoCo HTML | Day 22 |
| | Security scan report | OWASP ZAP HTML | Sprint 5 |
| | Performance benchmark results | Grafana dashboard PNG | Sprint 5 |
| | UAT sign-off document | Markdown | Day 22 |
| **Post-Mortem** | Lessons learned log | Markdown | Day 23 |

### 9.2 Location & Naming Conventions

```
doc/
├── TEST_STRATEGY.MD
├── TEST_PLAN.MD
├── UAT_SCRIPTS.md           # User Acceptance Test scenarios
└── TRACEABILITY_MATRIX.xlsx

src/
├── main/                    # application code
└── test/
    ├── java/
    │   ├── unit/            # @Test void methods, mocked
    │   ├── integration/     # @SpringBootTest, Testcontainers
    │   └── e2e/             # Selenium/Playwright tests (if co-located)
    └── resources/
        └── csv/             # valid_1000.csv, invalid_duplicate.csv, …

build/reports/
├── jacoco/                  # HTML coverage report
├── tests/
│   ├── unit/               # JUnit XML
│   ├── integration/        # JUnit XML + Allure
│   └── e2e/                # Playwright HTML report
└── performance/
    ├── locust/              # Load test stats
    └── jmeter/              # JMeter result files
```

---

## 10. Pass/Fail Criteria

### 10.1 Test Level Pass Criteria

| Test Level | Pass Criteria | Block on Failure? |
|------------|---------------|------------------|
| **Unit** | All tests pass; no new failures vs baseline | Yes — blocks PR merge |
| **Integration** | All tests pass; DB constraints validated | Yes — blocks PR merge |
| **E2E** | ≥95% pass rate; all P0 scenarios pass | No — logged as P1/P2 defect |
| **Performance** | p95 latency ≤500ms; throughput ≥ target | No — logged, addressed in next sprint |
| **Security** | 0 critical/high findings; 0 privilege escalations | Yes — blocks release candidate |

### 10.2 Release Sign-off Criteria

**Release Candidate (RC) is approved for production only when ALL of the following are satisfied:**

- ✅ All **P0** (critical path) test cases passed (100%)
- ✅ All **P1** (important) test cases passed (≥95%)
- ✅ No open **P0 defects** in issue tracker
- ✅ No more than **4 open P1 defects** (unblocked by documented mitigations)
- ✅ Code coverage on changed code: **≥80%** (JaCoCo)
- ✅ Performance tests meet thresholds (Section 3.4)
- ✅ Security scan: **0 critical/high** OWASP findings
- ✅ UAT sign-off document signed by 2 business stakeholders (PM lead, POD Manager lead)
- ✅ Database migration rollback tested and documented
- ✅ Runbook complete: monitoring, alerting, operational procedures

**If any criterion is not met:** RC is **not approved**; defect remediation required; re-test cycle triggered.

---

## 11. Test Risks & Mitigations

### 11.1 Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Test data volume too small → production performance unknown** | Medium | High | Add synthetic data generator; scale test DB to prod-like size (1M+ allocations) |
| **E2E tests flaky due to async timing** | High | Medium | Use explicit waits (Playwright `waitForResponse`, `awaitility`), not implicit sleeps |
| **Testcontainers slow startup → CI time > 30min** | High | Medium | Reuse container across tests via `@Testcontainers` static; parallelize test classes |
| **DB migration rollback fails in production** | Low | Critical | Test rollback in staging with real prod-like dataset; automate pre-flight checks |
| **Missing edge case in constraint validator → bug escapes to prod** | Medium | High | Peer code review of validators; property-based testing (jqwik) for boundary fuzzing |
| **Auto-allocation deadlock under concurrent load** | Low | High | Load test with concurrent engine calls; DB deadlock retry logic in service layer |
| **Rate period contiguity logic incorrect for year transition (Dec→Jan)** | Medium | High | Unit test cross-year scenarios; integration test with December→January boundary |
| **Audit log missing change_reason on status transitions** | Medium | Medium | Audit log assertion in every status-change test; AOP interceptor unit test |

### 11.2 Test Dependency Risks

| External Dependency | Risk | Mitigation |
|--------------------|------|------------|
| Testcontainers PostgreSQL image availability | Registry outage → CI blocked | Mirror Docker images internally; cache in runner |
| MailHog service (email mock) | Port conflict / startup failure | Health check wait loop; skip email-dependent tests if unavailable |
| Staging environment availability | Deploy queue → testing delayed | Parallel test branches: QA1, QA2 environments |

---

## 12. Test Team & Responsibilities

| Role | Team Member | Responsibilities |
|------|-------------|------------------|
| **QA Lead / Test Manager** | [TBD] | Owns test plan & strategy; traceability; test execution tracking; UAT coordination |
| **Developer — Unit/Integration** | All 4–6 developers | Write unit tests (TDD); integration tests for their features; code review test quality |
| **QA Engineer — E2E** | [TBD] | Playwright test authorship; CI E2E pipeline maintenance; visual regression baseline |
| **DevOps Engineer** | [TBD] | CI/CD test execution environment; Testcontainers setup; performance test infrastructure |
| **Security Engineer** | [TBD] | OWASP ZAP scans; RBAC penetration tests; audit completeness audit |
| **Product Owner / PM** | [TBD] | UAT scenario validation; acceptance sign-off; clarify business requirements |

**RACI Matrix:**

| Activity | Dev | QA | DevOps | Sec | PO |
|----------|-----|----|--------|-----|----|
| Write unit tests | R/A | C | C | I | I |
| Write integration tests | R/A | C | C | I | I |
| Write E2E tests | C | R/A | C | I | I |
| Review test quality | A | R | C | I | I |
| Execute regression | R | R/A | C | I | I |
| UAT execution | S | R/A | S | I | R |
| Release sign-off | I | R | R | C | A |

(R = Responsible, A = Accountable, C = Consulted, S = Supporting, I = Informed)

---

## 13. Approval Sign-off

**Prepared by:** QA Lead
**Date:** 2026-04-19

**Reviewed by:**
- [ ] Development Lead — approves test scope, unit/integration test expectations
- [ ] Product Owner — approves coverage of acceptance criteria
- [ ] DevOps Lead — approves environment strategy
- [ ] Security Engineer — approves security test plan

**Approved by:** Engineering Manager
**Date:** _______________

**Authorization:** This test plan is approved for execution. All testing activities will follow this plan; deviations must be documented and approved by QA Lead.

---

## Appendix A — Test Case Index (Alphabetical by Module)

### Module 1 — Resource Management

| TC-ID | Title | Priority | Type |
|-------|-------|----------|------|
| TC-RM-01 | Create resource with valid data succeeds | P0 | E2E |
| TC-RM-02 | Duplicate external_id rejected at API layer | P0 | Integration |
| TC-RM-03 | CSV bulk import 500 rows completes in <30s | P0 | Performance |
| TC-RM-04 | CSV import with 1 invalid row fails batch (all-or-nothing) | P0 | Integration |
| TC-RM-05 | CSV import error report downloadable CSV | P0 | Integration |
| TC-RM-06 | Update resource status → ON_LEAVE auto-rejects PENDING allocations | P0 | Integration |
| TC-RM-07 | Update resource status → TERMINATED locks APPROVED allocations | P0 | Integration |
| TC-RM-08 | Rate creation with contiguous month sequence succeeds | P0 | Unit |
| TC-RM-09 | Rate creation with gap (non-contiguous) fails with RATE_GAP_DETECTED | P0 | Integration |
| TC-RM-10 | Rate creation with overlap fails with RATE_OVERLAP | P0 | Integration |
| TC-RM-11 | Rate archival blocked if successor rate depends on closure | P1 | Integration |
| TC-RM-12 | Historical rate lookup returns correct rate for any date in period | P1 | Integration |
| TC-RM-13 | Soft-deleted resource excluded from allocation dropdown | P1 | E2E |
| TC-RM-14 | Resource cannot be hard-deleted (application guard) | P0 | Integration |
| TC-RM-15 | Export resources CSV includes BOM for Excel compatibility | P1 | Integration |
| TC-RM-16 | Rate edit — pre-effective rate allowed (within 7 days, future date) | P0 | Integration |
| TC-RM-17 | Rate edit — post-effective rate rejected with 403 FORBIDDEN | P0 | Integration |
| TC-RM-18 | Rate contiguity valid across year boundary (Dec 2026 → Jan 2027) | P0 | Unit + Integration |
| TC-RM-19 | PATCH resource attempts external_id change fails — immutable field | P0 | Integration |
| … | (51 total Module 1 test cases) | | |
| TC-RM-16 | Rate edit — pre-effective rate allowed (within 7 days, future date) | P0 | Integration |
| TC-RM-17 | Rate edit — post-effective rate rejected with 403 FORBIDDEN | P0 | Integration |
| TC-RM-18 | Rate contiguity valid across year boundary (Dec 2026 → Jan 2027) | P0 | Unit + Integration |
| TC-RM-19 | PATCH resource attempts external_id change fails — immutable field | P0 | Integration |
| … | (51 total Module 1 test cases) | | |
| TC-RM-16 | Rate edit pre-effective rate allowed (within 7 days, future effective date) | P0 | Integration |
| TC-RM-17 | Rate edit post-effective rate rejected with 403 FORBIDDEN | P0 | Integration |
| TC-RM-18 | Rate contiguity across year boundary (Dec 2026 → Jan 2027) validated | P0 | Unit + Integration |
| TC-RM-19 | PATCH resource attempts to change external_id fails with 400 error | P0 | Integration |
| … | (51 total Module 1 test cases) | | |

*(Full test case index spans all modules — abbreviated here. Complete index in `TEST_CASE_INDEX.xlsx`.)*

---

## Appendix B — Entry/Exit Checklist per Sprint

**Sprint Entry Checklist (tick all):**
- [ ] Database migration SQL reviewed by DBA (if applicable)
- [ ] API contract documented (OpenAPI/Swagger)
- [ ] Service interfaces defined
- [ ] Test fixtures designed
- [ ] Test plan updated with new test cases

**Sprint Exit Checklist (tick all):**
- [ ] All P0 test cases passed
- [ ] Zero regression defects introduced (vs baseline)
- [ ] Code coverage ≥80% on changed files
- [ ] Performance baseline established (if applicable)
- [ ] Security scan passed (if applicable)
- [ ] Documentation updated (user guide, API docs)

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-19 | Claude Code | Initial draft aligned to SPEC_FUNCTIONAL v1.0 |

---

*End of Test Plan Document*
