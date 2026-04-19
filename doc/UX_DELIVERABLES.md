# UX Deliverables — POD Team Management System

**Date:** 2026-04-19
**PRD Version:** v1.4
**Scope:** Phase 1 MVP

---

## Deliverable 1 — User Flow Diagrams

### 1.1 Manual Allocation Entry (Project-Centric View)

```
[Project Detail Page] → "Assignments" tab
         ↓
   Resource Grid (filterable by skill/level/CC)
         ↓
   Click "Assign Resource" button
         ↓
   Allocation Modal opens:
   - Resource picker (search/existing)
   - Week range picker (single or multi-week)
   - Hours per day input (default 8)
   - Real-time budget indicator (remaining budget in K USD)
   - OT warning if >8 regular / >2 OT daily
   - 5-project cap warning (counts distinct projects in month)
         ↓
   [Save] → Status: PENDING (requires POD Manager approval)
         ↓
   Notification sent to POD Manager
```

### 1.2 Manual Allocation Entry (Resource-Centric View)

```
[Resource Detail Page] → "Assignments" tab
         ↓
   Project Grid (filterable by status/date range)
         ↓
   Click "Assign to Project" button
         ↓
   Allocation Modal (same as above, mirrored)
         ↓
   [Save] → Status: PENDING
```

### 1.3 Auto-Allocation Trigger

```
[Dashboard] → "Auto-Allocate" action button
         ↓
   Confirmation dialog:
   - Show unallocated hours (demand)
   - Show available resources (supply)
   - Preview: top 10 suggested assignments
   - Toggle: "Auto-approve safe cases" (optional)
         ↓
   [Run Auto-Allocate]
         ↓
   Batch create allocations with status PENDING
         ↓
   Summary: X allocations created, Y errors (list expandable)
```

### 1.4 CSV Import Flow

```
[Admin Console] → "Import" → Select entity (Resource / Rate)
         ↓
   Step 1: Upload CSV
   - Drag-drop zone
   - Template download link
   - Preview: first 5 rows
         ↓
   Step 2: Mode selection
   - Batch Create (all-or-nothing) ← Phase 1 default
   - Upsert (row-level) ← Phase 2 only
         ↓
   Step 3: Preview & Validation
   - Row count, estimated time
   - Data type warnings (date format, numeric precision)
   - [Preview Full Report] → downloadable error CSV preview
         ↓
   Step 4: Confirm Import
   - "I understand: Batch Create rolls back entirely on any error"
   - [Import] button
         ↓
   Success: "X records imported. Batch ID: 20260419-xxxx"
   Failure: "0 records imported. Download Error Report"
```

### 1.5 Allocation Approval Workflow

```
1. PM creates allocation → status = PENDING
         ↓
2. Notification: "Allocation pending your approval" (POD Manager)
         ↓
3. POD Manager clicks notification
         ↓
4. Allocation Approval Panel:
   - Resource name, Project, Week(s), Hours
   - Budget impact (K USD)
   - Cost center + billable team
   - [Approve] [Reject] buttons
         ↓
5a. Approved → status = APPROVED
    - Capacity counters updated
    - PM notified: "Allocation approved"
    - Audit log entry created
         ↓
5b. Rejected → status = REJECTED
    - Rejection reason required (dropdown + comment)
    - PM notified: "Allocation rejected — see reason"
    - Allocation marked inactive (soft delete)
```

---

## Deliverable 2 — Wireframes (4 Key Screens)

### 2.1 Dashboard (Above-the-Fold)

