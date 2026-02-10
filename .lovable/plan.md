

## Fix: Dashboard Shift Schedule - Overnight Logout Detection

### Problem
Jaeran's Monday shift is **4:00 PM - 2:00 AM**. He logged out at **1:05 AM EST on Tuesday (Feb 10)**. The Shift Schedule table shows "No Logout" for Monday because it only searches for logout events with an EST date matching Monday (Feb 9). The logout's EST date is Feb 10, so it's missed.

### Root Cause
**File:** `src/lib/agentDashboardApi.ts`, around line 1638

```typescript
const logoutForDay = statusEvents.find((event) => {
  const eventDate = getESTDateFromTimestamp(event.created_at);
  return eventDate === dateStr && event.event_type === 'LOGOUT';
});
```

This only matches logout events with the exact same EST date as the day being processed. For overnight shifts, the logout occurs on the next calendar day.

### The Fix
**File:** `src/lib/agentDashboardApi.ts`

**Change 1 -- Extend logout search for overnight shifts**

After checking the schedule, detect if it's an overnight shift (`endMinutes < startMinutes`). If so, also search for LOGOUT events on the **next EST date** (dateStr + 1 day). This way, Monday's row will find the logout event from early Tuesday morning.

**Change 2 -- Fix early-out comparison for overnight shifts**

The current early-out check (`logoutTimeMinutes < scheduleParsed.endMinutes`) needs overnight awareness. For overnight shifts where end is 120 min (2:00 AM), a logout at 65 min (1:05 AM) correctly evaluates as early. However, we need to ensure we're comparing minutes-from-midnight correctly when the logout is found on the next day.

**Change 3 -- Fix noLogout for overnight shifts**

Currently `noLogout = isPast && !logoutForDay`. With the extended search from Change 1, this will naturally resolve -- if a next-day logout is found, `logoutForDay` will no longer be null.

### Scope
- Only `src/lib/agentDashboardApi.ts` needs changes
- The logout search logic in the `buildWeekAttendance` / day-processing function (around lines 1632-1672)
- No database changes needed

### Related Considerations
- **Hours worked calculation** (line 1656-1661): Currently uses login-to-logout duration. If the logout is found on the next day, this calculation will still work correctly since it uses raw timestamps, not date strings.
- **The agent report "No Logout" from the edge function**: This was fixed in the previous step (overnight-aware report generator). This fix is specifically for the **dashboard UI display**.

