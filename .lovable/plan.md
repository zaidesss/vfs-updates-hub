

## Two Topics

### 1. Backfill Auto-Chain: Background Behavior

**No, the backfill will NOT continue if you navigate away.** The auto-chain runs inside the React component (`BackfillManager.tsx`). Leaving the Admin page unmounts the component and stops the chain. However, the job's progress (cursor, counts) is saved in the database, so you can return to the Admin page and click **Resume** to continue from where it left off. This is a known limitation I should flag.

**Possible enhancement:** Add a warning banner when auto-chain is running ("Backfill in progress — do not navigate away") so you don't accidentally lose the chain.

---

### 2. Attendance Bug: False "No Logout" and "Absent OT" on Overnight Shifts

#### Root Cause Identified

The bug is in `calculateAttendanceForWeek()` in `src/lib/agentDashboardApi.ts` (line 1535).

Precious has a **10:00 PM - 4:30 AM overnight shift**. Today is Tuesday, Feb 24. Monday (Feb 23) is yesterday. Here's what happens:

1. Monday's date (`2026-02-23`) is compared to today (`2026-02-24`)
2. `isPast = isBefore(Monday, Tuesday) = true` — as soon as midnight EST passes
3. The Monday shift (10 PM Mon - 4:30 AM Tue) is **still active** between midnight and 4:30 AM
4. But `isPast = true` triggers:
   - `noLogout = isPast && !logoutForDay` → **true** (false positive — shift is still running)
   - `otStatus = 'absent_ot'` (line 1592) because `isPast = true` and no OT login yet

**The server-side `generate-agent-reports` function already handles this correctly** (lines 317-368 — it checks if the overnight shift has actually ended before flagging NO_LOGOUT). The client-side `calculateAttendanceForWeek` does NOT have this protection.

#### Fix

After the overnight shift detection at line 1674, adjust `isPast` to account for overnight shifts still in progress:

```text
Line 1674: isOvernightShift computed
+ NEW: If isPast && isOvernightShift && yesterday only && currentTime < shiftEndMinutes:
+        set isPast = false, isToday = true
```

This ensures that during an active overnight shift (midnight to shift end), the previous day's row stays as "active today" instead of "past."

#### Other Related Issues to Consider

1. **Early Out detection for overnight shifts** — If an agent logs out at 11 PM (only 1 hour into a 10 PM - 4:30 AM shift), the current early-out check (`logoutTimeMinutes < endMinutes` → `1380 < 270 = false`) will NOT flag it. This is a separate pre-existing bug. **Should I fix this too?**

2. **Backfill navigation warning** — Add a visual warning when auto-chain is running to prevent accidental page navigation. **Should I add this?**

#### Files Modified

| File | Change |
|---|---|
| `src/lib/agentDashboardApi.ts` | Adjust `isPast`/`isToday` for overnight shifts still in progress in `calculateAttendanceForWeek()` |

#### What This Does NOT Touch
- Server-side `generate-agent-reports` (already correct)
- Stale login/logout detection in `updateProfileStatus` (already has overnight handling)
- Snapshot computation logic

