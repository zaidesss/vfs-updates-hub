

## Root Cause Found — The Database RPC Is Broken

The overrides **are being saved correctly** to the database. The problem is that the `get_effective_schedule` RPC **silently ignores them** due to a PostgreSQL behavior with NULL fields in RECORD variables.

### The Core Bug

In the `get_effective_schedule` RPC, overrides are loaded into RECORD variables and then checked with `IS NOT NULL`:

```sql
SELECT co.override_start, co.override_end, co.reason, co.break_schedule
INTO v_regular
FROM coverage_overrides co
WHERE co.agent_id = p_agent_id AND co.date = p_target_date AND co.override_type = 'regular';
```

Later:
```sql
IF v_regular IS NOT NULL THEN ...
```

**The problem**: In PostgreSQL, `ROW('9:00 AM', '11:00 PM', 'drag adjustment', NULL) IS NOT NULL` returns **FALSE**. When ANY field in a record is NULL (like `break_schedule`), the entire `IS NOT NULL` check fails. Since `break_schedule` is almost always NULL, the RPC treats every override as if it doesn't exist.

I verified this directly:
- The `coverage_overrides` table has the correct rows for Feb 25 and Feb 26
- The direct query `SELECT * FROM coverage_overrides WHERE ...` returns them
- But `get_effective_schedule('...', '2026-02-25')` returns `is_override: false` and the base schedule `9:00 AM-5:00 PM`

This means **nothing on the frontend matters** — the Dashboard, Shift Schedule, Logout Dialog all call this RPC and get wrong data.

### Additional Issues

1. **SaveConfirmationDialog "From" column**: Line 116 hardcodes `—` instead of showing the agent's base schedule before the override.

2. **Activity Log `previous_value`**: `CoverageBoard.handleSave` passes `previous_value: null` when inserting log entries, so the "From" in the activity log is also empty.

---

## Implementation Plan

### Step 1: Fix the `get_effective_schedule` RPC (Database Migration)

Replace all `v_variable IS NOT NULL` checks with boolean flags set from `FOUND` after each `SELECT INTO`:

```sql
SELECT ... INTO v_regular FROM coverage_overrides ...;
v_found_regular := FOUND;

SELECT ... INTO v_ot FROM coverage_overrides ...;
v_found_ot := FOUND;

SELECT ... INTO v_dayoff FROM coverage_overrides ...;
v_found_dayoff := FOUND;

SELECT ... INTO v_legacy FROM coverage_overrides ...;
v_found_legacy := FOUND;
```

Then replace all `v_regular IS NOT NULL` → `v_found_regular`, `v_ot IS NOT NULL` → `v_found_ot`, etc. throughout the function.

### Step 2: Fix SaveConfirmationDialog "From" column

Instead of hardcoded `—`, look up the agent's base schedule for that day from the `agents` array (which contains `mon_schedule`, `tue_schedule`, etc.) and display it.

### Step 3: Fix Activity Log `previous_value`

In `CoverageBoard.handleSave`, compute the agent's base schedule for the overridden day and pass it as `previous_value` to `insertOverrideLog`.

### Step 4: Clean up legacy overrides in the database

The Feb 25 entry with `override_type = 'override'` (legacy) is redundant since a `'regular'` type already exists for the same date. Should be deleted to avoid confusion.

---

## Files to Change

| File / Location | Change |
|---|---|
| Database RPC `get_effective_schedule` | Add FOUND-based boolean flags instead of `IS NOT NULL` on RECORD variables |
| `src/components/coverage-board/SaveConfirmationDialog.tsx` | Show base schedule in "From" column instead of `—` |
| `src/pages/CoverageBoard.tsx` (handleSave) | Compute and pass `previous_value` (base schedule) to `insertOverrideLog` |
| Database cleanup | Delete the legacy `override_type='override'` row for Feb 25 |

