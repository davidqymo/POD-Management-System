# POD Team Management System — Product Requirements Document
**Version**: 1.5
**Date**: 2026-04-19
**Status**: Approved for Implementation

---

## Change Log
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-18 | Initial | Initial PRD based on requirement review |
| 1.1 | 2026-04-18 | Eng Refine | Rate structure (monthly contiguous), leave capacity impact, allocation override, daily OT validation, approval scope, rate overlap constraint |
| 1.2 | 2026-04-18 | BA Review | Resource lifecycle, project immutability, rejection workflow, notifications, holiday calendar entity, CSV error reporting, simulation mode, soft delete, audit log UI, bulk ops backlog |
| 1.3 | 2026-04-18 | Architecture Review | Fixed section numbering cascade, added structured auto-allocation error taxonomy, added API surface section, clarified notification retention (24mo+archive), clarified CSV import two-mode strategy, restructured section order (API→Architecture→Data Model→Business Logic), removed duplicates, corrected subsection numbering throughout PRD |
| 1.4 | 2026-04-18 | Engineering Review | Architecture decisions documented; concurrency, dashboard aggregation, Gantt library, timezone, audit retention, rate cache, idempotency, partition strategy finalized |
| 1.5 | 2026-04-19 | UX Review Integration | Captured UX review outcomes: Gantt drag cascade behavior (Q2 — conservative warning); allocation entry supports both project-centric and resource-centric views (Q1); dashboard above-the-fold KPIs defined (Q3 — Supply/Demand, Burn Rate, Variance); notification center grouping supports both by-project (default) and by-type toggle (Q4); CSV Import Phase 1 scope limited to Batch Create mode with Upsert deferred to Phase 2 (Q5); added UX Deliverables document reference and artifact dependency system |
---
## Executive Summary
A full-stack management system to plan, allocate, and monitor POD team resources across multiple projects. The system enables resource capacity planning, budget-conscious resource assignment, and real-time visibility into supply vs demand.
**Four Core Modules**:
1. Resource Management — Staff records, rates, CSV import/export
2. Project Management — Multi-stage projects with milestone activities
3. Resource Allocation & Monitoring — Weekly assignments, budget validation, auto-allocation
4. Supply & Demand Dashboard — Visual KPI reporting for PMs and POD managers
---
## 1. Glossary & Key Definitions
| Term | Definition |
|------|-----------|
| **HCM** | Headcount Month — standard capacity unit of 144 hours/month |
| **Rate** | Cost per HCM, stored as monthly rate; hourly rate derived by ÷ 144 |
| **Billable Team Code** | Client-facing billing code paired with Cost Center |
| **Activity** | A project phase/task with planned start/end dates and assigned resources |
| **Milestone** | A checkpoint activity (e.g., "SIT Signoff") that may have dependency rules |
| **Auto-allocation** | System-driven resource assignment respecting availability/skill/budget constraints |
| **Supply** | Total available resource capacity (hours) across the POD team |
| **Demand** | Total allocated/planned resource consumption (hours) across all projects |
| **POD Manager** | Resource/Allocation approver (also called Resource Manager) |
| **Budget Unit** | All monetary values (budget, rate, cost) stored/entered as **K USD** (thousands) with 2 decimal places (e.g., `4.95` = $4,950 USD) |
---
## 2. Module Specifications
### Module 1 — Resource Management
#### 2.1 Resource (Staff) Entity
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | Auto-increment integer | Yes | Internal DB primary key |
| `external_id` | String | Yes | **Immutable** ID from HR system (e.g., EMP-001) |
| `name` | String | Yes | Full name |
| `cost_center` | String (FK) | Yes | Reference to Cost Center table |
| `billable_team_code` | String | Yes | Billing team/client code |
| `category` | Enum | Yes | `contractor` or `permanent` (fixed list) |
| `skill` | String (FK) | Optional | Reference to Skill table (user-defined) |
| `level` | String (FK) | Optional | Reference to Level table (user-defined) |
| `hire_date` | Date | No | |
| `end_date` | Date | No | For contractors |
| `status` | Enum | Yes | `active`, `on_leave`, `terminated` |
**Resource Status Lifecycle**:
- `active`: Can be allocated; normal operations
- `on_leave`: **Cannot be allocated**; existing allocations are **paused** (hours not counted against capacity); status change by **Admin only** (audit logged); PMs can view but not edit
- `terminated`: **Cannot be allocated**; existing allocations are **automatically released** (deleted from pending queue but retained in history for audit); status change by **Admin only** (audit logged)
**Status Change Permissions**: Only **Admin** role can change resource status. All status changes are logged in audit trail with reason.
**Uniqueness**: `(cost_center, billable_team_code)` must be unique per resource.
---
#### 2.X Holiday Calendar Entity (Supporting Entity)
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | Auto-increment | Yes | |
| `name` | String | Yes | e.g., "Global Corporate Holidays 2026" |
| `cost_center_filter` | String | No | Nullable — if set, applies only to that Cost Center; if null, applies globally |
| `holiday_date` | Date | Yes | Calendar date of the holiday |
| `description` | String | No | e.g., "New Year's Day", "Christmas" |
| `created_by` | FK | Yes | Admin who created |
| `created_at` | Timestamp | Yes | |
**Holiday Resolution**: When calculating resource capacity for a week, system checks:
1. Resource's Cost Center-specific holidays (if any)
2. Global holidays (cost_center_filter = null)
3. Union of both calendars applies
**Management**: Admin-only CRUD. CSV import supported for bulk holiday entry.
---
#### 2.2 Rate Schema
| Field | Type | Notes |
|-------|------|-------|
| `id` | Auto-increment | |
| `cost_center` | String | Composite key part 1 |
| `billable_team_code` | String | Composite key part 2 |
| `monthly_rate_usd` | Decimal | Monthly rate in **K USD**. E.g., `14.4` = $14,400/month |
| `effective_from` | String (YYYYMM) | Month this rate applies, e.g., `"202604"` for April 2026 |
| `effective_to` | String (YYYYMM) | **System-calculated** when next rate is added: `next_rate.effective_from` minus 1 month (e.g., if next is `"202605"`, then this is `"202604"`) |
| `is_active` | Boolean | Derived: `effective_from ≤ current_YYYYMM < effective_to` |
| `created_at` | Timestamp | |
**Rate Record Structure**:
- Each rate covers **exactly one calendar month**
- New rate `effective_from` must be **exactly one month after** the previous rate's `effective_from` (contiguous sequence enforced)
- `effective_to` is **auto-populated by system** on insertion: `effective_to = next_rate.effective_from` (same month meaning previous month's last day)
- System enforces **no overlaps** and **no gaps** — each (CostCenter, BillableTeamCode) must have rate records for all months from hire to present (or future-committed rates)
**Rate Lookup Logic**: Given a `(Cost Center, Billable Team Code, YYYYMM string)`, return the rate where `effective_from ≤ YYYYMM < effective_to`.
**Retention Policy**: Old rates are marked `is_active = false` when superseded but **never deleted** (required for historical cost calculations).
#### 2.3 CSV Import
**Supported Entities in Phase 1**: Resource (staff records), Rate records.

**Format**: UTF-8, flexible column mapping (headers must match predefined field names or template aliases). System provides default templates; users can customize column selection via UI mapping grid.

**Validation**: Required fields checked, duplicate `external_id` rejected, data type enforcement with clear error messages.

**Import Mode Selection** (user chooses one per import):
- **(A) Batch Create** — All-or-nothing bulk load; **all rows must pass validation**. If any row fails, **zero rows are committed** and full error report downloaded. **Phase 1 only supports Batch Create mode**. Best for: first-time employee roster import, bulk rate updates.
- **(B) Upsert** — Row-level incremental updates; valid rows commit individually while invalid rows are reported and skipped. **Deferred to Phase 2** (required for Actual Consumption module's edit-within-window workflow).

**Phase 1 Scope Decision (UX Q5)**: Phase 1 implements **Batch Create only**. Upsert mode (row-level partial success) is deferred to Phase 2 to keep transaction model simple and avoid partial-commit complexity during MVP validation.

**Error Report CSV Format** (downloadable on any import completion):
| Column | Description |
|--------|-------------|
| `row_number` | 1-based row index in original file |
| `column_name` | Column header that failed validation |
| `error_type` | `required_missing`, `invalid_format`, `duplicate_key`, `type_mismatch`, `unknown_value` |
| `severity` | `error` (row blocked) or `warning` (row commits with caution) |
| `error_message` | Human-readable description |
| `suggested_fix` | Recommended correction (e.g., "Use one of: contractor, permanent") |
| `original_value` | The value that was provided |

**CSV Export**: Resource list with latest active rate; Allocation export (read-only); Rate history export.
#### 2.4 CSV Export
- Full resource list with all fields + latest active rate
- Exported in user-selected date range

#### 2.X Allocation Entry Views (UX Q1 Decision)
Manual allocation entry is supported in **both** contexts depending on user role and workflow:

**Project-Centric View** (Project Manager workflow):
- Within **Project Detail page** → "Assignments" tab
- Resource grid filterable by skill/level/cost center
- "Assign Resource" button opens allocation modal
- Budget burn indicator shows remaining project budget in real-time

**Resource-Centric View** (Resource Manager / POD Manager workflow):
- Within **Resource Detail page** → "Assignments" tab
- Project grid filterable by status/date range
- "Assign to Project" button opens allocation modal
- Shows resource's available capacity and monthly utilization

Both views share identical allocation modal:
- Resource / Project pickers
- Week range selection (single or multi-week)
- Hours per day input (default 8)
- Real-time validation warnings (OT, 5-project cap, budget)
- Save creates `PENDING` allocation requiring POD Manager approval

Rationale: PMs plan from project perspective; POD Managers balance from resource perspective. Supporting both eliminates unnecessary navigation and supports matrix organization workflows.

#### 2.X Allocation Entry Views (UX Q1 Decision)
Manual allocation entry is supported in **both** contexts depending on user role and workflow:

**Project-Centric View** (Project Manager workflow):
- Within **Project Detail page** → "Assignments" tab
- Resource grid filterable by skill/level/cost center
- "Assign Resource" button opens allocation modal
- Budget burn indicator shows remaining project budget in real-time

**Resource-Centric View** (Resource Manager / POD Manager workflow):
- Within **Resource Detail page** → "Assignments" tab
- Project grid filterable by status/date range
- "Assign to Project" button opens allocation modal
- Shows resource's available capacity and monthly utilization

Both views share identical allocation modal:
- Resource / Project pickers
- Week range selection (single or multi-week)
- Hours per day input (default 8)
- Real-time validation warnings (OT, 5-project cap, budget)
- Save creates `PENDING` allocation requiring POD Manager approval

Rationale: PMs plan from project perspective; POD Managers balance from resource perspective. Supporting both eliminates unnecessary navigation and supports matrix organization workflows.
---
### Module 2 — Project Management
#### 2.5 Project Entity
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | Auto-increment integer | Yes | Internal primary key (always present) |
| `request_id` | String | No | Early-phase reference; optional |
| `billable_product_id` | String | No | Budget confirmation reference; optional |
| `clarity_id` | String | No | Actual charging reference; optional |
| `name` | String | Yes | Project name |
| `description` | Text | No | |
| `budget_total_usd` | Decimal | Yes | Total project budget ceiling in **K USD** (thousands). E.g., `4.95` = $4,950 |
| `budget_monthly_breakdown` | JSON | No | Optional: `{ "202604": 4.5, "202605": 7.5 }` in **K USD** per month |
| `planned_start_date` | Date | Yes | |
| `planned_end_date` | Date | Yes | |
| `actual_start_date` | Date | No | |
| `actual_end_date` | Date | No | |
| `status` | Enum | Yes | See status workflow below |
**Business ID Lifecycle**:
- **Intake**: Only `request_id` set
- **Approved**: `billable_product_id` set; `request_id` retained
- **Executing**: `clarity_id` set; all three may coexist
#### 2.6 Project Status Workflow
```
┌─────────┐
│  Intake │ ← Start
└────┬────┘
     │ allocate budget?
     ▼
┌─────────────────┐
│ Budget Estimating│
└────┬────────────┘
     │ approved?
     ▼
┌─────────────────┐
│ Budget Approved │
└────┬────────────┘
     │ execution start
     ▼
┌─────────┐
│Executing│
└────┬────┘
     │ needs pause?
     ▼
┌─────────┐     │ resume    ┌─────────┐
│ On Hold │◄────┤            │Executing│
└────┬────┘     │            └─────────┘
     │ cancel?  │ complete?
     ▼     │    │
┌─────────┐   │    ▼
│Cancelled│   │ ┌─────────┐
└─────────┘   │ │Completed│
               │ └─────────┘
               └─────────────┘ Terminal states
```
**State Transition Rules Table**:
| From | To | Allowed? | Notes |
|------|----|----------|-------|
| Intake | Budget Estimating | ✅ | PM moves forward |
| Budget Estimating | Budget Approved | ✅ | After approval |
| Budget Estimating | Cancelled | ✅ | Terminal |
| Budget Approved | Executing | ✅ | Project kickoff |
| Budget Approved | Cancelled | ✅ | Terminal |
| Executing | On Hold | ✅ | Pause execution |
| Executing | Completed | ✅ | Terminal; finalize budget |
| Executing | Cancelled | ✅ | Terminal |
| On Hold | Executing | ✅ | Resume |
| On Hold | Cancelled | ✅ | Terminal |
| **Any** | **Cancelled** | ✅ | Terminal; allocations frozen |
| **Cancelled** | **Any** | ❌ | Immutable — cannot re-open |
| **Completed** | **Any** | ❌ | Immutable — final state |
| Intake/Budget Estimating/Budget Approved | Completed | ❌ | Must be in Executing first |
**Budget on Completion**: At `Completed` status, any unspent budget is **returned to organizational capacity pool** (not retained per project). Budget variance is calculated and stored for reporting.
**Allocation Behavior on Terminal States**:
- `Cancelled`: All allocations for the project are **frozen** (no further edits allowed)
- `Completed`: Allocations are **frozen** for audit; final actuals recorded
**State Change Permissions**: Only **Project Manager** can change project status (within allowed transitions). Admin can override if needed.
#### 2.7 Activity Entity
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | Auto-increment | Yes | |
| `project_id` | FK | Yes | References Project |
| `name` | String | Yes | e.g., "SIT Execution" |
| `description` | Text | No | |
| `planned_start_date` | Date | Yes | |
| `planned_end_date` | Date | Yes | |
| `actual_start_date` | Date | No | |
| `actual_end_date` | Date | No | |
| `is_milestone` | Boolean | No | Signoff/checkpoint activity |
| `milestone_status` | Enum | Conditional | `pending`, `in_progress`, `signed_off` (only if `is_milestone = true`) |
| `estimated_hours` | Decimal | No | Initial estimate |
| `depends_on` | JSON | No | Array of `activity_id` that must complete before this starts |
**Activity Dependencies**:
- M:N self-referential (an activity depends on multiple predecessors)
- **Cycle detection**: System validates no circular dependencies on save
- **Soft constraint**: System warns if dependency unmet but allows override
**Activity Templates**:
- Admin defines standard template (e.g., "Waterfall Template")
- PMs can clone template and customize per project
- Future: Link to JIRA items (manual mapping)
**Activity Assignment**:
- One activity ←→ multiple resources (many-to-many through ActivityAssignment table)
- Future: Skill matching logic (e.g., Business Analysis activity requires BA skill)
#### 2.8 Project Schedule Visualization (Gantt + Critical Path)
**Gantt Chart View**:
- Horizontal timeline displayed within **Project Detail page** (new "Schedule" tab)
- Each activity rendered as a horizontal bar spanning `planned_start_date` to `planned_end_date`
- Milestone activities shown as diamond symbols (■) on the timeline
- Color coding by status: Gray (Not started) → Blue (In progress) → Green (Completed) → Orange (On hold)
- Drag-and-drop resizing allowed, with **conservative cascade warning behavior** (see interaction spec below)
**Dependency Visualization**:
- Arrows drawn from predecessor → successor activities
- Arrow style indicates dependency type (Phase 1: all FS — solid line; Phase 2: SS/FF/SF with different patterns)
- Hover tooltip shows: "Activity B depends on Activity A (FS: Finish-to-Start)"
- Cycle conflicts highlighted in red with error message
**Critical Path Calculation & Highlighting**:
- System computes **critical path** using forward/backward pass algorithm on the activity network
- Activities on critical path highlighted in **red** (border or fill)
- Non-critical activities shown in **blue/gray**
- Tooltip displays each activity's **Total Float** (slack days): "0 days (critical)" or "5 days float"
- Project **duration** and **critical path length** displayed in header
**Gantt Drag Interaction (Phase 1 Behavior — UX Q2 Decision)**:
When a user drags an activity to a new start date:
1. System detects which successor activities would have their dates impacted by the shift
2. If any successors would be delayed (start date pushed forward), system shows **conservative warning modal**:
   > "Shifting '[Activity Name]' by +N days will affect M successor activities:
   >  • Successor A (delayed to new date)
   >  • Successor B (delayed to new date)
   >  Continue with cascade shift?"
3. User can **Cancel** (no change) or **Continue** (cascade shift applied to all affected successors, preserving original durations and lags)
4. No auto-cascade — user must explicitly confirm each cascade
5. Undo available via 30-second toast with "Undo cascade" button (reverts entire chain)
**What-If Scenario Mode** (Phase 2):
- PM can drag activity bars to new dates in simulation mode
- System recalculates critical path in real-time without persisting
- "Impact analysis" panel shows: "Moving Design 3 days later delays UAT by 3 days, pushes project end by 2 days"
**Export & Sharing**:
- Export Gantt as PNG image or PDF (for stakeholder presentations)
- Print-friendly layout option
---
### Module 3 — Resource Allocation & Monitoring
#### 3.1 Allocation Entity
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | Auto-increment | Yes | |
| `resource_id` | FK | Yes | Resource being allocated |
| `project_id` | FK | Yes | |
| `activity_id` | FK | No | Nullable if allocation is "unassigned" |
| `week_start_date` | Date | Yes | Monday date of the allocation week |
| `hours` | Decimal | Yes | Minimum unit: 0.1 HCM = 14.4 hours |
| `approved` | Boolean | Yes | Default `false` (pending manager approval) |
| `approved_by` | FK | No | Manager ID who approved |
| `approved_at` | Timestamp | No | |
| `notes` | Text | No | |
**HCM Conversion**: `hours / 144 = HCM units` (e.g., 72 hours = 0.5 HCM)
**Allocation Update Semantics**: New allocation for the same `(resource_id, project_id, week_start_date)` **replaces** (overrides) any existing allocation — does **not accumulate**. Last write wins.
**Daily/Hourly Validation Rules** (enforced at allocation time):
- **Regular workday**: Maximum 8 normal hours + 2 OT hours = 10 total hours per day
- **Holiday**: Maximum 10 OT hours (no regular hours counted on holidays)
- **Monthly OT cap**: Total OT hours per resource per month ≤ 36 hours
- **Monthly total cap**: Normal + OT hours ≤ 144 hours equivalent per month (1 HCM = 144 hrs)
**Approval Scope**: Only the **POD Manager** (or designated delegates within the POD team) can approve or reject allocations. Project Managers cannot self-approve.
#### 3.2 Auto-Allocation Engine
**Input**: Project with required skills, hours per activity/week; available resources with skills, rates, availability
**Algorithm Priority** (`Availability → Skill Match → Cost`):
1. Filter resources with matching skills at minimum qualifying level
2. Among those, prioritize resources with enough remaining capacity (≤ 144 hrs/month)
3. Among those, check **project count constraint**: resource must be assigned to ≤ 5 distinct projects in the target month (counting all allocations — pending, approved, or rejected — across all statuses)
4. Among those, select lowest hourly rate (cheapest) to minimize project cost
5. If no single resource can cover all hours, split across multiple resources (respecting all constraints per split)
**Structured Error Taxonomy** (returned to UI when auto-allocation fails):
| Error Code | Trigger Condition | PM Remediation Path |
|------------|-------------------|---------------------|
| `BUDGET_EXCEEDED` | Would exceed project total or monthly budget | 1) Reduce allocated hours 2) Select cheaper-rate resource 3) Request budget increase (audit-logged) |
| `CAPACITY_EXHAUSTED` | Resource has 0 remaining capacity this month | 1) Choose different resource 2) Reschedule to different month 3) Reduce hours |
| `OT_CAP_EXCEEDED` | Allocation would push resource past 36h OT/month | 1) Reallocate OT hours to non-OT resource 2) Split across more resources |
| `PROJECT_SPREAD_LIMIT` | Resource already assigned to ≥5 distinct projects in target month | 1) Choose different resource 2) Request spread-limit exception (requires POD Manager + Admin approval, audit-logged) |
| `SKILL_MISMATCH` | No resource with required skill/level available | 1) Broaden skill requirement 2) Manual allocate with approval exception 3) Delay activity |
**UI Display Format**: `❌ [ERROR_CODE] — human readable description` followed by "Try this:" bullet list (remediation path above). Error code enables analytics and future auto-retry features.
**Rejection is final** for auto-allocation; PM must manually adjust parameters and retry.
**Manual Allocation**: PM can directly enter allocations; these require **manager approval** before becoming active.
**Simulation Mode** (What-If): PM can run auto-allocation in **simulate** mode which:
- Shows projected allocations **without persisting** to database
- Displays cost, utilization, and constraint satisfaction metrics
- PM can then **Accept** (persist as pending allocations) or **Adjust manually**
- Supports comparing multiple scenarios (cost-first vs skill-first priority) side-by-side
**Notifications on Simulation**: PM receives in-app notification when auto-allocation completes with results summary.
**Allocation Approval Workflow**:
1. PM submits allocation → status: `pending` (not counted against resource capacity yet)
2. POD Manager receives notification (in-app + email if critical)
3. POD Manager **approves** → status: `approved` (allocations count against capacity and budget)
   - OR **rejects** → status: `rejected` (with required rejection reason note)
