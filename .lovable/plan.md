

# Fix Timezone-Sensitive Event Date Matching in Dashboard

## Problem
Jaeran's LOGIN event is stored as `2026-02-09T21:04:19Z` (4:04 PM EST Monday). However, the code that matches events to days uses `format(parseISO(event.created_at), 'yyyy-MM-dd')`, which formats using the **browser's local timezone**. For users in timezones ahead of UTC (e.g., Philippines at UTC+8), this timestamp becomes `2026-02-10` (Tuesday), causing Monday to show "Absent" and Tuesday to show "Present (4:04 PM)".

## Root Cause
In `src/lib/agentDashboardApi.ts`, the `buildWeeklyAttendance` function matches events to days using local timezone formatting instead of EST. Three locations need fixing:

1. **Line 1505-1506**: `today` is set using `new Date()` (local timezone) instead of EST
2. **Line 1632**: LOGIN event date matching uses `format(parseISO(...), 'yyyy-MM-dd')` (local timezone)
3. **Line 1638**: LOGOUT event date matching — same issue
4. **Line 1534**: OT_LOGIN event date matching — same issue  
5. **Line 1538**: OT_LOGOUT event date matching — same issue

## Fix

### File: `src/lib/agentDashboardApi.ts`

Create a helper function to format a UTC timestamp's date portion in EST:

```text
function formatDateInEST(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
```

Then update:

1. **`today` variable** (line 1505-1506): Use EST-based "today" derived from the portal clock pattern instead of raw `new Date()`
2. **LOGIN matching** (line 1632): Replace `format(parseISO(event.created_at), 'yyyy-MM-dd')` with `formatDateInEST(parseISO(event.created_at))`
3. **LOGOUT matching** (line 1638): Same replacement
4. **OT_LOGIN matching** (line 1534): Same replacement
5. **OT_LOGOUT matching** (line 1538): Same replacement

This ensures all event-to-day matching uses EST regardless of the user's browser timezone.

## No Database Changes Needed
The LOGIN event data (`2026-02-09T21:04:19Z`) is correct — it corresponds to 4:04 PM EST on Monday Feb 9. The issue is purely a frontend timezone conversion bug.

