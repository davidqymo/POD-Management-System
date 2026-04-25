# POD Team Management System — Progress Log

> **Last Updated:** 2026-04-25
> **Current Branch:** main
> **Current Phase:** Phase 2 — Implementation (ready to start)

---

## Current Status

**Phase 1 (Requirements Refinement):** ✅ **COMPLETE**
**Phase 1.5 (UX Design Deliverables):** ✅ **COMPLETE**
**Phase 2 (Implementation Planning):** ✅ **COMPLETE**
**Phase 2.5 (TDD Remediation):** ✅ **COMPLETE** — v2.1 → v2.2 critical block fixes (5 P0 + 5 P2), then v2.2 → v2.3 SFS alignment fixes (2 blocking notification events + 3 P1 service/error matrix)
**Phase 3 (Implementation Execution):** 🎯 **READY TO START** — implementation plan at `doc/TECHNICAL_IMPLEMENTATION_PLAN.MD` (approved v1.0 with QA review at `doc/TECHNICAL_IMPLEMENTATION_PLAN_QA_REVIEW.MD`)

**TDD Version History:**
| Version | Date       | Changes Summary |
| ------- | ---------- | --------------- |
| v2.0    | 2026-04-17 | Initial draft from consolidation |
| v2.1    | 2026-04-18 | TDD v2.0 validated: 15 dependency fixes (duplicate sections, FK renames, schema corrections, four-eyes removal) |
| v2.2    | 2026-04-19 | P0 critical blockers resolved: added 3 missing MVs (utilization, overplan, cash-flow), expanded notifications 4→9 events, added `is_billable` to resources/rates schema, added `ResourceService.changeStatus()` + `ProjectService.transitionToTerminal()` concrete signatures, added Resource export LATERAL join SQL, added error code appendix with 13 codes, added Notification Center UI spec (19.5–19.6), added audit partition automation task |
| v2.3    | 2026-04-19 | SFS v1.0 full alignment: added 2 blocking notification events (`RATE_CHANGED`, `RESOURCE_STATUS_CHANGED`), unified `AUTOALLOCATION_COMPLETE` event naming, added Project Reactivation service method (`reactivateCancelledProject()`) and endpoint, expanded Error Code Matrix with 4 additional codes (`CYCLE_DETECTED`, `VALIDATION_ERROR`, `DUPLICATE_KEY`, `NOT_FOUND`, `UNAUTHORIZED`), added consolidated RBAC Role Definitions table |

All major decisions documented in `doc/PRODUCT_REQUIREMENTS.md` (v1.5). PRD updated to capture UX decisions from review (Q1–Q5). Technical Design Document (`doc/TECHNICAL_DESIGN.md`) v2.3 fully aligned with System Functional Specification (`SPEC_FUNCTIONAL.md` v1.0). Design passes dependency checks and is **implementation-ready**.

---

## Completed Modules (Phase 1)

- [x] **Requirements discovery & clarification** — 27 structured questions answered across data model, process, UX, and technical dimensions
- [x] **Business Analysis gap review** — 13 gaps identified and integrated (resource lifecycle, project immutability, rejection workflow, notifications, holiday calendar, soft delete, audit viewer)
- [x] **Solution Architecture review** — 10 technical gaps resolved (concurrency, dashboard aggregation, Gantt library, timezone, audit retention, rate cache, idempotency, partition strategy)
- [x] **PRD v1.5 finalized** — 16 numbered sections + 5 appendices, 28+ acceptance criteria, all architectural decisions documented with justification
- [x] **UX Design Deliverables** — UX deliverables complete (user flows, wireframes, Gantt spec, error cheatsheet, notification layout); UX review conducted with 5 decisions captured (Q1–Q5)

## Phase 2.5 — TDD Remediation (v2.1)

**Status:** ✅ COMPLETE

**Issues Fixed (15 total):**

| # | Issue | Fix | Status |
|---|-------|-----|--------|
| 1 | resources table: erroneous UNIQUE (cost_center_id, billable_team_code) | Removed false constraint; verified only external_id is unique | ✅ |
| 2–4 | Duplicate Section 10 (Security & Authorization) | Deleted second copy at line 1490+; kept first full copy | ✅ |
| 5–7 | Duplicate Section 15 second copy | Renamed "Non-Functional Requirements" to Section 16; cascaded renumber all subsequent sections | ✅ |
| 8–10 | Duplicate Section 17 second copy (Frontend Pages) | Removed duplicate Appendix C and second Frontend Pages copy; renumbered to Section 19 with cascading renumber | ✅ |
| 11 | Section/sub-section numbering inconsistencies (26.1–26.x, 27.1–27.x) | Renumbered: Section 26 → 28 (API Rate Limiting), Section 27 → 29 (Operational Runbooks); all sub-sections updated | ✅ |
| 12 | holidays.created_by FK column naming | Renamed to `created_by_user_id` referencing `users` per Fix #4 Option A | ✅ |
| 13 | audit_log.changed_by FK column naming | Renamed to `changed_by_user_id` referencing `users` | ✅ |
| 14 | allocations.approved_by FK column naming | Renamed to `approved_by_user_id` referencing `users` | ✅ |
| 15 | allocations four-eyes CHECK constraint | Removed DB-level CHECK (deferred to service layer enforcement per Option A) | ✅ |

