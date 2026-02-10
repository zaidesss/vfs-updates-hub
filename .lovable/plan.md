

## Fix: Overnight Shift Report Generation (NO_LOGOUT / EARLY_OUT)

### What Happened
Jaeran Sanchez has an overnight shift: **4:00 PM - 2:00 AM EST**. He logged out at **1:05 AM EST** (55 minutes early). The system should have flagged this as **EARLY_OUT**, but instead flagged **NO_LOGOUT**.

### Root Cause
The report generator queries events using EST day boundaries: `05:00:00Z to 04:59:59Z next day`. For Jaeran's Feb 9 shift:
- His LOGIN at 4:04 PM EST (21:04 UTC on Feb 9) falls **inside** the window
- His LOGOUT at 1:05 AM EST (06:05 UTC on Feb 10) falls **outside** the window (past 04:59:59Z)

So the system saw a login with no logout and generated a NO_LOGOUT report. An hour later, the EARLY_OUT was also generated separately (possibly by a secondary trigger), resulting in **two conflicting reports**.

### The Fix
**File:** `supabase/functions/generate-agent-reports/index.ts`

**Change 1 -- Extend the event query window for overnight shifts**

Expand the event query end boundary from `04:59:59Z` (midnight EST) to `09:59:59Z` (5:00 AM EST next day). This 5-hour extension captures logout events for shifts ending up to 5:00 AM EST, which covers all realistic overnight schedules. This only affects the event fetch -- all date-based report attribution still uses the original target date.

```text
Current:  endOfDayEST = nextDayT04:59:59.999Z  (midnight EST)
Fixed:    endOfDayEST = nextDayT09:59:59.999Z  (5:00 AM EST)
```

**Change 2 -- Make NO_LOGOUT detection overnight-aware**

Before flagging NO_LOGOUT, check if the shift is overnight (endMinutes < startMinutes). If so, look for logout events that occurred after midnight EST (in the extended window). If a logout exists in that post-midnight period, skip the NO_LOGOUT flag -- the EARLY_OUT or normal logout logic will handle it instead.

**Change 3 -- Make EARLY_OUT comparison overnight-aware**

The current comparison `logoutMinutes < parsedSchedule.endMinutes` works correctly for overnight shifts by coincidence (1:05 AM = 65 min < 2:00 AM = 120 min). However, we should add an explicit overnight guard: for overnight shifts, only flag EARLY_OUT if the logout is after midnight (i.e., logoutMinutes < endMinutes and logoutMinutes < startMinutes), to avoid false positives where a logout during the first half of the shift (before midnight) is incorrectly compared.

### Other Considerations Already Handled
- **Existing wrong reports**: Delete Jaeran's false NO_LOGOUT report (incident from Feb 9) from the database. The EARLY_OUT report already exists and is correct.
- **Other overnight agents**: The same fix applies to all agents with overnight schedules going forward.
- **TIME_NOT_MET calculation**: Uses Upwork hours or portal hours, not affected by the event window since those are stored separately.
- **LATE_LOGIN**: Unaffected -- login always happens in the first half of the shift (before midnight), within the original window.

### Steps (one at a time)
1. Update the edge function with overnight-aware logic (all 3 changes)
2. Deploy and verify
3. Delete Jaeran's false NO_LOGOUT report from the database
