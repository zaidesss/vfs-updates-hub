

## Fix: OT Scheduled Badge Showing Despite OT Being Disabled

### Root Cause

The `calculateOTForDay` function in `agentDashboardApi.ts` (line 1527) reads per-day OT schedule fields (e.g., `mon_ot_schedule`) directly from the profile/directory data **without checking the `ot_enabled` flag**. So even when an agent has `ot_enabled: false`, the old OT schedule strings are still present in `agent_directory`, causing the Shift Schedule table to display "OT Scheduled" badges.

### Related Issues to Fix Together

1. **Primary bug**: `calculateOTForDay` ignores `ot_enabled` -- should return no OT data when OT is disabled
2. **Effective schedule not used for OT**: The function reads OT from profile fields directly instead of using `effectiveWeekSchedules` (the resolver), which could cause stale OT schedules on overridden weeks
3. **Directory sync gap**: When `ot_enabled` is toggled off on the profile, the per-day OT fields in `agent_directory` may not be cleared, leaving stale data

### Fix (Single Step)

**File**: `src/lib/agentDashboardApi.ts` -- `calculateOTForDay` function (around line 1527)

Add an early return at the top of `calculateOTForDay` when `profile.ot_enabled` is `false`:

```typescript
const calculateOTForDay = () => {
  // If OT is disabled for this agent, skip all OT logic
  if (!profile.ot_enabled) {
    return { otSchedule: undefined };
  }
  // ... rest of existing logic
};
```

Additionally, update the OT schedule lookup to prefer `effectiveWeekSchedules` (the resolver) over raw profile fields, matching how regular schedules already work (line 1626-1642):

```typescript
// Use effective schedule resolver for OT (same pattern as regular schedule)
const effectiveDay = effectiveWeekSchedules?.find(d => d.dayName.substring(0, 3) === day.short);
const otSchedule = override ? undefined : (effectiveDay?.otSchedule || (profile[otScheduleKey] as string | null));
```

This ensures:
- OT badges never appear when `ot_enabled` is false
- OT schedule respects coverage overrides and schedule assignments (not just raw profile data)
- No impact on snapshots (they store their own `ot_schedule` value at snapshot time)
- No impact on scorecard (it queries the effective schedule RPC directly)
- No impact on coverage board (it reads schedules independently)

### Verification

After this fix, Malcom's dashboard should no longer show any "OT Scheduled" badge since his `ot_enabled` is `false`.

