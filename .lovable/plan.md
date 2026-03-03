

## Plan: Enhanced Next Shift Dialog with Off-Day Details and Leave Reasons

### Current Behavior
The dialog only says "tomorrow is your rest day" and shows the next shift date. It doesn't distinguish between regular day off, planned leave, sick leave, or other outage reasons. It also doesn't list all consecutive off days.

### Enhanced Behavior
The dialog will:
1. **Collect all consecutive off days** from tomorrow until the next work day
2. **Cross-reference each off day** with the `leave_requests` table to determine if it's a regular day off or an approved leave (and which type)
3. **Display each off day with its reason**, e.g.:
   - "Day Off" for regular rest days
   - "Planned Leave", "Medical Leave", "Sick Leave", etc. for approved leaves

### Prompt Examples

**Regular Day Off tomorrow, work day after:**
> Please note your next shift is **tomorrow, Tuesday, March 3, 2026**, at **9:00 AM EST**.

**1 regular Day Off tomorrow:**
> Tomorrow is your **Day Off — Wednesday, March 4, 2026**.
> Your next shift is on **Thursday, March 5, 2026**, at **9:00 AM EST**.

**2 consecutive regular Day Offs:**
> Your upcoming days off:
> - **Saturday, March 7, 2026** — Day Off
> - **Sunday, March 8, 2026** — Day Off
>
> Your next shift is on **Monday, March 9, 2026**, at **9:00 AM EST**.

**Planned Leave tomorrow + Day Off after:**
> Your upcoming days off:
> - **Friday, March 6, 2026** — Planned Leave
> - **Saturday, March 7, 2026** — Day Off
>
> Your next shift is on **Sunday, March 8, 2026**, at **9:00 AM EST**.

**Medical Leave for 3 days:**
> Your upcoming days off:
> - **Monday, March 9, 2026** — Medical Leave
> - **Tuesday, March 10, 2026** — Medical Leave
> - **Wednesday, March 11, 2026** — Medical Leave
>
> Your next shift is on **Thursday, March 12, 2026**, at **9:00 AM EST**.

### Technical Changes

**File: `src/components/dashboard/NextShiftDialog.tsx`**
- Update the `ShiftInfo` interface to include an array of off days, each with a date and reason (e.g., "Day Off", "Planned Leave", "Medical Leave")
- After scanning consecutive off days, query `leave_requests` for the agent's email where `status = 'approved'` and the date range overlaps
- For each off day, check if any approved leave covers that date; if yes, use the `outage_reason` as the label; otherwise label as "Day Off"
- Update the JSX to render a list of off days with their reasons when there are multiple, or a single-line message for just one off day

**File: `src/components/dashboard/StatusButtons.tsx`**
- Add `agentEmail` prop to `StatusButtonsProps`
- Pass it through to `NextShiftDialog`

**File: `src/pages/AgentDashboard.tsx`**
- Pass `profile.email` as `agentEmail` to `StatusButtons`

