

# Fix OT Schedule Loading & Hours Calculation Issues

## Issues Identified

### Issue 1: OT Schedule Values Disappear After Save
**Root Cause**: The per-day OT schedule fields (`mon_ot_schedule` through `sun_ot_schedule`) are NOT being loaded from the database into the component state when the profile is fetched. When the profile is saved, these fields are sent as empty strings, overwriting the saved data.

**Affected Files**:
- `src/pages/AgentProfile.tsx` (lines 154-166) - Missing per-day OT fields in `loadProfile()`
- `src/pages/ManageProfiles.tsx` (lines 111-122) - Missing per-day OT fields in `handleSelectUser()`

### Issue 2: Upwork Hours Not Including OT in Agent Profile
**Root Cause**: The OT schedule fields are not being loaded (Issue 1), so `calculateProfileTotalHours()` receives empty/undefined values for OT schedules, resulting in 0 OT hours in the calculation.

### Issue 3: Break Deduction Ignores Weekend Working Days
**Root Cause**: Both calculation functions only deduct breaks for weekdays, ignoring agents who work weekends with scheduled breaks.

**Affected Files**:
- `src/lib/profileTotalHours.ts` (line 92)
- `src/lib/masterDirectoryApi.ts` (line 226)

---

## Solution Overview

| Issue | Fix |
|-------|-----|
| OT schedules disappear | Add missing per-day OT fields to profile loading in both pages |
| Upwork hours missing OT | Fixed automatically once OT fields are loaded |
| Weekend breaks ignored | Update break calculation to include all working days |

---

## Technical Changes

### File 1: `src/pages/AgentProfile.tsx`

**Location**: `loadProfile()` function, around lines 162-166

Add the missing per-day OT schedule fields after `weekend_ot_schedule`:

```typescript
weekday_ot_schedule: result.data.weekday_ot_schedule || '',
weekend_ot_schedule: result.data.weekend_ot_schedule || '',
// ADD THESE MISSING FIELDS:
mon_ot_schedule: result.data.mon_ot_schedule || '',
tue_ot_schedule: result.data.tue_ot_schedule || '',
wed_ot_schedule: result.data.wed_ot_schedule || '',
thu_ot_schedule: result.data.thu_ot_schedule || '',
fri_ot_schedule: result.data.fri_ot_schedule || '',
sat_ot_schedule: result.data.sat_ot_schedule || '',
sun_ot_schedule: result.data.sun_ot_schedule || '',
day_off: result.data.day_off || [],
```

Also add to the initial state definition (lines 83-90) and the fallback "new profile" section (lines 227-232).

---

### File 2: `src/pages/ManageProfiles.tsx`

**Location**: `handleSelectUser()` function, around lines 119-122

Add the missing per-day OT schedule fields after `weekend_ot_schedule`:

```typescript
weekday_ot_schedule: profile?.weekday_ot_schedule || '',
weekend_ot_schedule: profile?.weekend_ot_schedule || '',
// ADD THESE MISSING FIELDS:
mon_ot_schedule: profile?.mon_ot_schedule || '',
tue_ot_schedule: profile?.tue_ot_schedule || '',
wed_ot_schedule: profile?.wed_ot_schedule || '',
thu_ot_schedule: profile?.thu_ot_schedule || '',
fri_ot_schedule: profile?.fri_ot_schedule || '',
sat_ot_schedule: profile?.sat_ot_schedule || '',
sun_ot_schedule: profile?.sun_ot_schedule || '',
day_off: profile?.day_off || [],
```

---

### File 3: `src/lib/profileTotalHours.ts`

**Location**: Lines 87-93 (break calculation)

Update break calculation to include weekend working days:

```typescript
// BEFORE (Bug):
let unpaidBreakHours = 0;
if (hasBreakSchedule) {
  const breakDurationPerDay = parseScheduleHours(profile.break_schedule);
  // Weekday breaks only
  unpaidBreakHours = workingWeekdays * breakDurationPerDay;
}

// AFTER (Fixed):
let unpaidBreakHours = 0;
if (hasBreakSchedule) {
  const breakDurationPerDay = parseScheduleHours(profile.break_schedule);
  // Deduct breaks for ALL scheduled working days (weekdays + weekends)
  const totalWorkingDays = workingWeekdays + workingWeekendDays;
  unpaidBreakHours = totalWorkingDays * breakDurationPerDay;
}
```

---

### File 4: `src/lib/masterDirectoryApi.ts`

**Location**: Lines 220-227 (break calculation)

Apply the same fix:

```typescript
// BEFORE (Bug):
let unpaidBreakHours = 0;
if (hasBreakSchedule) {
  const breakDurationPerDay = parseScheduleHours(entry.break_schedule ?? null);
  // Weekday breaks only (no Revalida deduction anymore)
  unpaidBreakHours = workingWeekdays * breakDurationPerDay;
}

// AFTER (Fixed):
let unpaidBreakHours = 0;
if (hasBreakSchedule) {
  const breakDurationPerDay = parseScheduleHours(entry.break_schedule ?? null);
  // Deduct breaks for ALL scheduled working days (weekdays + weekends)
  const totalWorkingDays = workingWeekdays + workingWeekendDays;
  unpaidBreakHours = totalWorkingDays * breakDurationPerDay;
}
```

---

## Files to Modify

| File | Change Description |
|------|-------------------|
| `src/pages/AgentProfile.tsx` | Add per-day OT fields to profile loading and initial state |
| `src/pages/ManageProfiles.tsx` | Add per-day OT fields to profile loading |
| `src/lib/profileTotalHours.ts` | Fix break deduction to include weekend working days |
| `src/lib/masterDirectoryApi.ts` | Fix break deduction to include weekend working days |

---

## Expected Results After Fix

| Scenario | Before | After |
|----------|--------|-------|
| Save OT schedule, refresh page | OT values disappear | OT values persist |
| Agent Profile total hours with OT | Missing OT hours | Includes OT hours |
| Agent working 6 days with 1hr break | 5hr break deduction | 6hr break deduction |
| Master Directory total hours | Correct | Correct (now consistent) |

---

## Implementation Approach

I recommend implementing all four fixes together since they are related to the same data flow (schedules and hours calculation). This ensures consistency between Agent Profile and Master Directory views.