4. If `rejected`: PM can **revise and resubmit** (new pending record replaces rejected one)
**Approval History**: Every approval action logged with approver ID, timestamp, and notes.
**Approval SLA**: Approvals should be processed within **48 business hours**; escalations auto-notify if pending >72 hrs.
**Approval Scope**: Only the **POD Manager** (or designated delegates within the POD team) can approve. PMs cannot approve their own submissions (four-eyes principle).
#### 3.3 Budget Validation Rules
**At allocation time**, system validates against:
- **Total Project Budget**: Sum of (hours × applicable rate) must ≤ `budget_total_usd`
- **Monthly Budget** (if defined): Sum of (hours × applicable rate for that month) must ≤ `budget_monthly_breakdown[month]`
**Invalid allocations**: Rejected with error. PM can force with override if manager approves (audit logged).
**Resource Constraints** (enforced at allocation time):
- **Monthly Capacity**: Resource total hours (regular + OT) ≤ 144 per month
- **Monthly OT Cap**: Resource OT hours ≤ 36 per month
- **Project Spread Limit**: Resource assigned to ≤ 5 distinct projects per calendar month (counts all allocations regardless of approval status; hard constraint, **no override**)
- **Daily Limits**: ≤ 8 regular + 2 OT on regular days; ≤ 10 OT on holidays
If any constraint violated, allocation is **rejected** with specific error indicating which constraint failed and suggested remediation.
#### 3.4 Audit Log Table
| Field | Type | Notes |
|-------|------|-------|
| `id` | Auto-increment | |
| `entity_type` | String | e.g., "allocation" |
| `entity_id` | Integer | Record ID |
| `field_name` | String | Field that changed |
| `old_value` | JSON | Previous value |
| `new_value` | JSON | New value |
| `changed_by` | FK | User ID |
| `changed_at` | Timestamp | |
| `change_reason` | Text | Optional note |
All allocation edits (create/update/delete) are automatically logged.
#### 3.5 Overplan Detection
- Dashboard highlights projects where:
  - Allocated hours > Planned hours
  - Spent (actual consumption) > Allocated
