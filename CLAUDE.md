```markdown
# Claude Code Project Context & Guidelines
## Project Overview
- **Project Name:** POD Team Management System
- **Project Purpose:** Develop an internal resource and project management system for POD teams to manage resource capacity, project planning, allocation, and budget burn tracking
- **Technical Stack:** Java 17 + Spring Boot 3.2 + JPA/Hibernate + PostgreSQL (backend), React 18 + TypeScript + Vite (frontend), Redis (caching)
- **Project Scope:**
  1. Resource Management — staff records, skill/level taxonomy, rate management with effective dates, CSV import
  2. Project Management — multi-stage activities with M:N dependencies, customizable templates, Gantt with critical path
  3. Resource Allocation & Monitoring — weekly assignments, budget validation, auto-allocation engine, approval workflow
  4. Supply & Demand Dashboard — materialized view aggregation, burn rate, variance (plan vs actual)
  5. Actual Consumption Tracking (Phase 2) — CSV import from timekeeping systems, import-with-preview, 24-48hr edit window
- **Deadline:** TBD (not yet defined)

## Core Guidelines for Claude Code
### 1. Conversation Context Rules
- Focus on technical development tasks (coding, debugging, architecture design, etc.).
- Avoid irrelevant chats (e.g., non-technical topics, personal matters) to prevent context bloat.
- When asking for help, provide clear information: current task, error message, code snippet, and expected result.
- After resolving a problem, summarize the solution briefly for future reference.

### 2. Coding Standards
- **Naming Convention:** camelCase for Java variables/methods, PascalCase for classes/interfaces, SCREAMING_SNAKE_CASE for constants. Database tables: snake_case plural (e.g., `resource_allocations`). Package: `com.pod.*` (lowercase).
- **Code Style:** Follow Google Java Style Guide (4-space indent, braces on same line). Use Checkstyle + Spotless for formatting. ESLint + Prettier for TypeScript/React frontend.
- **Comment Requirements:** Add JavaDoc for all public classes/methods; inline comments for complex business logic, algorithm steps, and non-obvious decisions. Avoid redundant "what is obvious" comments.
- **Test Requirements:** Write unit tests for all core business logic (allocation engine, dependency graph, critical path); integration tests for API endpoints (TestRestTemplate/Testcontainers); target coverage 80%+.

### 3. Project Architecture (Key Context)
- **Overall Architecture:** Three-tier: API Layer (Spring MVC controllers) → Service Layer (business logic) → Data Access Layer (JPA repositories + entities). Frontend: component-driven (React + TypeScript).
- **Core Modules:**
  1. Resource Module — CRUD for resources, rates (with effective date ranges), skill/level lookups, CSV import
  2. Project Module — CRUD for projects, activity templates (M:N dependencies, cycle detection), project status lifecycle, Gantt visualization
  3. Allocation Module — weekly resource assignment, approval workflow (POD Manager), constraint validation (144h/month, 36h OT, 5-project cap), manual + auto-allocation engines
  4. Dashboard Module — materialized view aggregations, supply/demand heatmaps, burn rate & variance charts
  5. Consumption Module (Phase 2) — actual spend import, variance reporting, edit-within-window + reversal pattern
- **Key Interfaces:**
  - `GET /api/v1/resources` — list with filter (skill, level, cost_center)
  - `POST /api/v1/allocations` — create allocation (requires approval)
  - `POST /api/v1/allocations/auto` — trigger auto-allocation engine
  - `GET /api/v1/projects/{id}/gantt` — activity schedule with critical path
  - `GET /api/v1/dashboard/supply-demand` — monthly breakdown
  - `POST /api/v1/consumption/import` — CSV upload with preview (Phase 2)
  - `GET /api/v1/auth/me` — current user profile (JWT-based)
- **Database Design (core tables):**
  - `resources` (id, external_id, name, cost_center_id, billable_team_code, category, skill, level, status, is_active)
  - `rates` (id, cost_center_id, billable_team_code, monthly_rate_K, effective_from [YYYYMM], effective_to [YYYYMM], is_active)
  - `projects` (id, request_id, billable_product_id, clarity_id, name, budget_K, status, start_date, end_date, created_by, owner_id, is_active)
  - `activities` (id, project_id, name, planned_start_date, planned_end_date, estimated_hours, is_milestone, milestone_status, sequence, is_active)
  - `activity_dependencies` (id, predecessor_id, successor_id, dependency_type)
  - `allocations` (id, resource_id, project_id, activity_id, week_start_date, hours, status, version, approved_by_user_id, approved_at, rejection_reason, notes, is_active)
  - `actual_consumption` (id, project_id, resource_id, clarity_id, charge_date, hours, cost_K, source, import_batch_id, locked_at)
  - `holidays` (id, name, cost_center_filter, holiday_date, description, created_by_user_id, is_active)
  - `users` (id, email, display_name, roles [JSONB], resource_id, is_active)
  - `audit_log` (id, entity_type, entity_id, field_name, old_value, new_value, changed_by_user_id, changed_at, change_reason, revision_type)
- **Soft delete policy:** `is_active` flag on all tables; no hard deletes. Reversal pattern for corrections.

### 4. Claude Memory Binding
- This file is automatically bound to Claude Code's long-term memory (`/memory`).
- Update this file when architecture, guidelines, or scope changes occur.
- Key reference files: `PRODUCT_REQUIREMENTS.md` (single source of truth), `PROGRESS.md` (current status), `docs/superpowers/specs/` (design docs), `docs/superpowers/plans/` (implementation plans).

### 5. Troubleshooting & Common Issues
- **Common Error 1: Rate period overlap conflict** — When inserting/updating a rate, overlapping YYYYMM periods are rejected. Fix: ensure `effective_from` is first of month, system auto-calculates `effective_to` as next rate's `effective_from` minus 1 month.
- **Common Error 2: Allocation exceeds 5-project monthly cap** — Auto-allocation rejects resources already assigned to 5+ distinct projects in target month. Fix: reduce project count or adjust allocation dates.
- **Common Error 3: Optimistic lock version mismatch** — Concurrent allocation edits collide; last writer wins with conflict error. Fix: retry with latest version (client-side) or reconcile manually.
- **Common Error 4: Import batch duplicate** — CSV import with same `import_batch_id` idempotently skipped. Fix: generate new batch ID for each distinct import attempt.

### 6. Team Collaboration Rules
- **Branch Management:** `main` (production), `develop` (integration), `feature/*` (feature branches), `hotfix/*` (emergency fixes). Merge via PR to `develop`.
- **Commit Rules:** Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`. Example: `feat: add rate effective date constraint validation`.
- **Code Review:** All PRs require at least 1 reviewer approval before merge to `develop`. CI must pass (tests + lint).
- **Deployment:** Docker Compose (PostgreSQL + Redis) for dev; Kubernetes Helm charts for staging/prod.

## Additional Notes
- Do NOT expose database credentials, JWT secrets, or third-party API keys in conversation or logs.
- Reference `doc/PRODUCT_REQUIREMENTS.md` first when technical disputes arise; treat it as the source of truth.
- Update `PROGRESS.md` after each major milestone (requirements lock, design complete, implementation phase transitions).
- **Superpowers Workflow:** Always invoke `superpowers:brainstorming` before starting design work; `superpowers:writing-plans` before implementation; follow TDD discipline (test → minimal code → refactor).
- **Design Principle:** YAGNI ruthlessly — defer Phase 2 features (Actual Consumption UI, What-if Gantt, Skill-matching) until MVP validated.
```
