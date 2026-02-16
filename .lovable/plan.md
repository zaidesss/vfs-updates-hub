

## Fix: Database RPC Day-Off Comparison Bug

### Root Cause

The `get_effective_schedule` PostgreSQL RPC has a string mismatch bug. The `day_off` arrays in both `agent_profiles` and `agent_schedule_assignments` store **short day names** like `['Sat', 'Sun']`. However, the RPC sets `v_day_name` to **full day names** like `'Saturday'`, `'Sunday'`.

The comparison on line 87/101 and 117:
```
v_is_day_off := (v_assignment.day_off IS NOT NULL AND v_day_name = ANY(v_assignment.day_off));
```
...is effectively doing `'Saturday' = ANY(ARRAY['Sat', 'Sun'])`, which is always `false`.

This is why Jaeran (and every other agent) shows "Absent" instead of "Off" on their days off -- the RPC never identifies any day as a day off.

### The Fix

A single database migration to update the `get_effective_schedule` function. Add a `v_day_short` variable that holds the short day name (`Mon`, `Tue`, etc.) and use it for the `day_off` comparison instead of `v_day_name`.

Changes inside the RPC:
1. Declare a new variable: `v_day_short TEXT;`
2. In each CASE branch, set `v_day_short` alongside `v_day_name`:
   - `WHEN 1 THEN v_day_name := 'Monday'; v_day_short := 'Mon'; ...`
   - `WHEN 6 THEN v_day_name := 'Saturday'; v_day_short := 'Sat'; ...`
   - `WHEN 0 THEN v_day_name := 'Sunday'; v_day_short := 'Sun'; ...`
3. Change both day-off checks from:
   - `v_day_name = ANY(v_assignment.day_off)` to `v_day_short = ANY(v_assignment.day_off)`
   - `v_day_name = ANY(v_profile.day_off)` to `v_day_short = ANY(v_profile.day_off)`

### Files to Change

1. **Database migration only** -- `CREATE OR REPLACE FUNCTION get_effective_schedule(...)` with the corrected short-name comparison.

No frontend code changes needed. The frontend code from the previous fix is already correct -- it just needs the RPC to return the right `is_day_off` value.

### Verification

After the fix, running:
```sql
SELECT day_date, day_name, is_day_off
FROM get_effective_schedules_for_week('1415bc8d-...', '2026-02-09')
```
should return `is_day_off: true` for Saturday and Sunday.
