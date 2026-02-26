

## Investigation Results

### Root Cause: 42 Sequential RPC Calls Failing Silently

The Team Status Board makes **42 individual sequential `get_effective_schedule` RPC calls** — one per agent. The schedule resolver (`scheduleResolver.ts`) silently treats any RPC failure as `isDayOff: true`:

```typescript
// scheduleResolver.ts line 65-78
if (error || !data || data.length === 0) {
  return {
    isDayOff: true,  // ← silent failure = agent is skipped
    ...
  };
}
```

When these calls fail (network congestion, PostgREST connection pool saturation, intermittent timeouts), every failed agent is silently marked as "day off" and filtered out. If enough fail, the board shows 0.

**Database verification confirms the data is correct** — all 42 agents have valid schedules, the RPCs return correct results, and there are zero DB errors in logs. The problem is purely the client-side architecture of making 42 individual HTTP requests.

### When This Broke

This was introduced when the schedule resolver (`scheduleResolver.ts`) replaced direct schedule reads from `agent_profiles`. Before the resolver, the board read schedules from the profile columns directly (no per-agent RPC calls). After the resolver, every agent requires a separate `get_effective_schedule` RPC call, creating a fragile N+1 query pattern.

## Fix: Single Bulk RPC

Replace 42+ individual calls with **one database function** that resolves schedules for all agents in a single call.

### Step 1: Create `get_team_status_data(p_date date)` RPC

A SECURITY DEFINER function that:
- Fetches all non-terminated agent profiles
- Resolves each agent's effective schedule (overrides > assignments > profile fallback) in SQL
- Returns: id, email, full_name, position, break_schedule, effective_schedule, effective_ot_schedule, is_day_off

This replicates the `get_effective_schedule` logic inline using JOINs instead of per-row function calls.

### Step 2: Update `teamStatusApi.ts`

- Remove the for-loop that calls `getEffectiveScheduleForDate` per agent
- Replace with single `supabase.rpc('get_team_status_data', { p_date: todayStr })`
- Filter by `is_day_off = false` and `isWithinScheduleWindow` check on the returned rows
- Keep existing status/outage queries as-is (they're already parallel)

### Step 3: Add SELECT policy on `profile_status` for all authenticated users

This table only contains `profile_id`, `current_status`, `status_since` — no sensitive data. Currently non-admin users can only see their own status, causing all other agents to show as LOGGED_OUT.

### Step 4: Create `get_team_outages_today(p_date date)` RPC

SECURITY DEFINER function returning only the fields needed for outage badges (`agent_email`, `outage_reason`, `start_date`, `end_date`, `start_time`, `end_time`, `status`), avoiding exposing all `leave_requests` columns.

### Technical Details: Bulk Schedule Resolution SQL

The new function will resolve schedules using this precedence (same as `get_effective_schedule`):
1. `coverage_overrides` for the target date (typed: regular, ot, dayoff)
2. `agent_schedule_assignments` with `effective_week_start <= target_week` (most recent)
3. `agent_profiles` base columns (fallback)

Uses LEFT JOINs and COALESCE to resolve in a single pass rather than per-row function calls.

