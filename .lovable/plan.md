

## Problem

The effective schedule resolver returns `otSchedule: "Day Off"` for weekend/day-off days. The `ShiftScheduleTable` displays this value without filtering it out, causing:
1. "OT: Day Off" text in the Schedule column
2. "OT: Day Off" violet badge in the Status column  
3. "OT Scheduled" badge appearing for day-off days

## Fix: Filter "Day Off" OT values in ShiftScheduleTable.tsx

### Change 1 — Schedule column OT display (lines 282-289)
Add a guard: only show OT sub-text if `otSched` exists AND is not "Day Off" / "Off".

### Change 2 — Status badge for day-off rows (lines 88-95)
Add same guard to the `dayAttendance.otSchedule` check inside the `day_off` case — skip the OT badge if the value is "Day Off".

### Change 3 — OT status badges section (line 135)
Add guard so `otSchedule` values of "Day Off" don't trigger OT badge rendering.

All three changes are in `src/components/dashboard/ShiftScheduleTable.tsx`. No database or resolver changes needed — pure UI filtering.

