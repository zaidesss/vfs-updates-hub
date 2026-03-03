

## Plan: Next Shift Acknowledgment Dialog on Dashboard Logout

### Summary
After the agent confirms the existing Logout dialog (early out check), a second dialog appears showing their next scheduled shift. The agent must click "I Acknowledge" before the LOGOUT event fires. This applies to all users.

### New File: `src/components/dashboard/NextShiftDialog.tsx`
- A dialog component that:
  - On open, calls the `get_effective_schedule` RPC iterating day-by-day starting from tomorrow until a non-day-off day is found (no limit)
  - Displays the next shift info in two formats:
    - **If tomorrow is a work day**: "Please note your next shift is tomorrow, [Day], [Date], at [Start Time] EST."
    - **If tomorrow is a day off**: "Please note tomorrow is your rest day, [Day], [Date]. Your next shift is on [Day], [Date], at [Start Time] EST."
  - Shows an "I Acknowledge" button that triggers the actual logout
  - Shows a loading spinner while fetching schedule data
  - Uses `usePortalClock` for the current EST date to calculate "tomorrow"

### Modified File: `src/components/dashboard/StatusButtons.tsx`
- Add state: `showNextShiftDialog` (boolean)
- Change the `LogoutConfirmDialog` onConfirm handler:
  - Instead of directly calling `handleClick('LOGOUT')`, set `showNextShiftDialog = true`
- Add `NextShiftDialog` component:
  - On acknowledge → call `handleClick('LOGOUT')` and close both dialogs
- Pass the agent's profile ID (new prop `profileId`) so the dialog can query the RPC

### No database or edge function changes needed
The `get_effective_schedule(p_agent_id, p_target_date)` RPC already exists and returns `effective_schedule`, `is_day_off`, etc.

