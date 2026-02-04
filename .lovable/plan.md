
# Plan: Update Total Hours Calculation + OT Attendance Tracking

## Summary

This plan addresses three major changes:

1. **New Total Hours Formula**: `Weekday + Weekend - Break + Revalida (30m) + Weekly Meeting (30m) = Total Hours`
2. **OT Schedule UI Changes**: Change from weekday/weekend OT schedule to per-day OT schedules (Mon-Sun)
3. **OT Attendance Tracking**: Track Present OT, Late OT, Absent OT, OT Logout in Dashboard

---

## Part 1: New Total Hours Calculation Formula

### Current Logic (WRONG)
```text
Overall = (Weekday Hours + Weekend Hours + OT Hours) - Unpaid Break Hours
Unpaid Break = (working_weekdays × daily_break) + 0.5h (Revalida)
```

### New Logic (CORRECT)
```text
Overall = (Weekday Hours + Weekend Hours + OT Hours) - Unpaid Break + Revalida (0.5h) + Meeting (0.5h)
Unpaid Break = working_weekdays × daily_break_duration
```

The key differences:
- **Revalida (30 mins/week)**: Was DEDUCTED, now ADDED (paid activity)
- **Weekly Meeting (30 mins/week)**: NEW addition (paid activity)
- Net effect: Total hours increase by 1 hour compared to old formula

### Files to Modify
- `src/lib/masterDirectoryApi.ts` - `calculateTotalHours()` function

---

## Part 2: OT Schedule UI Changes (Agent Profiles)

### Current UI (when `ot_enabled = true`)
```text
□ Enable OT Schedule
├── Weekday OT Schedule: [________]  (single field for Mon-Fri)
└── Weekend OT Schedule: [________]  (single field for Sat-Sun)
```

### New UI (when `ot_enabled = true`)
```text
□ Enable OT Schedule

OT Schedule (Weekday)
├── Monday OT:    [________]
├── Tuesday OT:   [________]
├── Wednesday OT: [________]
├── Thursday OT:  [________]
└── Friday OT:    [________]

OT Schedule (Weekend)
├── Saturday OT:  [________]
└── Sunday OT:    [________]
```

### Database Changes Required

Add 7 new columns to `agent_profiles`:
| Column | Type | Description |
|--------|------|-------------|
| mon_ot_schedule | text | Monday OT schedule |
| tue_ot_schedule | text | Tuesday OT schedule |
| wed_ot_schedule | text | Wednesday OT schedule |
| thu_ot_schedule | text | Thursday OT schedule |
| fri_ot_schedule | text | Friday OT schedule |
| sat_ot_schedule | text | Saturday OT schedule |
| sun_ot_schedule | text | Sunday OT schedule |

Also add to `agent_directory` for sync:
| Column | Type | Description |
|--------|------|-------------|
| mon_ot_schedule | text | Monday OT schedule |
| tue_ot_schedule | text | Tuesday OT schedule |
| wed_ot_schedule | text | Wednesday OT schedule |
| thu_ot_schedule | text | Thursday OT schedule |
| fri_ot_schedule | text | Friday OT schedule |
| sat_ot_schedule | text | Saturday OT schedule |
| sun_ot_schedule | text | Sunday OT schedule |

### Files to Modify
- `src/pages/AgentProfile.tsx` - Add new OT schedule fields
- `src/lib/agentProfileApi.ts` - Update profile types and save logic
- `src/pages/ManageProfiles.tsx` - Update admin profile editing
- `src/lib/masterDirectoryApi.ts` - Update sync and calculation logic
- `src/integrations/supabase/types.ts` (auto-updated after migration)

---

## Part 3: OT Attendance Tracking in Dashboard

### OT Attendance Statuses
| Status | Condition | Visual |
|--------|-----------|--------|
| Present OT | OT_LOGIN within 10 min of OT schedule | Green badge "Present OT (time)" |
| Late OT | OT_LOGIN > 10 min after OT schedule | Yellow badge "Late OT (time)" |
| Absent OT | OT schedule exists for day, no OT_LOGIN | Red badge "Absent OT" |
| OT Logout | OT_LOGOUT recorded | Grey badge "OT Out (time)" |

### Dashboard Shift Schedule Table Changes

When OT is on a Day Off:
```text
| Day    | Schedule | Status                  |
|--------|----------|-------------------------|
| Monday | Day Off  | [Off] [Present OT 6PM]  |
```

Shows both the "Day Off" badge AND OT attendance badges.

### OT Hours in Weekly Summary

Add new metric cards:
- **OT Hours Expected**: From profile OT schedules
- **OT Hours Worked**: From actual OT_LOGIN to OT_LOGOUT events

### Data Changes Required

Update `DayAttendance` interface:
```typescript
interface DayAttendance {
  // ... existing fields
  otSchedule?: string;         // Expected OT schedule for this day
  otLoginTime?: string;        // Actual OT login time
  otLogoutTime?: string;       // Actual OT logout time
  otStatus?: 'present_ot' | 'late_ot' | 'absent_ot' | 'pending_ot';
  otHoursWorkedMinutes?: number;
}
```

### Files to Modify
- `src/lib/agentDashboardApi.ts` - Update attendance calculation, add OT tracking
- `src/components/dashboard/ShiftScheduleTable.tsx` - Display OT badges
- `src/components/dashboard/WeeklySummaryCard.tsx` - Add OT metrics

