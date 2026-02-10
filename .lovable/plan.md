

## Fix: Outage Duration Calculation for Overnight Shifts

### Problem
When a shift crosses midnight (e.g., 20:00 - 03:30), the system calculates:
- Daily hours: 7.5h (correct -- handles overnight)
- Days: 2 (Feb 26 to Feb 27 = 2 calendar days)
- Total: 7.5 x 2 = 15h (WRONG)

The actual duration should be **7.5h** because the two-day span IS the single overnight shift, not two separate shifts.

### Root Cause
In `src/lib/leaveRequestApi.ts`, the `calculateDurations` function multiplies daily hours by the number of calendar days. For overnight shifts, the end date is naturally the next day, so the day count double-counts the shift.

### Fix (Single File Change)
**File:** `src/lib/leaveRequestApi.ts` -- `calculateDurations` function

Update the logic to detect overnight shifts (end time earlier than start time) and adjust the day count accordingly:

1. When the shift is overnight (end time < start time), the date span inherently includes an extra day per shift
2. Subtract 1 from `daysDiff` to get the actual number of shift repetitions, then multiply by daily hours
3. For a single overnight shift (Feb 26-27), this gives: daysDiff=2, adjusted to 1 shift, 1 x 7.5 = 7.5h
4. For multiple overnight shifts (e.g., Feb 26-28, meaning 2 nights), daysDiff=3, adjusted to 2 shifts, 2 x 7.5 = 15h

```
Current:  totalHours = dailyHours * daysDiff
Fixed:    totalHours = dailyHours * (isOvernight ? daysDiff - 1 : daysDiff)
```

Normal daytime shifts remain unaffected (e.g., 09:00-17:00 across 2 days = 8h x 2 = 16h).

### Other Considerations
- **Display text** in the leave request table (`{total_days}d x {daily_hours}h = {total}h`) -- the `total_days` stored in the DB should reflect the adjusted shift count (1 instead of 2 for a single overnight), so the display reads correctly
- **Existing records** -- Will Reyes' LR-0012 already has wrong values stored. After the fix, we should update her record in the database
- **Email notifications** -- the duration sent in notification emails will automatically be correct since it reads from the stored values

### Technical Details

```text
Before fix (Will Reyes LR-0012):
  Start: Feb 26, 20:00  |  End: Feb 27, 03:30
  dailyHours = 7.5  |  daysDiff = 2  |  total = 15h  (WRONG)

After fix:
  isOvernight = true (03:30 < 20:00)
  effectiveDays = 2 - 1 = 1
  total = 7.5 x 1 = 7.5h  (CORRECT)
```

### Steps
1. Update `calculateDurations` in `src/lib/leaveRequestApi.ts`
2. Fix Will Reyes' existing record (LR-0012) in the database
3. Verify the display shows correctly

