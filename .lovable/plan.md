

## Diagnosis

### Root Cause: OT Productivity Still Empty

The `get_weekly_scorecard_data` RPC is **failing silently** every time it's called. The error:

```
operator does not exist: date = text
```

This happens because the RPC converts `p_week_start`/`p_week_end` to TEXT strings (`v_week_start_str`), then compares them against:
- `zendesk_agent_metrics.week_start` — which is a **DATE** column
- `zendesk_agent_metrics.week_end` — which is a **DATE** column  
- `saved_scorecards.week_start` — which is a **DATE** column
- `saved_scorecards.week_end` — which is a **DATE** column

PostgreSQL does not implicitly cast DATE = TEXT, so the entire RPC throws an error. The code catches this error and silently falls back to the legacy `fetchWeeklyScorecard` function, which hardcodes `otProductivity: null`. This is why the OT productivity column has shown a dash every single time — the RPC fix we made was never actually executing.

**Richelle has 89 OT tickets this week and a quota of 29/day — the data exists, the RPC just never runs.**

### Root Cause: UTC Timezone Usage

The `getDataSourceForWeek` function in `scorecardApi.ts` uses `new Date()` (browser UTC time) instead of the PortalClock EST time. While this particular usage is a relative comparison (within 2 weeks) and unlikely to cause visible bugs, it violates the EST-only policy.

---

## Fix Plan

### Step 1: Fix the RPC type mismatch (database migration)

Update the `get_weekly_scorecard_data` function to cast `v_week_start_str` and `v_week_end_str` back to DATE when comparing against DATE columns:

```sql
-- In zendesk_metrics CTE:
WHERE zm.week_start = v_week_start_str::date
  AND zm.week_end = v_week_end_str::date

-- In saved_status CTE:
WHERE ss.week_start = v_week_start_str::date
  AND ss.week_end = v_week_end_str::date
```

Alternatively (and cleaner): remove the TEXT conversion entirely and just use `p_week_start` / `p_week_end` directly since they're already DATE type. This eliminates the TEXT intermediary.

### Step 2: Replace `new Date()` with EST-aware time in `scorecardApi.ts`

In `getDataSourceForWeek` (line 154), replace `new Date()` with an EST-derived date using the `getTodayEST` utility, or accept the portal clock's `now` as a parameter. Since this is a utility function (not a hook), we'll use `Intl.DateTimeFormat` directly for EST.

