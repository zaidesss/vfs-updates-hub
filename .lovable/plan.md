

# Fix: Stale Session Detection on LOGOUT (With Overnight Schedule Safety)

## Problem Recap

1. Toggle button means agents in stale sessions can only click "Log Out" (never "Log In")
2. Current stale detection only runs on `LOGIN` -- so it never fires
3. We need to add stale detection to `LOGOUT`, BUT we must not break overnight/midnight-crossing schedules

## The Overnight Schedule Conflict

A naive "is status_since from a different day?" check would **incorrectly** flag agents with schedules like **8:00 PM - 3:30 AM**:

```text
Agent logs in at 8:00 PM on Feb 8
At 3:30 AM on Feb 9, they click Logout
status_since = Feb 8, today = Feb 9 --> "stale" = WRONG!
```

This is a **normal** logout for an overnight shift, NOT a forgotten logout.

## Solution: Schedule-Aware Stale Detection

Before declaring a session stale, check the agent's schedule for the login day. If it crosses midnight, calculate when the shift actually ends on the next day. Only flag as stale if the current time is well past that expected end time.

```text
LOGOUT clicked, status_since is from a previous day:
  1. Get agent's schedule for the status_since day
  2. Parse the schedule range (e.g., "8:00 PM - 3:30 AM")
  3. If schedule crosses midnight (start > end):
     - Calculate actual shift end on the NEXT calendar day
     - Add a buffer (e.g., 30 minutes grace)
     - If current time is BEFORE shift end + buffer --> NOT stale, normal logout
     - If current time is AFTER shift end + buffer --> STALE, trigger auto-logout
  4. If schedule does NOT cross midnight:
     - Any logout from a previous day is stale --> trigger auto-logout
  5. If no schedule found (blank/null):
     - Treat as day off, just process the logout normally without incident
```

## Implementation Steps

### Step 1: Add Schedule-Aware Stale Detection to LOGOUT

**File:** `src/lib/agentDashboardApi.ts`

In `recordStatusEvent`, add a new block before the transition validation:

```text
if (eventType === 'LOGOUT' && currentStatus !== 'LOGGED_OUT' && status_since is from a previous day):
  1. Fetch agent's directory entry (to get schedule)
  2. Get the schedule for the status_since day (e.g., sat_schedule)
  3. Parse it with parseScheduleRange()
  4. If midnight-crossing schedule:
     - Check if now() is still within the expected shift window
     - If YES: process as normal logout (not stale)
     - If NO: create SYSTEM_AUTO_LOGOUT + NO_LOGOUT report, then return
  5. If normal schedule or no schedule:
     - Create SYSTEM_AUTO_LOGOUT + NO_LOGOUT report, then return
```

This reuses the existing `parseScheduleRange()` and `isTimeInScheduleRange()` utilities from `timezoneUtils.ts`.

### Step 2: Fix Blank Schedule = Day Off in Report Generator

**File:** `supabase/functions/generate-agent-reports/index.ts`

Update the skip logic to also treat a blank/null schedule string as a day off, preventing false incident reports on unscheduled days.

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/agentDashboardApi.ts` | Add schedule-aware stale session detection for LOGOUT events |
| `supabase/functions/generate-agent-reports/index.ts` | Treat blank/null schedule as day off |

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| 9 AM - 5 PM agent forgets logout, clicks Logout next day | Stale detected, NO_LOGOUT report created |
| 8 PM - 3:30 AM agent logs out at 3:30 AM | Normal logout (within shift window) |
| 8 PM - 3:30 AM agent forgets logout, clicks Logout at 2 PM next day | Stale detected (well past shift end) |
| Day off / blank schedule agent clicks Logout | Processed normally, no incident |
| Agent with OT schedule crossing midnight | OT schedule checked separately if in OT status |

