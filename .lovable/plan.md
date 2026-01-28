

## Update Break Deduction Logic Based on Break Schedule Field

### Summary

Modify the `calculateTotalHours` function to make break deductions conditional on the Break Schedule field having a value. If Break Schedule is empty, skip all break deductions entirely.

---

### Current Behavior

```text
unpaid_break_hours = (workingWeekdays × 0.5) + 0.5  // Always applied
```

### New Behavior

```text
IF break_schedule has value:
  breakDuration = parseScheduleHours(break_schedule)  // e.g., 30 min = 0.5 hours
  weekdayBreakHours = workingWeekdays × breakDuration
  weekendRevalidaHours = 0.5  // Fixed 30 min
  unpaid_break_hours = weekdayBreakHours + weekendRevalidaHours

ELSE (break_schedule is empty/null):
  unpaid_break_hours = 0
```

---

### Example Calculations

**With Break Schedule = "12:00 PM-12:30 PM" (30 min break):**
- Weekday Schedule: 8:00 AM-5:00 PM (9 hours)
- Day Off: Wed
- Working weekdays: 4
- Break duration: 0.5 hours
- Unpaid breaks: (4 × 0.5) + 0.5 = 2.5 hours
- Overall: 36 - 2.5 = 33.5 paid hours

**With Break Schedule = "12:00 PM-1:00 PM" (1 hour break):**
- Working weekdays: 4
- Break duration: 1 hour
- Unpaid breaks: (4 × 1) + 0.5 = 4.5 hours
- Overall: 36 - 4.5 = 31.5 paid hours

**Without Break Schedule (empty):**
- Weekday Schedule: 8:00 AM-5:00 PM (9 hours)
- Working weekdays: 4
- Unpaid breaks: 0
- Overall: 36 paid hours (schedule treated as net time)

---

### File to Modify

**`src/lib/masterDirectoryApi.ts`** - Update `calculateTotalHours` function (lines 162-199)

### Changes

1. Check if `break_schedule` has a value
2. If yes:
   - Parse the break duration using `parseScheduleHours(break_schedule)`
   - Calculate weekday break: `workingWeekdays × breakDuration`
   - Add fixed 30-min Weekend Revalida: `+ 0.5`
3. If no:
   - Set `unpaid_break_hours = 0`

---

### Technical Implementation

```typescript
// Inside calculateTotalHours function:

// Check if break schedule has a value
const hasBreakSchedule = entry.break_schedule && entry.break_schedule.trim() !== '';

let unpaidBreakHours = 0;
if (hasBreakSchedule) {
  // Parse actual break duration from break schedule
  const breakDurationPerDay = parseScheduleHours(entry.break_schedule ?? null);
  
  // Weekday breaks + fixed 30 min Weekend Revalida
  unpaidBreakHours = (workingWeekdays * breakDurationPerDay) + 0.5;
}

// Overall = gross hours - unpaid breaks
const overallTotalHours = weekdayTotalHours + weekendTotalHours + otTotalHours - unpaidBreakHours;
```

