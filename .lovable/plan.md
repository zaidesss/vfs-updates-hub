

## Update Total Hours Calculation with Correct Break Deduction Logic

### Summary

This plan updates the hours calculation to properly compute weekly totals with unpaid break deductions, including:
- Weekday schedule applies to Mon-Fri (excluding day_off)
- Weekend schedule applies to Sat-Sun (excluding day_off)
- 30 minutes unpaid break per working weekday
- Fixed 30 minutes weekly for Weekend Revalida (applies to all agents regardless of day_off)

---

### Formula

```text
weekday_total_hours = workingWeekdays × weekdayHoursPerDay
weekend_total_hours = workingWeekendDays × weekendHoursPerDay
unpaid_break_hours = (workingWeekdays × 0.5) + 0.5
overall_total_hours = weekday_total_hours + weekend_total_hours + ot_total_hours - unpaid_break_hours
```

### Example Calculation

For an agent with:
- Weekday Schedule: 8:00 AM - 5:00 PM (9 hours)
- Weekend Schedule: 10:00 AM - 3:00 PM (5 hours)
- Day Off: Wed, Sun

Result:
- Working weekdays = 5 - 1 (Wed) = 4 days
- Working weekend days = 2 - 1 (Sun) = 1 day
- Weekday Total: 4 × 9 = 36 hours
- Weekend Total: 1 × 5 = 5 hours
- Unpaid Break: (4 × 0.5) + 0.5 = 2.5 hours
- Overall Total: 36 + 5 + 0 (OT) - 2.5 = 38.5 hours

---

### Changes Required

#### Step 1: Database Migration

Add `unpaid_break_hours` column to `agent_directory` table for tracking/reporting.

```sql
ALTER TABLE agent_directory 
ADD COLUMN unpaid_break_hours NUMERIC DEFAULT 0;
```

#### Step 2: Update DirectoryEntry Interface

**File:** `src/lib/masterDirectoryApi.ts`

Add the new field to the interface:
```typescript
export interface DirectoryEntry {
  // ... existing fields
  unpaid_break_hours: number;  // NEW: Track unpaid break deductions
  // ...
}
```

#### Step 3: Update calculateTotalHours Function

**File:** `src/lib/masterDirectoryApi.ts`

Replace the current simple calculation with:
- Count working weekdays (Mon-Fri excluding day_off)
- Count working weekend days (Sat-Sun excluding day_off)
- Calculate unpaid break: (workingWeekdays × 0.5) + 0.5
- Return all values including unpaid_break_hours

#### Step 4: Update toggleArrayValue to Recalculate Hours

**File:** `src/pages/MasterDirectory.tsx`

When day_off changes, trigger recalculation of total hours (similar to how schedule changes work).

#### Step 5: Update Merge Logic for fetchAllDirectoryEntries

**File:** `src/lib/masterDirectoryApi.ts`

Add `unpaid_break_hours` to the merged data with default value of 0.

#### Step 6: Update bulkSaveEntries

**File:** `src/lib/masterDirectoryApi.ts`

Include `unpaid_break_hours` in the upsert data.

---

### Technical Details

#### Updated calculateTotalHours Function Logic

```typescript
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const WEEKENDS = ['Sat', 'Sun'];

// Count working days
const workingWeekdays = WEEKDAYS.filter(day => !dayOff.includes(day)).length;
const workingWeekendDays = WEEKENDS.filter(day => !dayOff.includes(day)).length;

// Parse daily hours
const dailyWeekdayHours = parseScheduleHours(weekday_schedule);
const dailyWeekendHours = parseScheduleHours(weekend_schedule);

// Calculate totals
const weekdayTotal = workingWeekdays * dailyWeekdayHours;
const weekendTotal = workingWeekendDays * dailyWeekendHours;
const otTotal = parseScheduleHours(weekday_ot) + parseScheduleHours(weekend_ot);

// Unpaid break: 30 min per working weekday + 30 min weekly for Weekend Revalida
const unpaidBreak = (workingWeekdays * 0.5) + 0.5;

// Overall = gross hours - unpaid breaks
const overall = weekdayTotal + weekendTotal + otTotal - unpaidBreak;
```

---

### Files to Modify

| File | Changes |
|------|---------|
| Database | Add `unpaid_break_hours` column |
| `src/lib/masterDirectoryApi.ts` | Update interface, `calculateTotalHours`, `fetchAllDirectoryEntries`, `bulkSaveEntries` |
| `src/pages/MasterDirectory.tsx` | Update `toggleArrayValue` to recalculate hours when day_off changes |

