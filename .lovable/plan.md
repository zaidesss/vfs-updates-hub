

## Add Logout Confirmation Dialog

### What It Does
When the agent clicks "Log Out", instead of immediately logging out, a confirmation dialog appears showing:
- The agent's scheduled shift end time (e.g., "Your shift ends at 5:00 PM EST")
- The current portal time (live, updating every second)
- A warning if logging out early: "If you log out now, you will be marked as Early Out"
- If it's at or past their shift end time: just a simple "Proceed to Logout" prompt with no warning

### Considerations Before Proceeding
1. **OT Logout** -- Should the OT Logout button also get a confirmation dialog, or just the regular Logout?
2. **Day Off / No Schedule** -- If the agent has no schedule for today (day off), should we skip the warning entirely and just show "Proceed to Logout"?
3. **Overnight shifts** -- For shifts like "8:00 PM - 3:30 AM", the end time crosses midnight. The comparison logic needs to handle this correctly.

I'll handle all three: OT Logout gets no dialog (since OT is flexible), day-off/no-schedule shows a simple confirm, and overnight shifts are handled properly.

### Technical Details

**File: `src/components/dashboard/StatusButtons.tsx`**

1. Add new props to `StatusButtonsProps`:
   - `shiftEndTime?: string | null` -- the raw schedule string for today (e.g., "9:00 AM-5:00 PM")

2. Add a `LogoutConfirmDialog` state:
   - `showLogoutConfirm: boolean` -- controls dialog visibility
   - When user clicks the Logout button, instead of calling `handleClick('LOGOUT')`, set `showLogoutConfirm = true`

3. Add an `AlertDialog` component that:
   - Parses the shift end time from the schedule string using existing `parseScheduleRange`
   - Uses `usePortalClock()` to display the live portal time (updating every second)
   - Compares current EST time (in minutes) to the shift end time (in minutes)
   - If current time is before shift end: shows warning text in red/amber
   - If current time is at or after shift end: shows simple green "You are within your logout window" message
   - Has "Cancel" and "Confirm Logout" buttons

**File: `src/pages/AgentDashboard.tsx`**

4. Pass the current day's schedule to `StatusButtons`:
   - Derive today's day key from PortalClock (`currentDayKey`)
   - Look up `profile[`${dayKey}_schedule`]` (e.g., `mon_schedule`)
   - Pass as `shiftEndTime` prop

### Step-by-Step Implementation
- Step 1: Update `StatusButtons` to accept `shiftEndTime` prop and add the logout confirmation dialog with early-out detection logic
- Step 2: Update `AgentDashboard` to compute and pass the current day's schedule string to `StatusButtons`