- Count of overplan projects shown as KPI
#### 3.6 CSV Export (Allocations)
Filter by: Project, Date Range, Resource → Download CSV with columns: Project, Activity, Resource, Week, Hours, Rate, Cost.
### Module 4 — Actual Consumption Tracking (Phase 2)
#### 4.1 Entity: `ActualConsumption`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | Auto-increment | Yes | |
| `project_id` | FK | Yes | Project this consumption belongs to |
| `resource_id` | FK | Yes | Resource that performed work |
| `clarity_id` | String | No | External billing reference from Clarity |
| `charge_date` | Date | Yes | Date work was performed |
| `hours` | Decimal | Yes | Actual hours consumed |
| `cost_K` | Decimal | Yes | Actual cost in **K USD**. E.g., `7.2` = $7,200 actual |
| `source` | Enum | Yes | `clarity_import`, `manual_entry`, `csv_import` |
| `import_batch_id` | FK | No | Links to import batch for audit |
| `notes` | Text | No | |
| `is_adjustment` | Boolean | No | True if manually corrected after import |
| `adjusts_entry_id` | FK | No | Links to original entry being corrected |
| `created_at` | Timestamp | Yes | |
| `created_by` | FK | Yes | User who entered/imported |
| `locked_at` | Timestamp | No | Set when edit window (24–48hr) expires |
**Immutability After Lock**: Once `locked_at` is set, entry cannot be edited. Corrections require creating a new **adjustment entry** (`is_adjustment = true`) that references the original. Original remains immutable for audit.
**Edit Window**: 24 hours after creation (configurable: 24–48 hrs). Within window, owner can edit directly; after window, reversal+new-entry pattern required.
#### 4.2 Import Workflow (Clarity / CSV)
1. User clicks **"Import Actual Consumption"** → selects file
2. System parses CSV with **flexible column mapping** (same as Resource import templates)
3. **Preview phase**: Shows summary counts:
   - "X rows to insert, Y rows to update, Z rows conflict"
