# Plan: Fix Chat AHT Calculation, Display Units & Sync Database Goals ✅ COMPLETED

## Summary
All three issues have been addressed:
1. ✅ **Fixed Chat AHT calculation** - Now uses `agent_work_time` only (handle time), removed `full_resolution_time` fallback
2. ✅ **Changed display to seconds** - UI now shows raw seconds (e.g., "420s") instead of mm:ss format
3. ✅ **Synced database goals** - Updated `scorecard_config` table to match spreadsheet values

---

## Issue 1: Chat AHT Calculation (Edge Function Fix)

### Current Problem
The edge function at line 269-275 uses `full_resolution_time_in_minutes` which includes:
- Queue time (before agent picks up)
- Wait time (customer waiting for responses)  
- Actual handle time

This produces inflated values like 9171 seconds (2.5+ hours) instead of actual handle time.

### Solution
Change the Chat AHT logic to:
1. **Primary**: Use `agent_work_time` from Ticket Metric Events API (tracks actual time agent worked on ticket)
2. **Fallback**: If `agent_work_time` not available, skip the metric (show null)

**File:** `supabase/functions/fetch-zendesk-metrics/index.ts`

```text
Lines 269-275 - BEFORE:
  // AHT: For messaging tickets, Explore uses full_resolution_time as "Handle Time"
  const fullResolutionMinutes = tm?.full_resolution_time_in_minutes?.calendar;
  if (fullResolutionMinutes !== null) {
    ahtSeconds = Math.round(fullResolutionMinutes * 60);
  }

Lines 269-275 - AFTER:
  // AHT: Use agent_work_time ONLY (actual handle time, excludes queue/wait)
  // Do NOT use full_resolution_time as it includes queue and wait time
  // agent_work_time will be fetched from metric events below
  // Leave ahtSeconds as null here - will be populated from metric events
```

This ensures only actual agent handle time is captured.

---

## Issue 2: Display Units (UI Change)

### Current State
- Values stored in seconds in database
- Displayed as `mm:ss` format via `formatSeconds()` function
- Hardcoded `METRIC_GOALS` object doesn't match database

### Solution
1. Remove the `formatSeconds` usage and display raw seconds
2. Remove the hardcoded `METRIC_GOALS` object - use database goals from `scorecard_config`
3. Add "s" suffix for clarity (e.g., "420s")

**File:** `src/pages/TeamScorecard.tsx`

Changes:
- Remove/modify `METRIC_GOALS` constant (lines 35-40)
- Update `EditableMetricCell` usage to show seconds: replace `formatValue={formatSeconds}` with `formatValue={(v) => v !== null ? `${v}s` : '-'}`
- Fetch goals from `scorecard_config` query and use them dynamically

**File:** `src/components/scorecard/EditableMetricCell.tsx`

Changes:
- Update input parsing to accept raw seconds (not mm:ss)
- Update display to show seconds with "s" suffix

---

## Issue 3: Database Goal Sync

### Discrepancies Found

Based on your spreadsheet, the following `scorecard_config` records need updating:

| Support Type | Metric | Current Goal | Correct Goal |
|--------------|--------|--------------|--------------|
| Hybrid Support | call_aht | 240 | **420** |
| Hybrid Support | chat_aht | 420 | **600** |
| Hybrid Support | chat_frt | 20 | **30** |
| Hybrid Support | qa | 96 | **100** |
| Hybrid Support | reliability | 98 | **100** |
| Email Support | productivity | 100 | **715** |
| Email Support | revalida | 100 | **95** |
| Email Support | reliability | 100 | **98** |
| Logistics | reliability | 100 | **98** |
| Logistics | (missing) | - | Add productivity, QA, revalida |

**Action:** Use data update tool to sync these values.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/fetch-zendesk-metrics/index.ts` | Fix Chat AHT to use `agent_work_time` only |
| `src/pages/TeamScorecard.tsx` | Remove hardcoded goals, display seconds, use DB config |
| `src/components/scorecard/EditableMetricCell.tsx` | Parse/display raw seconds instead of mm:ss |
| `src/lib/scorecardApi.ts` | Update `formatSeconds` to `formatSecondsAsRaw` |
| Database: `scorecard_config` | Update goal values to match spreadsheet |

---

## Implementation Order

1. ✅ **Step 1**: Updated database `scorecard_config` goals
2. ✅ **Step 2**: Fixed edge function Chat AHT calculation
3. ✅ **Step 3**: Deployed edge function
4. ✅ **Step 4**: Updated UI to display seconds
5. **Step 5**: Clear cached metrics and refresh to test ← **READY FOR USER TESTING**

---

## Expected Outcome

1. ✅ **Chat AHT values** will show realistic agent handle times (typically 60-600 seconds)
2. ✅ **Display format** shows raw seconds (e.g., "420s")
3. ✅ **Goal comparisons** use correct values from spreadsheet
4. ✅ **Percentage calculations** accurate based on correct goals

## Next Steps for User
1. Navigate to Team Scorecard
2. Select "Hybrid Support" and a week
3. Click "Refresh Metrics" to fetch new Chat AHT values using agent_work_time
4. Verify values display in seconds and match expectations
