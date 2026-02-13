

## Fix: EST Date Formatting in Non-React API Functions

### What Happened

The PortalClock migration correctly updated all **React components** to use EST-aware time. However, four spots in **non-React API/utility functions** still use `date-fns format(date, 'yyyy-MM-dd')`, which formats dates using the **browser's local timezone** (e.g., UTC+8 for Philippines-based agents). This caused Erika's 7:20 PM EST login on Feb 12 to be interpreted as Feb 13 (her day off), skipping the late-login check entirely.

### Affected Spots

| File | Line | Function | Impact |
|------|------|----------|--------|
| `scheduleResolver.ts` | 53 | `getEffectiveScheduleForDate` | Wrong date passed to the RPC -- returns wrong day's schedule |
| `agentDashboardApi.ts` | 945 | `checkAndAlertLateLogin` | Report filed under wrong date, duplicate check queries wrong date |
| `agentDashboardApi.ts` | 1013 | `checkAndAlertEarlyOut` | Same as above for early-out detection |
| `agentDashboardApi.ts` | 1065 | `checkAndAlertOverbreak` | Same as above for overbreak detection |

### Fix (Single Step)

Replace all 4 instances of `format(date, 'yyyy-MM-dd')` with `getESTDateFromTimestamp(date.toISOString())` from the existing `timezoneUtils.ts` utility:

**File 1: `src/lib/scheduleResolver.ts` (line 53)**
- Import `getESTDateFromTimestamp` from `@/lib/timezoneUtils`
- Change: `format(date, 'yyyy-MM-dd')` to `getESTDateFromTimestamp(date.toISOString())`
- This ensures all schedule lookups resolve against the EST workday

**File 2: `src/lib/agentDashboardApi.ts` (lines 945, 1013, 1065)**
- `getESTDateFromTimestamp` is already imported in this file
- Line 945: `format(loginTime, 'yyyy-MM-dd')` to `getESTDateFromTimestamp(loginTime.toISOString())`
- Line 1013: `format(logoutTime, 'yyyy-MM-dd')` to `getESTDateFromTimestamp(logoutTime.toISOString())`
- Line 1065: `format(now, 'yyyy-MM-dd')` to `getESTDateFromTimestamp(now.toISOString())`

### Risk Assessment

- **Low risk**: `getESTDateFromTimestamp` is a well-tested utility already used throughout the portal
- **No behavioral change** for users already in US Eastern timezone
- **Fixes** all cross-timezone compliance detection (Late Login, Early Out, Overbreak)

### Backfill

After the fix is deployed, Erika's missed LATE_LOGIN report for Feb 12 will need to be manually triggered or will be caught by the next server-side batch job (if the cron fires correctly). We can address that separately.

