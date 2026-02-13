

## OT Work Tracker Visibility + OT Snapshot Enhancement

### Overview
Two changes:
1. Show OT Email bar whenever `ot_enabled` is true in the agent profile (not just when ON_OT status or has OT tickets)
2. Store per-day OT ticket counts in `attendance_snapshots` so historical drill-down works

Plus related improvements to consider.

---

### Part 1: OT Email Bar Always Visible When OT Enabled

**File: `src/components/dashboard/DailyWorkTracker.tsx`**

Current logic (line 124):
```ts
const showOtEmail = isOnOT || (ticketCounts.otEmail > 0);
```

Change: Add a new `otEnabled` prop and update the logic:
```ts
const showOtEmail = otEnabled || isOnOT || (ticketCounts.otEmail > 0);
```

**File: `src/pages/AgentDashboard.tsx`**

Pass `otEnabled={profile.ot_enabled}` to the `DailyWorkTracker` component (it already has access to `profile.ot_enabled`).

---

### Part 2: OT Ticket Count in Attendance Snapshots

**Database Migration:**

Add an `ot_ticket_count` integer column to `attendance_snapshots`:
```sql
ALTER TABLE attendance_snapshots 
  ADD COLUMN ot_ticket_count integer DEFAULT 0;
```

**File: `supabase/functions/compute-weekly-snapshots/index.ts`**

In `computeAttendanceSnapshots`, after computing OT hours for each day, also query `ticket_logs` for that day filtered by `is_ot = true` and `agent_email`, then include the count in the snapshot row:
```ts
ot_ticket_count: otTicketCountForDay,
```

**File: `src/lib/agentDashboardApi.ts`**

In `fetchAttendanceDualRead`, when mapping snapshot rows to `DayAttendance`, include the `ot_ticket_count` field so the dashboard can display it for historical weeks.

**File: `src/pages/AgentDashboard.tsx`**

When in snapshot mode, populate `ticketCounts.otEmail` from the attendance snapshot's `ot_ticket_count` for the selected day, instead of fetching from (purged) `ticket_logs`.

---

### Related Improvements to Consider

Here are additional improvements closely related to this OT/snapshot work that you may want to tackle:

1. **OT Hours in Work Tracker for Historical Weeks** -- Currently when viewing snapshot data, the Work Tracker's "Portal Time" shows total hours but doesn't separately display OT hours. The `attendance_snapshots` already has `ot_hours_worked_minutes` -- should we surface this as a separate metric in the Time Metrics row?

2. **OT Schedule Display on Day Off** -- When an agent has OT enabled on a day off, the attendance row shows "Day Off" but doesn't indicate they have an OT shift. Should we show an OT indicator badge on day-off rows when OT is scheduled?

3. **Snapshot Badge for OT Data** -- When viewing historical OT ticket counts from snapshots, should the OT Email bar show a small "snapshot" indicator to differentiate from live data?

4. **Weekly OT Summary in Performance Card** -- The weekly summary card shows total tickets but doesn't break out OT tickets separately. Should we add an OT subtotal line?

5. **OT Quota from Effective Schedule** -- Currently `quota_ot_email` comes from the base profile. Should historical weeks use the effective-dated quota (from schedule assignments) instead, for consistency with how regular quotas work?

---

### Execution Order

1. Database migration: add `ot_ticket_count` to `attendance_snapshots`
2. Update `DailyWorkTracker` to accept and use `otEnabled` prop
3. Pass `otEnabled` from `AgentDashboard` to `DailyWorkTracker`
4. Update `compute-weekly-snapshots` to capture OT ticket counts per day
5. Update `fetchAttendanceDualRead` to map `ot_ticket_count`
6. Update dashboard snapshot path to use `ot_ticket_count` for Work Tracker