4. User can drill into each category to **verify details** (per resource, per date)
5. User confirms → system writes entries with `source` tag and `import_batch_id`
6. Full **audit log** records: file hash, row count, user, timestamp, change summary
**Duplicate Handling**: On `(project_id, resource_id, charge_date)` conflict → preview shows "Update existing" option (replace values) or "Skip" (keep existing).
#### 4.3 Manual Entry
- Single-entry form requiring: Project, Resource, Date, Hours, Cost
- Optional: Clarity ID, Notes
- `source = 'manual_entry'`, `import_batch_id = null`
- Follows same edit-window rules as imports
#### 4.4 Variance Dashboard Integration
- **Planned** = sum of all approved allocations (hours & cost_K)
- **Actual** = sum of all `ActualConsumption` entries (hours & cost_K)
- **Variance** = Actual − Planned (displayed as absolute + percentage)
- Granularity: Project-level only (not per-activity)
- Time slices: Current month, Last 3 months, Project life-to-date
#### 4.5 Audit & Traceability
- Every import batch logged: `batch_id, file_name, row_count, imported_by, imported_at`
- Every entry links to its batch (if imported)
- Adjustments chain: `adjusts_entry_id` creates linked list for full correction history
- Import preview snapshot stored for dispute resolution
---
### Module 5 — Supply & Demand Dashboard
#### 5.1 Dashboard KPIs
**Above-the-Fold Default (UX Q3 Decision)** — 3 KPIs always visible without scrolling (Priority 1 Core):

1. **Supply vs Demand (Monthly)** — Bar chart: Capacity HCM vs Allocated HCM per month. Primary indicator of whether the POD team is over- or under-allocated.
2. **Budget Burn Rate & Trend** — Line chart: Budget remaining vs actual spend over time with trend arrow (▲/▼ vs last week). Shows financial health at a glance.
3. **Variance Analysis** — Table: Project-by-project breakdown of planned hours/cost vs actual hours/cost, with variance percentage. Provides actionable detail on which projects are driving budget variance.

**Secondary KPIs** (hidden until "Expand Dashboard" clicked):

4. **Utilization Rate** — Gauge: Total approved allocation hours / Total capacity hours (system-wide)
5. **Overplan Count** — Number of projects exceeding planned hours or budget
6. **Monthly Cash Flow Forecast** — Next 6 months projected spend vs committed commitments

**Additional Priority 2 Metrics** (expandable secondary sections):
7. Skill Gap Heatmap — Demand skills vs available supply by cost center
8. Project Health Status — RAG (Red/Amber/Green) indicators based on schedule/budget variance
9. Pipeline Forecast — Intake/Estimation stage projected demand (next 90 days)
10. Resource Fatigue Index — Count of resources within 10% of 144h/month cap (burnout risk)

