# Test Strategy — POD Team Management System

**Version:** 1.0
**Date:** 2026-04-19
**Related Documents:**
- `SPEC_FUNCTIONAL.md` v1.0 (System Functional Specification)
- `PRODUCT_REQUIREMENTS.md` v1.5 (PRD)
- `TDD_Testing.md` v2.3 (TDD Guidelines)
**Status:** Draft — Under Review

---

## Table of Contents

1. [Testing Philosophy & Objectives](#1-testing-philosophy--objectives)
2. [Test Scope & Coverage](#2-test-scope--coverage)
3. [Test Types & Strategy](#3-test-types--strategy)
4. [Test Environment](#4-test-environment)
5. [Test Data Management](#5-test-data-management)
6. [Test Automation Pyramid](#6-test-automation-pyramid)
7. [Quality Gates & Entry/Exit Criteria](#7-quality-gates--entryexit-criteria)
8. [Defect Management](#8-defect-management)
9. [Traceability Matrix](#9-traceability-matrix)
10. [Risks & Mitigations](#10-risks--mitigations)

---

## 1. Testing Philosophy & Objectives

### 1.1 Core Principles

The POD Team Management System follows a **test-first, quality-adjacent** approach:

1. **TDD as default behavior** — All new features and bug fixes begin with a failing test. See `CLAUDE.md` Section "Superpowers Workflow".
2. **Shift-left validation** — Constraints validated at API boundary (Spring Validation) before business layer.
3. **Nobody owns quality alone** — Developers write unit/integration tests; QA owns E2E scenarios and acceptance validation.
4. **Behavior over implementation** — Tests assert observable outcomes, not internal state manipulation.
5. **Deterministic & isolated** — No shared mutable state between tests; database reset between test classes.

### 1.2 Quality Objectives

| Objective | Success Metric | Measurement Method |
|-----------|---------------|-------------------|
| **Functional Correctness** | 100% acceptance criteria pass | Traceability matrix (Section 9) |
| **Regression Prevention** | <5% test flake rate | CI test stability dashboard |
| **Performance Baseline** | 95th percentile API latency <500ms | JMeter/Locust load tests |
| **Data Integrity** | Zero orphaned records; audit trail complete | DB consistency checks |
| **Security Posture** | No privilege escalation; RBAC enforced | OWASP ZAP scan + manual pen test |

---

## 2. Test Scope & Coverage

### 2.1 In-Scope (Phase 1 MVP)

The test suite covers **Modules 1–3, 5, 6** (per SFS Section 1 Scope):

| Module | Features | Test Focus |
|--------|----------|------------|
| **Module 1 — Resource Management** | CRUD, CSV import/export, rate lifecycle, status transitions | Rate period contiguity, soft-delete cascade, audit logging |
| **Module 2 — Project Management** | CRUD, activities, dependencies, Gantt, state machine | Cycle detection, critical path, terminal freeze, 30-day reactivation |
| **Module 3 — Resource Allocation** | Allocation CRUD, approval workflow, auto-allocation engine, constraint validation | 5-project cap, OT caps (daily/monthly), budget exhaustion, four-eyes enforcement |
| **Module 5 — Dashboard** | Materialized view KPIs, filters, refresh strategy | MV concurrency, WebSocket invalidation, data freshness |
| **Module 6 — Notifications** | Event emission, inbox grouping, email digests | Redis pub/sub, retention policy, action routing |

### 2.2 Out-of-Scope (Phase 2 — Deferred)

| Feature | Reason Deferred | Test Strategy (Future) |
|---------|----------------|------------------------|
| Module 4 — Actual Consumption Tracking | Phase 2 scope | Separate test plan in v2.0 |
| Advanced skill-matching (adjacent skills) | UX Q2 decision pending | Parametrized integration tests when implemented |
| What-if Gantt simulation | UX Q4 enhancement | E2E drag scenarios with undo |
| Rate-card complex rules (tiered/discount) | PRD v1.5 Phase 2 | Property-based testing for edge cases |

---

## 3. Test Types & Strategy

### 3.1 Unit Tests (Target: 50% of test count, 40% of effort)

**Purpose:** Validate isolated business logic units in Service layer. Fast (<50ms/test), deterministic.

**Scope:**
- Constraint validators (CR-VAL-01 through CR-VAL-08)
- Rate contiguity check algorithm
- Activity dependency DFS cycle detector
- Critical path forward/backward pass calculator
- Auto-allocation filter chain (5-stage pipeline)
- Audit log field diff extractor

**Framework/Tools:**
- JUnit 5 + Mockito (mocking collaborators)
- AssertJ for fluent assertions
- JsonUnit for JSON audit payload assertions

**Example pattern:**
```java
@ExtendWith(MockitoExtension.class)
class AllocationConstraintValidatorTest {
    @Test
    void whenMonthlyOTExceeds36h_thenThrowOTMonthlyCapException() {
        // Arrange
        BigInteger totalHours = BigInteger.valueOf(180); // 36h OT over 144h base
        // Act & Assert
        assertThatThrownBy(() -> validator.validateMonthlyOT(resourceId, month, totalHours))
            .isInstanceOf(OTMonthlyCapException.class)
            .hasMessageContaining("exceeds 36h cap");
    }
}
```

**MoSCoW Priority:**
- **MUST:** All constraint validators, cycle detection, rate contiguity
- **SHOULD:** Auto-allocation filter chain (complex logic)
- **COULD:** Gantt critical path helper functions

### 3.2 Integration Tests (Target: 30% of test count, 35% of effort)

**Purpose:** Verify cross-component behavior: Repository → Service → Controller pipeline with real DB (Testcontainers) and Redis.

**Scope:**
- Allocation creation with cascade effects (budget, capacity, approval)
- Rate lifecycle (create → close → reopen with validation)
- Project status transitions with side-effects (LOCK allocations, audit)
- CSV import batch operations (preview → confirm)
- Auto-allocation full pipeline (filter → validate → create)

**Framework/Tools:**
- **Testcontainers** (PostgreSQL + Redis) — real DB per test class
- **@SpringBootTest** with random port
- **RestAssured / TestRestTemplate** for HTTP integration
- **Awaitility** for async notification assertions

**Database strategy:**
```java
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@SpringBootTest(webEnvironment = RANDOM_PORT)
@Testcontainers
class AllocationIntegrationTest {
    @Container
    static PostgreSQLContainer<?> pg = new PostgreSQLContainer<>("postgres:15");

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", pg::getJdbcUrl);
    }

    @BeforeEach
    void resetDb(@Autowired JdbcTemplate jdbc) {
        jdbc.execute("TRUNCATE TABLE allocations, projects, resources RESTART IDENTITY CASCADE");
    }
}
```

**MoSCoW:**
- **MUST:** Allocation approval flow, rate period constraints, project terminal state
- **SHOULD:** CSV import with error report, auto-allocation end-to-end
- **COULD:** Notification delivery pipeline (Redis → DB)

### 3.3 End-to-End (E2E) Tests (Target: 15% of test count, 20% of effort)

**Purpose:** Full-stack user journey validation against deployed test environment.

**Scope:**
1. **PM Allocation Journey:** Login → Create allocation → Submit → Wait for approval → View on dashboard
2. **POD Manager Approval Journey:** Login → Review PENDING allocations → Approve/Reject with reason → Verify budget recalc
3. **Admin CSV Import Journey:** Upload 500-row CSV → Preview validation → Confirm → Verify 500 records + audit log
4. **Gantt Interaction:** Drag activity with cascade warning → Confirm → Verify successor dates shift
5. **Dashboard KPIs:** Create allocation → Wait 5min → Verify KPI updates in materialized view

**Framework/Tools:**
- **Playwright** or **Selenium** (cross-browser: Chrome/Edge required; Firefox optional)
- **BFF (Backend-for-Frontend) test doubles** where Phase 2 features external systems
- **TestRail integration** for results reporting

**Data setup:** Seed via REST API or fixture scripts (`scripts/seed_test_data.sh`).

**Traceability:** Each E2E test linked to ≥1 acceptance criterion via `@Criterion("AC-XX")` annotation.

**MoSCoW:**
- **MUST:** Approval workflow, CSV import, dashboard refresh
- **SHOULD:** Gantt drag-and-drop cascade, resource reactivation
- **COULD:** Notification center grouping toggle

### 3.4 Performance & Load Tests (Target: 3% of test count, 3% of effort)

**Purpose:** Verify system meets non-functional requirements under realistic load.

**Scenarios:**

| Scenario | Load Profile | Success Criteria | Tool |
|----------|--------------|------------------|------|
| **Concurrent Allocation Submissions** | 50 PMs submitting 10 allocations/min each | 95% success rate; p99 < 2s | JMeter thread groups |
| **Dashboard Refresh Spike** | 30 concurrent dashboard queries during MV refresh | All responses <1s; no 5xx errors | k6 script |
| **CSV Import Bulk** | 1 admin uploading 5000-row CSV | Parse + validate <30s; commit <10s | Locust user |
| **Auto-allocation Engine** | 10 projects triggering auto-alloc simultaneously | Each completes <15s; no deadlocks | JUnit benchmark |

**Metrics Collected:**
- API response time (p50, p95, p99)
- Database connection pool saturation
- Redis memory/CPU saturation
- MV refresh duration (should be <30s)

**MoSCoW:**
- **MUST:** CSV import bulk timing, dashboard refresh concurrency
- **SHOULD:** Concurrent allocation submissions
- **COULD:** Auto-allocation under 100 concurrent engine calls

### 3.5 Security Tests (Target: 1% of test count, 1% of effort)

**Scope:**
- **RBAC enforcement:** Viewer cannot POST/PUT/DELETE; PM cannot approve; POD Manager cannot create resources
- **SQL Injection:** Parameterized query verification (all JPQL/Native queries use bind parameters)
- **XSS protection:** React frontend escapes user input; no innerHTML without DOMPurify
- **Rate limiting:** API gateway or Spring Security filters (if implemented in Phase 2)
- **Audit trail completeness:** Every mutation has audit entry with `changed_by` non-null

**Tools:**
- **OWASP ZAP** baseline scan (automated)
- **Manual pen test** checklist (admin privilege escalation, session fixation)
- **Asserting no secrets in logs:** Log scrubbing tests verify no credential leakage

**MoSCoW:**
- **MUST:** RBAC enforcement, audit completeness, SQL injection prevention
- **SHOULD:** XSS protection validation
- **COULD:** Rate limiting coverage

### 3.6 Exploratory & Regression Tests (Ongoing)

**Charter-based Sessions:**
- "Allocate resource already at 144h/month — verify ALL constraints fire correctly"
- "Create rate with overlapping month — ensure transaction rolls back with clear error"
- "Cancel project with PENDING allocations — verify LOCKED state on all"

Regression suite: Daily CI run; manually validate all critical paths before release.

---

## 4. Test Environment

### 4.1 Environments

| Environment | Purpose | Equivalent Prod? | Refresh Frequency |
|-------------|---------|------------------|------------------|
| **Local (Docker Compose)** | Developer unit/integration testing | No (single-node DB) | Per-developer spun up on demand |
| **CI (GitHub Actions)** | Pull-request validation | No (ephemeral containers) | Per PR |
| **Staging (K8s)** | UAT, performance testing, release candidate | Yes (full stack, scaled down) | Weekly; manual reset |
| **Production** | Live traffic | N/A | N/A |

### 4.2 Environment Configuration

**Database:**
- Local: `docker-compose up -d postgres redis`
- Staging: Dedicated CloudSQL/PostgreSQL instance (1 vCPU, 4GB RAM)
- Testcontainers: PostgreSQL 15 (matches prod)

**Mocked External Systems:**
- **Email service:** MailHog (dev/staging) — no real emails sent
- **Authentication:** Keycloak test realm (dev); stub JWT issuer in CI

**Feature Flags:**
- **CSV_IMPORT_BATCH_CREATE_ONLY:** Enable in Phase 1; disable in Phase 2 (Upsert mode)
- **NOTIFICATION_EMAIL_DIGEST:** Enabled in staging; disabled for dev (instant delivery)

---

## 5. Test Data Management

### 5.1 Fixtures & Factories

**Java test factories (using `java-faker` + builder pattern):**

```java
public class TestFixtures {
    public static Resource resource(String externalId, String costCenter, String billableTeam) {
        return Resource.builder()
            .externalId(externalId)
            .name(faker.name().fullName())
            .costCenterId(costCenter)
            .billableTeamCode(billableTeam)
            .skill("Java")
            .level(faker.number().numberBetween(1, 10))
            .isBillable(true)
            .status(ResourceStatus.ACTIVE)
            .isActive(true)
            .build();
    }

    public static Project project(BigDecimal budgetK, LocalDate start, LocalDate end) {
        return Project.builder()
            .name(faker.company().name() + " Project")
            .budgetK(budgetK)
            .plannedStartDate(start)
            .plannedEndDate(end)
            .status(ProjectStatus.REQUESTED)
            .build();
    }
}
```

**CSV Import test fixtures:**
- `src/test/resources/csv/valid_100_resources.csv` (100 rows, all valid)
- `src/test/resources/csv/invalid_duplicate_external_id.csv` (2 rows, 1 duplicate)
- `src/test/resources/csv/edge_case_null_cost_center.csv` (1 row, missing FK)

### 5.2 Database Seeding Strategy

1. **Unit tests:** In-memory H2 (no Docker); isolated per method; `@BeforeEach` truncates tables.
2. **Integration tests:** Testcontainers PostgreSQL; `@Sql` scripts seed baseline data:
   ```sql
   -- seed_cost_centers.sql
   INSERT INTO cost_centers (id, name) VALUES ('CC-TECH', 'Technology');
   ```
3. **E2E tests:** HTTP API POSTs to staging create test data; `TearDown` deletes test-org-owned records.

### 5.3 Test Data Lifecycle

- **Never commit real production data** to test fixtures.
- **Use deterministic fake data:** Faker seeded with fixed `Random(12345)` across test runs for reproducibility.
- **Label test data:** Resources created by test runs tagged with `created_by='test_runner'` and deleted nightly.

---

## 6. Test Automation Pyramid

```
                    ┌─────────────────┐
                    │   E2E Tests     │  (15%) — Critical user journeys
                    │  Playwright/Sel │  …slowest, most brittle
                    └────────┬────────┘
                             │
                    ┌─────────▼──────────┐
                    │  Integration Tests │  (30%) — Cross-component
                    │  @SpringBootTest   │  …medium speed, real dependencies
                    └─────────┬──────────┘
                             │
         ┌───────────────────▼───────────────────┐
         │          Unit Tests (50%)             │
         │  @Test void method() { … }            │
         │  …fastest, most isolated              │
         └───────────────────────────────────────┘
```

**Anti-patterns avoided:**
- ❌ **UI-driven unit tests** — business logic lives in Service layer, not React components
- ❌ **Monolithic test classes** — one test class per SUT (system under test)
- ❌ **Network-dependent unit tests** — use mocks/stubs for external calls

**CI/CD gate:**
```
PR opened → [Lint → Unit Tests → Integration Tests] → All pass → ✅
                      ↓
                  Merge to develop → [Deploy to staging → E2E tests → Smoke tests] → ✅
                      ↓
                  Promote to main → [Manual QA signoff → Production deploy]
```

---

## 7. Quality Gates & Entry/Exit Criteria

### 7.1 Pull Request Quality Gate

Every PR targeting `develop` must pass:

| Check | Tool | Threshold |
|-------|------|-----------|
| **Code Style** | Spotless (Java) + ESLint (TS) | 0 violations |
| **Unit Test Coverage** | JaCoCo + SonarQube | ≥80% on changed lines |
| **Unit Test Passes** | JUnit 5 | 100% pass (0 failures) |
| **Integration Tests** | Testcontainers + JUnit | 100% pass |
| **Static Analysis** | SpotBugs + PMD | 0 blocker/high issues |
| **Dependency Check** | OWASP Dependency-Check | 0 CVEs in critical/high |
| **SFS Compliance** | Manual checklist or automated traceability | All acceptance criteria covered |

Failing any check → PR blocked from merge.

### 7.2 Release Candidate Gates

**Gate 1 — Build Verification (Automated, nightly)**:
- Full test suite passes on staging deployment
- No new flaky tests in last 7 days
- Database migration rollback tested

**Gate 2 — Functional Acceptance (Manual QA)**:
- Test Plan (Section 10) executed on RC build
- All MUST test cases pass
- Zero P0 (blocker) defects open
- Max 5 P1 (high) defects open with mitigation plan

**Gate 3 — Performance & Security (Automated/Manual)**:
- Load test meets thresholds (Section 3.4)
- OWASP ZAP scan: 0 high-risk findings
- Pen test checklist: 100% passed

**Gate 4 — Production Readiness (DevOps signoff)**:
- Helm chart values locked
- Runbook complete
- Rollback plan validated
- Monitoring/alerting rules active

Exit all 4 gates → production deployment approved.

### 7.3 Hotfix Overrides

For production hotfixes:
- PR requires: (1) unit test demonstrating fix, (2) regression test added, (3) two reviewer approvals, (4) security team signoff
- Can bypass Gate 2 (Functional Acceptance) with documented business justification
- Must pass Gates 3 & 4 before merge

---

## 8. Defect Management

### 8.1 Severity Classification

| Severity | Definition | Resolution SLA | Example |
|----------|------------|----------------|---------|
| **P0 — Blocker** | System down; core user journey impossible; data loss/corruption | 4 hours (24/7) | Cannot submit allocation; rate import fails with 500 |
| **P1 — High** | Major feature broken; no workaround available | 24 hours | Budget validation not enforced; 5-project cap bypassed |
| **P2 — Medium** | Feature partially broken; workaround exists | 3 business days | Gantt drag warning modal appears 2s late |
| **P3 — Low** | Cosmetic; typo; non-functional regression | 1 sprint | Audit log timestamp off by 1 timezone hour |

### 8.2 Defect Lifecycle

```
Reported ──► Triaged (Severity/Priority) ──► Assigned ──► In Progress
     │                                                              │
     ▼                                                              ▼
  Duplicate? ──(yes)──► Closed                                  Fixed ──► Verified ──► Closed
     │
     ▼ (no)
  Cannot Reproduce? ──(yes)──► Closed
     │
     ▼ (no)
  Root Cause Identified → Add regression test → Fix
```

**Must-add rule:** Every bug fix MUST include:
1. Failing test reproducing the bug (before fix)
2. Code change that makes it pass
3. Regression test guard (if applicable)

### 8.3 Defect Triage Cadence

- **Daily standup:** Review all new P0/P1 defects
- **Weekly triage meeting:** Prioritize P2/P3; estimate sprint capacity
- **Retrospective:** Analyze defect injection rate by module; identify process gaps

---

## 9. Traceability Matrix

This matrix maps **SFS acceptance criteria** (SPEC_FUNCTIONAL.md Section 11) to **test artifacts**.

| PRD Criterion # | Criterion Text | Test Type | Test File(s) | Coverage | Status |
|-----------------|----------------|-----------|--------------|-----------|---------|
| **Resource Management** |
| AC-01 | CSV import with 1000+ rows completes in <30s | Performance | `tests/performance/test_csv_import_speed.py` | Covered | Pending |
| AC-02 | Rate lookup returns correct rate for any historical date | Unit + Integration | `tests/services/test_rate_lookup.py::test_historical_rate` | Covered | Pending |
| AC-03 | Resource external_id is immutable after creation | Unit + Integration | `tests/models/test_resource.py::test_external_id_immutable`; `tests/api/test_resource_api.py::test_external_id_immutable_negative` | Covered | Pending |
| AC-04 | Skill/level user-configurable | Integration | `tests/api/test_skill_api.py` | Covered | Pending |
| AC-05 | Resource status transitions respected | Unit + Integration | `tests/services/test_resource_lifecycle.py` | Covered | Pending |
| AC-06 | Holiday calendar respected in capacity | Integration | `tests/services/test_allocation_constraints.py::test_holidays_counted` | Covered | Pending |
| **Project Management** |
| AC-07 | Activity dependency cycle rejected | Unit + Integration | `tests/services/test_activity_dependencies.py::test_cycle_detection` | Covered | Pending |
| AC-08 | Project budget validation enforced | Integration | `tests/services/test_budget_validation.py` | Covered | Pending |
| AC-09 | Status transitions follow workflow | Unit + Integration | `tests/services/test_project_state_machine.py` | Covered | Pending |
| AC-10 | Gantt displays activities + dependencies | E2E | `tests/integration/test_gantt_rendering.py` | Covered | Pending |
| AC-11 | Critical path correct (zero-float = red) | Unit + Integration | `tests/services/test_critical_path.py::test_zero_float_identified` | Covered | Pending |
| AC-12 | Drag-and-drop validates constraints | E2E | `tests/integration/test_gantt_drag.py::test_cascade_warning_shown` | Covered | Pending |
| *(derived) | Project concurrent edit optimistic locking | Integration | `tests/integration/test_project_concurrent_edit.py::test_optimistic_lock_conflict` | Covered | Pending |
| *(derived) | Project concurrent edit optimistic locking | Integration | `tests/integration/test_project_concurrent_edit.py::test_optimistic_lock_conflict` | Covered | Pending |
| **Resource Allocation** |
| AC-13 | Auto-allocation produces valid allocations | Integration | `tests/services/test_auto_allocation.py::test_produces_valid_allocations` | Covered | Pending |
| AC-14 | Simulate mode shows projections without persisting | Integration | `tests/services/test_auto_allocation.py::test_simulate_mode_no_persist` | Covered | Pending |
| AC-15 | Allocation exceeding budget rejected | Integration | `tests/services/test_allocation_constraints.py::test_budget_exceeded` | Covered | Pending |
| AC-16 | Four-eyes approval enforced | Integration | `tests/services/test_approval_workflow.py::test_cannot_self_approve` | Covered | Pending |
| AC-17 | Rejection workflow: reason required + resubmit | Integration | `tests/services/test_approval_workflow.py::test_reject_with_reason_allows_resubmit` | Covered | Pending |
| AC-18 | Audit log captures every change | Unit + Integration | `tests/audit/test_audit_log.py::test_all_allocation_changes_logged` | Covered | Pending |
| AC-19 | Fine-grained allocations (0.1 HCM) supported | Unit | `tests/models/test_allocation.py:: test_hours_precision` | Covered | Pending |
| AC-20 | Daily OT validation enforced | Unit + Integration | `tests/services/test_allocation_constraints.py::test_daily_ot_exceeded` | Covered | Pending |
| AC-21 | Allocation is override not accumulate | Integration | `tests/services/test_allocation_override.py::test_replaces_not_accumulates` | Covered | Pending |
| AC-22 | Leave-aware capacity (on_leave pauses) | Integration | `tests/services/test_leave_impact.py` | Covered | Pending |
| AC-23 | 5-project monthly cap validated | Unit + Integration | `tests/services/test_allocation_constraints.py:: test_5_project_cap` | Covered | Pending |
| AC-24 | 5-project counts all statuses (hard) | Unit + Integration | `tests/services/test_allocation_constraints.py::test_5_project_counts_pending` | Covered | Pending |
| AC-25 | Monthly capacity (144h) + OT cap (36h) validated | Integration | `tests/services/test_allocation_constraints.py::test_monthly_caps` | Covered | Pending |
| **Dashboard** |
| AC-26 | All 6 core KPIs display accurate real-time numbers | Integration | `tests/integration/test_dashboard_kpis.py::test_values_match_source` | Covered | Pending |
| AC-27 | Filters apply instantly | Integration | `tests/api/test_dashboard_filters.py` | Covered | Pending |
| AC-28 | CSV export includes timestamp in filename | Integration | `tests/api/test_dashboard_export.py:: test_filename_has_timestamp` | Covered | Pending |
| AC-29 | Dashboard refreshes within 5s of data change | E2E | `tests/integration/test_dashboard_freshness.py` | Covered | Pending |
| AC-30 | Default date range = current month; preference persisted | E2E | `tests/frontend/test_dashboard_preferences.py` | Covered | Pending |
| AC-31 | Notification center shows unread count + grouped | E2E | `tests/frontend/test_notification_center.py::test_unread_count` | Covered | Pending |
| **CSV Import** |
| AC-32 | CSV import Batch Create all-or-nothing | Integration | `tests/services/test_csv_import.py::test_batch_create_rollback_on_error` | Covered | Pending |
| AC-33 | Import either fully succeeds or fully fails with downloadable error report | Integration | `tests/api/test_csv_import.py::test_error_report_downloadable` | Covered | Pending |
| **Non-Functional** |
| AC-34 | Rate records enforce no-overlap at DB level | Integration | `tests/models/test_rate.py::test_overlap_constraint` | Covered | Pending |
| AC-35 | Soft delete (`is_active`) supported everywhere | Integration | `tests/models/test_soft_delete.py` | Covered | Pending |
| AC-36 | Audit log queryable by Admin/POD Manager with filters | Integration | `tests/api/test_audit_log.py::test_filtered_query` | Covered | Pending |

**Derived Coverage (Implicit SFS Requirements):**
| *(derived) | Rate period contiguity across calendar year boundary (Dec→Jan) | Unit + Integration | `tests/services/test_rate_contiguity.py::test_year_boundary_transition` | Covered | Pending |
| *(derived) | Rate edit pre-effective rate allowed; post-effective rate forbidden (UC-RM-08) | Integration | `tests/services/test_rate_edit_restrictions.py` | Covered | Pending |
| *(derived) | Project concurrent edit optimistic lock conflict detection | Integration | `tests/integration/test_project_concurrent_edit.py::test_optimistic_lock_conflict` | Covered | Pending |
| *(derived) | Notification email throttling: max 1 email per recipient per 24h per event type | Integration | `tests/services/test_notification_throttling.py::test_email_digest_coalescing` | Covered | Pending |
| *(derived) | Notification read status atomic update (race condition safe) | Integration | `tests/services/test_notification_read_race.py` | Covered | Pending |

**Coverage Summary:** 36/36 PRD acceptance criteria mapped; 5 implicit requirements covered; 0 gaps identified.

---

## 10. Test Plan

### 10.1 Test Execution Schedule

| Phase | Test Suites | Duration | Owner | Gate |
|-------|-------------|----------|-------|------|
| **Sprint 1 — Foundation** | Resource CRUD, Rate lifecycle | 3 days | Dev Team | Unit + Integration gate |
| **Sprint 2 — Project Core** | Project CRUD, Activities, Dependencies, Gantt | 3 days | Dev Team | Integration + 1 E2E |
| **Sprint 3 — Allocation Engine** | Allocation CRUD, Constraints, Approval | 4 days | Dev Team + QA | All unit/integration/e2e |
| **Sprint 4 — Dashboard + Notifications** | KPIs, Filters, MV refresh, Notification center | 3 days | Dev Team + QA | E2E load tests |
| **Sprint 5 — Performance & Security** | Load tests, Security scans, Pen test | 5 days | DevOps +Sec Team | Security gate |
| **Sprint 6 — UAT + Release Prep** | Full regression, smoke tests, documentation | 4 days | QA + PM | All gates passed |

### 10.2 Test Case Template

```
Test Case ID: TC-ALLOC-001
Title: Allocation exceeding project budget is rejected
Related AC: AC-15
Priority: MUST
Type: Integration
Preconditions: Project exists with budget=100K; Resource has rate=14.40K/mo; Resource has 144h capacity remaining

Steps:
1. POST /api/v1/allocations with {resourceId: 1, projectId: 1, weekStartDate: "2026-04-06", hours: 120}
2. Verify HTTP 422 response
3. Verify response body: { "error_code": "BUDGET_EXCEEDED", "message": "Project budget exceeded by 12.50K" }
4. GET /api/v1/allocations — verify allocation not created (status = 0 rows)

Expected Result: Allocation rejected with clear error; project budget unchanged
```

### 10.3 Regression Test Suite

**Daily regression** (~200 tests, ~30 min runtime):
- All unit tests
- All integration tests (Testcontainers)
- Critical E2E journeys (approval, CSV import, dashboard)

**Full regression** (~400 tests, ~2h runtime):
- Daily regression +
- All E2E tests (Playwright)
- Performance smoke tests (Locust 1-min quick check)

**Pre-release regression** (~600 tests, ~4h runtime):
- Full regression +
- Security scan (OWASP ZAP)
- Pen test manual checklist

### 10.4 Acceptance Test Scenarios (User Journey Level)

**Scenario 1 — PM allocates resource within budget**
```
Given Sarah (PM) logged in
And Project "Phoenix" has remaining budget $45K
And Resource "David Chen" has rate $14.40K/mo and 120h capacity this month
When Sarah creates allocation: 80h week of 2026-04-06 on Phoenix
Then Allocation created with status PENDING
And Budget recalculated: remaining $44.03K (80h × $14.40K/144h)
And Notification sent to POD Manager inbox
```

**Scenario 2 — POD Manager rejects allocation with reason**
```
Given Michael (POD Manager) has 1 PENDING allocation in inbox
When Michael clicks "Reject" and enters reason "Incorrect week; re-submit for May"
Then Allocation status set to REJECTED
And PM receives notification with "Edit & Resubmit" button
And Allocation NOT counted against resource capacity
```

**Scenario 3 — Admin imports 1000 resources successfully**
```
Given Admin Lisa is logged in
And CSV file "resources_1000.csv" passes local validation
When Lisa uploads CSV and confirms preview
Then System imports all 1000 records in <30 seconds
And Success toast shows "1000 resources imported. Batch ID: ..."
And All 1000 have audit log entry (type: RESOURCE_CREATED)
And Error report download link returns 0 errors
```

**Scenario 4 — 5-project cap enforced**
```
Given Resource R assigned to Projects P1, P2, P3, P4 (all have APPROVED allocations in May)
When PM attempts allocation on P5 in May
Then Allocation accepted (5th project allowed)
When PM attempts allocation on P6 in May
Then Allocation REJECTED with "PROJECT_SPREAD_LIMIT: Resource already on 5 projects"
```

**Scenario 5 — Project completion freezes allocations**
```
Given Project "Atlas" in EXECUTING with 3 APPROVED allocations
When Admin marks project COMPLETED
Then Project status = COMPLETED, is_active = false
And All 3 allocations status = LOCKED, is_active = false
And Attempt to edit any allocation returns 403 PROJECT_TERMINAL_IMMUTABLE
```

### 10.5 Non-Functional Test Checklist

**Performance:**
- [ ] CSV import 1000 rows: parse+validate <30s; commit <10s (AC-01)
- [ ] Dashboard KPIs query <1s (p95) under 30 concurrent users
- [ ] Auto-allocation engine <15s for 20 unassigned activities
- [ ] Concurrent allocation submissions: 50 RPS sustained, no deadlocks

**Security:**
- [ ] PM role cannot approve allocations (RBAC enforced)
- [ ] Injection attempts (SQL/XSS) rejected with 400/422 errors
- [ ] Audit log contains `changed_by_user_id` for all mutations
- [ ] No credentials in application logs (verified via log scrubbing test)

**Reliability:**
- [ ] Database transaction rollback on validation failure leaves no partial data
- [ ] Optimistic lock retry logic recovers from concurrent edits in ≤2 attempts
- [ ] Redis restart: notifications queue durable; no data loss

---

## 11. Test Artifacts & Deliverables

| Artifact | Format | Owner | Location |
|----------|--------|-------|----------|
| **Unit Test Reports** | JUnit XML + HTML | Dev per module | `target/surefire-reports/` |
| **Integration Test Reports** | JUnit XML + Allure JSON | Dev | `build/reports/tests/integration/` |
| **E2E Test Reports** | Playwright HTML + JSON | QA | `e2e/test-results/` |
| **Code Coverage Report** | JaCoCo HTML + SonarQube | DevOps | `target/site/jacoco/` |
| **Performance Test Results** | JMeter JTL + Grafana dashboard | DevOps | `load-test-results/{timestamp}/` |
| **Security Scan Reports** | OWASP ZAP JSON + HTML | Security Team | `security-reports/zap_{date}.html` |
| **Traceability Matrix** | Excel/Markdown | QA Lead | `doc/TRACEABILITY_MATRIX.xlsx` |
| **Defect Log** | Jira/Linear export | QA | Linked from ticket system |

---

## Appendix A — Constraint Validation Test Map

| Constraint | Business Rule (SFS Ref) | Test File | Test Count |
|------------|-------------------------|-----------|------------|
| Daily hour limit (≤10h/day) | CR-VAL-01 | `AllocationConstraintValidatorTest` | 6 |
| Monthly OT cap (≤36h OT) | CR-VAL-02 | `AllocationConstraintValidatorTest` | 8 |
| 5-project monthly spread | CR-VAL-03 | `AllocationConstraintValidatorTest` | 10 |
| Budget exhaustion | CR-VAL-04 | `BudgetValidationServiceTest` | 12 |
| Override not accumulate | CR-VAL-05 | `AllocationRepositoryTest` | 5 |
| Rate period contiguity | CR-VAL-06 | `RateServiceTest` | 8 |
| Resource status cascade | CR-VAL-07 | `ResourceServiceTest` | 6 |
| Project terminal freeze | CR-VAL-08 | `ProjectServiceTest` | 7 |

**Total constraint tests: 52 unit + 28 integration = 80 tests**

---

## Appendix B — Test Data Volume Estimates

| Entity | Production Volume | Test Volume (per suite) | Rationale |
|--------|------------------|------------------------|-----------|
| Resources | 500 | 1000 (bulk import) | CSV import tests; bulk operations |
| Rates | 6000 (10 years × 600 CC/BTC combos) | 1200 | Rate lifecycle + MV refresh |
| Projects | 200 active / 1000 total | 300 | Project per PM; plus terminal |
| Activities | 2000 | 500 | Average 5–10 activities/project |
| Allocations | 50,000                        monthly avg | 10,000 per test run | Monthly allocation volume |
| Notifications | ~2000/week | 2000 | Retention window tests |
| Audit log | ~50K/month | 5000 | Query filter tests |

Test database size: ~500MB (PostgreSQL) per full integration test suite.

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-19 | Claude Code | Initial draft aligned to SPEC_FUNCTIONAL v1.0 |

---

*End of Test Strategy Document*
