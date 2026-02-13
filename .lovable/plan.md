

## 5 OT-Related Improvements -- Implementation Plan

We will tackle all 5 improvements step by step. Here is the full plan, and we will implement them one at a time.

---

### Improvement 1: OT Hours in Work Tracker for Historical Weeks

**What it does:** When viewing snapshot data, show OT hours as a separate metric in the Work Tracker's Time Metrics row (alongside Portal Time and Upwork Time).

**Changes:**
- **`src/components/dashboard/DailyWorkTracker.tsx`**: Add an `otHoursWorkedMinutes` prop. When non-zero, render an "OT Time" metric in the Time Metrics grid (using a Timer icon, violet color). Increase the grid column count accordingly.
- **`src/pages/AgentDashboard.tsx`**: Pass the selected day's `otHoursWorkedMinutes` from attendance data to the `DailyWorkTracker`.

---

### Improvement 2: OT Schedule Display on Day Off

**What it does:** In the Shift Schedule Table, when a day is marked "Day Off" but the agent has an OT schedule for that day, show an "OT Scheduled" badge next to the "Off" badge.

**Changes:**
- **`src/components/dashboard/ShiftScheduleTable.tsx`**: In the `getStatusBadges` function, for `day_off` status rows, check if `dayAttendance.otSchedule` exists. If so, append a violet "OT Scheduled" badge showing the OT schedule time.

---

### Improvement 3: Snapshot Badge for OT Data

**What it does:** When the OT Email bar in the Work Tracker is displaying data from a snapshot (historical week), show a small "Snapshot" indicator badge next to the "OT Email" label.

**Changes:**
- **`src/components/dashboard/DailyWorkTracker.tsx`**: Add a `dataSource` prop (`'snapshot' | 'live'`). When `dataSource === 'snapshot'` and OT Email bar is visible, render a small "Snapshot" badge next to the OT Email label.
- **`src/pages/AgentDashboard.tsx`**: Pass `dataSource` to the `DailyWorkTracker`.

---

### Improvement 4: Weekly OT Summary in Performance Card

**What it does:** Add an "OT Tickets" metric to the Weekly Summary card that shows the total OT tickets handled across the week, separate from the existing "OT Hours" metric.

**Changes:**
- **`src/components/dashboard/WeeklySummaryCard.tsx`**: Add an `otEnabled` prop. Sum `otTicketCount` across all attendance days. When `otEnabled` is true or the total is greater than 0, add an "OT Tickets" metric (using Zap icon, violet color) showing the weekly total.
- **`src/pages/AgentDashboard.tsx`**: Pass `otEnabled={!!profile.ot_enabled}` to the `WeeklySummaryCard`.

---

### Improvement 5: OT Quota from Effective Schedule

**What it does:** For historical weeks, use the effective-dated `quota_ot_email` from the schedule resolver (stored in snapshots) rather than the current base profile value.

**Changes:**
- **Database migration**: Add `quota_ot_email` column to `attendance_snapshots` (integer, nullable).
- **`supabase/functions/compute-weekly-snapshots/index.ts`**: When computing each day's snapshot, include the effective `quota_ot_email` from the schedule resolver in the snapshot row.
- **`src/lib/agentDashboardApi.ts`**: Map `quota_ot_email` from snapshot rows into the `DayAttendance` type (add a new `effectiveQuotaOtEmail` field).
- **`src/pages/AgentDashboard.tsx`**: When in snapshot mode, use the day's `effectiveQuotaOtEmail` for the OT Email progress bar quota instead of `profile.quota_ot_email`.

---

### Execution Order

1. Improvement 1 -- OT Hours in Work Tracker (UI only, no migration)
2. Improvement 2 -- OT badge on Day Off rows (UI only)
3. Improvement 3 -- Snapshot badge on OT Email bar (UI only)
4. Improvement 4 -- OT Tickets in Weekly Summary (UI only)
5. Improvement 5 -- OT Quota from Effective Schedule (migration + edge function + UI)