**KPI Visibility Rationale**: Supply/Demand + Burn Rate answer "Do we have enough people?" and "Are we spending too fast?" jointly; Variance adds specificity ("Project X is 40% over budget"). Utilization and Cash Flow are important but less time-sensitive in daily operational review.
#### 5.2 Dashboard Filters
Primary filters: **POD Team**, **Project**
Secondary (lower priority): Cost Center, Skill, Time Range
#### 5.3 Data Visualization
- Chart.js or Recharts for interactive graphs
- Date range picker for custom views
- Drill-down: Click any KPI to see underlying data table
#### 5.4 Export
- **CSV**: All dashboard tables exportable
- **PDF**: Nice-to-have future enhancement (print-friendly reports)
#### 5.5 Refresh Strategy
- Real-time updates when allocation changes occur (WebSocket or polling every 30s)
- Dashboard caches aggregated data for performance; invalidates on key data changes

#### 5.6 Defaults & UX
- **Default date range**: Current calendar month (most relevant for operational decisions)
- **Persisted preference**: User's last-selected date range saved in local storage
- **CSV Export**: All visible/exportable tables include full dataset (not just visible page); includes export timestamp in filename

#### 5.7 Notification Integration
Dashboard shows unread notification count; clicking opens notification center with:
- Approval pending: X allocations await your review
- Budget alerts: Y projects over 80% budget consumed
- Rate changes: Z resources have upcoming rate adjustments


#### 5.6 Defaults & UX
- **Default date range**: Current calendar month (most relevant for operational decisions)
- **Persisted preference**: User's last-selected date range saved in local storage
- **CSV Export**: All visible/exportable tables include full dataset (not just visible page); includes export timestamp in filename

#### 5.7 Notification Integration
Dashboard shows unread notification count; clicking opens notification center with:
- Approval pending: X allocations await your review
- Budget alerts: Y projects over 80% budget consumed
- Rate changes: Z resources have upcoming rate adjustments

---
## 3. API Surface (Tentative)
### 3.1 Resource APIs
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/v1/resources` | GET | List resources with filters (skill, level, cost_center) |
| `POST /api/v1/resources` | POST | Create new resource (Admin only) |
| `GET /api/v1/resources/{id}` | GET | Resource detail + current rate |
| `PUT /api/v1/resources/{id}` | PUT | Update resource fields (Admin only) |
| `POST /api/v1/resources/import/csv` | POST | Bulk CSV import with flexible mapping |
| `GET /api/v1/resources/export/csv` | GET | Export resources + latest rates |
### 3.2 Project & Activity APIs
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/v1/projects` | GET | List projects with status/date filters |
| `POST /api/v1/projects` | POST | Create new project (PM only) |
| `GET /api/v1/projects/{id}` | GET | Project detail + activities + allocations |
| `PUT /api/v1/projects/{id}` | PUT | Update project (PM + Admin) |
| `POST /api/v1/projects/{id}/activities` | POST | Add activity to project |
| `PUT /api/v1/activities/{id}` | PUT | Update activity dates, dependencies |
| `GET /api/v1/projects/{id}/gantt` | GET | Gantt data (activities + dependencies + critical path) |
### 3.3 Allocation APIs
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/v1/allocations` | POST | Create/update allocation (PM submit → pending) |
| `GET /api/v1/allocations` | GET | Query allocations with filters (resource, project, week) |
| `POST /api/v1/allocations/approve` | POST | Approve allocation (POD Manager only) |
| `POST /api/v1/allocations/reject` | POST | Reject allocation with reason (POD Manager only) |
| `DELETE /api/v1/allocations/{id}` | DELETE | Soft delete allocation (audit logged) |
| `POST /api/v1/allocations/auto` | POST | Trigger auto-allocation engine (simulate or commit) |
### 3.4 Dashboard APIs
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/v1/dashboard/supply-demand` | GET | Monthly supply vs demand bar chart data |
| `GET /api/v1/dashboard/burn-rate` | GET | Budget burn rate trend lines |
| `GET /api/v1/dashboard/variance` | GET | Project-level planned vs actual variance table |
| `GET /api/v1/dashboard/utilization` | GET | Overall resource utilization percentage |
| `GET /api/v1/dashboard/health` | GET | Project health RAG status indicators |
### 3.5 Administration APIs
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/v1/admin/rates` | POST | Create new rate record (Admin only) |
| `GET /api/v1/audit/log` | GET | Query audit log with filters (Admin/POD Manager) |
| `POST /api/v1/holidays/import` | POST | Bulk holiday calendar import (Admin only) |
| `PUT /api/v1/resources/{id}/status` | PUT | Change resource status (on_leave/terminated, Admin/POD) |
---
## 4. Architecture Decisions
### 4.1 Concurrency Control — Optimistic Locking
Allocation updates use **optimistic locking** via `version` column on `allocation` table:
- On update: `UPDATE allocation SET hours = ?, version = version + 1 WHERE id = ? AND version = ?`
- If 0 rows affected → concurrent modification detected → auto-retry once with fresh data
- If retry fails → show user-friendly message: "This allocation was just modified by someone else. Please review and try again."
**Rationale**: Avoids deadlocks and blocking while maintaining data integrity. Retry is transparent to user in most cases.
---
### 4.2 Dashboard Aggregation — Materialized Views
Real-time dashboard KPIs powered by **materialized views** refreshed every 5 minutes during business hours (08:00–18:00 local time):
```sql
-- Example: monthly_allocation_rollup
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_allocation_rollup;
```
**Staleness tolerance**: 5 minutes maximum. Refresh strategy:
- Business hours (8 AM–6 PM): every 5 minutes
- Off-hours: every 30 minutes
- Manual refresh button available to users
**Rationale**: Real-time triggers would slow allocation writes; materialized views balance freshness with performance.
---
### 4.3 Gantt Library — Frappe Gantt + Custom Critical Path Plugin
Frontend Gantt visualization uses **Frappe Gantt** (MIT license) with custom plugin for critical path highlighting:
- Library: `frappe-gantt` (lightweight, ~20KB gzipped)
- Custom plugin: `critical-path-highlighter` (internal development, ~200 LOC)
- Dependencies rendered as SVG arrows; cycle detection shown inline
- Virtual scrolling for >100 activities; timeline zoom (week/month/quarter)
**Rationale**: MIT license avoids GPL restrictions; lightweight; critical path logic implemented in-house with full control.
---
### 4.4 Primary Business Timezone — Single-Region
All date/time calculations use a **single configured business timezone** (default: company HQ timezone). Configurable via system settings. Holiday calendar uses same timezone.
**Rationale**: Multi-regional timezone logic multiplies complexity (per-CC calendars, DST handling). Single-region covers 80% use cases with simpler implementation. Phase 2 may add per-CC timezone if needed.
---
### 4.5 Audit Log Partitioning — Monthly Ranges, Indefinite Retention
`audit_log` table partitioned by `RANGE (changed_at)` **monthly**. Each partition kept in primary DB for 24 months, then **archived** to read-only object storage (S3/Blob) while remaining queryable via foreign tables.
- **Retention**: Indefinite (no deletion)
- **Partitioning**: Yes, monthly ranges
- **Archive after**: 24 months to cold storage (cost savings)
- **Query optimization**: Index on `(entity_type, entity_id, changed_at DESC)`
**Rationale**: Partitioning essential for query performance at scale; indefinite retention meets compliance/audit requirements; cold archive reduces storage cost.
---
### 4.6 Rate Cache Strategy — Redis Shared Cache
Rate lookups cached in **Redis** with:
- Key pattern: `rate:{cost_center}:{billable_team}:{YYYYMM}`
- TTL: 1 month (until rate period expires)
- Cache warming: On new rate creation, pre-warm the new month's rate entry
- Invalidation: When a new rate is added for (CC, BTC), invalidate all future-month keys for that pair
**Rationale**: Multiple web/API instances need consistent rate view; Redis provides sub-millisecond lookups; TTL ensures eventual consistency.
---
## 5. Data Model Summary (ERD Overview)
```
Resource ──< Allocation >── Project ──< Activity
   │              │              │
   │              │              └── depends_on → Activity (M:N self)
   │              │
   │              └── status (pending/approved)
   │
   └── cost_center + billable_team_code ──> Rate (by effective date)
