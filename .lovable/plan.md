

## Revised Fix Plan: Schedule System Inconsistencies

### Updated Root Cause

The previous analysis assumed Ruth and Erika had overnight shifts and needed a code fix. The reference images reveal their schedules are simply **wrong data** — both should be standard daytime (9:00 AM-5:30 PM) but are stored as overnight shifts. Similarly, Biah and Richelle have stale/incorrect profile data beyond just the OT issue.

### Data Corrections Needed (All 4 Agents)

**Biah Mae Divinagracia** — Profile + Assignments:
- Break: `12:00 PM-01:00 PM` (currently 12:30 PM-01:00 PM)
- OT: uniform `5:30 PM-7:30 PM` all working days (profile has Thu/Fri as 7:00 AM-9:00 AM)
- Assignments: fix OT from 7:00 AM-9:00 AM to 5:30 PM-7:30 PM; clear Thu/Fri (day off)

**Richelle Cayabyab** — Profile + Assignments:
- Day off: `Sat-Sun` (currently Fri-Sat)
- OT: uniform `7:00 AM-9:00 AM` all working days (profile has most days as 6:00 PM-8:00 PM)
- Assignments: clear Sat/Sun (day off)

**Ruth Gajo** — Profile + Assignments (complete rewrite):
- Shift: `9:00 AM-5:30 PM` (currently 5:00 PM-2:30 AM)
- Break: `01:00 PM-01:30 PM` (currently 11:00 PM-11:30 PM)
- OT: `7:00 AM-9:00 AM` (currently 2:30 AM-4:30 AM)
- Day off: Wed-Thu (correct)

**Erika Rhea Santiago** — Profile + Assignments (complete rewrite):
- Shift: `9:00 AM-5:30 PM` (currently 7:00 PM-6:30 AM)
- Break: `12:30 PM-01:00 PM` (currently 10:30 PM-11:00 PM)
- OT: `7:00 AM-9:00 AM` on working days (currently only Fri has OT)
- Day off: `Sat-Sun` (currently Fri-Sat-Sun)

### Implementation Steps

**Step 1: SQL migration to fix all 4 agents' profiles and assignments**
- Update `agent_profiles` for Biah, Richelle, Ruth, Erika with correct per-day schedules, OT, breaks, and days off
- Update `agent_schedule_assignments` for weeks 2026-02-23 and 2026-03-02 to match
- Sync `agent_directory` break/schedule fields

**Step 2: Fix overnight shift detection in Team Status (still needed)**
- Even though Ruth/Erika aren't overnight, the `isWithinScheduleWindow()` bug should be fixed for any future overnight agents
- Add wrap-around logic: if `end < start`, valid window is `time >= start || time <= end`

**Step 3: Coverage Board Override Editor — add OT block type**
- Add block type selector (Regular / OT / Day Off) to the OverrideEditor
- Pass `block_type` to `PendingOverride` instead of hardcoding `'regular'`

**Step 4: Profile save — preserve current week**
- When saving profile schedule changes, upsert current week assignment with OLD values if none exists, so changes only take effect next week

**Step 5: Coverage Board schedule resolution**
- Use resolved schedules (from the schedule resolver) instead of raw profile fields in `getEffectiveBlocks()`

### Execution Order
Step 1 first (data fix), then verify all 4 agents appear correctly before proceeding to code fixes.

