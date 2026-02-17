

## Fix: Day Off Detection Returning "Absent" for Actual Days Off

### Problem
Pauline (Sunday day off) and Jaeran (Saturday/Sunday day off) are incorrectly flagged as "Absent" on their days off. This affects attendance display across the Agent Dashboard.

### Root Cause: Day Name Format Mismatch

There are two compounding bugs caused by inconsistent day name formats:

**Bug 1 -- `fetchDashboardProfile` produces wrong `day_off` format (line 339)**
```
dayOffArray = weekSchedules
  .filter(d => d.isDayOff)
  .map(d => d.dayName); // Comment says ['Sat', 'Sun'] but actually produces ['Saturday', 'Sunday']
```
The RPC `get_effective_schedules_for_week` returns full day names (`'Monday'`, `'Tuesday'`, etc.), so `dayOffArray` ends up as `['Saturday', 'Sunday']` instead of `['Sat', 'Sun']`.

**Bug 2 -- `calculateAttendanceForWeek` lookup never matches (line 1593)**
```
const effectiveDay = effectiveWeekSchedules?.find(d => d.dayName === day.short);
```
This compares `'Sunday'` (from RPC) against `'Sun'` (from DAYS array), so `effectiveDay` is always `undefined`.

Since `effectiveDay` is undefined, the fallback runs: `dayOffArray.includes('Sun')`. But `dayOffArray` contains `'Sunday'` (from Bug 1), so this also returns `false`. The day is treated as a working day with no login, resulting in "Absent".

**Bug 3 -- Same mismatch in `ShiftScheduleTable` (line 181 and 208)**
The same `dayName === dayShort` comparison exists in the schedule display table, potentially causing incorrect schedule display.

### Fix Plan

All fixes involve converting full day names to short abbreviations for consistent matching.

#### Step 1: Fix `fetchDashboardProfile` day_off mapping
**File: `src/lib/agentDashboardApi.ts` (line 337-339)**

Change `.map(d => d.dayName)` to extract the 3-letter abbreviation:
```
.map(d => d.dayName.substring(0, 3)); // 'Monday' -> 'Mon', 'Sunday' -> 'Sun'
```

This ensures `dayOffArray` contains `['Sat', 'Sun']` as consumers expect.

#### Step 2: Fix `calculateAttendanceForWeek` effective schedule lookup
**File: `src/lib/agentDashboardApi.ts` (line 1593)**

Change the find predicate to match on short name:
```
const effectiveDay = effectiveWeekSchedules?.find(
  d => d.dayName.substring(0, 3) === day.short
);
```

This ensures the effective schedule (which knows the true day-off status from the RPC) is properly matched.

#### Step 3: Fix `ShiftScheduleTable` effective schedule lookups
**File: `src/components/dashboard/ShiftScheduleTable.tsx` (lines 181 and 207)**

Apply the same `.substring(0, 3)` fix to both lookup sites:
```
const effectiveDay = effectiveWeekSchedules?.find(d => d.dayName.substring(0, 3) === dayShort);
```

### Additional Considerations

1. **Snapshot path**: The snapshot-based attendance (for weeks older than 2 weeks) reads pre-computed data and does not go through `calculateAttendanceForWeek`, so snapshots already frozen with "absent" for a day off would remain incorrect. However, this only affects historical data.

2. **OT on day off**: The `calculateOTForDay` helper reads OT schedule from the profile using `day.key` (`sun_ot_schedule`), not from effective schedules. This is a separate minor inconsistency but doesn't cause the absent flag.

3. **Coverage Board overrides**: The override path (`if (!override && isDayOff)`) is unaffected since it checks the override map by date string, not day name.

### Summary of Changes
- `src/lib/agentDashboardApi.ts`: 2 line changes (lines 339 and 1593)
- `src/components/dashboard/ShiftScheduleTable.tsx`: 2 line changes (lines 181 and 207)