## Phase 2.5 — TDD Remediation (v2.1)

**Status:** ✅ COMPLETE

**Issues Fixed (15 total):**

| # | Issue | Fix | Status |
|---|-------|-----|--------|
| 1 | resources table: erroneous UNIQUE (cost_center_id, billable_team_code) | Removed false constraint; verified only external_id is unique | ✅ |
| 2–4 | Duplicate Section 10 (Security & Authorization) | Deleted second copy at line 1490+; kept first full copy | ✅ |
| 5–7 | Duplicate Section 15 second copy | Renamed "Non-Functional Requirements" to Section 16; cascaded renumber all subsequent sections | ✅ |
| 8–10 | Duplicate Section 17 second copy (Frontend Pages) | Removed duplicate Appendix C and second Frontend Pages copy; renumbered to Section 19 with cascading renumber | ✅ |
| 11 | Section/sub-section numbering inconsistencies (26.1–26.x, 27.1–27.x) | Renumbered: Section 26 → 28 (API Rate Limiting), Section 27 → 29 (Operational Runbooks); all sub-sections updated | ✅ |
| 12 | holidays.created_by FK column naming | Renamed to `created_by_user_id` referencing `users` per Fix #4 Option A | ✅ |
| 13 | audit_log.changed_by FK column naming | Renamed to `changed_by_user_id` referencing `users` | ✅ |
| 14 | allocations.approved_by FK column naming | Renamed to `approved_by_user_id` referencing `users` | ✅ |
| 15 | allocations four-eyes CHECK constraint | Removed DB-level CHECK (deferred to service layer enforcement per Option A) | ✅ |

---

## In-Progress Tasks

- [x] **Sprint 0 Implementation** — infrastructure + TDD scaffolding
  - Status: 100% (T0.1–T0.6/6 complete ✅)
  - Last updated: 2026-04-21

- [x] **Sprint 1: Task T1.1 — Entity Layer** (Resource + Rate JPA mappings)
  - Status: ✅ COMPLETE (5 entities: Resource, Rate, Project, Activity, ActivityDependency, Allocation, Holiday, AuditLog, Notification)

- [x] **Sprint 1: Task T1.2 — Flyway Migrations** (V1 + V2)
  - Status: ✅ COMPLETE (V1 schema + V2 audit triggers + V1.1-V1.4 seed data)

- [x] **Sprint 1: Task T1.3 — Repository Layer** (Spring Data JPA)
  - Status: ✅ COMPLETE (ResourceRepository, RateRepository with custom queries + pessimistic locks)

- [x] **Sprint 1: Task T1.4 — Service Layer** (ResourceService + RateService)
  - Status: ✅ COMPLETE (5 tests passing: changeStatus x2, createRate x3)
  - Implemented: ResourceService.changeStatus() with pessimistic locking + validation, RateService.createRate() with contiguous month validation + gap detection

- [ ] **Sprint 1: Task T1.5 — Controller Layer** (Resource + Rate REST APIs)
  - Status: PENDING
  - Next: ResourceController + RateController with CRUD endpoints

- [x] **Sprint 1: Task T1.6 — Frontend** (Resource List + CSV Import)
  - Status: ✅ COMPLETE (18 Vitest tests passing — ResourceList, ImportModal, DataTable)

- [x] **Integration Test Infrastructure** — Docker Compose + Spring config + SecurityConfig + E2E
  - Status: ✅ COMPLETE
  - Docker Compose: PostgreSQL 15 + Redis 7 (`infra/docker-compose.yml`)
  - Spring Boot: `application.yml` + `application-dev.yml` + `application-test.yml`
  - SecurityConfig: permissive (permit all) — real JWT auth in Sprint 5
  - ResourceController: filter params + pagination (matches frontend expectations)
  - E2E: 8 Playwright scenarios (Resource CRUD x5, Rate CRUD x3)

---

## To-Develop & To-Debug (Phase 2)

- **Backend API Layer** — FastAPI + SQLAlchemy models for all 6 core entities (Resource, Rate, CostCenter, Project, Activity, Allocation)
- **Project Schedule Engine** — M:N dependency graph, cycle detection, critical path calculation, activity template management
- **Resource Allocation Engine** — availability-based assignment, constraint validation (144h/month, 36h OT, 5-project cap), approval workflow
- **Auto-Allocation Service** — priority-based automated assignment, conflict resolution, exception reporting
- **Dashboard Materialized Views** — 5-minute refresh pipeline, supply/demand aggregation, burn rate + variance metrics
- **CSV Import/Export** — Resource import, Allocation export, Actual Consumption import (Phase 2)
- **Gantt Visualization** — Frappe Gantt integration, drag-drop with constraint validation, critical path overlay
- **Audit & Notification** — partitioned audit log, event matrix (9 types), in-app + email for critical events
- **Admin Console** — holiday calendar management, rate maintenance, resource soft-delete, audit viewer

