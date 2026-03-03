

## Fix Timezone-Dependent Dashboard Inconsistencies

### Root Cause

Three issues cause agent dashboards (viewed from PHT/UTC+8) to show different data than admin views (EST):

1. **Event query boundaries use `.toISOString()`** — `getWeekStatusEvents` and `getWeekAllEvents` convert `weekStart`/`weekEnd` Date objects via `.toISOString()`, which produces UTC timestamps based on the viewer's local timezone. For PHT agents, this shifts the query window ~13 hours earlier than EST-anchored boundaries, causing events near week edges to be missed or misplaced.

2. **Break schedule uses a single value for the whole week** — `calculateAttendanceForWeek` reads `profile.break_schedule` (which is set to "today's" effective break schedule) and applies that same value to every day row. If the agent's break schedule varies by day, all rows show the wrong break allowance.

3. **`getTodayTicketCount` uses local midnight** — It sets `startOfDay`/`endOfDay` using the viewer's local `setHours(0,0,0,0)`, then calls `.toISOString()`. This produces different query windows per timezone.

### Fix Plan (3 steps, done one at a time)

---

**Step 1 — Fix event query boundaries in `agentDashboardApi.ts`**

In `getWeekStatusEvents` and `getWeekAllEvents`, replace:
```typescript
const startStr = weekStart.toISOString();
const endStr = weekEnd.toISOString();
```
with:
```typescript
const weekStartStr = format(weekStart, 'yyyy-MM-dd');
const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
const { start: startStr, end: endStr } = getESTWeekBoundaries(weekStartStr, weekEndStr);
```

This ensures all viewers query the identical EST-anchored UTC window.

Also fix `getTodayTicketCount` to use `getESTDayBoundaries(getTodayEST())` instead of local-midnight `.toISOString()`.

---

**Step 2 — Use per-day break schedule in attendance calculation**

In `calculateAttendanceForWeek`, instead of using the single `profile.break_schedule` for the `allowedBreakMinutes` calculation on every row, read `effectiveDay.breakSchedule` for each day individually. This means moving the break parsing inside the `DAYS.map()` loop and using the effective schedule's per-day break value when available, falling back to `profile.break_schedule` otherwise.

---

**Step 3 — Clear schedule cache on dashboard load**

Add `clearScheduleCache()` at the start of `loadDashboardData()` in `AgentDashboard.tsx` to prevent stale cached schedules from causing incorrect day-off or shift displays after profile/schedule changes.

---

### Day-level query audit (Additional Consideration #1)

`getDayPortalHours` and `getDayTicketCountByType` already use `getESTDayBoundaries` — no fix needed. `getTodayTicketCount` needs fixing (covered in Step 1).

### Redeployment (Additional Consideration #2)

After all fixes, the published app must be redeployed so agents on the production URL see the corrected code.

