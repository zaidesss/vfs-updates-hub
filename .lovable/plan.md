

## Analysis

I identified **four issues** — two reported by you, and two additional related problems found during the audit.

---

### Issue 1: Coverage Board overrides not reflected in Dashboard logout dialog
**Root cause:** In `AgentDashboard.tsx` line 865, the `shiftSchedule` passed to `StatusButtons` → `LogoutConfirmDialog` is read directly from the profile object:
```typescript
shiftSchedule={profile[`${currentDayKey}_schedule` as keyof DashboardProfile] as string | null}
```
This reads the **base profile schedule** (e.g., ending at 5:00 PM), completely ignoring coverage board overrides. The logout dialog therefore shows the wrong shift end time and incorrectly marks you as "within your logout window" instead of "Early Out."

**Fix:** Replace with the effective schedule from the already-fetched `effectiveWeekSchedules` state. Look up today's date in that array and use `effectiveDay.schedule` instead of the raw profile field.

---

### Issue 2: Activity log shows wrong date (Feb 24 instead of Feb 25)
**Root cause:** In `CoverageActivityLog.tsx` line 135:
```typescript
format(new Date(log.date), 'MMM dd, yyyy')
```
`log.date` is a `yyyy-MM-dd` string like `"2026-02-25"`. JavaScript's `new Date("2026-02-25")` parses this as **UTC midnight**, which converts to **Feb 24 at 7:00 PM EST** — rolling the displayed date back by one day.

**Fix:** Use `parseISO` from date-fns (which also parses as UTC midnight but when used with `format` treats it as a local date without timezone conversion), or manually parse the date string to avoid the timezone shift. The standard pattern used elsewhere in this codebase is `parseDateStringLocal` from `timezoneUtils`.

---

### Issue 3: Dashboard bio allowance calculation ignores overrides
**Root cause:** In `AgentDashboard.tsx` lines 63-88, `calculateBioAllowanceFromSchedule` reads from `profile[dayMap[today]]` — the raw profile schedule. If a coverage override changes the shift length for today, the bio allowance (5 min for 5+ hour shifts, 2.5 min for shorter) could be wrong.

Note: The **backend** `calculateBioAllowanceForProfile` (called on LOGIN) already uses the schedule resolver. This frontend function is only a UI fallback. However, for consistency, it should also use the effective schedule.

**Fix:** Update `calculateBioAllowanceFromSchedule` to accept the effective schedule string directly instead of looking it up from the profile.

---

### Issue 4: ShiftScheduleTable profile fallback ignores overrides
**Root cause:** In `ShiftScheduleTable.tsx` line 202, there's a fallback that reads `profile[dayKey_schedule]` when effective schedules aren't available. This is already a secondary path (the primary path uses effective schedules), so this is low-risk but should be noted.

**No code change needed** — the effective schedules are always loaded before the table renders.

---

## Implementation Plan

### Step 1: Fix Dashboard logout dialog schedule (AgentDashboard.tsx)
Replace line 865 to derive `shiftSchedule` from `effectiveWeekSchedules` (already in state):
```typescript
// Find today's effective schedule from the resolver
const todayEffective = effectiveWeekSchedules.find(d => d.dayDate === currentDayKey_date);
shiftSchedule={todayEffective?.schedule || profile[`${currentDayKey}_schedule`...]}
```
This requires matching by today's date string (`getTodayEST()`) against `effectiveWeekSchedules[].dayDate`.

### Step 2: Fix Activity Log date parsing (CoverageActivityLog.tsx)
Replace line 135:
```typescript
// Before (timezone-shifted):
format(new Date(log.date), 'MMM dd, yyyy')

// After (timezone-safe):
format(parseISO(log.date), 'MMM dd, yyyy')
```
Import `parseISO` from `date-fns`. The `parseISO` + `format` combo treats the date as a local calendar date without UTC shifting.

### Step 3: Fix bio allowance frontend calculation (AgentDashboard.tsx)
Update `calculateBioAllowanceFromSchedule` to accept an optional effective schedule string parameter. When available, use it instead of the profile-based lookup. Pass the effective schedule from `effectiveWeekSchedules` at the call site.

---

## Scope Clarification

The following systems **already correctly use** the schedule resolver and do NOT need changes:
- `checkAndAlertEarlyOut` (backend early-out detection) — uses `getEffectiveScheduleForDate`
- `calculateAttendanceForWeek` (attendance table) — uses overrides + effective schedules
- `calculateBioAllowanceForProfile` (backend bio init on LOGIN) — uses schedule resolver
- Stale login/logout detection — uses `getEffectiveScheduleForDate`

The issues are purely **frontend display** (logout dialog, bio fallback) and **date formatting** (activity log).

