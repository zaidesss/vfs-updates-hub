

## Fix: Eradicate ALL Browser-Local Timezone Usage

You're right -- this should have been a one-time, project-wide sweep. The Portal Clock (EST) is the single source of truth, period. Here is every remaining violation found across the codebase.

### Violations Found

| # | File | Line(s) | What It Does Wrong | Risk Level |
|---|------|---------|--------------------|------------|
| 1 | `src/lib/agentDashboardApi.ts` | 431-432 | LOGIN stale detection uses `format(now, 'yyyy-MM-dd')` -- browser-local date | **Critical** -- causes misdated NO_LOGOUT reports |
| 2 | `src/lib/agentDashboardApi.ts` | 1316 | Break duration filter uses `format(parseISO(...), 'yyyy-MM-dd')` -- browser-local date | **High** -- break events grouped by wrong day for non-EST agents |
| 3 | `src/lib/agentDashboardApi.ts` | 1492 | Weekly attendance builder uses `format(date, 'yyyy-MM-dd')` with local midnight | **Medium** -- date strings may shift for edge-case timezones |
| 4 | `src/lib/agentDashboardApi.ts` | 2143 | `getTodayGapData` uses `format(new Date(), 'yyyy-MM-dd')` -- browser-local "today" | **High** -- gap data fetched for wrong day |
| 5 | `src/lib/agentDashboardApi.ts` | 2395 | `fetchAndCacheUpworkTime` uses `format(new Date(), 'yyyy-MM-dd')` -- browser-local "today" | **High** -- Upwork sync for wrong day |
| 6 | `src/components/coverage-board/CoverageTimeline.tsx` | 116 | Today highlight uses `format(now, 'yyyy-MM-dd')` | **Low** -- visual-only, but still inconsistent |
| 7 | `src/components/agent-reports/AgentAnalyticsPanel.tsx` | 37-38 | Analytics date range uses `format(new Date(), 'yyyy-MM-dd')` | **Low** -- date range endpoint off by 1 day possible |
| 8 | `src/components/coverage-board/OverrideEditor.tsx` | 79 | Override date uses `format(date, 'yyyy-MM-dd')` | **Low** -- date comes from week selector, but should be consistent |
| 9 | `src/pages/OutageStats.tsx` | 94 | Month default uses `format(new Date(), 'yyyy-MM')` | **Low** -- month selector default |
| 10 | `src/pages/OutageReport.tsx` | 53 | Same as above | **Low** |
| 11 | `src/pages/QAEvaluations.tsx` | 91 | Week default uses `format(weekStart, 'yyyy-MM-dd')` where weekStart comes from `new Date()` | **Low** -- initial default only |

Note: `format(parseISO(...), 'MMM d, yyyy')` usages in display-only contexts (AgentReports table, LeaveRequest table, ReportDetailDialog) are safe -- they're formatting stored date strings for human display, not deriving a date key.

### Fix Approach

All fixes follow one simple rule: **replace browser-local date derivation with Portal Clock EST or `getESTDateFromTimestamp`**.

**Step 1 (Critical fixes in agentDashboardApi.ts)**

- Line 431-432: Replace `format(now, 'yyyy-MM-dd')` and `format(statusDate, 'yyyy-MM-dd')` with `getESTDateFromTimestamp(now.toISOString())` and `getESTDateFromTimestamp(currentStatusData.status_since)`
- Line 1316: Replace `format(parseISO(event.created_at), 'yyyy-MM-dd')` with `getESTDateFromTimestamp(event.created_at)`
- Line 1492: Replace `format(date, 'yyyy-MM-dd')` with a proper EST date string derived from the week offset
- Line 2143: Replace `format(new Date(), 'yyyy-MM-dd')` with `getTodayEST()` from timezoneUtils
- Line 2395: Replace `format(new Date(), 'yyyy-MM-dd')` with `getTodayEST()` from timezoneUtils

**Step 2 (Component fixes)**

- CoverageTimeline.tsx line 116: The `now` here comes from PortalClock, but `format(now, 'yyyy-MM-dd')` still uses date-fns which interprets it as local. Replace with building the string from `now.getFullYear()`/`getMonth()`/`getDate()` directly (since PortalClock's `now` already has EST-adjusted local getters), or use the `todayEST` property from `usePortalClock()` which already provides this exact string.
- AgentAnalyticsPanel.tsx lines 37-38: Replace with `getTodayEST()` and calculate 6 months back in EST.
- OverrideEditor.tsx line 79: The `date` comes from the week selector grid (already aligned to EST weeks), so `format(date, 'yyyy-MM-dd')` is acceptable here since the Date object represents a specific calendar date. No change needed.

**Step 3 (Page defaults -- low priority but included for completeness)**

- OutageStats.tsx line 94 and OutageReport.tsx line 53: Replace `format(new Date(), 'yyyy-MM')` with EST-based month string.
- QAEvaluations.tsx line 91: Replace initial week calculation with EST-based date.

### What This Does NOT Touch

- **Edge functions** (server-side): These run in UTC on the server, and their `toISOString().split('T')[0]` patterns are operating on UTC dates which is correct for server-side batch jobs that define their own EST boundaries.
- **Display-only formatting**: `format(parseISO('2026-02-14'), 'MMM d, yyyy')` for showing "Feb 14, 2026" in tables is purely cosmetic and timezone-safe since the source is a stored date string.
- **Week selector math**: Files like `scheduleResolver.ts` and `weekConstants.ts` use `format()` on dates that are already anchored to known calendar dates (Monday anchors), not derived from "now".

