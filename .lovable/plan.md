

## Root Cause Analysis & Fix Plan: Schedule System Inconsistencies

### Issues Found

**Issue 1: Biah & Richelle — Wrong OT displayed ("Post Shift" instead of "Pre-shift")**
- **Root cause**: The `agent_schedule_assignments` table for week `2026-03-02` has ALL days set to `7:00 AM-9:00 AM` OT. But the `agent_profiles` table has the correct per-day values (e.g., Biah Mon = `5:30 PM-7:30 PM`, Fri = `7:00 AM-9:00 AM`). A previous bulk update flattened the per-day OT into a single value. The schedule resolver picks up `agent_schedule_assignments` over `agent_profiles`, so it shows the wrong OT.
- **Fix**: SQL migration to correct the `agent_schedule_assignments` rows for Biah and Richelle to match their actual per-day OT from `agent_profiles`.

**Issue 2: Ruth & Erika — Not showing in Team Status**
- **Root cause**: Both have correct schedules and `get_team_status_data` DOES return them. Ruth works 5:00 PM - 2:30 AM EST and Erika works 7:00 PM - 6:30 AM EST. The `isWithinScheduleWindow()` function in `teamStatusApi.ts` doesn't handle overnight shifts correctly — it checks `isTimeInScheduleRange(currentTimeMinutes, start, end)` but for overnight shifts where end < start (e.g., 17:00-2:30), the range check fails during daytime hours and also fails during the next-day portion (0:00-2:30 AM). The `parseScheduleRange` returns `{start: 17, end: 2.5}` and `isTimeInScheduleRange` likely doesn't wrap correctly.
- **Fix**: Fix `isWithinScheduleWindow()` to properly handle overnight shifts where end < start.

**Issue 3: Coverage Board — OT on Day Offs unresponsive**
- **Root cause**: The `OverrideEditor` component hardcodes `block_type: 'regular'` (line 106). There's no mechanism in the UI to create OT-type overrides. When you click a day-off cell, it opens the regular override editor, but OT overrides need a separate `block_type: 'ot'` entry.
- **Fix**: Extend `OverrideEditor` to support a block type selector (Regular / OT / Day Off) so admins can create OT overrides on any day including day-off days.

**Issue 4: Team Status showing stale schedules**
- **Root cause**: The `get_team_status_data` RPC correctly resolves schedules from assignments > profiles. BUT the Coverage Board's `fetchAgentSchedules()` reads raw `agent_profiles` (via the `agent_profiles_team_status` view), not resolved schedules. So the Coverage Board timeline shows the old base profile data instead of the effective schedule. When admins make changes on profiles, the base `agent_profiles` table updates immediately, but the `agent_schedule_assignments` targets next week — creating a mismatch where the Coverage Board shows "new" data while the resolver uses "old" assignment data for the current week.
- **Fix**: The Coverage Board's timeline rendering (`getEffectiveBlocks`) already receives overrides, but it falls back to `getScheduleForDay(agent, jsDayIndex)` which reads raw profile fields. This needs to use the effective schedule data from `get_team_status_data` or the resolver instead.

**Issue 5: Profile saves updating base table immediately**
- **Root cause**: When an admin saves a profile, `upsertProfile()` updates `agent_profiles` immediately AND creates a schedule assignment for next Monday. But `agent_profiles` is the fallback source for the current week (when no assignment exists for it). This means if someone had no assignment for the current week, the profile change takes effect immediately instead of next week.
- **Fix**: When saving profile schedule changes, also upsert the CURRENT week's assignment with the OLD values (if no current-week assignment exists), ensuring the current week remains unchanged.

### Implementation Steps (one at a time)

**Step 1: Data fix — Correct Biah & Richelle schedule assignments**
- SQL migration to update their `agent_schedule_assignments` for weeks `2026-02-23` and `2026-03-02` with correct per-day OT values from `agent_profiles`.

**Step 2: Fix overnight shift detection in Team Status**
- Update `isWithinScheduleWindow()` in `teamStatusApi.ts` to handle overnight shifts where the end time is less than the start time (wrap-around logic).

**Step 3: Extend Coverage Board Override Editor for OT**
- Add a block type selector to `OverrideEditor` (Regular Schedule / OT Schedule / Day Off toggle).
- Pass the selected block type through to `PendingOverride.block_type`.
- Allow OT overrides to be created on day-off cells.

**Step 4: Fix profile save to preserve current week**
- In `upsertProfile()`, before creating the next-week assignment, check if a current-week assignment exists. If not, create one with the OLD profile values so the current week is frozen.

**Step 5: Coverage Board schedule resolution**
- Update `getEffectiveBlocks()` to accept resolved schedule data (from the schedule resolver) instead of reading raw profile fields, ensuring the Coverage Board displays the same effective schedule as Team Status and Dashboard.

### Technical Details

- The `isTimeInScheduleRange` utility likely needs an overnight-aware variant: if `end < start`, the valid window is `time >= start || time <= end`.
- The Coverage Board currently loads agents from `agent_profiles_team_status` view. To show effective schedules, it should either call the `get_team_status_data` RPC or integrate the schedule resolver per-agent per-day.
- The `OverrideEditor` block_type will need a radio group or tabs: "Regular", "OT", "Day Off" — each creating the corresponding `override_type` in `coverage_overrides`.

