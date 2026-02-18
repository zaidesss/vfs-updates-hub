

## Show NCNS Label on Agent Dashboard

### Overview
When an agent's shift schedule shows "Absent" status, and there's an NCNS report for that date, the badge should display **"Absent (NCNS)"** in a darker red to distinguish it from a regular absence (where the agent might have a pending outage request).

### What Changes

**1. Add `isNcns` flag to `DayAttendance` interface** (`agentDashboardApi.ts`)
- Add an optional `isNcns?: boolean` field to the `DayAttendance` interface

**2. Fetch NCNS reports during attendance building** (`agentDashboardApi.ts`)
- In the `buildWeekAttendance` function (or the caller that assembles dashboard data), query `agent_reports` for NCNS incidents matching the agent's email and the week's date range
- When a day resolves to `absent` status, check if an NCNS report exists for that date and set `isNcns: true`

**3. Update badge rendering** (`ShiftScheduleTable.tsx`)
- In the `getStatusBadges` function, update the `absent` case to check `dayAttendance.isNcns`
- If true, render **"Absent (NCNS)"** with a darker red style (e.g., `bg-red-700 text-white`) to visually differentiate it from a standard "Absent"

### Considerations
- Should we also show "Absent (NCNS)" differently from an absent day that has a pending outage request? Currently both show "Absent" -- but NCNS means no outage request exists at all. This change already addresses that distinction.
- The snapshot-based attendance (for past weeks) would also need the NCNS flag. We can add it to the snapshot query path as well.

### Technical Steps (one at a time)

**Step 1** -- Add `isNcns` to `DayAttendance` and fetch NCNS reports in `buildWeekAttendance`

**Step 2** -- Update `ShiftScheduleTable` badge rendering for the NCNS variant
