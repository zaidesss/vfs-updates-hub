

## Root Cause Analysis

There are **two bugs** causing this issue:

### What happened to Malcom

1. **Tuesday**: Malcom logged in at 9:05 AM EST. He did not log out at the end of his shift.
2. **Wednesday**: Dashboard correctly showed Tuesday as "No Logout" because no LOGOUT event existed for Tuesday.
3. **Wednesday 6:40 PM**: Malcom clicked the Logout button (which was still showing because the UI hadn't reset). The **stale session handler** (line 523-630 in `agentDashboardApi.ts`) detected the previous-day status and inserted a `SYSTEM_AUTO_LOGOUT` event backdated to 11:59:59 PM EST Tuesday.
4. **After refresh**: The attendance calculation found this SYSTEM_AUTO_LOGOUT as a valid "logout" for Tuesday. Combined with the schedule being treated as overnight ("9:00 PM-5:00 PM"), a logout at 11:59 PM was calculated as "Early Out" (within the PM portion after shift start of an overnight schedule).

### Bug 1: Client-side attendance treats SYSTEM_AUTO_LOGOUT as a real logout

In `src/lib/agentDashboardApi.ts` lines 1698-1701 and 1720-1722, the candidate logout search does not exclude events where `triggered_by === 'SYSTEM_AUTO_LOGOUT'`. When a SYSTEM_AUTO_LOGOUT exists, the day should still show "No Logout" because the agent never actually logged out.

### Bug 2: Server-side report generation has a broken filter

In `supabase/functions/generate-agent-reports/index.ts` line 302:
```typescript
const logoutEvents = profileEvents.filter(e => 
  e.event_type === 'LOGOUT' && e.event_type !== 'OT_LOGOUT' && e.event_type !== 'SYSTEM_AUTO_LOGOUT'
);
```
The conditions `e.event_type !== 'OT_LOGOUT'` and `e.event_type !== 'SYSTEM_AUTO_LOGOUT'` are always true when `e.event_type === 'LOGOUT'`. The SYSTEM_AUTO_LOGOUT events have `event_type: 'LOGOUT'` and `triggered_by: 'SYSTEM_AUTO_LOGOUT'` -- so the filter should check `triggered_by`, not `event_type`.

### Additional consideration: EARLY_OUT report creation on stale LOGOUT

When the stale session handler (lines 566-629) runs, it returns early at line 629 without reaching the `checkAndAlertEarlyOut` call at line 755. So no EARLY_OUT agent report is created by the real-time handler -- the problem is purely in the attendance display. However, the nightly `generate-agent-reports` cron WOULD incorrectly find the SYSTEM_AUTO_LOGOUT as a real logout (due to Bug 2) and could create a false EARLY_OUT report later.

---

## Fix Plan

### Step 1: Fix client-side attendance calculation

**File: `src/lib/agentDashboardApi.ts`**

At line 1698-1701, add `triggered_by` filter to exclude SYSTEM_AUTO_LOGOUT:
```typescript
let candidateLogout = statusEvents.find((event) => {
  const eventDate = getESTDateFromTimestamp(event.created_at);
  return eventDate === dateStr && event.event_type === 'LOGOUT' && event.triggered_by !== 'SYSTEM_AUTO_LOGOUT';
});
```

At line 1720-1722, same filter for overnight shift next-day search:
```typescript
const nextDayCandidate = statusEvents.find((event) => {
  const eventDate = getESTDateFromTimestamp(event.created_at);
  return eventDate === nextDateStr && event.event_type === 'LOGOUT' && event.triggered_by !== 'SYSTEM_AUTO_LOGOUT';
});
```

### Step 2: Fix server-side report generation filter

**File: `supabase/functions/generate-agent-reports/index.ts`**

At line 302, fix the filter to check `triggered_by` instead of `event_type`:
```typescript
const logoutEvents = profileEvents.filter(e => 
  e.event_type === 'LOGOUT' && e.triggered_by !== 'SYSTEM_AUTO_LOGOUT'
);
```

This also removes the redundant `e.event_type !== 'OT_LOGOUT'` check (which was always true).

### Result after fix
- Days where the only "logout" is a SYSTEM_AUTO_LOGOUT will correctly show **"No Logout"** instead of "Early Out"
- The nightly compliance cron will not create false EARLY_OUT reports for auto-logged-out sessions
- Real logouts by the agent will continue to work normally

