

## Root Cause Found: Double Timezone Conversion

The `PortalClockContext` creates `now` by parsing an EST-formatted string back into a Date: `new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))`. This produces a Date whose `.getHours()` returns EST hours, but whose internal UTC timestamp is wrong.

When `TeamStatusBoard` passes this `now` to `fetchScheduledTeamMembers(now)`, the function calls `getCurrentESTTimeMinutes(now)` which applies EST conversion **again** using `Intl.DateTimeFormat`. For users in the Philippines (UTC+8), this double-conversion shifts the time by ~13 hours, making it appear as ~3:53 AM EST instead of ~4:53 PM EST. Since no agents are scheduled at 3:53 AM, the board shows 0.

**Example**: Real EST time = 4:53 PM (1013 min). After double conversion = 3:53 AM (233 min). All agents with 9 AM-5:30 PM schedules get filtered out.

The same bug affects `getTodayEST(now)` — it could produce the wrong date entirely, sending the wrong `p_date` to the RPC.

## Fix

### Step 1: Update `TeamStatusBoard.tsx`
- Pass the pre-computed `todayEST` and `currentTimeMinutes` from `usePortalClock()` instead of `now`

### Step 2: Update `fetchScheduledTeamMembers` in `teamStatusApi.ts`
- Change the function signature to accept `{ todayEST: string, currentTimeMinutes: number }` instead of `now?: Date`
- Remove calls to `getCurrentESTTimeMinutes(now)` and `getTodayEST(now)` — use the passed values directly
- This eliminates the double timezone conversion entirely

