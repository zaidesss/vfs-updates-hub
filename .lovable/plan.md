

## Root Cause Analysis

There are **three interconnected issues** causing the override to not reflect on the Dashboard:

### Issue 1: Schedule Resolver Cache Never Cleared After Coverage Board Saves
The `scheduleResolver.ts` has an in-memory cache (`scheduleCache` and `weekCache`). When the Coverage Board saves overrides via `upsertOverride()` in `coverageBoardApi.ts`, it does NOT call `clearScheduleCache()`. When the user navigates to the Dashboard, `getEffectiveSchedulesForWeek()` returns stale cached data (the old base schedule), so both the Shift Schedule Table and the Logout Dialog show the pre-override schedule.

`clearScheduleCache()` is only called in one place: `upsertScheduleAssignment()` in `scheduleResolver.ts`. The coverage board uses a completely separate function (`upsertOverride` / `deleteOverride` in `coverageBoardApi.ts`) which never touches the cache.

### Issue 2: OverrideEditor Does Not Set `block_type`
When a user clicks a cell and manually enters override times, `OverrideEditor.handleApply()` (line 99-106) creates a `PendingOverride` without setting `block_type`. This falls through to the default `'override'` (legacy type) in `CoverageBoard.handleSave()` (line 161). While the RPC does handle legacy overrides, this is inconsistent — new overrides should use `'regular'` type to match the modern override flow.

### Issue 3: `override_type = 'override'` (Legacy) Has Restrictive Handling in RPC
In the `get_effective_schedule` RPC (line 121-127), legacy overrides are only used if NO regular, OT, or dayoff overrides exist for the same agent+date. If any typed override co-exists, the legacy one is silently ignored. This means future typed overrides could mask legacy ones unpredictably. Using `'regular'` type avoids this.

---

## Implementation Plan

### Step 1: Clear schedule cache after Coverage Board saves
In `CoverageBoard.tsx`, import and call `clearScheduleCache()` in `handleSave` right before the React Query invalidation (line 248). This ensures the Dashboard fetches fresh data from the RPC instead of serving stale cache.

```typescript
import { clearScheduleCache } from '@/lib/scheduleResolver';

// In handleSave, after all upserts/deletes:
clearScheduleCache();
queryClient.invalidateQueries({ queryKey: ['coverage-overrides'] });
```

### Step 2: Clear schedule cache in `coverageBoardApi.ts` functions
Add `clearScheduleCache()` calls inside `upsertOverride()` and `deleteOverride()` so any consumer of these functions (not just the Coverage Board page) automatically invalidates the cache.

### Step 3: Fix `OverrideEditor` to set `block_type: 'regular'` by default
In `OverrideEditor.tsx`, update `handleApply` to include `block_type: 'regular'` in the override object. This ensures overrides are stored with the modern type and correctly resolved by the RPC.

### Step 4: Also clear cache on Coverage Board edit mode toggle-off
When `setEditMode(false)` is called after save (line 265), the cache is already cleared from Step 1. No additional change needed here — just noting for completeness.

---

## Summary of Files to Change

| File | Change |
|------|--------|
| `src/pages/CoverageBoard.tsx` | Import `clearScheduleCache`, call it in `handleSave` |
| `src/lib/coverageBoardApi.ts` | Call `clearScheduleCache()` in `upsertOverride` and `deleteOverride` |
| `src/components/coverage-board/OverrideEditor.tsx` | Set `block_type: 'regular'` in `handleApply` |

