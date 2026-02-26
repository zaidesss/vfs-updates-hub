

## Problem: Stale Schedule Assignment Overriding Correct Profile

**What's happening**: Nikki's `agent_profiles` has the correct schedule (`9:00 AM -3:30 PM` for all weekdays), but there's a stale record in `agent_schedule_assignments` for week `2026-03-02` with the old `9:00 AM-5:30 PM` schedule. This was created by a `schedule_standardization` batch operation that read outdated data. The schedule resolver prioritizes assignments over the profile, so the dashboard displays the stale assignment data instead of the correct profile values.

**Data state**:
- `agent_profiles`: `9:00 AM -3:30 PM` all weekdays (correct)
- `agent_schedule_assignments` for `2026-03-02`: `9:00 AM-5:30 PM` all days (stale, from batch backfill)
- `agent_schedule_assignments` for `2026-02-09`: `7:00 AM - 1:30 PM` all days (old migration)
- No assignment exists for current week `2026-02-23`, so the `2026-02-09` record is used this week

**Related considerations before we fix**:
1. This likely affects other agents too — the same `schedule_standardization` batch may have written stale data for multiple agents. Should we audit all agents for profile/assignment mismatches?
2. The profile save flow only creates an assignment for **next Monday**. Should it also upsert the **current week** so changes take effect immediately?
3. Should we add a safeguard so batch operations always read from the latest profile data rather than potentially cached/stale sources?

## Proposed Fix (Step 1: Immediate Data Correction)

Run a SQL migration that syncs all `agent_schedule_assignments` records created by `schedule_standardization` to match the current `agent_profiles` values. Also create current-week assignments for agents missing them.

```sql
-- Update all schedule_standardization assignments to match current profile
UPDATE agent_schedule_assignments asa
SET 
  mon_schedule = ap.mon_schedule,
  tue_schedule = ap.tue_schedule,
  wed_schedule = ap.wed_schedule,
  thu_schedule = ap.thu_schedule,
  fri_schedule = ap.fri_schedule,
  sat_schedule = ap.sat_schedule,
  sun_schedule = ap.sun_schedule,
  mon_ot_schedule = ap.mon_ot_schedule,
  ...
FROM agent_profiles ap
WHERE asa.agent_id = ap.id
  AND asa.source = 'schedule_standardization';
```

## Proposed Fix (Step 2: Architecture — Profile Save Syncs Current Week Too)

Update `AgentProfile.tsx` save handler to upsert **both** the current week and next week assignments, so schedule changes take effect immediately rather than only next Monday.

