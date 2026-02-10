

# Fix Week Selector: Rolling 10-Week Window from Current Week

## Problem

The current week selector logic calculates weeks from the anchor date but the rolling window isn't working correctly, causing some users to see only 1-2 weeks.

## Solution

Keep the 10-week rolling window, but simplify the logic: always show the **last 9 weeks + the current week** (10 total). As each new week arrives, the oldest week drops off and the new one appears.

**Example (current week = Week 11):**
Week 2, Week 3, Week 4, Week 5, Week 6, Week 7, Week 8, Week 9, Week 10, Week 11

**Next week (Week 12):**
Week 3, Week 4, Week 5, Week 6, Week 7, Week 8, Week 9, Week 10, Week 11, Week 12

If fewer than 10 weeks have passed since launch, show all available weeks (e.g., in Week 3 you'd see Weeks 1-3).

## Technical Details

**File:** `src/components/dashboard/DashboardWeekSelector.tsx`

The fix is in the `weekOptions` memo (lines 40-60). Replace the current calculation with:

```typescript
const currentWeekStart = startOfWeek(todayEST, { weekStartsOn: 1 });
const weeksElapsed = differenceInWeeks(currentWeekStart, ANCHOR_DATE);

// Show up to 10 weeks: current week + up to 9 past weeks
const totalWeeks = Math.min(weeksElapsed + 1, 10);
const startOffset = Math.max(0, weeksElapsed + 1 - totalWeeks);
```

This is the same rolling window concept but ensures the math correctly anchors from the current week backward, so every user always sees the correct 10 (or fewer) weeks regardless of timezone edge cases.

## Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/DashboardWeekSelector.tsx` | Fix rolling 10-week window calculation |