```
┌─────────────────────────────────────────────────────────────────┐
│ POD Team Management                            [User ▼] [🔔 3] │
├─────────────────────────────────────────────────────────────────┤
│ Dashboard | Projects | Resources | Allocations | Admin           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Supply vs Demand│  │ Budget Burn Rate│  │  Variance       │ │
│  │ (Bar Chart)     │  │ (Line Chart)    │  │  Analysis       │ │
│  │                 │  │                 │  │  (Table)        │ │
│  │ Demand: 1,240h  │  │ Current: 89%    │  │ Project  Hours  │ │
│  │ Supply: 1,180h  │  │ Plan: 85%       │  │ A   +120 (+15%) │ │
│  │ Gap: -60h       │  │ ▲+4% vs last wk │  │ B   -30 (-5%)   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  [Expand Dashboard] → reveals: Utilization, Overplan, Cash Flow│
│                                                                 │
│  Quick Actions:                                                 │
│  [Auto-Allocate]  [Create Allocation]  [Import Resources]     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Resource Allocation Modal (Both Views)

```
┌─────────────────────────────────────────────────────────────────┐
│ Assign Resource to Project                        [X] Close    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Resource:  ▼ [David Chen ▼]      Search by name/skill...       │
│   Cost Center: ENG-01          Billable Team: CONSULT          │
│                                                                 │
│ Project:  ▼ [Project Phoenix ▼]      Search by request ID...   │
│   Budget remaining: 245.50 K USD (of 300.00)                   │
│                                                                 │
│ Week Range:  [2026-04-20] to [2026-05-17]  [4 weeks ▼]        │
│                                                                 │
│ Hours per day: 8  (OT max per month: 36h)                      │
│                                                                 │
│ ┌── Weekly Breakdown ──────────────────────────────────────────┐ │
│ │ Week       Hours   Daily Avg   OT Est                        │ │
│ │ 2026-04-20  40      8/0         0                             │ │
│ │ 2026-04-27  40      8/0         0                             │ │
│ │ 2026-05-04  40      8/0         0                             │ │
│ │ 2026-05-11  40      8/0         0                             │ │
│ │ Total       160h   Est. Cost: 12.30 K USD                   │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ⚠️ Warnings:                                                   │
│   • Resource already allocated to 4 projects this month        │
│   • Adding 5th project — at monthly cap limit                  │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Cancel]                          [Save → Pending Approval]│ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Project Detail — Gantt View

```
┌─────────────────────────────────────────────────────────────────┐
│ Project: Phoenix — Website Redesign        [Edit ▼] [Export]   │
├─────────────────────────────────────────────────────────────────┤
│ Timeline: 2026-04-15 → 2026-07-30  |  Status: ACTIVE         │
│ Budget: 120.00 K USD  |  Burn: 67% (80.4K / 120K)            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Drag activity to reschedule → "This will delay 3 successor  │
│   activities: Design QA, Dev Backend, Dev Frontend. Continue?" │
│   [Cancel]  [Shift All]                                        │
│                                                                 │
│  Week 17  Week 18  Week 19  Week 20  Week 21  Week 22 ...      │
│   ┌─────────────────────────────────────────────────────┐       │
│   │ Design Sprint       [FS]       May 4 – May 10        │       │
│   │ ●───●───────────────●───────────●                    │       │
│   │                                          ▲ CRITICAL PATH │
│   │ Backend Dev         [FS]       May 11 – Jun 7         │       │
│   │                 ●───────●──────●──────●               │       │
│   │ Frontend Dev        [FS]       Jun 8 – Jul 12         │       │
│   │                            ●──────●──────●──────●      │       │
│   │ QA                  [FS]       Jul 13 – Jul 20        │       │
│   │                                          ●───●         │       │
│   │ UAT                          Jul 21 – Jul 30          │       │
│   └─────────────────────────────────────────────────────┘       │
│                                                                 │
│  Legend: ● Start  ●─ Milestone  ▲ Critical Path                │
│         [FS] Finish–Start Dependency                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 Notification Center

```
┌─────────────────────────────────────────────────────────────────┐
│ Notifications                              [Mark all read]    │
├─────────────────────────────────────────────────────────────────┤
│ View:  ● By Project  ○ By Type   |   Filter: [All ▾]          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Project: Phoenix — Website Redesign                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ · Allocation approved — David Chen → 160h (Apr 20–May 17) │ │
│  │   2 hours ago  [View]                                       │ │
│  │ · Budget warning: Project at 89% burn rate                  │ │
│  │   5 hours ago  [Dismiss]                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Project: Atlas — Data Migration                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ · Allocation rejected — Sarah Liu (OT cap exceeded)        │ │
│  │   1 day ago  [View Reason]  [Edit & Resubmit]              │ │
│  │ · New activity added: "Cutover Planning"                   │ │
│  │   2 days ago  [View Gantt]                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  System                                                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ · Import complete: 47 resources added                       │ │
│  │   3 hours ago                                               │ │
│  │ · Rate schedule updated: Q2 2026 effective Apr 1            │ │
│  │   1 day ago                                                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [Load more]                                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Deliverable 3 — Gantt Interaction Specification

