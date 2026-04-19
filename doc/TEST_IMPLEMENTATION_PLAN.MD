# Test Implementation Plan — POD Team Management System

**Version:** 2.0
**Date:** 2026-04-19
**Based On:**
- `TEST_STRATEGY.MD` v1.0
- `TEST_PLAN.MD` v1.1 (gap-resolved)
- `SPEC_FUNCTIONAL.md` v1.0
- `TDD_Testing.md` v2.3
**QA Review:** `TEST_IMPLEMENTATION_PLAN_QA_REVIEW.MD` v1.0 — all blockers resolved
**Owner:** Development Team
**Status:** ✅ Approved for Execution

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Implementation Phases](#2-implementation-phases)
3. [Sprint-by-Sprint Breakdown](#3-sprint-by-sprint-breakdown)
4. [Test Project Structure](#4-test-project-structure)
5. [Infrastructure & Sprint 0](#5-infrastructure--sprint-0-prerequisites)
6. [Dependencies](#6-dependencies)
7. [Implementation Standards](#7-implementation-standards)
8. [Definition of Done (DoD)](#8-definition-of-done-dod)
9. [Review & Sign-off](#9-review--sign-off-process)
10. [Risks & Mitigations](#10-risks--mitigations)

---

## 1. Executive Summary

This revised plan operationalizes the test strategy into **concrete coding tasks** with deliverable artifacts, realistic capacity, and full coverage including **security & performance tests**.

**Key v2.0 changes (post-QA review):**
- ✅ **Realistic capacity:** 4 productive hours/day (revised from 6h unrealistic) → total **~46 days**
- ✅ **Security tests added:** 7 test tasks (RBAC matrix, SQLi, XSS, audit completeness, log scrubbing)
- ✅ **Performance tests added:** 10 test tasks (CSV bulk, dashboard concurrent, auto-alloc throughput, allocation submissions, MV refresh)
- ✅ **Sprint 0 added:** 2 days infrastructure scaffolding (fixtures, seeds, base classes, Playwright)
- ✅ **DoD expanded:** Separate RED/GREEN/REFACTOR commits; no test+code in same commit; TDD discipline enforced

---

## 2. Implementation Phases

| Phase | Sprint | Duration | Delivery |
|-------|--------|----------|----------|
| Phase 0 — Infrastructure | Sprint 0 | 2 days | Test fixtures, CI/CD, Playwright (6 tasks) |
| Phase 1 — Resource | Sprint 1 | 5 days | Resource/Rate unit + CSV integration (~21 tests) |
| Phase 2 — Project | Sprint 2 | 8 days | State machine, dependencies, Gantt, locking (~24 tests) |
| Phase 3 — Allocation | Sprint 3 | 14 days | Constraints (52), approval workflow, auto-alloc (~32 tests) |
| Phase 4 — Dashboard+Notif | Sprint 4 | 8 days | KPIs, MV refresh, notification center E2E (~22 tests) |
| Phase 5 — Hardening | Sprint 5 | 5 days | Security (7), Performance (10), Audit, Concurrency (~25 tests) |
| Phase 6 — Stabilization | Sprint 6 | 6 days | Flake fix, docs, traceability, release cert (~12 tasks) |
| **Total** | **6 sprints + 0** | **~46 days** | **~341 tests** |

**Capacity model:** 4 productive hours/day + 2h overhead = 8h nominal day. Conservative buffer accounts for meetings, debugging, context switching.

---

## 3. Sprint-by-Sprint Breakdown

### Sprint 0 — Test Infrastructure & Prerequisites (Days 1–2)

**Sprint Goal:** All test frameworks, fixtures, CI/CD, and scaffolding ready for Sprint 1+.

| Task ID | Task Description | Acceptance | Owner | Est. (h) |
|---------|-----------------|------------|-------|----------|
| T0.1 | Create `TestFixtures.java` builder utility | Static methods: `resource()`, `project()`, `allocation()`, `rate()`; Faker seeded `Random(12345)`; realistic defaults | DevOps | 2 |
| T0.2 | SQL seed files: `seed_cost_centers.sql`, `seed_holidays_2026.sql`, `seed_test_users.sql`, `seed_skills.sql` | 3 CCs, 10 holidays, 4 roles (PM/POD/Admin/Viewer), 5 skills | DevOps | 2 |
| T0.3 | Create `AbstractIntegrationTest` base class | `@Testcontainers` Postgres+Redis; `@BeforeEach` TRUNCATE; `@DynamicPropertySource`; reusable `jdbcTemplate` | Dev | 3 |
| T0.4 | Bootstrap Playwright: `frontend/e2e/package.json`, `playwright.config.ts`, `BasePage` class | `npm ci` passes; `npx playwright install chromium`; `baseURL` configurable | QA | 3 |
| T0.5 | CI/CD: `.github/workflows/ci.yml` with 3 jobs (unit, integration, e2e) + Maven cache + artifact upload | PR triggers all jobs; reports archived | DevOps | 4 |
| T0.6 | JaCoCo + SonarQube coverage gate: `jacoco.xml` produced; PR comment shows coverage delta ≥80% | `mvn verify` generates report; SonarCloud quality gate blocks PR if <80% | DevOps | 3 |
| **Sprint 0 Total:** | | | | **17h** |

---

### Sprint 1 — Resource & Rate Module (Days 3–7)

**Goal:** Resource/rate lifecycle unit-tested ≥90%; CSV import + rate edit integration tests complete.

#### Day 1 — Resource Entity + Immutability (7.5h)
| T1.1 | `ResourceTest.java`: field constraints — `externalId` unique, `isBillable` default, category enum | 3h |
| T1.2 | Status transitions: ACTIVE→ON_LEAVE, ACTIVE→TERMINATED validation | 2h |
| T1.3 | `externalId` immutable: setter no-op after persist | 1h |
| **G6-T1.4** | `ResourceApiTest`: PATCH `externalId` → **400 BAD_REQUEST** "field read-only" | 1.5h |

#### Day 2 — Rate Contiguity Unit Tests (9h)
| T2.1 | `RateServiceTest` scaffold: mock `RateRepository`, fixtures | 2h |
| **G1-T2.2** | `testContiguity_Succeeds_AdjacentMonths()` — 2026-04→2026-05 closes prior | 2h |
| T2.3 | `testContiguity_Fails_WithGap()` → `RateContiguityViolationException` | 1.5h |
| T2.4 | `testContiguity_Fails_WithOverlap()` → `RateOverlapException` | 1.5h |
| **G1-T2.5** | `testContiguity_AcrossYearBoundary_Dec2026_To_Jan2027()` — Dec→Jan valid; Feb→Dec fails | 2h |

#### Day 3 — Rate Edit Restrictions (8h)
| **G2-T3.1** | `testEditPreEffective_Succeeds()` — future effective date, within 7d → 200 OK | 1.5h |
| **G2-T3.2** | `testEditPostEffective_Fails()` — effective date passed → **403 FORBIDDEN** | 1.5h |
| T3.3 | `testEditAfter7DayWindow_Fails()` — created >7d ago | 1.5h |
| T3.4 | `testRateArchival_BlockedIfSuccessorDepends()` — prevent orphan gap | 2h |
| T3.5 | `testHistoricalRateLookup()` — `findActiveRate()` returns correct period | 1.5h |

#### Day 4 — CSV Import Integration (9h)
| T4.1 | `CsvImportServiceTest`: preview validation returns `ImportValidationResult` (no DB) | 2h |
| **T4.2** | `CsvImportIntegrationTest`: `testBatchCreate_500Rows_AllSuccess()` — <30s; 500 audit entries | 4h |
| **T4.3** | `testBatchCreate_OneInvalid_RollsBack()` — 0 rows; error report downloadable | 3h |

#### Day 5 — Export + DB Constraints (7h)
| T5.1 | `CsvExportIntegrationTest`: Resource export includes BOM (`\uFEFF`) for Excel | 2h |
| T5.2 | Export Resources+Latest Rates: LATERAL subquery returns most recent per resource | 2h |
| T5.3 | Export Audit Log: pagination (max 100k), ISO 8601 timestamps | 1.5h |
| T5.4 | DB constraint: unique partial index prevents duplicate active rate period | 1.5h |
| **Sprint 1 Total:** | | | **40.5h** |

---

### Sprint 2 — Project & Activity Management (Days 8–15)

**Goal:** State machine, cycle detection, Gantt critical path, project optimistic locking, terminal freeze.

#### Day 6 — Project State Machine Unit (7h)
| T6.1 | `ProjectStateMachineTest`: 8 valid transitions (REQUESTED→…→COMPLETED) | 3h |
| T6.2 | Invalid: REQUESTED→COMPLETED → `InvalidStateTransitionException` | 1.5h |
| T6.3 | CANCELLED from any state (terminal) | 1.5h |
| T6.4 | Budget validation: `budget_K > 0`, `end >= start + 7d` | 1h |

#### Day 7 — Activity Dependencies Unit (8h)
| T7.1 | `ActivityDependencyCycleDetectorTest`: DFS with `visited`+`stack` | 3h |
| T7.2 | `testDetectCycle_AcyclicGraph_ReturnsEmpty()` | 1.5h |
| T7.3 | `testDetectCycle_CycleA_B_C_A_ReturnsPath()` → [A,B,C] | 2h |
| T7.4 | `testDetectCycle_SelfLoop()` — self-dependency detected | 1.5h |

#### Day 8 — Project + Activity Integration (9h)
| T8.1 | `ProjectIntegrationTest`: create with status=REQUESTED; audit entry | 2h |
| T8.2 | Invalid dates → 400 validation error | 1.5h |
| T8.3 | M:N self-referential dependencies; cycle rejected pre-save | 3h |
| T8.4 | Activity `isMilestone` + `milestoneStatus` enum validation | 1.5h |
| T8.5 | Project `budgetMonthlyBreakdown` JSONB storage/retrieval | 1h |

#### Day 9 — Terminal State + Freeze (8h)
| T9.1 | `testTransitionToCOMPLETED_LocksAllocations()` — all → LOCKED, `is_active=false` | 3h |
| T9.2 | `testTransitionToCANCELLED_LocksAllocations()` — PENDING→REJECTED, APPROVED→LOCKED | 3h |
| T9.3 | `testEditLockedProject_Returns403_PROJECT_TERMINAL_IMMUTABLE()` | 2h |

#### Day 10 — Project Reactivation + Gantt Unit (8h)
| T10.1 | `testReactivateProjectWithin30Days_Succeeds()` — restores `is_active=true` | 2h |
| T10.2 | `testReactivateProjectAfter30Days_Fails()` — must clone new | 1.5h |
| T10.3 | `CriticalPathCalculatorTest`: forward/backward pass on 5-activity DAG | 3h |
| T10.4 | `testZeroFloatActivities_MarkedCritical()` — LS-ES=0 flagged red | 1.5h |

#### Day 11 — Gantt Integration + Drag Constraints (7h)
| T11.1 | `GanttIntegrationTest`: REST returns activities with ES/EF/LF/LS floats | 2h |
| T11.2 | Bar color by status: NOT_STARTED gray, IN_PROGRESS blue, COMPLETED green, ON_HOLD orange | 2h |
| T11.3 | Drag-reschedule modal with cascade warning (3+ successors affected) | 2h |
| T11.4 | Drag blocked: beyond `end_date` → tooltip "Cannot exceed project end date" | 1h |

#### Day 12 — Concurrent Project Edit (**G3 fix**) + Orphan Fixes (7h)
| **G3-T12.1** | `ProjectOptimisticLockTest`: concurrent edit → `OptimisticLockingFailureException` → HTTP 409 | 3h |
| T12.2 | `testProjectVersionIncrementsOnUpdate()` — `@Version` increments | 1.5h |
| T12.3 | Fix orphan: `TC-PM-03` cycle detection explicit method naming | 1.5h |
| T12.4 | Fix orphan: `TC-RM-15` export BOM integration path | 1h |
| **Sprint 2 Total:** | | | **54h** |

---

### Sprint 3 — Allocation Engine (Days 16–29)

**Goal:** All 8 constraint validators; approval workflow; auto-allocation 5-stage filter.

#### Day 13–14 — Constraint Validators Unit (CR-VAL-01–05) (13h)
| T13.1 | `testDailyHours_Exceeds10PerDay_Throws_OT_DAILY_EXCEEDED` | 2h |
| T13.2 | `testDailyHoliday_RegularHoursZero_OTMax10()` — holiday constraint | 2h |
| T13.3 | `testMonthlyOT_Exceeds36h_Throws_OT_MONTHLY_CAP` — 180h total (144+36) | 2h |
| T13.4 | `testMonthlyOT_Exactly36h_Allowed()` — at cap boundary | 1.5h |
| T13.5 | `testFiveProjectCap_Exactly5_Allowed()` — 5th project accepted | 1.5h |
| **T13.6** | `testFiveProjectCap_6th_Throws_PROJECT_SPREAD_LIMIT()` — counts PENDING+APPROVED+LOCKED | 2h |
| T13.7 | `testBudgetExhaustion_Total_Throws_BUDGET_EXCEEDED()` — Σ(hours×rate/144) > budget_K | 2h |
| T13.8 | `testBudgetExhaustion_MonthlyBreakdown_Throws_MONTHLY_BUDGET_EXCEEDED()` | 2h |

#### Day 15 — Constraint CR-VAL-05–07 Integration (9h)
| T14.1 | `testOverrideSemantics_NewAllocationReplacesOld()` — old `is_active=false`, REJECTED | 2h |
| T14.2 | `testOverride_SameWeek_UniqueConstraintEnforced()` — DB unique index | 1.5h |
| T14.3 | Allocation create → PENDING status; audit log entry | 2h |
| T14.4 | Resource ON_LEAVE auto-rejects PENDING (CR-VAL-07 Part A) | 1.5h |
| T14.5 | Resource TERMINATED locks APPROVED (CR-VAL-07 Part B) | 2h |

#### Day 16 — Approval Workflow Unit + Integration (9h)
| T15.1 | `AllocationApprovalServiceTest`: approve() sets `approved_by`, `approved_at` | 2h |
| T15.2 | Four-eyes: submitter == approver → 403 FORBIDDEN (`cannot_self_approve`) | 2h |
| T15.3 | Reject with reason: status=REJECTED; `rejection_reason` stored; audit logged | 2h |
| T15.4 | "Edit & Resubmit" button opens modal pre-filled (E2E stub) | 1.5h |
| T15.5 | Approval SLA Phase 2 — documented only | 1.5h |

#### Day 17–18 — Auto-Allocation Filter Chain Unit (10h)
| T16.1 | `AutoAllocationEngineTest` scaffold: mocks for `ResourceRepository`, `AllocationRepository` | 2h |
| T16.2 | Stage 1 Capacity: `filterByAvailableCapacity()` — `remainingCapacity >= hours` | 2h |
| T16.3 | Stage 2 Skill: `filterBySkillMatch()` — exact skill string | 1.5h |
| T16.4 | Stage 3 Spread: `filterByProjectSpread()` — count <5, includes LOCKED | 2h |
| T16.5 | Stage 4 Budget: `filterByBudget()` — Σ allocated+candidate ≤ budget_K | 1.5h |
| T16.6 | Stage 5 Cost: `sortByCheapest()` — ascending `monthlyRateK` | 1h |

#### Day 19–20 — Auto-Allocation Integration + Simulate Mode (11h)
| T17.1 | `AutoAllocationIntegrationTest`: full engine E2E with Testcontainers | 3h |
| T17.2 | `testSimulateMode_ReturnsPredictions_NoDbWrites()` — `allocationId=null` | 2h |
| T17.3 | `testAllocate_NoCandidates_CAPACITY_EXHAUSTED()` failure recorded | 2h |
| T17.4 | `testAllocate_SkillMismatch_SKILL_MISMATCH` failure recorded | 2h |
| T17.5 | `testAllocate_BudgetExceeded_BUDGET_EXCEEDED` failure recorded | 2h |

#### Day 21–22 — Override + Concurrency (9h)
| T18.1 | `testUpsertAllocation_AtomicReplace_NoDuplicate()` — PESSIMISTIC_WRITE then INSERT | 3h |
| T18.2 | `ConcurrentAllocationUpdateTest`: two update same version → one gets 409 | 2h |
| T18.3 | `@Retryable` logic: transient conflict auto-retried once; second succeeds | 2h |
| T18.4 | Optimistic lock → HTTP 409 with `OPTIMISTIC_LOCK_CONFLICT` error code | 2h |

#### Day 23–24 — Monthly Cap + Holiday Constraints (8h)
| T19.1 | `testMonthlyCapacity_144hLimit_Enforced()` — Σ ≤ 144 base; excess OT | 2h |
| T19.2 | `testMonthlyOT_Cap36h_AccumulatesAcrossWeeks()` — week-by-week accumulation | 2h |
| T19.3 | `testHoliday_RegularHoursZero_OTMax10()` — holiday constraint | 2h |
| T19.4 | Combined edge: resource at 144h base, 36h OT, 4 projects → 5th project budget checked first | 2h |

#### Day 25–27 — Auto-Allocation Full Pipeline (10h)
| T20.1 | `testAutoAllocate_AllStagesPass_CreatesValidAllocations()` — 10 activities, 5 resources | 3h |
| T20.2 | Error taxonomy: each failure (`CAPACITY_EXHAUSTED`, `SKILL_MISMATCH`, etc.) has correct `errorCode` | 3h |
| T20.3 | `testAutoAllocation_SimulateMode_ReturnsDryRun()` — no DB writes | 2h |
| T20.4 | `testAutoAllocation_ConcurrentRuns_NoDuplicateAllocations()` — thread-safe | 2h |

#### Day 28–29 — Approval E2E + Notifications (9h)
| T21.1 | `AllocationApprovalE2ETest`: PM creates → POD approves → notification received | 2h |
| T21.2 | Rejection flow: POD rejects with reason → PM "Edit & Resubmit" → resubmit | 2h |
| T21.3 | `BUDGET_EXCEED_WARNING` notification generated on exceed | 2h |
| T21.4 | `ALLOCATION_SUBMITTED` written to `notifications` table with `is_read=false` | 1.5h |
| T21.5 | Notification `changed_by`, `changed_at` audit fields populated | 1.5h |
| **Sprint 3 Total:** | | | **95h** |

---

### Sprint 4 — Dashboard & Notifications (Days 30–37)

**Goal:** Dashboard KPIs, filters, MV refresh; Notification center UI interactions; E2E journeys.

#### Day 30–31 — Dashboard KPI Integration (11h)
| T22.1 | `DashboardKpiIntegrationTest`: Supply vs Demand — `COUNT(resource)` vs `SUM(hours)` correct | 3h |
| T22.2 | Budget Burn Rate: `spent_K = Σ(hours×rate/144)`; `remaining_pct` correct | 3h |
| T22.3 | Variance Analysis: `allocated_K` vs `budget_K` per project; percentage correct | 2h |
| T22.4 | Filter: POD team multi-select + secondary `cost_center` filter applied | 1.5h |
| T22.5 | Date range presets (current month, last 3, YTD, custom) — boundaries correct | 1.5h |

#### Day 32 — Materialized View Refresh + Real-time (9h)
| T23.1 | `MaterializedViewRefreshTest`: `@Scheduled` job 5min business / 30min off-hours | 3h |
| T23.2 | `testManualRefresh_Concurrent()` — manual button triggers non-blocking refresh | 2h |
| T23.3 | `WebSocketAllocationUpdateTest`: allocation created → `allocation_updated` to Redis `topic/dashboard` | 2h |
| T23.4 | Dashboard client receives event → invalidates cache → refetches within 5s (`awaitility`) | 2h |

#### Day 33 — Notification E2E — Core UI (8h)
| T24.1 | `notification-center.spec.ts`: bell icon unread count reflects DB count | 2h |
| T24.2 | Grouping toggle "By Project" (default) vs "By Type" — `localStorage` persisted | 2h |
| T24.3 | "Mark all read" button — all `is_read=true`; badge cleared | 1.5h |
| T24.4 | Per-item dismiss (×) on hover; click-through marks read | 1.5h |
| T24.5 | `ALLOCATION_REJECTED` shows [View Reason] + [Edit & Resubmit] | 1h |

#### Day 34 — Notification E2E — Advanced (**G4**, **G5**) (9h)
| **G4-T25.1** | `testEmailThrottling_MaxOnePer24hPerType()` — 3 triggers in 24h = 1 email; 4th >24h = 2nd | 3h |
| **G5-T25.2** | `testNotificationReadRace_ConcurrentMarkRead()` — 5 parallel: 1 succeeds, 4 get 409; `version`+1 | 2h |
| T25.3 | `RESOURCE_STATUS_CHANGED` sent to all PMs on affected projects | 2h |
| T25.4 | Retention query: hot (last 90d) vs archive (>24mo) separation | 2h |

#### Day 35–37 — Notification Integration + Dashboard E2E Journeys (10h)
| T26.1 | `NotificationServiceTest`: event → inbox DB insert + `MockJavaMailSender` | 2h |
| T26.2 | E2E: PM submits allocation → success toast → notification center unread +1 | 2h |
| T26.3 | E2E: POD approves → PM sees `ALLOCATION_APPROVED`; click → allocation detail | 2h |
| T26.4 | E2E: Dashboard CSV export filename `pod_dashboard_export_YYYY-MM-DD_HHMM.csv` with BOM | 1.5h |
| T26.5 | E2E: Filters apply → URL query updates → table refreshes | 1.5h |
| T26.6 | E2E: Create allocation → wait 300s → KPI value changes (MV refresh) | 1h |
| **Sprint 4 Total:** | | | **57h** |

---

### Sprint 5 — Security + Performance + Cross-Cutting (Days 38–42)

**Goal:** Security tests 0 high-risk; performance benchmarks met; audit + concurrency validated.

#### Day 38 — Security: RBAC + Audit Completeness (8h)
| **Sec-T27.1** | `SecurityRBACIntegrationTest`: Viewer → all POST/PUT/DELETE return 403 UNAUTHORIZED | 2h |
| **Sec-T27.2** | PM cannot approve own allocation (four-eyes second layer) | 2h |
| **Sec-T27.3** | POD Manager cannot create resources (RBAC boundary) | 1.5h |
| **Sec-T27.4** | Audit completeness: every mutation has `changed_by_user_id` non-null | 2.5h |

#### Day 39 — Security: SQLi + XSS + Rate Limiting (7h)
| **Sec-T28.1** | `testSqlInjectionBlocked()`: `externalId = "'; DROP TABLE resources;--"` → 400; bind params used | 2.5h |
| **Sec-T28.2** | `testXssInputEscaped()`: project name `<script>alert()</script>` → stored escaped `&lt;script&gt;` | 2h |
| **Sec-T28.3** | Audit JSON (`old_value`, `new_value`) properly serialized, no executable code | 2h |
| **Sec-T28.4** | No credentials in logs: logback pattern excludes `password`, `token`, `secret` | 1.5h |

#### Day 40 — Performance: Bulk + Concurrent (7h)
| **Perf-T29.1** | `CsvImportPerformanceTest`: 1000-row CSV parse+validate <30s; commit <10s (AC-01) | 2.5h |
| **Perf-T29.2** | `DashboardConcurrentLoadTest`: 30 users query during MV refresh — p95 <1s; 0 5xx (k6) | 2.5h |
| **Perf-T29.3** | `AutoAllocationThroughputTest`: 10 concurrent engine calls <15s each; no deadlocks | 2h |

#### Day 41 — Performance: Allocation Submissions + Tuning (6h)
| **Perf-T30.1** | `AllocationSubmissionLoadTest`: 50 PMs × 10/min → 95% success; p99 <2s (Locust) | 3h |
| **Perf-T30.2** | DB connection pool: HikariCP tuned; no wait >100ms | 2h |
| **Perf-T30.3** | Redis memory under load: `noeviction` policy; no OOM | 1h |

#### Day 42 — Audit + Soft-Delete + Reactivation (7h)
| T31.1 | `AuditLogIntegrationTest`: status change with `change_reason` stored; `revision_type=MOD` | 2h |
| T31.2 | Soft-delete resource → PENDING→REJECTED; APPROVED frozen; audit logged | 2h |
| T31.3 | Soft-delete project → allocations LOCKED; project `is_active=false`; hidden from dashboard | 1.5h |
| T31.4 | `ProjectReactivateIntegrationTest`: within 30d reactivates; allocations restored | 1.5h |
| **Sprint 5 Total:** | | | **43h** |

---

### Sprint 6 — Stabilization + Documentation + Release (Days 43–48)

**Goal:** Zero flaky tests; complete docs; traceability locked; release certified.

#### Day 43–44 — Flake Detection & Stabilization (9h)
| T32.1 | Run full suite 10× on CI — identify flaky tests via report diff | 3h |
| T32.2 | Fix flaky root causes: replace `Thread.sleep` with `awaitility`; increase timeout; `@Order` to eliminate hidden dependencies | 4h |
| T32.3 | Add `@Tag("flaky")` annotation; temporarily skip until fixed | 2h |

#### Day 45 — Documentation Finalization (7h)
| T33.1 | Update `TEST_STRATEGY.MD` Appendix A with actual test file paths (not placeholders) | 2h |
| T33.2 | Populate `TRACEABILITY_MATRIX.xlsx` — every AC-XX → `package.ClassName#testMethod` | 3h |
| T33.3 | Create `README_TEST.md` in `src/test/`: `mvn test`, `mvn verify -Pintegration`, `npm run test:e2e`, coverage locations | 2h |

#### Day 46 — Release Readiness Verification (6h)
| T34.1 | Pre-release full regression on staging — all 341 tests; JUnit XML report | 2h |
| T34.2 | Coverage: ≥80% overall; ≥90% on core modules (Allocation, Project) | 1h |
| T34.3 | Performance benchmark: CSV <30s, dashboard p95 <1s, auto-alloc <15s | 1.5h |
| T34.4 | QA Sign-off: all MUST passed; P0=0; ≤5 P1 with mitigations | 1.5h |

#### Day 47–48 — Release Artifacts + Retrospective (8h)
| T35.1 | Archive reports: `build/reports/` zipped to `release-artifacts/` | 2h |
| T35.2 | Update `PROGRESS.md` with test completion milestone; link commit `dba4257` | 1h |
| T35.3 | Sprint retrospective: defect rate, flake rate, coverage delta, lessons | 3h |
| T35.4 | Merge test-implementation branch to `main`; create PR with all test commits | 2h |
| **Sprint 6 Total:** | | | **30h** |

---

## 4. Test Project Structure

```
src/test/
├── java/
│   ├── unit/
│   │   ├── models/
│   │   │   ├── ResourceTest.java
│   │   │   ├── RateTest.java
│   │   │   └── AllocationTest.java
│   │   ├── services/
│   │   │   ├── AllocationConstraintValidatorTest.java   (CR-VAL-01–05)
│   │   │   ├── RateServiceTest.java                     (CR-VAL-06 + edit restrictions)
│   │   │   ├── ResourceServiceTest.java                 (CR-VAL-07)
│   │   │   ├── ProjectServiceTest.java                  (CR-VAL-08)
│   │   │   ├── BudgetValidationServiceTest.java         (CR-VAL-04 deep dive)
│   │   │   ├── AutoAllocationEngineTest.java            (5-stage filter)
│   │   │   ├── ActivityDependencyCycleDetectorTest.java
│   │   │   ├── CriticalPathCalculatorTest.java
│   │   │   └── NotificationThrottlingServiceTest.java   (email digests)
│   │   └── repositories/
│   │       └── AllocationRepositoryTest.java
│   ├── integration/
│   │   ├── ResourceIntegrationTest.java
│   │   ├── RateIntegrationTest.java
│   │   ├── ProjectIntegrationTest.java
│   │   ├── AllocationIntegrationTest.java
│   │   ├── CsvImportIntegrationTest.java
│   │   ├── CsvExportIntegrationTest.java
│   │   ├── DashboardKpiIntegrationTest.java
│   │   ├── MaterializedViewRefreshTest.java
│   │   ├── AuditLogIntegrationTest.java
│   │   ├── SoftDeleteIntegrationTest.java
│   │   ├── ConcurrencyIntegrationTest.java
│   │   ├── NotificationReadRaceIntegrationTest.java
│   │   └── NotificationThrottlingIntegrationTest.java
│   └── security/
│       ├── SecurityRBACIntegrationTest.java
│       ├── SqlInjectionTest.java
│       ├── XssProtectionTest.java
│       └── AuditCompletenessTest.java
├── performance/
│   ├── CsvImportPerformanceTest.java
│   ├── DashboardConcurrentLoadTest.java
│   ├── AutoAllocationThroughputTest.java
│   ├── AllocationSubmissionLoadTest.java
│   └── MaterializedViewRefreshLoadTest.java
├── resources/
│   ├── csv/
│   │   ├── valid_100_resources.csv
│   │   ├── valid_500_resources.csv
│   │   ├── invalid_duplicate_external_id.csv
│   │   └── edge_case_null_cost_center.csv
│   ├── sql/
│   │   ├── seed_cost_centers.sql
│   │   ├── seed_holidays_2026.sql
│   │   ├── seed_test_users.sql
│   │   └── seed_skills.sql
│   └── application-test.yml
├── e2e/
│   ├── spec/
│   │   ├── allocation-approval.spec.ts
│   │   ├── csv-import.spec.ts
│   │   ├── dashboard-refresh.spec.ts
│   │   ├── gantt-drag-cascade.spec.ts
│   │   ├── notification-center.spec.ts
│   │   └── project-completion-freeze.spec.ts
│   ├── playwright.config.ts
│   ├── package.json
│   └── tsconfig.json
└── README_TEST.md
```

---

## 5. Infrastructure & Sprint 0 Prerequisites

### 5.1 Build Configuration (pom.xml snippets)

**JUnit 5 + Mockito:**
```xml
<dependency>
    <groupId>org.junit.jupiter</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.mockito</groupId>
    <artifactId>mockito-junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
```

**Spring Boot Test + Testcontainers:**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
    <exclusions>
        <exclusion>
            <groupId>org.junit.vintage</groupId>
            <artifactId>junit-vintage-engine</artifactId>
        </exclusion>
    </exclusions>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
```

**AssertJ + JsonUnit:**
```xml
<dependency>
    <groupId>org.assertj</groupId>
    <artifactId>assertj-core</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>net.javacrumbs.json-unit</groupId>
    <artifactId>json-unit-assertj</artifactId>
    <scope>test</scope>
</dependency>
```

### 5.2 CI/CD Pipeline (GitHub Actions)

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [develop, main]
  push:
    branches: [develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: 17
          distribution: temurin
          cache: maven
      - name: Maven unit tests
        run: mvn -B test -DskipITs

  integration-tests:
    needs: unit-tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - name: Maven integration tests
        run: mvn verify -DskipITs=false -Dit.test=*IntegrationTest

  e2e-tests:
    needs: integration-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      - name: Run E2E tests
        run: |
          npm ci
          npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: e2e-report
          path: e2e/test-results/
```

---

## 6. Dependencies

### 6.1 External Systems (Mocked/Stubbed)

| System | Test Double | Scope |
|--------|-------------|-------|
| Email (SMTP) | `MockJavaMailSender` or MailHog | All email tests verify no real email sent |
| Redis | Testcontainers Redis 7 | In-memory; cleared between tests |
| PostgreSQL | Testcontainers PostgreSQL 15 | Real DB per test class; Flyway migrations auto-run |
| Keycloak/Auth | `@WithMockUser` + JWT test tokens | No real IdP; RBAC tested via `@PreAuthorize` |

### 6.2 Team Prerequisites

- JUnit 5 + Testcontainers experience (internal training available)
- Spring Boot Testing annotations (`@DataJpaTest`, `@WebMvcTest`, `@SpringBootTest`)
- Playwright TypeScript basics (docs: playwright.dev)
- PostgreSQL SQL fundamentals (for fixtures and assertions)

---

## 7. Implementation Standards

### 7.1 Naming Conventions

| Artifact | Pattern | Example |
|----------|---------|---------|
| Unit test class | `{ClassUnderTest}Test.java` | `RateServiceTest.java` |
| Integration test | `{Feature}IntegrationTest.java` | `AllocationIntegrationTest.java` |
| Test method | `given{Context}_when{Action}_then{Outcome}` | `givenResourceActive_whenAllocate_thenPendingCreated()` |
| E2E spec | `{feature}.spec.ts` | `allocation-approval.spec.ts` |
| Fixture method | `static {Entity} {entity}()` | `static Resource davidChen()` |

### 7.2 Assertion Patterns

```java
// Fluent AssertJ
assertThat(result).isNotNull();
assertThat(result.getStatus()).isEqualTo(AllocationStatus.APPROVED);

// Exception with message
assertThatThrownBy(() -> service.createRate(overlapReq))
    .isInstanceOf(RateOverlapException.class)
    .hasMessageContaining("overlaps existing rate");

// JSON audit comparison
assertThatJson(auditEntry)
    .inField("entity_type").isEqualTo("allocation")
    .inField("old_value").isAbsent()
    .inField("new_value").hasEntry("status", "PENDING");
```

### 7.3 Database Reset Strategy

```java
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@SpringBootTest
@Testcontainers
class AllocationIntegrationTest {
    @Container
    static PostgreSQLContainer<?> pg = new PostgreSQLContainer<>("postgres:15");

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", pg::getJdbcUrl);
    }

    @BeforeEach
    void clean(@Autowired JdbcTemplate jdbc) {
        jdbc.execute("""
            TRUNCATE TABLE audit_log, notifications, allocations, activities,
                       activity_dependencies, projects, rates, resources, holidays
            RESTART IDENTITY CASCADE
            """);
    }
}
```

### 7.4 Time Handling

All tests use fixed clock:
```java
@BeforeEach
void setUp() {
    fixedClock = Instant.parse("2026-04-19T00:00:00Z");
    when(clock.instant()).thenReturn(fixedClock);
    when(clock.getZone()).thenReturn(ZoneId.of("UTC"));
}
```
Avoid `LocalDate.now()`; inject `Clock` or use fixture constants.

---

## 8. Definition of Done (DoD)

A test task is **complete** only when **all** of the following satisfied:

1. ✅ **RED phase:** Failing test written (compiles, runs, fails with expected exception/message)
2. ✅ **GREEN phase:** Minimal code change makes test pass (no over-engineering)
3. ✅ **REFACTOR phase:** Code cleaned (no duplication); tests remain green
4. ✅ **Traceability:** Test method annotated with `@Criterion("AC-XX")` linking to PRD acceptance criterion
5. ✅ **Code Review:** Peer reviewed; reviewer confirms:
   - Test deterministic (no flaky waits)
   - Arrange-Act-Assert pattern (no hidden setup)
   - Mocks used appropriately (no real network in `@Test`)
6. ✅ **CI Green:** All tests in module pass locally + on PR pipeline
7. ✅ **Coverage:** JaCoCo shows ≥80% on changed files (not total project)
8. ✅ **Documentation:** Test method has JavaDoc explaining purpose and scenario
9. ✅ **Commit Policy:** **Separate commits** for RED, GREEN, REFACTOR phases (enforced via pre-commit hook or PR review)
10. ✅ **No Combined Commits:** Test and production code **never** in same commit (TDD discipline)

**Done checklist per task:**
```
[RED]   Test written — fails with expected exception
[GREEN] Minimal code change passes
[REFACTOR] Duplication removed; tests still green
[TRACE] @Criterion("AC-15") added
[REVIEW] Peer approved; deterministic
[CI]    GitHub Actions passed
[COV]   Coverage ≥80% on changed files
[DOC]   JavaDoc: "Allocation exceeds budget rejected with 422"
[COMMIT] 3 commits: test-only, impl, refactor (verified via git log)
```

---

## 9. Review & Sign-off Process

### 9.1 Pull Request Checklist

All test PRs must pass:

- [ ] **Compilation:** `mvn clean compile` passes; 0 warnings
- [ ] **Unit Tests:** All unit tests pass (0 failures)
- [ ] **Integration:** All integration tests pass
- [ ] **Code Style:** Spotless + ESLint applied
- [ ] **Test Quality:** ≥1 assertion per method; no `Thread.sleep`; mocks appropriate; `@Test` not `@SpringBootTest`
- [ ] **Traceability:** Every test method linked to AC-XX via `@Criterion`
- [ ] **Coverage:** PR shows coverage delta ≥0 (not decreasing)
- [ ] **No Flakiness:** Reviewer runs test class locally 3× — all green
- [ ] **Commit Hygiene:** RED→GREEN→REFACTOR commits separate (no test+impl in same)

### 9.2 QA Validation Gate

Before merging any test implementation PR:

1. QA Lead runs tests on staging environment
2. Cross-check against `TEST_PLAN.MD` test case index to verify mapping
3. `TRACEABILITY_MATRIX.xlsx` updated with file+method links
4. Sign-off comment on PR: "QA reviewed — test coverage verified against AC-XX"

### 9.3 Final Release Certification

After Sprint 6:

1. Full regression (all 341 tests) on staging — JUnit XML archived
2. Zero P0 test failures; ≤2 P1 with documented mitigations
3. Coverage ≥80% overall; ≥90% on core modules
4. Flake rate <2% (re-run count)
5. QA Lead signs `RELEASE_READINESS.md` documenting all 5 gates passed

---

## 10. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Testcontainers slow → CI >30min | High | Medium | Reuse static containers; parallelize test classes with Surefire `forkCount` |
| E2E flaky due to async timing | High | Medium | Playwright `expect(locator).toHaveText()` auto-retry; `awaitility` for backend |
| Missing fixture data for integration | Medium | High | `TestFixtures` single source; builders with defaults |
| Dev unfamiliar with Testcontainers | Medium | Low | Pair programming Day 1; internal wiki `docs/testing/testcontainers.md` |
| DB migration schema mismatch | Low | High | `@AutoConfigureTestDatabase`; validate schema on CI startup |
| Playwright driver mismatch (CI) | Medium | Medium | Pin Playwright version; `npx playwright install --with-deps chromium` in CI |
| Test race not caught locally | Medium | Medium | Run full suite 5× locally pre-PR; CI flake detector re-runs |
| Coverage target missed | Low | Medium | SonarQube quality gate blocks PR if `coverageDelta < 0` |

---

## Appendix A — Task Count Summary

| Sprint | Days | Tasks | Total Hours | Avg/Day |
|--------|------|-------|-------------|---------|
| Sprint 0 | 2 | 6 | 17h | 8.5h |
| Sprint 1 | 5 | 14 | 40.5h | 8.1h |
| Sprint 2 | 8 | 16 | 54h | 6.75h |
| Sprint 3 | 14 | 24 | 95h | 6.8h |
| Sprint 4 | 8 | 18 | 57h | 7.1h |
| Sprint 5 | 5 | 18 | 43h | 8.6h |
| Sprint 6 | 6 | 12 | 30h | 5h |
| **Total** | **~46** | **108** | **~341.5h** | **~7.4h nominal** |

**Note:** Estimates include coding + testing + debugging + code review overhead. 4 productive hours/day + 3–4h overhead average is realistic for sprint capacity.

---

## Appendix B — Traceability Index

| AC # | SFS Requirement | Test File + Method |
|------|----------------|-------------------|
| AC-01 | CSV import <30s (1000 rows) | `CsvImportPerformanceTest.testBulkImport_1000Rows_CompletesUnder30s()` |
| AC-02 | Historical rate lookup | `RateServiceTest.testFindActiveRate_ReturnsCorrectPeriod()` |
| AC-03 | external_id immutable | `ResourceTest.testExternalId_Immutable_SetterNoOp()` + `ResourceApiTest.testPatchExternalId_Returns400()` |
| … | … | … |
| **All 36 AC** | **Mapped** | **See `TRACEABILITY_MATRIX.xlsx`** |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-19 | Claude Code | Initial draft (rejected — capacity & coverage gaps) |
| **2.0** | **2026-04-19** | **Claude Code** | **Revised: realistic capacity (4h/day), Sprint 0 added, Security+Performance tests added, DoD expanded with TDD commit policy** |

---

*End of Test Implementation Plan v2.0 — Approved for Execution*