---

## Implementation Order

### Step 1: Database Migration
Add 14 new columns (7 to agent_profiles, 7 to agent_directory)

### Step 2: Update Agent Profile UI
- Add per-day OT schedule fields
- Update form state and save logic

### Step 3: Update Total Hours Calculation
- Fix the formula in `calculateTotalHours()`
- Add Revalida and Meeting as additions

### Step 4: Update Master Directory Sync
- Include new OT columns in sync
- Update OT total hours calculation to use per-day fields

### Step 5: Update Dashboard Attendance
- Fetch OT events (OT_LOGIN, OT_LOGOUT)
- Calculate OT attendance status per day
- Add OT fields to DayAttendance interface

### Step 6: Update Dashboard UI Components
- ShiftScheduleTable: Show OT badges alongside day status
- WeeklySummaryCard: Add OT Hours metrics

---

## Technical Details

### Total Hours Calculation (New)

```typescript
export function calculateTotalHours(entry: Partial<DirectoryEntry>): {...} {
  // ... existing weekday/weekend calculations
  
  // Parse break duration per working weekday
  const breakDurationPerDay = parseScheduleHours(entry.break_schedule ?? null);
  const unpaidBreakHours = workingWeekdays * breakDurationPerDay;
  
  // Fixed weekly additions (paid activities)
  const revalidaHours = 0.5;  // 30 mins weekly
  const weeklyMeetingHours = 0.5;  // 30 mins weekly
  
  // NEW FORMULA:
  // Gross - Break + Revalida + Meeting = Total
  const overallTotalHours = 
    weekdayTotalHours + 
    weekendTotalHours + 
    otTotalHours - 
    unpaidBreakHours + 
    revalidaHours + 
    weeklyMeetingHours;
  
  return {
    weekday_total_hours: weekdayTotalHours,
    weekend_total_hours: weekendTotalHours,
    ot_total_hours: otTotalHours,
    unpaid_break_hours: unpaidBreakHours,
    overall_total_hours: overallTotalHours,
  };
}
```

### OT Total Hours Calculation (Per-Day)

```typescript
// Calculate OT by summing each day's OT schedule
const dailyOtSchedules = [
  { day: 'Mon', schedule: entry.mon_ot_schedule, isOff: dayOff.includes('Mon') },
  { day: 'Tue', schedule: entry.tue_ot_schedule, isOff: dayOff.includes('Tue') },
  // ... etc
];

let otTotalHours = 0;
dailyOtSchedules.forEach(({ schedule, isOff }) => {
  // OT can happen even on day off, so don't skip based on isOff
  if (schedule) {
    otTotalHours += parseScheduleHours(schedule);
  }
});
```

### OT Attendance Detection

```typescript
function calculateOTAttendanceForDay(
  dayKey: string,
  profile: DashboardProfile,
  allEvents: ProfileEvent[],
  dateStr: string
): OTDayAttendance {
  // Get OT schedule for this specific day
  const otScheduleKey = `${dayKey}_ot_schedule` as keyof DashboardProfile;
  const otSchedule = profile[otScheduleKey] as string | null;
  
  // Find OT events for this date
  const otLogin = allEvents.find(e => 
    e.event_type === 'OT_LOGIN' && 
    format(parseISO(e.created_at), 'yyyy-MM-dd') === dateStr
  );
  const otLogout = allEvents.find(e =>
    e.event_type === 'OT_LOGOUT' &&
    format(parseISO(e.created_at), 'yyyy-MM-dd') === dateStr
  );
  
  // Determine OT status
  if (!otSchedule) {
    // No OT scheduled
    if (otLogin) return { status: 'present_ot', ... }; // Voluntary OT
    return { status: undefined }; // No OT
  }
  
  if (!otLogin) {
    return { status: 'absent_ot' }; // OT scheduled but didn't log in
  }
  
  // Check if late (> 10 mins after OT schedule start)
  const otParsed = parseScheduleRange(otSchedule);
  const otLoginMinutes = getTimeInESTMinutes(parseISO(otLogin.created_at));
  const isLateOT = otLoginMinutes > otParsed.startMinutes + 10;
  
  return {
    status: isLateOT ? 'late_ot' : 'present_ot',
    loginTime: formatTimeInEST(parseISO(otLogin.created_at)),
    logoutTime: otLogout ? formatTimeInEST(parseISO(otLogout.created_at)) : undefined,
    hoursWorkedMinutes: /* calculate from events */
  };
}
```

---

## Summary of All File Changes

| File | Changes |
|------|---------|
| Database migration | Add 14 OT schedule columns |
| `src/lib/masterDirectoryApi.ts` | Fix total hours formula, add OT per-day sync |
| `src/lib/agentDashboardApi.ts` | Add OT attendance calculation, update interfaces |
| `src/lib/agentProfileApi.ts` | Add new OT schedule fields to types |
| `src/pages/AgentProfile.tsx` | Add per-day OT schedule UI fields |
| `src/pages/ManageProfiles.tsx` | Update admin profile editing for OT |
| `src/components/dashboard/ShiftScheduleTable.tsx` | Display OT attendance badges |
| `src/components/dashboard/WeeklySummaryCard.tsx` | Add OT hours metrics |
| `src/components/profile/WorkConfigurationSection.tsx` | Add per-day OT inputs |
