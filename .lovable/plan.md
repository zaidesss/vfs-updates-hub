

## Fix: False EARLY_OUT for Overnight Shifts Due to Previous Day's Logout Bleed

### Problem
The `generate-agent-reports` edge function's event query window for overnight shifts captures logout events from the **previous day's** shift. For Jaeran's Feb 10 report, the 1:05 AM logout (from his Feb 9 shift) was incorrectly treated as Feb 10's logout, causing a false EARLY_OUT flag.

### Root Cause
The event window starts at midnight EST (5:00 AM UTC), which includes early-morning logouts belonging to the previous day's overnight shift. The EARLY_OUT check picks the last logout in the window but doesn't verify it's paired with a same-day login.

### Related Issues to Address
1. **False EARLY_OUT** (primary issue) -- logout from previous shift attributed to current day
2. **False LATE_LOGIN** -- needs verification: Jaeran's LOGIN at 5:37 PM (scheduledStart 4:00 PM) shows 97 min late, which may be legitimate, but the login pairing logic should also be reviewed
3. **Duplicate NO_LOGOUT reports** -- two NO_LOGOUT reports exist for Jaeran (one from the 5 AM cron, one from stale session detection at 2:59 PM). Should deduplicate
4. **Stale data cleanup** -- the 4 false/duplicate incident reports for Jaeran should be cleaned up

### Fix Strategy
Update the EARLY_OUT detection in `generate-agent-reports/index.ts` to **pair logouts with their corresponding logins** for overnight shifts:

- For overnight shifts, only consider logout events that occur **after** the last login event in the window
- If a logout happens before any login in the window, it belongs to the previous day's shift and should be excluded from EARLY_OUT evaluation
- Add the same pairing logic to ensure NO_LOGOUT detection accounts for the stale session auto-logout timing gap

### Technical Changes

**File: `supabase/functions/generate-agent-reports/index.ts`**

In the EARLY_OUT check section (~line 533):

```text
Current (buggy):
  Uses logoutEvents[logoutEvents.length - 1] without checking
  if the logout is actually from the current day's session.

Fixed:
  For overnight shifts, filter logoutEvents to only those occurring
  AFTER the last LOGIN event. If no qualifying logout exists,
  skip EARLY_OUT check entirely.
```

Pseudocode:
```text
if (isOvernightShift && loginEvents.length > 0) {
  const lastLoginTime = new Date(loginEvents[loginEvents.length - 1].created_at).getTime();
  // Only consider logouts that happened after the last login (same session)
  const sessionLogouts = logoutEvents.filter(e =>
    new Date(e.created_at).getTime() > lastLoginTime
  );
  if (sessionLogouts.length === 0) {
    // No logout in current session -- skip EARLY_OUT
    skip;
  }
  // Use last session logout for EARLY_OUT check
  lastLogout = sessionLogouts[sessionLogouts.length - 1];
}
```

**Data cleanup**: Delete the 4 false incident reports for Jaeran (Feb 10):
- EARLY_OUT (actualLogout: 65)
- LATE_LOGIN (may be valid -- verify with user)
- Two NO_LOGOUT reports (one is a duplicate)

### Step-by-step Implementation
1. Fix the EARLY_OUT login-pairing logic in the edge function
2. Review and apply same pairing logic to NO_LOGOUT duplicate prevention
3. Deploy the updated edge function
4. Clean up Jaeran's false reports (after confirming which ones to remove)

