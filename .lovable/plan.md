

## Plan: Fix No Logout Auto-Logout Logic + Malcolm's Data

This is a multi-part fix addressing: (A) proactive auto-logout 5 hours after shift end, (B) dashboard mount stale session cleanup, and (C) Malcolm's corrupted event data.

### Current Problem

1. **No Logout only triggers reactively** — when the agent next clicks Login or Logout. If they never return, the stale session persists indefinitely.
2. **Malcolm's data is corrupted**: He's shown as LOGGED_IN since Wednesday 8:42 PM EST (Feb 25), with stale events and false incident reports (NO_LOGOUT, LATE_LOGIN, NCNS).

### Step 1: Create `auto-logout-stale-sessions` edge function (cron job)

New edge function that runs every 15 minutes. For each agent with `profile_status.current_status != 'LOGGED_OUT'`:
- Resolve their effective schedule for the status_since date
- Calculate shift end time
- If current time is 5+ hours past shift end AND status is still active → insert SYSTEM_AUTO_LOGOUT event, create NO_LOGOUT report, update profile_status to LOGGED_OUT
- Handle overnight shifts correctly (shift end is next calendar day)
- Skip agents on approved outages or day off

**File**: `supabase/functions/auto-logout-stale-sessions/index.ts`

### Step 2: Register cron job

Use `pg_cron` + `pg_net` to invoke the function every 15 minutes.

### Step 3: Add proactive stale session check on dashboard mount

In `src/lib/agentDashboardApi.ts`, add a new function `checkAndCleanupStaleSession(profileId)` that:
- Reads profile_status
- If status != LOGGED_OUT and status_since date != today EST:
  - Resolve effective schedule for the status_since date
  - Check if 5+ hours past shift end
  - If so: insert SYSTEM_AUTO_LOGOUT, create NO_LOGOUT report, update profile_status to LOGGED_OUT
- Called from `AgentDashboard.tsx` on mount (before rendering status buttons)

This gives immediate UX feedback when the agent opens the portal, while the cron handles cases where they don't.

### Step 4: Update existing stale detection in `updateProfileStatus`

Change the existing stale session logic (lines ~453-631 in agentDashboardApi.ts) to use the same 5-hour-past-shift-end rule instead of the simple "different day" check. This ensures consistency across all three mechanisms.

### Step 5: Fix Malcolm's database records

**Delete bad events** (Feb 23-26 range) and **insert correct events**:
- Mon Feb 23: LOGIN at 14:00 UTC (9:00 AM EST), LOGOUT at 22:00 UTC (5:00 PM EST)
- Tue Feb 24: LOGIN at 14:00 UTC (9:00 AM EST), LOGOUT at 22:00 UTC (5:00 PM EST)
- Wed Feb 25: LOGIN at 14:00 UTC (9:00 AM EST), LOGOUT at 22:00 UTC (5:00 PM EST)
- Thu Feb 26: LOGIN at 14:00 UTC (9:00 AM EST)

**Update profile_status**: Set `status_since` to `2026-02-26T14:00:00.000Z` (Thu 9 AM EST), keep `current_status` as `LOGGED_IN`.

**Delete false incident reports**: Remove the 5 incorrect reports for Malcolm (NO_LOGOUT, LATE_LOGIN, NCNS, TIME_NOT_MET).

### Files to change

| File | Change |
|---|---|
| `supabase/functions/auto-logout-stale-sessions/index.ts` | **New** — cron-based auto-logout |
| `supabase/config.toml` | Add verify_jwt = false for new function |
| `src/lib/agentDashboardApi.ts` | Add `checkAndCleanupStaleSession()`, update stale detection to 5hr rule |
| `src/pages/AgentDashboard.tsx` | Call stale cleanup on mount |
| Database (insert tool) | Fix Malcolm's events, status, and reports |
| Database (insert tool) | Register cron job |

### Related considerations

- The `generate-agent-reports` daily batch (5 AM UTC) also has NO_LOGOUT detection with a 3-hour threshold. Should I update that to 5 hours for consistency?
- The current stale detection creates the auto-logout at 11:59:59 PM EST. With the new 5-hour rule, should the auto-logout timestamp be set to shift_end + 5 hours instead (e.g., 10:00 PM for a 5 PM shift)?

