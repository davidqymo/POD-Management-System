# Allocation Base Unit Change to HCM (Monthly) - Design

**Date:** 2026-05-01
**Status:** Draft for User Review

## Overview

Change the allocation time unit from weekly to monthly (HCM = Headcount Month), aligning with the Dashboard's HCM metric used in supply/demand calculations.

## Problem Statement

The current allocation system uses weekly time units (`weekStartDate`), which doesn't align with the monthly HCM metric used in the Dashboard. This creates a mismatch when reporting and calculating resource utilization.

## Solution

Switch allocation base unit to monthly (HCM), where 1 HCM = 144 hours per resource per month.

## Data Model Changes

### Backend - Allocation Entity

| Field | Type | Description |
|------|------|-------------|
| `weekStartDate` | LocalDate | **Removed** (replaced by hcm) |
| `hcm` | Integer | **Added** - YYYYMM format (e.g., 202512 = Dec 2025) |

Both project-level and activity-level allocations use the `hcm` field.

**Database Index:**
```sql
-- Partial unique index: one allocation per resource/project/hcm
CREATE UNIQUE INDEX idx_allocations_resource_project_hcm 
ON allocations (resource_id, project_id, hcm) 
WHERE status IN ('PENDING','APPROVED') AND is_active = TRUE;
```

### Migration Strategy

1. Add `hcm` column as nullable initially
2. Backfill `hcm` from `weekStartDate` (extract YYYYMM)
3. Make `hcm` NOT NULL
4. Optionally drop `weekStartDate` in Phase 2

## Validation Rules

| Rule | Current | New |
|------|---------|-----|
| Time unit | Week | Month (HCM) |
| Input format | Week start date | YYYYMM integer |
| Max records per (resource, project, hcm) | 1 per week | 1 per month |
| Total hours cap per resource/hcm | 144h/month | 1 HCM (= 144h) |
| 5-project monthly cap | Yes | Removed (replaced by hours cap) |

**New Validation Logic:**
- Exactly 1 allocation record allowed per (resource, project, hcm)
- Sum of hours for a resource across all projects in same hcm ≤ 144h

## API Changes

### CreateAllocationRequest

```java
// Current:
private LocalDate weekStart;
private BigDecimal hours;

// New:
private Integer hcm;  // YYYYMM format (e.g., 202512)
private BigDecimal hours;  // 0.5-144h per allocation
```

### Response DTO

| Field | Change |
|-------|--------|
| `weekStartDate` | Changed to `hcm` (Integer) |
| Other fields | Unchanged |

### Endpoints

Same endpoint URLs, request/response structure changes:

| Endpoint | Method | Change |
|----------|--------|--------|
| `/api/v1/allocations` | POST | `weekStart` → `hcm` |
| `/api/v1/allocations` | GET | Response includes `hcm` |
| `/api/v1/allocations/{id}` | GET | Response includes `hcm` |

## UI Changes

### AllocationModal (Frontend)

- Replace week date picker with month picker (input type="month")
- Display format: YYYY-MM in UI, convert to YYYYMM for API
- Update validation: max 144h per resource per HCM

**UI Mockup:**
```
Resource: [Dropdown]      Project: [Dropdown]
HCM:      [____-____]   Hours:   [____] h
```

### AllocationPage (Frontend)

- Grouping column changes from week to HCM
- Display header: "HCM" instead of "Week"
- Filter by HCM instead of week

### Validation Panel

- Update constraint messages: "HCM" instead of "Week"
- Update max cap display: "1 HCM = 144h/month"

## Affected Components

### Backend
- `Allocation.java` - entity changes
- `CreateAllocationRequest.java` - DTO changes
- `AllocationDTO.java` - response DTO changes
- `AllocationService.java` - validation logic
- `AllocationController.java` - endpoint parameter changes
- `AllocationRepository.java` - query changes

### Frontend
- `AllocationModal.tsx` - form input
- `AllocationPage.tsx` - display columns
- `api/allocations.ts` - API client

## Testing Strategy

1. Unit tests for new validation rules
2. Integration tests for CRUD operations
3. E2E tests for allocation workflow
4. Verify Dashboard calculations still work correctly

## Rollback Plan

If issues arise:
- Keep `weekStartDate` column for fallback
- Feature flag to toggle between weekly/monthly mode
- Database migration to restore weekly view if needed

## Dependencies

- No external dependencies
- Works with existing database migrations
- Compatible with current schema (additive change)

## Open Questions

1. **Activity hcm:** Should activity allocations also use the same hcm value as project-level? (Presumably yes - same month)
2. **Historical data:** How to handle existing weekly allocations? (Keep for read-only, new allocations use hcm)

---

**For Implementation:** Invoke writing-plans skill to create detailed implementation plan.