

## Fix: Dashboard Day Off Array Not Populated Correctly

### Root Cause

In `fetchDashboardProfile` (line 344 of `agentDashboardApi.ts`):

```text
day_off: effectiveSchedule.isDayOff ? ['all'] : [],
```

The schedule resolver (`getEffectiveScheduleForDate`) is called for a **single date** (today). It returns `isDayOff: true/false` for just that one day. The code then sets `day_off` to either `['all']` or `[]` -- completely discarding the actual day-off array (e.g., `['Sat', 'Sun']`).

When the dashboard loads on a weekday (Monday), `isDayOff` is `false`, so `day_off` becomes `[]`. Then `calculateAttendanceForWeek` checks `dayOffArray.includes('Sat')` which is `false` because the array is empty. Saturday and Sunday fall through to the "no login + past day = absent" logic.

### The Fix

Replace the single-date schedule resolve with the **week-based resolver** (`getEffectiveSchedulesForWeek`) so that each day in the week gets its own `isDayOff` status. There are two places to fix:

**Fix 1: `fetchDashboardProfile` -- restore proper `day_off` array**

Instead of deriving `day_off` from a single-date resolver call, fetch the week's schedules and build the array from days where `isDayOff === true`:

```text
// Current (broken):
day_off: effectiveSchedule.isDayOff ? ['all'] : [],

// Fixed: use getEffectiveSchedulesForWeek to build proper day_off array
const weekSchedules = await getEffectiveSchedulesForWeek(profileId, weekStart);
const dayOffArray = weekSchedules
  .filter(d => d.isDayOff)
  .map(d => d.dayName);  // e.g., ['Sat', 'Sun']

day_off: dayOffArray,
```

This requires passing a `weekStart` parameter to `fetchDashboardProfile` (the caller in `AgentDashboard.tsx` already has this value).

**Fix 2: `calculateAttendanceForWeek` -- use per-day effective schedules**

Currently this function reads `profile.day_off`, `profile.mon_schedule`, etc. from the static profile/directory. It should also accept the week's effective schedules so that per-day overrides (from coverage board or schedule assignments) are respected for both day-off detection AND schedule lookups.

Add an optional `effectiveWeekSchedules` parameter. When provided, use each day's resolved schedule instead of the profile fields:

```text
// For each day in the loop:
const effectiveDay = effectiveWeekSchedules?.find(d => d.dayName === day.short);

// Day off check becomes:
if (!override && effectiveDay?.isDayOff) { ... }

// Schedule lookup becomes:
scheduleTime = effectiveDay?.schedule || null;
```

**Fix 3: `ShiftScheduleTable` -- also use effective schedules**

The `ShiftScheduleTable` component also reads `profile.day_off` and `profile[day_schedule]` directly. It should receive the effective week schedules and display the resolved values instead.

### Files to Change

1. `src/lib/agentDashboardApi.ts` -- `fetchDashboardProfile` and `calculateAttendanceForWeek`
2. `src/pages/AgentDashboard.tsx` -- pass `weekStart` to profile fetch, pass effective schedules to attendance calculator
3. `src/components/dashboard/ShiftScheduleTable.tsx` -- accept and use effective week schedules

### Why This Matters

Without this fix, any agent whose dashboard is loaded on a day that is NOT their day off will show ALL their days off as "Absent" for past dates. The schedule resolver was introduced but only partially integrated -- the dashboard still bypasses it for the weekly view.
