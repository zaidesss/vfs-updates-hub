

## Fix: Overnight Schedule Visibility on Team Status Board

### Problem
Precious Mae Gagarra has a Monday shift of **10:00 PM - 4:30 AM** with OT **4:30 AM - 5:30 AM**. At 1:17 AM EST on Tuesday, she should still be visible on the Team Status Board because her Monday shift extends into Tuesday. However, the board only checks Tuesday's schedule (which is her day off), so she disappears at midnight.

### Root Cause
In `src/lib/teamStatusApi.ts`, the `fetchScheduledTeamMembers` function:
1. Gets the current EST day key (e.g., "tue")
2. Checks only that day's schedule column (`tue_schedule`)
3. Skips agents whose current day is a day off

It never looks back at the **previous day's** overnight schedule that may still be active.

### The Fix

**File:** `src/lib/teamStatusApi.ts`

**Change 1 -- Also check previous day's overnight schedule**

After the existing logic that checks today's schedule, add a second pass for agents who were skipped (day off or no schedule today). For these agents:
- Look up the previous day's schedule column (e.g., if today is Tue, check `mon_schedule` and `mon_ot_schedule`)
- Parse those schedules and check if they are overnight (end < start)
- If overnight, check if the current EST time falls within the post-midnight portion (i.e., currentTimeMinutes <= endMinutes)
- If yes, include the agent on the board with the previous day's schedule info

**Change 2 -- Skip day-off check for previous-day carryover**

The day-off array check currently causes an early return. This needs to be restructured so that even if today is a day off, the previous day's overnight schedule can still make the agent visible.

### Technical Detail

```text
Current flow:
  1. Get today's day key (tue)
  2. If today in day_off array -> SKIP
  3. If today's schedule is null/off -> SKIP
  4. Check if current time is in today's schedule window

New flow:
  1. Get today's day key (tue) AND previous day key (mon)
  2. Check today's schedule first (same as before)
  3. If today didn't match (day off, no schedule, or outside window):
     a. Get previous day's schedule + OT schedule
     b. If either is overnight (end < start), check if current time
        falls in the post-midnight portion (currentMinutes <= endMinutes)
     c. If yes -> include agent, using previous day's schedule as display
```

### Previous Day Key Mapping
A simple helper to get the previous day:
- mon -> sun, tue -> mon, wed -> tue, etc.

### Scope
- Only `src/lib/teamStatusApi.ts` needs changes
- No database or edge function changes required
- The `isTimeInScheduleRange` utility in `timezoneUtils.ts` already handles midnight-crossing correctly, but we need to call it with the previous day's schedule data