### 3.1 Drag & Drop — Sequential Steps

1. **User initiates drag:** Click and hold activity bar
2. **Visual feedback:** Bar lifts slightly; ghost bar shows current position; tooltip shows "Drag to reschedule"
3. **Move tracking:** Mouse movement updates ghost bar position (snap-to-week grid)
4. **Drop target calculation:**
   - Compute new `start_date` based on dropped column
   - Calculate `delta_days` shift
   - Run dependency check: for each successor, verify `new_start ≥ predecessor_end + lag`
5. **Conflict detection:**
   - If any successor would violate dependency → show modal (warning mode)
   - Modal content:
     ```
     Shifting "[Activity Name]" by +7 days will affect:
     • Design QA (May 17) — delayed to May 24
     • Dev Backend (May 18) — delayed to May 25
     • Dev Frontend (May 25) — delayed to Jun 1
     
     Continue with cascade shift?
     [Cancel]  [Shift All 3 Successors]
     ```
6. **Confirmed shift:**
   - Update current activity `start_date`, `end_date`
   - Recursively update all cascade-shifted successors (preserve original duration, lag between activities unchanged)
   - Recompute critical path for entire project
   - Emit 3+ audit events (one per shifted activity)
7. **Undo available:** 30-second undo toast with "Undo cascade" button (reverts entire cascade chain)

### 3.2 Edge Cases

| Case | Behavior |
|------|----------|
| Drag into past (before today) | ❌ Blocked with tooltip: "Cannot reschedule past activities" |
| Drag beyond project end_date | ❌ Blocked with tooltip: "Exceeds project end date" |
| Drag breaks circular dependency | ❌ Blocked: "This change creates a cycle. Adjust dependencies first." |
| Multi-select drag (future) | Phase 2: Select 2+ activities → drag together, maintain relative offsets |

### 3.3 Keyboard Alternative

- Select activity → press `R` for reschedule → enter new start date in modal → dependency check runs → confirm cascade

---

## Deliverable 4 — Error State Cheat Sheet

### 4.1 Allocation Errors

| Error Code | Message (User) | Explanation (Tooltip) | Remediation Path |
|------------|---------------|----------------------|------------------|
| `BUDGET_EXCEEDED` | "Project budget exceeded by 12.5K USD. Reduce hours or request budget increase." | Allocation would push project burn >100% of budget | 1. Reduce allocated hours; 2. Choose lower-rate resource; 3. Request budget increase (Admin) |
| `CAPACITY_EXHAUSTED` | "Resource fully allocated (144h/month). Choose different week or resource." | Resource has no remaining HCM for that month | 1. Shift to month with capacity; 2. Select alternate resource |
| `OT_CAP_EXCEEDED` | "Monthly OT cap (36h) exceeded. Current: 40h OT. Reduce hours or spread across months." | Total OT (actual - 144) > 36h | 1. Reduce hours; 2. Shift OT to adjacent month; 3. Select resource with lower allocation |
| `PROJECT_SPREAD_LIMIT` | "Resource already on 5 projects this month. Cannot add 6th." | 5-project monthly cap (hard) | 1. Remove from existing project; 2. Choose different resource |
| `SKILL_MISMATCH` | "Resource skill level below project requirement." | Resource skill/level doesn't match project needs | 1. Choose resource with matching skill tag; 2. Override with POD Manager override (future) |
| `VERSION_CONFLICT` | "Allocation was modified by another user. Reload and retry." | Optimistic lock version mismatch | [Retry] button: reload latest data and reapply |

### 4.2 Import Errors

| Severity | Format | Example |
|----------|--------|---------|
| **ERROR** (blocks row) | `ROW 23: Invalid cost_center_id "ENG-X" — not found` | Must fix data or skip row |
| **WARNING** (allows row) | `ROW 45: effective_from "202613" — invalid YYYYMM, using 2026-01-01` | Auto-corrected, review recommended |
| **INFO** (informational) | `ROW 1: external_id already exists — updating existing record (Upsert mode)` | Expected in Upsert, no action needed |

### 4.3 Dashboard Loading States