Skill (lookup)          Level (lookup)
   └── assigned to Resource
Project ──> status (workflow)
Activity ──> is_milestone + milestone_status
Allocation ──> audit_log
```
---
## 6. Business Logic Rules
### 6.1 Rate Calculation
```python
def get_hourly_rate(cost_center: str, billable_team_code: str, date: date) -> Decimal:
    rate = query(Rate)
        .where(cost_center == cc)
        .where(billable_team_code == btc)
        .where(effective_from <= date)
        .where(effective_to > date OR effective_to IS NULL)
        .order_by(effective_from DESC)
        .first()
    return rate.monthly_rate_usd / 144
```
### 6.2 Allocation Constraint Check
```python
def validate_allocation(project_id: int, week_start: date, proposed_hours: Decimal):
    # All monetary values stored in K USD (thousands)
    total_allocated_hours = sum(allocation.hours for allocation in project.allocations)
    total_cost_K = sum(
        allocation.hours * get_hourly_rate_K(resource, allocation.week_start)
        for allocation in project.allocations
    )
    # Compare in K USD — project.budget_total_usd is stored in K
    assert total_cost_K <= project.budget_total_usd, f"Exceeds total budget: {total_cost_K}K > {project.budget_total_usd}K"
    if project.budget_monthly_breakdown:
        month_key = week_start.strftime("%Y%m")  # YYYYMM string
        monthly_allocated_K = sum(... filter by month)
        monthly_budget_K = project.budget_monthly_breakdown[month_key]
        assert monthly_allocated_K <= monthly_budget_K, f"Exceeds monthly cap: {monthly_allocated_K}K > {monthly_budget_K}K"
```
### 6.3 Week Calculation (with Holidays & Leave)
```python
def get_working_hours_in_week(start_date: date, resource_id: int) -> float:
    # Monday-Sunday calendar week
    # Subtract holidays from holiday_calendar where resource.cost_center matches
    # Subtract approved leave days (PTO, sick, training) from resource.leave_records
    days = [start_date + timedelta(d=i) for i in range(7)]
    working_days = [d for d in days if d not in holidays and d not in resource.leave_days]
    return len(working_days) * 8  # 8 hours per working day