---

## Key Architectural Decisions

1. **Concurrency:** Optimistic locking (version column + auto-retry) on allocation updates
2. **Dashboard Performance:** Materialized views refreshed every 5 minutes (no real-time requirement)
3. **Gantt Library:** Frappe Gantt (MIT) + custom critical path plugin; FS-only dependencies for Phase 1
4. **Timezone:** Single-region configurable (default Asia/Shanghai); no distributed TZ complexity
5. **Audit Retention:** Monthly partitions; primary 24mo retention + archive to cold storage; indefinite retention possible
6. **Rate Cache:** Redis shared cache with key pattern `rate:{CC}:{BTC}:{YYYYMM}`, TTL 1 month

---

## Known Constraints & Invariants

- **HCM conversion:** 1 HCM = 144 hours (fixed, not configurable)
- **Budget unit:** K USD with 2 decimal places (e.g., `4.95` = $4,950)
- **Rate periods:** `effective_from` = YYYYMM string; `effective_to` = system auto-calculated (next rate's effective_from minus 1 month)
- **Project cap:** Resource cannot be allocated to >5 distinct projects in any calendar month (HARD, no override)
- **Allocation semantics:** Override (replace) not accumulate — new allocation for (resource, project, week) replaces any existing
- **Soft delete:** `is_active` flag everywhere; hard delete forbidden
- **Approval gate:** All allocations require POD Manager approval before becoming effective
- **Capacity validation:** Daily 8+2 regular OT, holiday 10h OT max, monthly 36h OT cap
- **Import idempotency:** CSV imports tracked by `import_batch_id` to prevent duplicates

---

## Next Steps (Post-Planning)

_Once implementation plan is created:_

1. **Set up worktree** — `EnterWorktree` for isolated implementation branch
2. **Backend Phase 1** — database schema (Alembic migrations), core CRUD APIs, validation layer
3. **Backend Phase 2** — allocation engine, auto-allocation service, dependency/critical path algorithms
4. **Frontend Phase 1** — project/resource list/detail pages, allocation grid (weekly calendar view)
5. **Frontend Phase 2** — Gantt chart with drag-drop, dashboard charts, import/export UIs
6. **Integration** — end-to-end testing, approval workflow, notification flows
7. **DevOps** — Docker compose (PostgreSQL + Redis), CI/CD pipeline, migration scripts

---

## PRD Reference

- **Path:** `doc/PRODUCT_REQUIREMENTS.md`
- **Version:** 1.5 (final)
- **Sections:** 1–18 + Appendices A–E
- **Acceptance Criteria:** 28+ checkboxes (Section 11)
- **Total Decisions:** 27 requirement clarifications + 6 architecture choices + 13 BA gaps + 10 technical gaps = **56 documented decisions**

---

## Stakeholder Scope

| Role | Access | Primary Concerns |
|------|--------|-----------------|
| **POD Manager** | Full CRUD + Dashboard | Supply/demand, resource assignment, budget oversight |
| **Project Manager** | Project CRUD + Allocation requests | Activity planning, resource booking, schedule tracking |
| **Admin** | All entity management + Audit | Rate maintenance, holiday calendar, audit log viewer, soft delete |

External stakeholder views deferred to future phase.

---

## Progress Metrics

| Metric | Value |
|--------|-------|
| Clarification questions asked | 27 |
| BA gaps identified | 13 |
| Architecture decisions | 6 |
| PRD version | 1.5 (UX decisions integrated) |
| PRD sections | 18 + 5 appendices |
| Acceptance criteria | 28+ |
| Scope changes after validation | 0 (requirements stable) |
| Time to consensus | ~2 hours of structured dialogue |
| UX deliverables produced | 5 (flows, wireframes, Gantt spec, error cheatsheet, notification layout) |
| UX decisions confirmed | 5 (Q1–Q5) |
| TDD issues identified & remediated | 15 (3 critical blocks, 6 architecture fixes, 6 polish) |
| Artifact dependency checks | 3 scripts + 1 manifest + hooks integration |

---

## Artifact Dependency Synchronization

**Dependency Manifest:** `doc/DEPENDENCIES.yaml`
**Check Scripts:**
- `scripts/check_prd_deps.py` — validates PRD → UX sync
- `scripts/check_ux_deps.py` — validates UX → Design sync
- `scripts/check_design_deps.py` — validates Design → code/test sync

**Git Hooks:** Integrated into `.claude-hooks.yaml`
- Pre-commit: warns if doc changes have stale downstream dependencies
- Post-commit: prints full dependency report
- CI strict check: fails on PRD changes if downstream not reviewed

**Rationale:** Prevent drift between artifacts. PRD is single source of truth; all downstream docs/code must stay aligned.

---

**Last Updated:** 2026-04-19
**Updated By:** Claude (UX Deliverables Complete + Artifact Sync System Added)