| State | Display |
|-------|---------|
| Initial load | Skeleton bars for 3 above-fold KPIs + spinner |
| Background refresh (5min) | Subtle pulse animation on affected KPI borders |
| Refresh failed | "Supply/Demand: data stale (last: 25 min ago). [Retry]" in yellow |

---

## Deliverable 5 — Notification Center Layout Spec

### 5.1 Data Model (Notifications Table)

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    recipient_id UUID NOT NULL REFERENCES resources(id),
    type VARCHAR(20) NOT NULL,  -- ALLOCATION_APPROVED, ALLOCATION_REJECTED,
                                -- BUDGET_WARNING, IMPORT_COMPLETE, SYSTEM_ANNOUNCEMENT
    project_id UUID REFERENCES projects(id),
    allocation_id UUID REFERENCES allocations(id),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500),  -- deep link to relevant page
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    -- Partitioned by month (created_at)
);
```

### 5.2 Grouping Logic

**Grouped by Project (default):**
```
Project: Phoenix
  · Allocation approved — David Chen (Apr 20)
  · Budget warning — 89% burn (2h ago)
  · New activity added — "Cutover Planning" (1d ago)

Project: Atlas
  · Allocation rejected — Sarah Liu (OT cap) (1d ago)
  · Milestone reached — "Design Complete" (3d ago)

System
  · Import complete: 47 resources (3h ago)
```

**Grouped by Type:**
```
Approvals (2)
  · Phoenix — David Chen allocation approved
  · Atlas — Michael Wang allocation approved

Rejections (1)
  · Atlas — Sarah Liu allocation rejected (OT cap)

Warnings (1)
  · Phoenix — 89% burn rate warning
```

**Toggle:** Segmented control in header: `[By Project ●] [By Type ○]` (persisted per user in localStorage)

### 5.3 Notification Actions

| Type | Primary Action | Secondary |
|------|----------------|-----------|
| `ALLOCATION_APPROVED` | [View Allocation] | — |
| `ALLOCATION_REJECTED` | [View Reason] | [Edit & Resubmit] |
| `BUDGET_WARNING` | [View Project] | [Dismiss] |
| `IMPORT_COMPLETE` | [Download Report] | — |
| `SYSTEM_ANNOUNCEMENT` | [Read More] | [Dismiss] |

### 5.4 Unread Badge

- Bell icon in header: `🔔 3` (total unread)
- On notification list: bold titles for unread; dimmed for read
- "Mark all read" button at top (only visible when unread > 0)
- Per-item dismiss: `×` on hover

---

## Summary

All 5 UX deliverables are now documented and ready for engineering handoff:

1. **User Flow Diagrams** — End-to-end flows for allocation, auto-allocate, import, approval
2. **Wireframes** — 4 key screens with above-the-fold prioritization (Q3)
3. **Gantt Interaction Spec** — Drag behavior with conservative warning cascade (Q2 = A)
4. **Error State Cheat Sheet** — All 6 allocation error codes + remediation paths
5. **Notification Center Layout** — Dual-grouping (by project default + by type toggle) (Q4 = both)

**UX decisions confirmed:**
- Q1: Both project-centric and resource-centric allocation entry
- Q2: Conservative warning + cascade shift (not auto-cascade)
- Q3: Above-the-fold KPIs = Supply vs Demand, Budget Burn Rate, Variance
- Q4: Notification groups by both project (default) and type (toggle)
- Q5: CSV Import Phase 1 = Batch Create only; Upsert deferred to Phase 2

---

## Audit Log — UX Deliverables Document

This section tracks all material changes to the UX deliverables specification.

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| v1.0 | 2026-04-19 | Claude (Chat) | Initial creation — 5 deliverables authored based on PRD v1.4 and UX review outcomes |
| v1.1 | 2026-04-19 | Claude (Chat) | Added audit log section per user request |

**Audit Notes:**
- v1.0 covers all 5 deliverables: User Flow Diagrams (1.1–1.5), Wireframes (2.1–2.4), Gantt Interaction Spec (3.1–3.3), Error State Cheat Sheet (4.1–4.3), Notification Center Layout Spec (5.1–5.4)
- All UX decisions are derived from PRD v1.4 and the preceding 27-requirement clarification session