
# Fix Ticket Logs Dashboard to Use EST Timezone

## Problem

The current `getRollingTwoWeekRange()` function and date generation loop in `ticketLogsApi.ts` use the user's local timezone via `new Date()`. This causes:

1. **Incorrect "today" calculation** - If user is in a different timezone, "today" might not match EST
2. **Incorrect date column generation** - Dates are shifted due to timezone parsing issues
3. **Missing columns** - 1/31 and 2/1 are not showing because of UTC parsing

## Solution

Update `ticketLogsApi.ts` to use EST (America/New_York) timezone consistently, following the existing pattern in `dateUtils.ts` that uses `Intl.DateTimeFormat` with `timeZone: 'America/New_York'`.

---

## Changes Required

### File: `src/lib/ticketLogsApi.ts`

**1. Add EST helper function** (similar to `dateUtils.ts` pattern):

```typescript
// Get current date in EST timezone
function getESTDate(): { year: number; month: number; day: number; dayOfWeek: number } {
  const now = new Date();
  const estFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  
  const parts = estFormatter.formatToParts(now);
  const dateParts: Record<string, string> = {};
  for (const part of parts) {
    dateParts[part.type] = part.value;
  }
  
  // Map weekday to day number (0=Sun, 1=Mon, etc.)
  const weekdayMap: Record<string, number> = {
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
  };
  
  return {
    year: parseInt(dateParts.year),
    month: parseInt(dateParts.month),
    day: parseInt(dateParts.day),
    dayOfWeek: weekdayMap[dateParts.weekday] || 0
  };
}
```

**2. Update `getRollingTwoWeekRange()`** to use EST-based "today":

Replace:
```typescript
const today = new Date();
const dayOfWeek = today.getDay();
```

With:
```typescript
const estToday = getESTDate();
// Create date object from EST values
const today = new Date(estToday.year, estToday.month - 1, estToday.day);
const dayOfWeek = estToday.dayOfWeek;
```

**3. Update date generation loop** (lines 217-223) to parse dates without timezone shift:

Replace:
```typescript
const dates: string[] = [];
const start = new Date(dateRange.startDate);
const end = new Date(dateRange.endDate);
for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
  dates.push(format(new Date(d), 'yyyy-MM-dd'));
}
```

With:
```typescript
const dates: string[] = [];
// Parse dates correctly to avoid timezone issues
const [startYear, startMonth, startDay] = dateRange.startDate.split('-').map(Number);
const [endYear, endMonth, endDay] = dateRange.endDate.split('-').map(Number);
const start = new Date(startYear, startMonth - 1, startDay);
const end = new Date(endYear, endMonth - 1, endDay);

for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
  dates.push(format(new Date(d), 'yyyy-MM-dd'));
}
```

---

## Technical Details

| Issue | Current Behavior | Fix |
|-------|-----------------|-----|
| "Today" uses local timezone | `new Date()` returns user's local time | Use `Intl.DateTimeFormat` with `timeZone: 'America/New_York'` to get EST date |
| Date parsing shifts dates | `new Date('2026-01-19')` parsed as UTC midnight, shifts back in local time | Parse date strings manually with `new Date(year, month-1, day)` |
| Day of week calculation | Uses local timezone | Extract weekday from EST-formatted date |

---

## Files Changed

| File | Changes |
|------|---------|
| `src/lib/ticketLogsApi.ts` | Add `getESTDate()` helper; update `getRollingTwoWeekRange()` to use EST; fix date generation loop to parse dates correctly |

---

## Expected Result

After this fix:
- Dashboard will show **1/19 - 2/1** in the badge (previous week Mon + current week Sun)
- Table columns will correctly display all 14 days: **1/19, 1/20, 1/21, ... 1/30, 1/31, 2/1**
- All date calculations will be based on EST timezone regardless of user's local timezone
