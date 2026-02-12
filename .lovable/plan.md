
## Add Break Confirmation Dialog with Correct Allowance Logic

### What It Does
When the agent clicks "Break In", a confirmation dialog appears showing:
- **Break schedule window** (e.g., "Your break is scheduled from 12:00 PM - 12:30 PM EST")
- **Live portal time** (updating every second)
- **Status indicator and calculated return time**:
  - **Green**: Current time is within the break-in window (schedule start to schedule start + 10 mins)
  - **Amber warning**: Current time is outside the allowed break-in window (before start or after start + 10 mins)
  - **Gray**: No break schedule configured

### Allowance Rules (Correctly Understood)
1. **Break-In Window (10 mins after start)**: Agent can break IN anytime from the scheduled break start up to 10 minutes after the start. For example:
   - Schedule: 12:00 PM - 12:30 PM (30-minute break)
   - Break-in window: 12:00 PM - 12:10 PM
   - If they break in at 12:05 PM, their break-out time will be 12:35 PM (12:05 PM + 30 mins)
   - If they break in at 12:10 PM, their break-out time will be 12:40 PM (12:10 PM + 30 mins)

2. **Break-Out Grace (5 mins total grace)**: The agent can stay on break up to 5 minutes PAST their calculated break-out time before being flagged as OVERBREAK. For example:
   - Break in at 12:10 PM → calculated break-out: 12:40 PM
   - Grace window: 12:40 PM - 12:45 PM (5 minutes)
   - If they break out at 12:45 PM or earlier: no flag
   - If they break out at 12:46 PM or later: OVERBREAK incident

3. **Break Out button**: Remains immediate (no dialog), agents should end break ASAP when they return

### Files Changed

**New file: `src/components/dashboard/BreakConfirmDialog.tsx`**
- AlertDialog following the same pattern as `LogoutConfirmDialog`
- Uses `usePortalClock()` for live time updating every second
- Uses `parseScheduleRange` from `agentDashboardApi` to extract break schedule start/end times
- Displays:
  - Break schedule times (e.g., "12:00 PM - 12:30 PM")
  - Current live portal time (e.g., "12:07 PM EST")
  - Calculated break-out time = current time + (schedule end - schedule start)
    - Example: 12:07 PM + 30 mins = 12:37 PM
  - Grace window note: "You have a 5-minute grace period to return by [grace time]"
  - Status message:
    - Green: "You are within your break-in window" (if current time >= start AND current time <= start + 10 mins)
    - Amber: "You are outside your scheduled break-in window" (if current time < start OR current time > start + 10 mins)
    - Gray: "No break schedule found" (if no break_schedule configured)
- Cancel and "Confirm Break In" buttons

**Modified: `src/components/dashboard/StatusButtons.tsx`**
- Add `breakSchedule` prop (raw break schedule string, e.g., "12:00 PM-12:30 PM")
- Add `showBreakConfirm` state
- Intercept the "Break In" click to show the dialog instead of immediately triggering `handleClick('BREAK_IN')`
- The "Break Out" button remains immediate with no dialog

**Modified: `src/pages/AgentDashboard.tsx`**
- Import `usePortalClock` hook
- Derive current day key from `usePortalClock()` hook (e.g., `currentDayKey`)
- Look up the break_schedule from profile: `profile.break_schedule`
- Pass `break_schedule` to `StatusButtons` as the new `breakSchedule` prop

### Technical Implementation Details

**Break-in window calculation:**
```
scheduleStart = parsed start time (in minutes from midnight EST)
breakInAllowance = 10 minutes
isWithinBreakInWindow = currentTime >= scheduleStart AND currentTime <= (scheduleStart + breakInAllowance)
```

**Calculated break-out time:**
```
breakDuration = (scheduleEnd - scheduleStart) minutes
calculatedBreakOut = currentTime + breakDuration
graceEndTime = calculatedBreakOut + 5 minutes
```

**Status colors:**
- Green (within window): `border-green-500 text-green-600`
- Amber (outside window): `border-amber-500 text-amber-600`
- Gray (no schedule): `border-gray-300 text-gray-400`

### Step-by-Step Implementation
1. **Step 1**: Create `BreakConfirmDialog.tsx` with break schedule display, calculated return time, and within-window detection logic
2. **Step 2**: Update `StatusButtons.tsx` to accept `breakSchedule` prop and show the dialog on "Break In" click
3. **Step 3**: Update `AgentDashboard.tsx` to pass `profile.break_schedule` to `StatusButtons`
