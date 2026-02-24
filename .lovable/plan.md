

## Fix: Team Status Board Reliability + Timezone Safety

### Root Cause

The Team Status Board can show empty data due to three issues:

1. **No try/catch** around `fetchScheduledTeamMembers()` in `TeamStatusBoard.tsx` -- any thrown exception silently fails and leaves the loading state stuck or shows no data
2. **Browser timezone dependency** -- `fetchScheduledTeamMembers()` calls `getCurrentESTDayKey()`, `getCurrentESTTimeMinutes()`, and `getTodayEST()` without passing a `now` parameter, so each call independently creates `new Date()`. The `PortalClockContext` already provides a stable EST clock but is not used
3. **Silent member dropping** -- if `categorizeByPosition()` returns an unrecognized value, members could theoretically be lost (though the current code defaults to `'other'`, there is no warning logged)

### Implementation Steps (done one at a time)

**Step 1: Update `TeamStatusBoard.tsx` -- Error handling + PortalClock integration**

- Import `usePortalClock` 
- Wrap `fetchScheduledTeamMembers()` in `try/catch/finally`
- Pass the portal clock's `now` Date to `fetchScheduledTeamMembers()`
- Add `console.log` for the result to aid debugging
- Add a temporary admin-only debug panel below `ZendeskRealtimePanel` showing `totalScheduled`, `totalOnline`, category counts, and raw JSON

**Step 2: Update `fetchScheduledTeamMembers()` in `src/lib/teamStatusApi.ts`**

- Add an optional `now?: Date` parameter to the function signature
- Pass `now` to `getCurrentESTDayKey(now)`, `getCurrentESTTimeMinutes(now)`, and `getTodayEST(now)` (these utils already accept an optional `now`)
- Add `console.warn` when `categorizeByPosition` returns `'other'` for a non-null, non-logistics position value
- No changes to the categorization logic itself (it already defaults to `'other'`)
- No database changes

**Step 3: Verify**

- Confirm numbers appear on the board
- Confirm the debug panel shows correct category counts
- Confirm no interference with Coverage Board, Scorecards, or Ticket Logs

### Files Modified

| File | Change |
|---|---|
| `src/pages/TeamStatusBoard.tsx` | Add try/catch, usePortalClock, debug panel |
| `src/lib/teamStatusApi.ts` | Accept optional `now` param, pass to timezone utils, add categorization warning |

### What This Does NOT Touch

- No database schema changes
- No changes to `scheduleResolver.ts`, `timezoneUtils.ts`, `PortalClockContext.tsx`
- No changes to Coverage Board, Ticket Logs, or Scorecard logic
- No changes to the Zendesk realtime panel (separate concern, already updated)

### Technical Details

The `PortalClockContext` already provides a `now` Date that updates every second in EST. By passing this to `fetchScheduledTeamMembers`, all "is scheduled now?" checks use the same consistent clock rather than multiple independent `new Date()` calls that may differ by milliseconds or be affected by browser timezone quirks.

The timezone utility functions (`getCurrentESTDayKey`, `getCurrentESTTimeMinutes`, `getTodayEST`) already accept an optional `now?: Date` parameter -- they just need to receive it.

