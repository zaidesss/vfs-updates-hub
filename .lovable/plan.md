

## Phase 5: Profile Events Purging + Dashboard Dual-Read Integration ✅ COMPLETE

### What was done:

**Part A: Profile Events Purging** — Added `profile_events` deletion to `cleanup-ticket-logs` edge function. Records older than the 2-week retention window are now purged alongside `ticket_logs` and `ticket_gap_daily`. The purge count is logged and included in the response.

**Part B: Dashboard Dual-Read Integration** — Wired `fetchAttendanceDualRead` into `AgentDashboard.tsx`. Historical weeks (older than 2 weeks) now read from `attendance_snapshots` instead of live `profile_events`. The Activity card shows empty for snapshot weeks (granular event snapshots are a future enhancement). The existing Snapshot badge displays automatically.

### All Phases Complete:
- Phase 1: Snapshot tables ✅
- Phase 2: compute-weekly-snapshots function ✅
- Phase 3: snapshot-retention-cleanup function ✅
- Phase 4: Cron scheduling ✅
- Phase 5: Profile events purging + Dashboard dual-read ✅
