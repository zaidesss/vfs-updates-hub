

## Root Cause

There are **two bugs** in the live data path:

1. **OT Productivity is hardcoded to `null`** -- Line 1138 of `scorecardApi.ts` explicitly sets `otProductivity: null` with a comment "Legacy path - OT productivity not computed here." The `fetchWeeklyScorecardDualRead` function calls the legacy `fetchWeeklyScorecard` for current/recent weeks, which never computes OT productivity.

2. **Productivity includes OT tickets** -- The legacy ticket query (line 918-922) fetches all `ticket_logs` without selecting or filtering the `is_ot` column. This means OT email tickets are counted as regular email tickets, inflating regular productivity while OT productivity remains null.

The **RPC-based path** (`fetchWeeklyScorecardRPC`) already handles both correctly -- the `get_weekly_scorecard_data` RPC separates `email_count` (excluding OT) from `ot_email_count`, and the RPC path computes OT productivity using the schedule resolver. But the UI never calls it.

## Fix

**File**: `src/lib/scorecardApi.ts`

### Change 1: Switch live data path to use the RPC function

In `fetchWeeklyScorecardDualRead` (line 248-249), replace the call to the legacy `fetchWeeklyScorecard` with `fetchWeeklyScorecardRPC`, which already has correct OT separation and OT productivity calculation.

```typescript
// Before:
return fetchWeeklyScorecard(weekStart, weekEnd, supportType);

// After:
const result = await fetchWeeklyScorecardRPC(weekStart, weekEnd, supportType);
return result.data;
```

This single change fixes both issues because:
- The RPC separates regular email tickets from OT tickets at the database level
- The RPC path already computes OT productivity using effective schedules and `quota_ot_email`
- The RPC path falls back to the legacy function automatically if the RPC call fails

### Other considerations

- **No database changes needed** -- the RPC already has the correct logic from our previous updates.
- **Performance improvement** -- the RPC consolidates 10+ parallel queries into a single database call, so this is actually faster.
- **The legacy `fetchWeeklyScorecard` function** can remain as a fallback (the RPC path already falls back to it on error), but it will still have the OT bug if used. We could optionally fix it too for safety, but the RPC path should handle all cases.

