

# Fix QA Score Showing in Wrong Week on Team Scorecard

## Problem

Jessie Argao is showing a QA score for work week Feb 9-15 even though all of Jessie's QA evaluations have `work_week_start: 2026-02-02` (belonging to work week Feb 2-8). The QA evaluation was audited on Feb 10 (today), which falls within the Feb 9-15 calendar week.

## Root Cause

The **legacy scorecard function** in `src/lib/scorecardApi.ts` filters QA evaluations by `audit_date` (the date the evaluation was performed) instead of `work_week_start` (the work week the evaluation belongs to).

```text
Current (wrong):
  .gte('audit_date', weekStartStr)    -- picks up evals audited this week
  .lte('audit_date', weekEndStr)      -- even if they belong to a different work week

Correct:
  .gte('work_week_start', weekStartStr)  -- only picks up evals assigned to this week
  .lte('work_week_start', weekEndStr)
```

The database RPC function (`get_weekly_scorecard_data`) already uses the correct filter (`work_week_start`), but the legacy fallback function is used when the RPC fails. Both need to be consistent to prevent this issue.

## Fix

### File: `src/lib/scorecardApi.ts`

1. **Update the QA evaluations query** (lines 706-710) to filter by `work_week_start` instead of `audit_date`
2. Also select `work_week_start` in the query fields so it is available for grouping
3. Add a fallback for legacy evaluations that may not have `work_week_start` set -- use `audit_date` only when `work_week_start` is null

This is a single-file, single-line-range change.

