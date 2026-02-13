

## Phase 5: Profile Events Purging + Dashboard Dual-Read Integration

### Overview
Two closely related changes to complete the snapshot system:
1. Add `profile_events` cleanup to the weekly purge job
2. Wire the Agent Dashboard to read from snapshots for historical weeks

---

### Part A: Profile Events Purging

**File: `supabase/functions/cleanup-ticket-logs/index.ts`**

Currently this function purges `ticket_logs` and `ticket_gap_daily` but leaves `profile_events` untouched. We will add a step to delete `profile_events` records older than the 2-week retention window (same cutoff logic already used for ticket_logs).

- After the existing ticket_gap_daily cleanup block, add a new section that deletes `profile_events` where `created_at < cutoffDate`
- Log the count of purged profile events in the response

This is safe because the `compute-weekly-snapshots` job (running Sunday 9AM EST) already captures all profile_events data into `attendance_snapshots` and `event_snapshots` before Monday's cleanup runs.

---

### Part B: Dashboard Dual-Read Integration

**File: `src/pages/AgentDashboard.tsx`**

Currently (lines 193-213), the dashboard always fetches live data from `profile_events` via `getWeekLoginEvents`, `getWeekAllEvents`, etc., regardless of how old the week is.

The change: When the selected week is older than 2 weeks, use the existing `fetchAttendanceDualRead` function instead of the live data path.

- Import `fetchAttendanceDualRead` from `agentDashboardApi`
- In the data loading section, check `getDataSourceForWeek(weekStart)`:
  - If `'snapshot'`: call `fetchAttendanceDualRead` to get attendance from snapshots, and skip the live event fetches (since raw events are purged). Set `allEvents` to an empty array (the Activity card will show "No events" for old weeks)
  - If `'live'`: keep the current behavior (fetch from live tables, calculate attendance)
- The existing `dataSource` state and Snapshot badge already exist, so the UI indicator will work automatically

---

### Execution Order
1. Update `cleanup-ticket-logs` to also purge `profile_events`
2. Wire `fetchAttendanceDualRead` into the dashboard's data loading

### What This Means for Users
- Historical weeks (older than 2 weeks) will display attendance data from frozen snapshots with a "Snapshot" badge
- The "Activity" card will show "No events" for historical weeks (granular event snapshots are a future enhancement)
- Recent weeks continue to work exactly as they do today
- The `profile_events` table stays lean, preventing table bloat over time

