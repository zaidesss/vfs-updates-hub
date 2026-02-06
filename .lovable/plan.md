
# Fix Sync: Use First Available Schedule Instead of Fixed Day

## Problem Identified

The calculation and sync logic uses `mon_schedule` as the representative weekday schedule and `sat_schedule` as the representative weekend schedule. When an agent has Monday or Saturday as a day off, these fields are `null`, causing the hours calculation to be wrong.

**Example - Pauline Carbajosa:**
- Days off: `['Sun', 'Mon']`
- `mon_schedule = null` (Monday is off)
- Actual working weekdays: Tue-Fri all have `12:00 PM - 7:30 PM`
- **Current result:** weekday_total_hours = 0 (WRONG)
- **Expected result:** weekday_total_hours = 4 days × 7.5 hours = 30 hours

## Root Cause

| File | Bug Location | Issue |
|------|--------------|-------|
| `src/lib/profileTotalHours.ts` | Lines 55-58 | Uses `mon_schedule` and `sat_schedule` as representatives |
| `src/lib/masterDirectoryApi.ts` | Lines 544-545 | Uses `mon_schedule` and `sat_schedule` for sync |
| `src/lib/masterDirectoryApi.ts` | Lines 185-186 | Uses `weekday_schedule` and `weekend_schedule` for calculation |

## Solution

Create helper functions to find the **first available schedule** from the per-day fields, not just Monday/Saturday.

---

## Technical Changes

### File 1: `src/lib/profileTotalHours.ts`

Add helper function and update schedule retrieval:

```typescript
// Helper to get first available weekday schedule
function getFirstWeekdaySchedule(profile: Partial<AgentProfileInput>): string | null | undefined {
  return profile.mon_schedule || profile.tue_schedule || profile.wed_schedule || 
         profile.thu_schedule || profile.fri_schedule;
}

// Helper to get first available weekend schedule
function getFirstWeekendSchedule(profile: Partial<AgentProfileInput>): string | null | undefined {
  return profile.sat_schedule || profile.sun_schedule;
}
```

Then update lines 55-58:
```typescript
// Get weekday schedule from first available working day
const dailyWeekdayHours = parseScheduleHours(getFirstWeekdaySchedule(profile));
// Get weekend schedule from first available weekend day
const dailyWeekendHours = parseScheduleHours(getFirstWeekendSchedule(profile));
```

---

### File 2: `src/lib/masterDirectoryApi.ts`

Update sync logic (lines 544-545):

```typescript
// Find first available weekday schedule (not just Monday)
weekday_schedule: profile.mon_schedule || profile.tue_schedule || profile.wed_schedule || 
                  profile.thu_schedule || profile.fri_schedule || null,
// Find first available weekend schedule (not just Saturday)
weekend_schedule: profile.sat_schedule || profile.sun_schedule || null,
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/profileTotalHours.ts` | Add helpers and use first available schedule |
| `src/lib/masterDirectoryApi.ts` | Update sync to use first available schedule |

---

## Expected Results After Fix

**For Pauline Carbajosa (days off: Sun, Mon):**

| Metric | Before (Bug) | After (Fixed) |
|--------|--------------|---------------|
| weekday_schedule | null | 12:00 PM - 7:30 PM |
| weekday_total_hours | 0 | 30 (4 days × 7.5h) |
| weekend_total_hours | 7.5 | 7.5 |
| unpaid_break_hours | 2.5 | 2.5 |
| overall_total_hours | 6 | 36 |

---

## Implementation Notes

After applying this fix:
1. The profile page will show correct total hours immediately
2. Master Directory needs a "Sync from Bios" click to recalculate stored values
3. All agents with non-Monday/Saturday day offs will be fixed
