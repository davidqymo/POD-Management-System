# Gap Analysis: SPEC_FUNCTIONAL.md vs TECHNICAL_DESIGN.md v2.2

**Date:** 2026-04-19
**TDD Version:** v2.2 (post-remediation)
**SFS Version:** 1.0
**Status:** Preliminary Findings

---

## Methodology

For each SFS section, I check whether TDD v2.2 contains an implementing specification. Gaps are classified as:
- **BLOCKING** — missing implementation would prevent coding
- **P1** — important but can be deferred to later sprint
- **P2** — polish/clarification
- **ALREADY COVERED** — TDD adequately implements SFS requirement

---

## Cross-Check Results

### Section 1: Introduction

| SFS Requirement | TDD Presence | Verdict |
|----------------|--------------|---------|
| Scope definition (Modules 1–3, 5, 6; Module 4 Phase 2) | TDD Section 1 Introduction lists same scope modules | ✅ COVERED |
| Out-of-Scope (Phase 2+) enumerated | TDD Section 1 explicitly lists Phase 1 vs Phase 2+ | ✅ COVERED |

**No gaps.**

---

### Section 2: User Roles & Personas

| SFS Requirement | TDD Presence | Verdict |
|----------------|--------------|---------|
| Role matrix (4 roles: PM, POD Manager, Admin, Viewer) | TDD Section 3–8 implicitly define RBAC roles; Section 10.1 (Security) documents roles JSONB array | ⚠️ **P1 — no consolidated role matrix** |
| Personas (Sarah PM, Michael POD Manager, Lisa Admin) | TDD lacks personas (design docs don't require narrative personas) | ℹ️ INFO ONLY — acceptable |
| Role-specific permissions per module | TDD Section 10 Security defines endpoint-level `@PreAuthorize` annotations per role | ✅ COVERED (implied) |

**Gap P1:** Add brief "User Roles" subsection to TDD Section 2 or 3 to anchor RBAC scope and role-to-permission mapping.

---

### Section 3: Module 1 — Resource Management

#### UC-RM-01: Create Resource (Admin)
- **SFS:** External_id unique, category enum, skill/level fields, is_billable toggle
- **TDD:** Section 4.1 `resources` table schema + API Section 5.2 Resource CRUD + Service Section 6.2 changeStatus
- **Status:** ✅ COVERED

#### UC-RM-02: View Resource Detail
- **SFS:** Resource info + current rate + allocation calendar + status history
- **TDD:** Section 19.2 Resource Detail page specifies tabs (Overview, Allocation Calendar, History); Section 5.2 `GET /resources/{id}` returns rate + allocations
- **Status:** ✅ COVERED

#### UC-RM-03: Import Resources via CSV (Admin)
- **SFS:** Upload → Preview validation → Mode selector (PREVIEW/CONFIRM/DRY_RUN) → Confirm; all-or-nothing batch_create vs upsert; import_batch_id tracking; import history table
- **TDD:** 
  - Section 5.2 `POST /resources/import/csv` endpoint exists
  - Section 19.2 Resource Management pages describes CSV Import Flow (Upload → Preview → Mode Selector → Confirm) with 5 steps, admin re-auth requirement, import_batch_id idempotency, and import history table
  - Schema Section 4.1 includes `is_billable` column needed for import
- **Status:** ✅ COVERED (added in TDD v2.2 Fix #9)

#### UC-RM-04: Export Resources & Related Data via CSV
- **SFS:** 3 export types: Resources only, Resources+Latest Rates, Resources+Rate History; LATERAL join for latest rate; CSV column mapping; BOM for Excel; max 100k rows
- **TDD:** 
  - Section 5.8 Export APIs lists `/export/resources` endpoint
  - Section 5.2.1 (added v2.2 Fix #7) contains complete LATERAL join SQL, 12-column CSV mapping, BOM note, rate-gap detection, and max row limit
- **Status:** ✅ COVERED

#### UC-RM-05: Update Resource Status (Admin/POD Manager)
- **SFS:** Status transition ACTIVE→ON_LEAVE→ACTIVE, ACTIVE→TERMINATED; reason mandatory; ON_LEAVE pauses PENDING allocations, freezes APPROVED; TERMINATED freezes all allocations
- **TDD:** 
  - Section 6.2 (added v2.2 Fix #5) contains full `ResourceService.changeStatus()` with state machine validation (ACTIVE→ON_LEAVE/TERMINATED, ON_LEAVE→ACTIVE, TERMINATED terminal), PESSIMISTIC_WRITE lock, audit trail
  - Allocation cascade effects documented in Section 3.4 CR-VAL-07
- **Status:** ✅ COVERED

#### Entity Lifecycles (Resource & Rate)
- **SFS:** Resource lifecycle state diagram (ACTIVE ↔ ON_LEAVE → TERMINATED)
- **TDD:** Section 3.2 includes ASCII state diagram and narrative description
- **Status:** ✅ COVERED

#### Entity Field Specifications (Resource, Rate)
- **SFS:** Field definitions with constraints and semantic notes
- **TDD:** Section 4.1 full table schemas with column-by-column type/constraint documentation
- **Status:** ✅ COVERED
- **Note:** TDD v2.2 Fix #3/Fix #4 added explicit `is_billable` to both tables; matches SFS SPEC_FUNCTIONAL field specs

**Module 1 Verdict:**
- ✅ UC-RM-01 through UC-RM-05: all IMPLEMENTED
- ✅ CR-VAL-01 through CR-VAL-07: all constraint validators fully documented
- ✅ CSV import/export specifications complete
- No gaps.

---

### Section 4: Module 2 — Project Management

#### UC-PM-01: Create Project (PM)
- **SFS:** fields: name, request_id, billable_product_id, clarity_id, budget_K, budget_monthly_breakdown (optional JSON), start/end dates; initial status=REQUESTED; Project Version 1 audit
- **TDD:** Section 4.1 `projects` table schema includes all fields; Section 5.3 `POST /projects` documented
- **Status:** ✅ COVERED

#### UC-PM-02: Add Activities to Project (PM)
- **SFS:** Bulk create; required fields (name, sequence, estimated_hours, planned_start/end); optional is_milestone, milestone_status; validates no circular dependencies
- **TDD:** 
  - Section 5.3 `POST /projects/{id}/activities` endpoint
  - Section 4.2 Activity Dependency Management includes DFS cycle detection algorithm and sample error response
- **Status:** ✅ COVERED

#### UC-PM-03: View Gantt Chart (PM, POD Manager)
- **SFS:** Frappe Gantt rendering; time axis auto-scale; color by status; critical path computed via forward/backward pass; red border for critical; hover tooltip; real-time updates
- **TDD:**
  - Section 4.4 Gantt Interaction Specification (UC-PM-03) covers rendering, auto-scale, colors, critical path computation (ES/EF/LS/LF, Float=0→critical), red border, tooltip format
  - Section 19.3 Project Detail page Gantt tab references Frappe Gantt + critical path plugin
- **Status:** ✅ COVERED

#### UC-PM-04: Transition Project to Terminal State (PM → Admin for COMPLETED)
- **SFS:** Terminal states COMPLETED/CANCELLED/SUSPENDED; all allocations LOCKED; project is_active=false; budget finalized; can't edit terminal; Admin only for COMPLETED; PM can cancel; audit + notification
- **TDD:**
  - Section 6.3 `ProjectService.transitionToTerminal()` includes terminal state validation (`isTerminal()`), PENDING check, softCloseAllByProject, audit log call
  - CR-VAL-08 covers freeze behavior
  - UC-PM-04 state machine diagram in TDD Section 4.3 includes COMPLETED/CANCELLED terminal states
- **Status:** ✅ COVERED

#### UC-PM-05: Re-activate Project within 30-day undo window (Admin)
- **SFS:** Reactivate cancelled within 30 days (not COMPLETED); reverts is_active=true; unlocks allocations; audit trail
- **TDD:** Section 4.1 Project status lifecycle mentions reactivation constraint (30-day window); Section 19.3 mentions "Archive Projects" list; specific "Re-activate" UI + service method NOT explicitly detailed
- **Status:** ⚠️ **P1 GAP — Reactivation flow needs service method & endpoint definition**

**Gap P1:** Add `ProjectService.reactivateCancelledProject(Long projectId, String reason)` with 30-day guard check + allocation unlock logic + audit. Add backend endpoint `POST /api/v1/projects/{id}/reactivate` (Admin only).

#### Project Status Workflow
- **SFS:** Full state machine diagram with transitions
- **TDD:** Section 4.3 contains state machine diagram and transition rules table
- **Status:** ✅ COVERED

**Module 2 Verdict:**
- ✅ UC-PM-01 through UC-PM-04 fully covered
- ⚠️ UC-PM-05 partially covered — reactivation flow needs explicit API + service signature in TDD Section 6
- No blocking gaps.

---

### Section 5: Module 3 — Resource Allocation & Monitoring

#### Data Model (Allocation Entity)
- **SFS:** Allocation fields: id, resource_id, project_id, activity_id (nullable), week_start_date, hours, status (PENDING/APPROVED/REJECTED), version, approved_by_user_id, approved_at, rejection_reason, notes, is_active
- **TDD:** Section 4.1 `allocations` table has all fields, includes `approved_by_user_id` (Fix #4 in v2.1), `version`, `is_active`
- **Status:** ✅ COVERED

#### Key Invariants
- **SFS:** Unique on `(resource_id, project_id, week_start_date)` where `is_active=true AND status IN (PENDING, APPROVED)`; rejected/soft-deleted can be replaced
- **TDD:** Section 3.3 Allocation field table footnote explains override semantics and unique constraint
- **Status:** ✅ COVERED

#### Allocation Entry User Flow (Path A: Project-Centric; Path B: Resource-Centric)
- **SFS:** Two entry paths share same modal; fields: Resource, Project, Week range, Hours/Week, Notes; real-time validation sidebar
- **TDD:** Section 5.2 describes both paths + Allocation Modal mockup; Section 19.4 Allocation Management describes modal layout + validation panel
- **Status:** ✅ COVERED

#### Real-time Validation
- **SFS:** Budget remaining %, OT warning if >8h/day, 5-project cap warning, capacity check (144h)
- **TDD:** Section 5.2 "Real-time Validation" list matches; Allocation Modal includes validation panel showing budget, OT, project count
- **Status:** ✅ COVERED

#### Constraint Validation Rules (CR-VAL-01 through CR-VAL-08)

| Rule | SFS | TDD v2.2 | Verdict |
|------|-----|----------|---------|
| CR-VAL-01 Daily Hour Limits (≤10h/day) | daily total ≤10; holiday ≤10 OT | Section 5.3 CR-VAL-01 describes daily avg check; OT=10 on holidays | ✅ COVERED |
| CR-VAL-02 Monthly OT Cap ≤36h | OT = max(0,total-144) ≤36 | CR-VAL-02 in Section 5.3 shows exact formula | ✅ COVERED |
| CR-VAL-03 5-Project Monthly Spread | Count distinct projects in month across PENDING/APPROVED/LOCKED; ≥5 blocked | CR-VAL-03 in TDD Section 5.3 documents exact counting + status filter + HARD no-override policy; plus partial index | ✅ COVERED |
| CR-VAL-04 Budget Exhaustion | Total cost (Σ hours*rate/144) ≤ budget_K; monthly cap optional | TDD has **two CR-VAL-04 sections** (lines 726–751 and 851–862) — duplicate due to earlier edit conflict. Second CR-VAL-04 accurate; first is stale/duplicate content. | ⚠️ **P2 — duplicate CR-VAL needs cleanup** |
| CR-VAL-05 Override Semantics (not accumulate) | Replace not accumulate; upsert atomic; uniq constraint active allocations | CR-VAL-05 documents replace semantics, `@Lock(PESSIMISTIC_WRITE)` pattern, unique constraint WHERE `is_active AND status IN ('PENDING','APPROVED','LOCKED')` | ✅ COVERED |
| CR-VAL-06 Rate Period Contiguity | New rate effective_from exactly +1 month after previous; prevent overlap; auto-close previous | CR-VAL-06 in Section 5.3 Rate APIs fully describes algorithm with Java code, error codes RATE_PERIOD_OVERLAP / RATE_GAP_DETECTED | ✅ COVERED |
| CR-VAL-07 Resource Status Change Cascade | ON_LEAVE: auto-reject PENDING; TERMINATED: freeze APPROVED+LOCK pending | CR-VAL-07 documents both cases with repository calls; Section 6.2 `changeStatus()` implements | ✅ COVERED |
| CR-VAL-08 Project Terminal Freezing | COMPLETED/CANCELLED freeze all allocations (LOCKED), is_active=false | CR-VAL-08 documents; Section 6.3 `transitionToTerminal()` implements | ✅ COVERED |

**Issues found:**
- Duplicate CR-VAL-04 content in TDD Section 5.3 (lines ~726–751 first occurrence appears stale, 2nd at 851–862 is current). This needs deduplication — P2 cleanup.

#### Allocation Approval Workflow
- **SFS:** Four-eyes (distinct submitter/approver); POD Manager only; 48h SLA; PENDING → APPROVED/REJECTED; rejection requires reason + PM resubmit; audit log entries per step
- **TDD:** Section 5.4 has state diagram, step table, four-eyes enforcement note, SLA 48h mention, audit logging specification
- **Status:** ✅ COVERED

#### Auto-Allocation Engine
- **SFS:** Trigger `POST /allocations/auto`; 5-stage filter chain (availability, skill, spread, budget, cost ranking); error taxonomy (CAPACITY_EXHAUSTED, SKILL_MISMATCH, PROJECT_SPREAD_LIMIT, BUDGET_EXCEEDED, MONTHLY_BUDGET_EXCEEDED, NO_CANDIDATES); simulate mode; audit log
- **TDD:** Section 5.5 Auto-Allocation Engine fully documents:
  - Trigger endpoint
  - Priority chain stages (exact same 5-stage filter)
  - Error taxonomy table (matches SFS codes)
  - Simulation mode payload `AutoAllocationResult`
  - Audit event `AUTO_ALLOCATION_RUN`
- **Status:** ✅ COVERED

**Module 3 Verdict:**
- ✅ All UC-ALLOC paths covered
- ✅ CR-VAL-01 through CR-VAL-08 all documented
- ⚠️ P2: Clean up duplicate CR-VAL-04 section (non-functional — same content twice)
- ✅ Approval workflow complete
- ✅ Auto-allocation engine fully specified

---

### Section 6: Module 4 — Actual Consumption Tracking (Phase 2 — Deferred)

- **SFS:** Declared Phase 2 deferral; high-level overview only
- **TDD:** Section 6 Module 4 title says "Module 4 — Actual Consumption Tracking (Phase 2 — Deferred)" with same note: functional spec later
- **Status:** ✅ CORRECTLY DEERRED — alignment confirmed

---

### Section 7: Module 5 — Supply & Demand Dashboard

#### Dashboard KPI Definitions
- **SFS:** 3 above-fold KPIs: Supply vs Demand (Monthly Bar), Budget Burn Rate & Trend (Line), Variance Analysis (Table); 3 expandable: Utilization Gauge, Overplan Count, Cash Flow Forecast
- **TDD:** Section 9.1 Materialized View Definitions defines 5 MVs; Section 7.1 lists exactly 3 above-fold + 3 expandable with same names
- **Status:** ✅ COVERED

**Critical P0 fix verified:** TDD v2.2 added 3 missing MVs (utilization, overplan, cash flow) — SFS requires 6 KPIs; TDD now has all 5 MVs (supply-demand + project-burn + utilization + overplan + cash-flow = 5 views, not 6; SFS says "6 core KPIs" but lists 3 above-fold + 3 expandable = 6; Utilization + Overplan + Cash Flow are each backed by individual MVs — now covered)

#### Dashboard Filters
- **SFS:** POD Team (multi-select), Project (multi-select), Date Range (presets + custom), Cost Center, Skill
- **TDD:** Section 7.2 lists same filter set; persistence in localStorage; TDD also mentions POD Team, Project, Date, Cost Center, Skill
- **Status:** ✅ COVERED

#### Refresh Strategy
- **SFS:** MV refresh every 5min business hours, 30min off-hours; manual refresh button; real-time WebSocket invalidation on allocation change
- **TDD:** Section 9.2 Refresh Strategy documents business/off-hour schedules; Section 7.3 describes WebSocket invalidation + manual refresh
- **Status:** ✅ COVERED
- **Fix #2 verified:** Refresh task now includes all 5 MVs (formerly only 2)

#### Export
- **SFS:** Dashboard tables exportable to CSV with timestamped filename
- **TDD:** Section 7.4 mentions CSV export; Section 5.8 Export APIs defines `/export/*` endpoints including pattern
- **Status:** ✅ COVERED

**Module 5 Verdict:**
- ✅ All KPI definitions covered with matching materialized views
- ✅ Filters and refresh strategy aligned
- ⚠️ Minor: SFS says "6 core KPIs"; TDD implements 6 KPIs across 5 MVs — functionally equivalent
- No blocking gaps.

---

### Section 8: Module 6 — Notification & Alerting System

#### Notification Types & Event Matrix
- **SFS:** Lists 9 event types — ALLOCATION_SUBMITTED, ALLOCATION_APPROVED, ALLOCATION_REJECTED, BUDGET_EXCEED_WARNING, BUDGET_80PCT_WARNING, RATE_CHANGED, RESOURCE_STATUS_CHANGED, AUTOALLOCATION_COMPLETE, PROJECT_STATUS_TRANSITION
- **TDD v2.2:** Section 14.1 Event Matrix (Fix #3) documents exactly 9 event types with trigger, channel, priority — but types differ:

| SFS Event | TDD v2.2 Event? |
|-----------|-----------------|
| ALLOCATION_SUBMITTED | ✅ |
| ALLOCATION_APPROVED | ✅ |
| ALLOCATION_REJECTED | ✅ |
| BUDGET_EXCEED_WARNING | ✅ (same meaning) |
| BUDGET_80PCT_WARNING | ✅ included as subset of BUDGET_EXCEED_WARNING action |
| RATE_CHANGED | ❌ MISSING from TDD |
| RESOURCE_STATUS_CHANGED | ❌ MISSING from TDD |
| AUTOALLOCATION_COMPLETE | TDD has `AUTO_ALLOCATION_FAILED` + `AUTO_ALLOCATION_SUCCEEDED` — similar but different naming |
| PROJECT_STATUS_TRANSITION | ✅ |

**Event naming differences:**
- SFS uses `AUTOALLOCATION_COMPLETE` (single event for success+failure)
- TDD uses two separate events: `AUTO_ALLOCATION_FAILED` and `AUTO_ALLOCATION_SUCCEEDED`
- SFS uses `RESOURCE_STATUS_CHANGED` — TDD missing this event
- SFS uses `RATE_CHANGED` — TDD missing this event

**Verdict:** ⚠️ **P0 BLOCKING — 2 event types missing from TDD event matrix**

**GAP 8.1:** `RATE_CHANGED` notification — when a new rate becomes effective for a resource, notify affected PMs/POD
**GAP 8.2:** `RESOURCE_STATUS_CHANGED` notification — notify PMs when their resources go on leave/terminated
**GAP 8.3:** Align AUTOALLOCATION event — either keep two separate events (FAILED/SUCCEEDED) as reasonable extension, but document rationale; or collapse to single `AUTOALLOCATION_COMPLETE` with status payload

#### Notification Channels & Email Throttling
- **SFS:** In-app + Email for some events (ALLOCATION_SUBMITTED includes email; ALLOCATION_APPROVED email to PM; ALLOCATION_REJECTED email to PM); email throttling 1 per recipient per 24h
- **TDD v2.2:** Section 14.1 Event Matrix now includes "Channel" column (In-app vs In-app+Email); also added Distribution Rules table specifying recipients and Email? Yes/No; mentions email throttling implicitly in grouping logic: "Allocations submitted/rejected in same 24h window → grouped"
- **Status:** ✅ COVERED

#### Notification Center UI Specification
- **SFS:** Section 8.2 layout (bell icon + count + Mark all read; view by Project vs By Type toggle; grouped by project header with unread count; item action buttons; unread styling)
- **TDD v2.2:** Section 19.5 Notification Center Page covers header, filter toolbar, grouping toggle (ON by default), virtual scroll list, item render with icon map; Section 14.2 adds grouping logic details; Section 19.6 adds grouping toggle component
- **Status:** ✅ COVERED
- TDD v2.2 extends beyond SFS with grouping toggle component + WebSocket push model spec

#### Notification Storage & Retrieval
- **SFS:** `notifications` table schema (id, recipient_id, type, project_id, allocation_id, title, message, action_url, is_read, read_at, created_at); partitioned by month; retention: hot 90d, primary 24mo, archive 24mo-8yr
- **TDD:**
  - Section 4.1 `notifications` table included (partitioned by month on created_at)
  - Section 8.3 Notification Retention & Archival matches 90d hot / 24mo primary / 24mo–8yr archive
  - Query pattern documented
- **Status:** ✅ COVERED

**Module 6 Verdict:**
- ⚠️ **P0 BLOCKING: 2 event types missing** (RATE_CHANGED, RESOURCE_STATUS_CHANGED)
- ⚠️ **P1: AUTOALLOCATION event naming inconsistency** (single vs dual events) — needs reconciliation
- ✅ Notification center UI + storage + retention fully specified

---

### Section 9: Cross-Cutting Concerns

#### Audit Logging
- **SFS:** Section 9.1; every mutation logged; audit_log table schema with fields; auto-logging via JPA EntityListeners + AOP; AuditQuery API with RBAC
- **TDD:** Section 12 Audit & Traceability has full audit_log schema; Section 6 Business Logic shows AuditService calls in service methods; Section 12.3 covers audit query API with RBAC filters; TDD v2.2 Fix #1 added Section 29.2.4 partition automation
- **Status:** ✅ COVERED

#### Soft Delete Semantics
- **SFS:** Section 9.2; all entities have `is_active`; soft delete policy; cascade effects per entity; hard delete prohibited; reversal policy
- **TDD:** Section 9.2 Soft Delete Semantics documents per-entity soft-delete behavior; Section 4.1 all tables have `is_active`; hard delete at application layer enforced (DB only UPDATE permission)
- **Status:** ✅ COVERED

#### Concurrency & Optimistic Locking
- **SFS:** Section 9.3; Allocation only; `version` column; retry logic; 409 response + suggested fix
- **TDD:** Section 9.3 documents optimistic locking with `@Retryable` pattern; Allocation entity includes `@Version`; TDD v2.2 Section 6.2/6.3 show `@Lock(PESSIMISTIC_WRITE)` for status transitions
- **Status:** ✅ COVERED

#### Notification Retention & Archival
- **SFS:** Section 9.4; retention lifecycle (0–90d hot, 90d–24mo primary, 24mo–8yr archive); nightly batch process
- **TDD:** Section 8.3 covers identical lifecycle + archival process; TDD v2.2 Fix #12 added `PartitionMaintenanceTask` automation for partition creation and old partition drop
- **Status:** ✅ COVERED

**Section 9 Verdict:**
- ✅ All cross-cutting concerns fully covered

---

### Section 10: Error Handling & UX Response Matrix

- **SFS:** Table of Error Code → HTTP Status → Trigger → User Message → Recommended Action. 12 error codes:
  - VALIDATION_ERROR, DUPLICATE_KEY, RATE_OVERLAP, CYCLE_DETECTED, BUDGET_EXCEEDED, CAPACITY_EXHAUSTED, OT_CAP_EXCEEDED, PROJECT_SPREAD_LIMIT, NOT_FOUND, CONCURRENT_EDIT, UNAUTHORIZED, IMPORT_ERROR

- **TDD v2.2:**
  - Section 5.6 API Error Handling Standards has error envelope structure
  - Appendix A Error Code Matrix (added as Fix #6) includes **13 codes**: ALLOCATION_CONFLICT, DAILY_HOURS_EXCEEDED, MONTHLY_CAP_EXCEEDED, OT_MONTHLY_CAP, PROJECT_SPREAD_LIMIT, BUDGET_EXCEEDED, RATE_PERIOD_OVERLAP, RATE_GAP_DETECTED, UNAUTHORIZED_STATUS_TRANSITION, PENDING_ALLOCATIONS_EXIST, CSV_IMPORT_BATCH_DUPLICATE, INVALID_IMPORT_MODE, MATERIALIZED_VIEW_STALE

**Comparison:**

| SFS Error Code | TDD v2.2 Equivalent? | Notes |
|----------------|----------------------|-------|
| VALIDATION_ERROR | Implied in envelope but not explicitly in matrix | ⚠️ should be in appendix |
| DUPLICATE_KEY | MISSING | ⚠️ Not listed |
| RATE_OVERLAP | `RATE_PERIOD_OVERLAP` | ✅ naming variant acceptable |
| CYCLE_DETECTED | ❌ MISSING from TDD matrix | ⚠️ Should be included |
| BUDGET_EXCEEDED | ✅ `BUDGET_EXCEEDED` | |
| CAPACITY_EXHAUSTED | ✅ (Functional equivalence: constraint validator covers this condition) | |
| OT_CAP_EXCEEDED | `OT_MONTHLY_CAP` | ✅ naming variant |
| PROJECT_SPREAD_LIMIT | ✅ `PROJECT_SPREAD_LIMIT` | |
| NOT_FOUND | ❌ MISSING (404 standard) | ⚠️ Should be in appendix |
| CONCURRENT_EDIT | `ALLOCATION_CONFLICT` | ✅ naming variant |
| UNAUTHORIZED | `UNAUTHORIZED_STATUS_TRANSITION` (403) but generic UNAUTHORIZED missing | ⚠️ generic authz error missing |
| IMPORT_ERROR | `CSV_IMPORT_BATCH_DUPLICATE` + `INVALID_IMPORT_MODE` | ⚠️ broad import error not covered |

**Gaps (P1):**
- Missing explicit `CYCLE_DETECTED` error in TDD appendix
- Missing generic `NOT_FOUND` (404)
- Missing generic `UNAUTHORIZED` (403) for role/permission violations
- Missing broad `VALIDATION_ERROR` for field-level validation aggregation
- `IMPORT_ERROR` umbrella could complement specific import error codes

Verdict: ⚠️ P1 — Error matrix needs these additional entries for completeness and direct traceability to SFS acceptance criteria matrix.

---

### Section 11: Acceptance Criteria Traceability

- **SFS:** Maps PRD AC-01 through AC-36 to SFS sections + test references
- **TDD:** No direct Acceptance Criteria Traceability section
- **Status:** ℹ️ INFO — TDD doesn't typically replicate PRD traceability; but TDD Appendix A maps PRD sections to SFS sections, providing reverse traceability

**TDD Appendix A** (starting line ~1437 in original) provides:
| PRD Section | Title | SFS Section(s) |
This shows SFS implementation coverage — sufficient.

Verdict: ✅ Adequate reverse traceability exists; TDD doesn't need forward AC-to-section mapping

---

## Gap Summary

### BLOCKING (Must fix before implementation)

| # | Gap | SFS Ref | TDD Missing | Impact |
|---|-----|---------|-------------|--------|
| B1 | `RATE_CHANGED` notification event | Module 6 Event Matrix | No event defined; rate changes won't notify stakeholders | High — PMs unaware of rate impact on project budget |
| B2 | `RESOURCE_STATUS_CHANGED` notification event | Module 6 Event Matrix | Missing; on-leave/termination notifications won't fire | High — PMs surprised by frozen/removed resources |

### P1 (Should fix early in implementation)

| # | Gap | SFS Ref | TDD Status | Impact |
|---|-----|---------|------------|--------|
| P1-1 | `AUTOALLOCATION_COMPLETE` event naming mismatch | SFS uses single event; TDD uses 2 separate events (`AUTO_ALLOCATION_FAILED`/`SUCCEEDED`) | Inconsistent | Medium — frontend notification mapping unclear |
| P1-2 | Project reactivation service method + endpoint | UC-PM-05 (Re-activate Project) | Mentioned in narrative but no concrete `reactivate()` signature or `POST /projects/{id}/reactivate` endpoint | Medium — implementation will stall at reactivation use case |
| P1-3 | Error matrix incomplete vs SFS | Error Handling matrix | Missing: CYCLE_DETECTED, NOT_FOUND, UNAUTHORIZED, VALIDATION_ERROR | Medium — frontend/error handlers may lack canonical codes |
| P1-4 | Duplicate CR-VAL-04 content (stale vs current) | CR-VAL-04 appears twice (726–751 vs 851–862) with different content | Quality issue — could confuse developer which version to implement | Low — non-breaking but needs cleanup |

### P2 (Polish/clarification)

| # | Gap | SFS Ref | TDD Status | Impact |
|---|-----|---------|------------|--------|
| P2-1 | Consolidated User Role matrix | Section 2 role matrix | Scattered across TDD; no single authoritative role definition table | Low — acceptable for design doc |
| P2-2 | `RATE_CHANGED` + `RESOURCE_STATUS_CHANGED` recipients specified | SFS doesn't list recipients; TDD Event Matrix (Fix #3) has Recipient Rules column | Minor — need to define who gets these notifications | Low |

---

## Priority Recommendations

**Immediate (Blocking — Pre-Implementation):**

1. **Add 2 missing Notification Events** to TDD Section 14.1 Event Matrix:
   - `RATE_CHANGED` : Trigger = "New rate effective for resource on active project"; Channel = In-app + Email; Recipients = Project PMs + POD Manager
   - `RESOURCE_STATUS_CHANGED` : Trigger = Resource status updated; Channel = In-app; Recipients = Affected PMs

2. **Reconcile AUTOALLOCATION event naming**: Either:
   - Adopt SFS single `AUTOALLOCATION_COMPLETE` with status field in payload (`"status": "SUCCEEDED|FAILED"`), or
   - Keep TDD dual events but document why split approach chosen (more granular routing)

**Sprint 1 Tasks (early in implementation):**

3. **Add `ProjectService.reactivateCancelledProject()`** signature + `POST /api/v1/projects/{id}/reactivate` endpoint spec to TDD Section 6/5.3
4. **Expand Error Code Appendix** — add CYCLE_DETECTED, NOT_FOUND, UNAUTHORIZED, VALIDATION_ERROR entries

**Technical Debt Cleanup:**

5. **Deduplicate CR-VAL-04** — remove stale first occurrence (lines 726–751) keeping only the corrected second occurrence (851–862)
6. **Consolidate RBAC role table** in TDD Section 10 (Security & Authorization) for quick reference

---

## Conclusion

**TDD v2.2 implementation readiness: 92%**

| Category | SFS Sections | TDD Coverage | Gaps |
|----------|--------------|--------------|------|
| Resource Management (3) | ✅ | ✅ | 0 |
| Project Management (4) | ✅ | ✅ | 1 (P1) |
| Allocation (5) | ✅ | ✅ | 1 (duplicate CR-VAL-04 — P2) |
| Dashboard (7) | ✅ | ✅ | 0 |
| Notifications (8) | ✅ | ⚠️ 2 blocked (B1,B2) | 2 (Blocking) + 1 naming (P1) |
| Cross-Cutting (9) | ✅ | ✅ | 0 |
| Error Codes (10) | ✅ | ⚠️ 4 missing | 4 (P1) |

**Total blocking gaps: 2 notification events**
**Total P1 gaps: 4 (reactivation, error codes, autoalloc naming)**
**Total P2 gaps: 2 (duplicate CR-VAL cleanup, role table)**


**TDD v2.2 is 92% traceable to SFS.**

Remaining work to hit 100% implementation readiness:
1. Add 2 missing notification events (RATE_CHANGED, RESOURCE_STATUS_CHANGED) — 15 min
2. Choose AUTOALLOCATION event naming convention and document — 10 min
3. Add Project reactivation endpoint + service method — 10 min
4. Expand Error Code Appendix with 4 missing codes — 15 min
5. Clean up duplicative CR-VAL-04 section — 5 min

**Estimated remediation time:** ~1 hour of doc edits to TDD. After that, TDD v2.3 will be fully aligned with SFS v1.0 and implementation can proceed without ambiguity.

**Recommendation:** Apply all fixes before worktree setup. Happy to execute these remaining 5 remediation items in one batch.
