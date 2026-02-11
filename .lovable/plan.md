

## Fix All False EARLY_OUT Reports + Dashboard UI

This plan addresses 3 bugs across 2 files, plus cleanup of 3 false reports.

### Bugs to Fix

**Bug 1: Dashboard UI logout bleed (primary visual issue)**
In `src/lib/agentDashboardApi.ts` (~line 1681-1696), the logout search finds any LOGOUT on `dateStr` without checking if it belongs to the current session. For overnight workers, a 1:05 AM logout from the previous shift gets attributed to the current day.

**Fix:** After finding a same-day logout, verify it occurred AFTER the same-day login. If the logout is before the login (or no login exists), discard it as previous-session bleed. Apply the same check to the next-day logout search for overnight shifts.

**Bug 2: OT_LOGOUT treated as regular LOGOUT (edge function)**
In `generate-agent-reports/index.ts` (line 355), logout events are filtered by `event_type === 'LOGOUT'` only. An `OT_LOGOUT` event is not a regular shift logout and should be excluded from EARLY_OUT checks.

**Fix:** Keep the filter as `event_type === 'LOGOUT'` (already correct -- OT_LOGOUT won't match). However, need to verify the Biah Mae case: if an OT_LOGOUT was somehow stored as a regular LOGOUT, or if the issue is the same logout bleed from a previous session. Will add explicit exclusion of `OT_LOGOUT` and `SYSTEM_AUTO_LOGOUT` from the logout event filter as a safeguard.

**Bug 3: Dashboard UI Early Out check missing overnight logic**
In `src/lib/agentDashboardApi.ts` (line 1723), `isEarlyOut = logoutTimeMinutes < scheduleParsed.endMinutes` doesn't account for overnight shifts where endMinutes < startMinutes (e.g., shift ends at 2:00 AM = 120 min, but a 10 PM logout = 1320 min would not trigger). This is fine for standard overnight cases, but needs session pairing to avoid false positives from bleed logouts.

### Data Cleanup
Delete these 3 false EARLY_OUT reports:
- `214766b2-...` -- Meryl Jean, Feb 9
- `2189ee6d-...` -- Biah Mae, Feb 11
- `3670dd55-...` -- Stephen Martinez, Feb 11

### Step-by-step Implementation

**Step 1**: Fix `src/lib/agentDashboardApi.ts` -- add session pairing to logout search
- Same-day logout must be AFTER same-day login
- Next-day overnight logout must also be AFTER the login

**Step 2**: Fix `supabase/functions/generate-agent-reports/index.ts` -- add explicit exclusion of non-standard logout types (OT_LOGOUT, SYSTEM_AUTO_LOGOUT) from the EARLY_OUT logout filter

**Step 3**: Deploy edge function

**Step 4**: Delete the 3 false EARLY_OUT reports from the database

### Technical Details

**File: `src/lib/agentDashboardApi.ts`** (lines 1681-1696)
```
// Current: finds any LOGOUT on dateStr
logoutForDay = statusEvents.find(event => 
  eventDate === dateStr && event.event_type === 'LOGOUT'
);

// Fixed: verify logout is after login (session pairing)
let candidateLogout = statusEvents.find(event => 
  eventDate === dateStr && event.event_type === 'LOGOUT'
);
// Discard if it belongs to previous day's session
if (candidateLogout && loginForDay) {
  if (new Date(candidateLogout.created_at) < new Date(loginForDay.created_at)) {
    candidateLogout = undefined; // Previous session bleed
  }
}
logoutForDay = candidateLogout;
```

**File: `supabase/functions/generate-agent-reports/index.ts`** (line 355)
```
// Current
const logoutEvents = profileEvents.filter(e => e.event_type === 'LOGOUT');

// Fixed: explicitly exclude OT and system auto-logouts
const logoutEvents = profileEvents.filter(e => 
  e.event_type === 'LOGOUT' && 
  e.event_type !== 'OT_LOGOUT' && 
  e.event_type !== 'SYSTEM_AUTO_LOGOUT'
);
```