```
**Resource Monthly Capacity**: Sum of working hours in all weeks of the month, accounting for:
- Weekends (already excluded from Mon-Fri week calc)
- Company holidays (from holiday calendar)
- Approved leave (PTO, sick, training) logged against the resource
**Monthly Capacity Cap**: Maximum assignable hours per resource per month = **144 hours** (including both regular and OT hours combined). This is the hard capacity ceiling enforced during allocation.
### 6.4 Auto-Allocation Scoring
Each candidate resource scored by:
1. Availability score = remaining capacity this month (higher is better)
2. Skill match score = skill adjacency match (1.0 = exact, 0.7 = related)
3. Cost score = inverse of rate (lower rate = higher score)
Final ranking: `Availability_weight × Score1 + Skill_weight × Score2 + Cost_weight × Score3`
---
## 7. Non-Functional Requirements
| Category | Requirement |
|----------|-------------|
| **Performance** | Dashboard loads within 3 seconds; allocation validation within 1 second |
| **Concurrency** | Multiple users can edit different projects simultaneously |
| **Audit** | All allocation changes permanently logged with user, timestamp, old/new values |
| **Security** | Role-based access: Admin, PM, POD Manager, Viewer |
| **Data Retention** | Rate and allocation history retained indefinitely (no deletion) |
| **Soft Delete** | All core entities support soft-delete (`is_active = false` flag); hard delete prohibited |
| **Export** | CSV downloads support up to 100k rows |
| **Backup** | Daily database backup; point-in-time recovery capability |
| **Browser Support** | Chrome, Firefox, Edge (latest 2 versions) |
**Bulk Operations Note**: MVP supports single-record operations. Phase 2 will add bulk approve, bulk status update, and bulk reassignment capabilities for scale.
---
## 8. User Roles & Permissions
| Role | Permissions |
|------|-------------|
| **Admin** | CRUD all entities; manage templates; system config; user management; manage holiday calendars; view full audit log; soft-delete/archive records |
| **Project Manager** | Create/edit projects/activities; submit allocations (pending approval); view dashboard; view own project audit trail; clone projects (Phase 2); cannot approve own allocations |
| **POD Manager** | Approve/reject allocations (any project); view all projects; export reports; view allocation audit log; manage resource status (on_leave/terminated); simulate auto-allocation |
| **Viewer** | Read-only access to projects, resources, dashboard (no edit, no approval) |
**Permission Notes**:
- Admin-only: Holiday calendar management, user management, soft-delete/archive, audit log full access
- POD Manager-only: Allocate approval/rejection, resource status changes
- PM-only: Project creation/editing, allocation submission (but not approval)
- All roles: Access notification center; can configure email opt-in/out in profile
---
## 9. Acceptance Criteria
#### Resource Management
- [ ] CSV import with 1000+ rows completes in <30 seconds
- [ ] Rate lookup returns correct rate for any historical date
- [ ] Resource external_id is immutable after creation
- [ ] All skill/level values are user-configurable via UI
- [ ] Resource status transitions respected (on_leave cannot allocate; terminated releases allocations)
- [ ] Holiday calendar can be created/edited by Admin; capacity respects holidays
#### Project Management
- [ ] Activity dependency cycle rejected at creation
- [ ] Project budget validation enforced at allocation time
- [ ] Status transitions follow defined workflow; terminal states immutable
- [ ] Activity templates can be cloned and customized
- [ ] Budget roll-forward at completion returns unspent to pool
- [ ] Gantt chart displays all activities with correct date ranges and dependencies
- [ ] Critical path algorithm correctly identifies zero-float activities (red highlight)
- [ ] Drag-and-drop rescheduling validates constraints and prevents illegal date changes
- [ ] Gantt chart displays all activities with correct date ranges and dependencies
- [ ] Critical path algorithm correctly identifies zero-float activities (red highlight)
- [ ] Drag-and-drop rescheduling validates constraints and prevents illegal date changes
#### Resource Allocation
- [ ] Auto-allocation produces valid allocations respecting all constraints
- [ ] Auto-allocation simulate mode shows projections without persisting
- [ ] Allocation that exceeds budget is rejected with actionable message
- [ ] Allocation edits require manager approval (PM cannot self-approve)
- [ ] Rejection workflow: POD Manager adds reason; PM can revise & resubmit
- [ ] Audit log captures every allocation change (create/update/delete/approve/reject)
- [ ] Fine-grained allocations (0.1 HCM = 14.4 hrs) fully supported
- [ ] Daily OT validation enforced (8+2 regular, 10 holiday, 36 monthly OT cap)
- [ ] Allocation update is override (replace) not accumulate
- [ ] Allocations respect leave-aware capacity (approved leave reduces capacity)
- [ ] Resource cannot be assigned to more than 5 distinct projects in any calendar month (counts all allocations regardless of status; hard constraint, no override)
- [ ] Resource monthly capacity (144h), OT cap (36h), and project spread limit (5 projects) all validated during allocation
#### Dashboard
- [ ] All 6 core KPIs display accurate real-time numbers
- [ ] Filters for POD Team and Project apply instantly
- [ ] CSV export contains all visible data + timestamp in filename
- [ ] Dashboard refreshes within 5 seconds of underlying data change
- [ ] Default date range = current month; user preference persisted locally
- [ ] Notification center displays unread count and grouped notifications
#### Actual Consumption (Phase 2)
- [ ] CSV import with flexible column mapping supports preview before import
- [ ] Import summary shows counts (insert/update/conflict); drill-down to verify details
- [ ] Manual entry form supports direct entry with 24-hour editable window
- [ ] Edit window enforces 24hr limit; post-lock corrections use reversal+new-entry pattern
- [ ] Variance dashboard shows planned vs actual (hours & cost) at project level
- [ ] Duplicate detection prevents double-billing (same resource+date+project)
- [ ] Audit trail links adjustments to original entries; import batches fully logged
#### Non-Functional & Cross-Cutting
- [ ] Rate records enforce no-overlap constraint at database level
- [ ] CSV import either fully succeeds or fully fails with downloadable error report
- [ ] Soft delete (`is_active`) supported on core entities; hard delete prohibited
- [ ] Audit log queryable by Admin/POD Manager with filters and export
## 10. Notification & Alerting System
### 10.1 Notification Types
| Event | Channel | Audience | Priority |
|-------|---------|----------|----------|
| Allocation submitted (pending approval) | In-app + Email | POD Manager | High |
| Allocation approved/rejected | In-app + Email | PM | Medium |
| Rate change mid-project | In-app only | PM of affected projects | Medium |
| Budget exceed alert (allocation would exceed) | In-app only | PM + POD Manager | High |
| Project budget >80% consumed | In-app only | PM + POD Manager | Medium |
| Project status transition required | In-app only | PM | Low |
| Resource status changed (on_leave/terminated) | In-app only | PM of affected projects | Medium |
| Auto-allocation simulation complete | In-app only | PM | Low |

### 10.2 Notification Center
**In-app notification center** accessible via bell icon with unread count badge.

**Grouping Behavior (UX Q4 Decision — Both Options Supported)**:
- **By Project (default)**: All events belonging to a given project are clustered together under a single collapsible header displaying the project name. This grouping helps PMs/PODs understand context for a specific project's activity stream.
- **By Type**: All events of the same notification type (approvals, rejections, warnings, etc.) are grouped together. Helps POD Managers triage by priority.

**UI Control**: Segmented toggle control in notification header: `[By Project ●] [By Type ○]`. User's selected preference persisted in localStorage and remembered on next visit.

**Notification Actions per Type**:
| Type | Primary Action | Secondary |
|------|----------------|-----------|
| `ALLOCATION_APPROVED` | [View Allocation] | — |
| `ALLOCATION_REJECTED` | [View Reason] | [Edit & Resubmit] |
| `BUDGET_WARNING` | [View Project] | [Dismiss] |
| `IMPORT_COMPLETE` | [Download Report] | — |
| `SYSTEM_ANNOUNCEMENT` | [Read More] | [Dismiss] |

**Unread Management**:
- Bell badge shows total unread count
- "Mark all read" button visible when unread > 0
- Per-item dismiss (×) on hover
- Unread items shown in bold; read items dimmed

### 10.3 Email Notification Rules
- Email sent only for **High** priority events OR if user offline >24 hrs for Medium priority
- Email contains direct action link back to system (e.g., "Approve allocation" button)
- Users can opt-out of non-critical emails in profile settings
- Throttling: same event type to same recipient max 1 email per 24 hours (digest bundling)

### 10.3 Email Notification Rules
- Email sent only for **High** priority events OR if user offline >24 hrs for Medium priority
- Email contains direct action link back to system (e.g., "Approve allocation" button)
- Users can opt-out of non-critical emails in profile settings
- Throttling: same event type to same recipient max 1 email per 24 hours (digest bundling)

### 10.4 Notification Retention & Archival
Notifications are retained for 24 months in the primary database (partitioned monthly, same as audit log).
**Retention Details**:
- **Hot view** (notification dropdown): Shows last 90 days (performance optimization)
- **Primary store**: All notifications retained in DB for 24 months
- **Archive**: After 24 months, move to read-only object storage (total 8-year retention for compliance)
- **Full history browser**: "Notification History" page accessible to Admin/POD Manager with date-range and type filters; exportable to CSV

---

## 11. Audit Log Viewer
### 11.1 Access Control
- **Admin**: Full audit log access across all entities
- **POD Manager**: Audit log for allocation changes only (own scope)
- **PM**: Read-only view of own project's allocation history
### 11.2 Query Capabilities
- Filter by: Entity type (allocation, resource, project), Date range, User, Action type
- Export filtered audit log to CSV
- Display rate-limited to last 10,000 records per query; pagination available
---
## 12. Holiday Calendar Management
### 12.1 Calendar Hierarchy
- **Global Calendar**: Company-wide holidays (e.g., New Year, Christmas) — cost_center_filter = null
- **Regional Calendar**: Cost Center-specific holidays (e.g., country-specific) — cost_center_filter = CC code
When computing capacity, system applies **union** of matching calendars.
### 12.2 Management UI
- Admin-only CRUD interface with calendar view
- Bulk import via CSV (columns: `date, description, cost_center_filter (optional)`)
- Recurring holiday support (e.g., "Last Monday of May" for Memorial Day)
---
## 13. Soft Delete & Archival Policy
### 14.1 Entity Soft-Delete Support
All core entities have `is_active: boolean` flag:
| Entity | Delete Behavior |
|--------|-----------------|
| Resource | `is_active = false`; allocations frozen; history retained |
| Project | `is_active = false`; allocations frozen; history retained |
| Activity | `is_active = false`; allocations frozen; history retained |
| Allocation | `is_active = false` (logical delete within audit); physical row retained |
### 13.2 Archive Project Action
- PM can "Archive" completed/cancelled projects (sets `is_active = false`)
- Archived projects hidden from default dashboard views but included in reports
- Archive is reversible only by Admin (un-archive)
---
## 14. Future Enhancements (Out of Scope v1)
| Enhancement | Priority | Notes |
|-------------|----------|-------|
| JIRA integration | P2 | Link activities to external JIRA tickets |
| PDF dashboard export | P3 | Print-friendly formatted reports |
| Cost Center hierarchy | P3 | Nested cost center support |
| Skill gap auto-suggest | P2 | Recommend training/resources based on gaps |
| Advanced dependency types | P3 | Finish-to-start, Start-to-start, etc. |
| Mobile-responsive UI | P3 | Tablet/mobile optimized |
| API for external systems | P2 | REST API for integration |
| Rate approval workflow | P3 | Rate changes require approval |
| Bulk operations (select-multiple approve/reassign) | P2 | Needed for scale; single-record ops only in v1 |
| Project clone / template from existing | P2 | Copy activities from similar project |
| Regional/Cost Center-specific holiday calendars | P2 | Per-CC calendars separate from global |
| Email digests (weekly summary) | P3 | Scheduled email reports |
| Advanced "What-If" scenarios with side-by-side compare | P2 | Multi-scenario auto-allocation comparison |
| Audit log viewer UI | P2 | Filterable audit trail for Admin/POD Manager |
| Notification preferences (user-configurable) | P3 | Granular opt-in/out per notification type |
| Bulk operations (select-multiple approve/reassign) | P2 | Needed for scale; single-record ops only in v1 |
| Project clone / template from existing | P2 | Copy activities from similar project |
| Regional/Cost Center-specific holiday calendars | P2 | Per-CC calendars separate from global |
| Email digests (weekly summary) | P3 | Scheduled email reports |
| Advanced "What-If" scenarios with side-by-side compare | P2 | Multi-scenario auto-allocation comparison |
| Audit log viewer UI | P2 | Filterable audit trail for Admin/POD Manager |
| Notification preferences (user-configurable) | P3 | Granular opt-in/out per notification type |
---
## 15. Technology Stack
- **Backend**: Python 3.11, FastAPI, SQLAlchemy, Alembic
- **Database**: PostgreSQL (production), SQLite (dev)
- **Frontend**: React 18, TypeScript, Vite, Chart.js / Recharts
- **Authentication**: JWT tokens, role-based middleware
- **DevOps**: Docker, GitHub Actions CI/CD
---
## 16. Implementation Phases
**Phase 1** (MVP): Data models + CRUD APIs + CSV import/export (Resource, Project, Activity, Allocation)
**Phase 2**: Activity & project management + dependency engine (includes Actual Consumption tracking for variance)
**Phase 3**: Allocation engine + auto-allocation algorithm
**Phase 4**: Approval workflows + audit logging
**Phase 5**: Dashboard with all 6 core KPIs
**Phase 6**: Polish, performance tuning, security hardening
**Note**: Actual Consumption module (variance tracking) shipped in Phase 2, not Phase 1 — allows real vs planned variance comparison from early MVP stages.
| Event | Channel | Audience | Priority |
|-------|---------|----------|----------|
| Allocation submitted (pending approval) | In-app + Email | POD Manager | High |
| Allocation approved/rejected | In-app + Email | PM | Medium |
| Rate change mid-project | In-app only | PM of affected projects | Medium |
| Budget exceed alert (allocation would exceed) | In-app only | PM + POD Manager | High |
| Project budget >80% consumed | In-app only | PM + POD Manager | Medium |
| Project status transition required | In-app only | PM | Low |
| Resource status changed (on_leave/terminated) | In-app only | PM of affected projects | Medium |
| Auto-allocation simulation complete | In-app only | PM | Low |
### 11.2 Notification Center
- **In-app bell icon** with unread count
- Dropdown panel shows last 20 notifications, grouped by type
- Mark as read / clear all actions
- Notification retention: 90 days, then auto-archived
### 11.3 Email Rules
- Email sent only for **High** priority events OR if user offline >24 hrs for Medium
- Email contains action link back to system
- Users can opt-out of non-critical emails in profile settings
## Appendix A — Rate Calculation Examples
All monetary values use **K USD** (thousands) storage.
**Example 1**: Monthly rate = `14.4` K USD → Hourly rate = 14,400 ÷ 144 = **$100/hour**
**Example 2**: 0.5 HCM allocation = 72 hours; cost = 72 × $100 = **$7,200** (stored as `7.2` K USD)
**Example 3**: 2.3 HCM allocation = 331.2 hours; cost = 331.2 × $100 = **$33,120** (stored as `33.12` K USD)
**Conversion**: `storage_value_K * 1000 = actual_USD`
---
## Appendix B — Sample CSV Schema (Resource Import)
Required columns: `external_id, name, cost_center, billable_team_code, category`
Optional columns: `skill, level, hire_date, end_date`
Custom columns allowed; unmapped columns stored as metadata.
---
## Appendix C — Overtime & Validation Rules
### Daily Hour Limits
| Day Type | Normal Hours | Max OT | Total Max |
|----------|-------------|--------|-----------|
| Regular workday | ≤ 8 hrs/day | ≤ 2 hrs/day | ≤ 10 hrs/day |
| Holiday | 0 hrs | ≤ 10 hrs | ≤ 10 hrs/day |
### Monthly Caps
- **Total hours per resource per month**: ≤ 144 hours (including OT)
- **OT hours per resource per month**: ≤ 36 hours
### Allocation Override Behavior
When a new allocation is submitted for the same `(resource, project, week)`:
- **Replace** the existing allocation (last write wins; does not accumulate)
- Validation rules above are checked on the **final** allocation value
### Example Calculation
**Scenario**: Resource allocates 40 hrs Week 1 Project A, then 30 hrs Week 1 Project A
- **Result**: Final allocation = 30 hrs (replaces 40 hrs)
- Validation: 30 hrs ÷ 5 working days = 6 hrs/day → ✅ compliant
---
## Appendix D — CSV Import Error Report Format
When a CSV import fails validation, the system generates an **Error Report CSV** with these columns:
| Column | Description |
|--------|-------------|
| `row_number` | 1-based row index in the original file |
| `column_name` | Column header that failed validation |
| `error_type` | `required_missing`, `invalid_format`, `duplicate_key`, `type_mismatch`, `unknown_value` |
| `severity` | `error` (blocks entire import in Batch Create mode) or `warning` (row will import but with caution) |
| `error_message` | Human-readable description of the issue |
| `suggested_fix` | Recommended correction (e.g., "Value must be one of: contractor, permanent") |
| `original_value` | The value that was provided (for reference) |
The error report is downloadable immediately after failed import. The original file must be corrected and re-uploaded (no partial-import mode in v1).
---
## Appendix E — Notification Events Reference
| Event | Trigger | Channels | Action Required? |
|-------|---------|----------|-----------------|
| `allocation.submitted` | PM submits allocation | In-app (bell), Email if POD Manager offline >24h | Yes — POD Manager must approve/reject |
| `allocation.approved` | POD Manager approves | In-app (PM) | No — informational |
| `allocation.rejected` | POD Manager rejects with reason | In-app (PM) + Email | Yes — PM must revise |
| `rate.changed` | New rate effective for resource on active project | In-app (affected PMs) | No — informational |
| `budget.exceeded` | Allocation would exceed budget at entry | In-app only (real-time) | Yes — PM must adjust |
| `project.budget.80pct` | Project spent 80% of total budget | In-app only (PM, POD Manager) | No — warning |
| `resource.status_changed` | Resource becomes on_leave/terminated | In-app (PMs with allocations on that resource) | Yes — re-allocate affected hours |
| `autoallocation.complete` | Simulation or actual auto-allocation finishes | In-app (PM) | No — review results |
| `project.status_changed` | Project moves to new state | In-app (stakeholders) | No — informational |
**Notification Retention**: Stored for 90 days; auto-archived thereafter. Can be manually cleared by user.
**Email throttling**: Same event type to same recipient max 1 email per 24 hours (digest bundling).
---
*End of Requirements Document*