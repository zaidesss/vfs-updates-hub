

# Uniform Anchor-Based Week Selection + Default to Last Week

## Overview

Align the Team Scorecard's week selector with the Dashboard's anchor-based rolling week logic, and change the default selected week across the entire portal to **last week** instead of the current week.

## What Changes

### 1. Share the ANCHOR_DATE constant

**New file: `src/lib/weekConstants.ts`**

Extract the anchor date into a shared constant so both Dashboard and Scorecard (and any future selector) use the same reference point:

```text
ANCHOR_DATE = startOfWeek(new Date(2026, 1, 2), { weekStartsOn: 1 })
```

### 2. Refactor Team Scorecard week generation (lines 111-171 of TeamScorecard.tsx)

Replace the current `eachWeekOfInterval` approach with the Dashboard's anchor-based logic, but scoped to the selected Year/Month:

- Generate weeks from `ANCHOR_DATE` using `addWeeks`, same as `DashboardWeekSelector`
- Filter to only show weeks that overlap with the selected month
- Mark the current week with a checkmark, same styling as Dashboard
- **Default to last week** (the week before the current one) instead of current week

### 3. Update DashboardWeekSelector default to last week

**Edit: `src/components/dashboard/DashboardWeekSelector.tsx`**

- Change the default `selectedWeekId` fallback: instead of selecting the current week, select the week immediately before it
- The current week still appears in the dropdown (with the checkmark) but is not pre-selected

### 4. Update initial state in TeamScorecard

**Edit: `src/pages/TeamScorecard.tsx`**

- Set initial `selectedYear` and `selectedMonth` based on **last week's** date (not today)
- For example, if today is Monday Feb 9, last week started Feb 2, so month defaults to February
- Remove the `'current'` sentinel value for `selectedWeek`; initialize directly to last week's start date string

### 5. Year selector uses portal clock

The year dropdown currently uses `new Date().getFullYear()` (line 636). This will be updated to use `portalNow` for consistency.

## Technical Details

**Week alignment logic** (same as Dashboard):
- All weeks are integer multiples of 7 days from the shared `ANCHOR_DATE`
- This guarantees Dashboard and Scorecard always show identical week boundaries
- Within a selected month, only weeks overlapping that month are shown

**Default selection = last week**:
- `lastWeekStart = addWeeks(startOfWeek(portalNow, Mon), -1)`
- Dashboard pre-selects this week on load
- Scorecard initializes Year/Month from this date, then selects the matching week

**What stays the same**:
- Year and Month dropdowns remain in the Scorecard UI
- Support Type, Team Lead, Search, Score filters are untouched
- All query logic (`weekStartStr`, `weekEndStr`) remains identical

## Implementation Order

1. Create shared `weekConstants.ts` with `ANCHOR_DATE`
2. Update `DashboardWeekSelector` to import from shared constant + default to last week
3. Refactor `TeamScorecard` week generation to use anchor-based logic + default to last week
4. Verify both selectors produce identical week boundaries
