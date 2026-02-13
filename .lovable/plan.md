
## Fix Outage/Leave Display on Team Status Board

### Problem
Pauline has an approved "Planned Leave" spanning Feb 12 (01:00) to Feb 13 (05:00), but the Team Status Board doesn't show her outage status. The issue is in the time-matching logic for multi-day leaves in `src/lib/teamStatusApi.ts`.

### Root Causes

**Bug 1: Multi-day leave time check is incorrect**
When a leave spans multiple days (start_date != end_date), the current code (around lines 211-226) naively checks:
```
if (currentHHMM >= outageStart && currentHHMM <= outageEnd)
```
This check works on the first day but fails on subsequent days. For example, if it's Feb 13 at 2:00 AM (currentHHMM = 200), it still checks against the time range, but the logic doesn't account for being in the middle or end of a multi-day leave.

The correct logic should be:
- **First day of leave**: Check if currentTime >= start_time (since leave starts mid-day)
- **Last day of leave**: Check if currentTime <= end_time (since leave ends mid-day)  
- **Middle days**: Apply all day (no time check needed)
- **Single day leave**: Check both start_time and end_time

**Bug 2: Time string parsing is fragile**
The code uses `.replace(':', '')` on `HH:MM:SS` strings like `01:00:00`, which produces `0100:00`. While parseInt still technically works (stops at the colon), it's fragile and should be fixed using proper string splitting.

### Solution: Refactor outage detection logic in teamStatusApi.ts

**File: `src/lib/teamStatusApi.ts`**

Changes needed in the outage detection block (currently around lines 208-226):

1. **Update outage map creation** (lines 159-167):
   - Change the map to store `start_date`, `end_date`, `start_time`, and `end_time` for each agent
   - Update the map structure to include these date fields

2. **Refactor time comparison logic** (lines 211-226):
   - Add date comparison: Check if `todayStr === start_date`, `todayStr === end_date`, or somewhere in between
   - Implement conditional time checking:
     - If today is the **first and only day** (start_date === end_date): Check `currentTime >= startTime AND currentTime <= endTime`
     - If today is the **first day only** (start_date < end_date): Check `currentTime >= startTime`
     - If today is the **last day only**: Check `currentTime <= endTime`
     - If today is a **middle day**: No time check needed (all day applies)
     - Otherwise: `hasApprovedOutage = false`

3. **Fix time parsing**:
   - Replace `.replace(':', '')` with `.split(':')[0] + String(parseInt(timeString.split(':')[1]))`
   - Or simpler: parse as `HH * 60 + MM` to get total minutes, then compare with `currentTimeMinutes`

### Expected Behavior After Fix

- Pauline with leave Feb 12 (01:00) → Feb 13 (05:00) will appear on Team Status Board whenever scheduled
- She will consistently show "Planned Leave" as her status during the entire leave period
- Once the leave ends, her actual status (Active, On Break, etc.) will reappear

### Files to Modify
- `src/lib/teamStatusApi.ts` (only file that needs changes - data layer fix)

### No UI Changes Needed
The `StatusCard` component already has the correct logic to display outage badges. Once the data layer correctly detects the outage, the UI will display it properly.
