

# Fix Week Selector: Progressive Rolling Window

## Problem

The week selector anchor is set to February 3, 2025 (nearly a year ago), causing it to always show 10 weeks of old history. The user wants weeks to build up progressively from a recent starting point.

## Solution

Update the `ANCHOR_DATE` in `DashboardWeekSelector.tsx` to last week (February 2, 2026 -- Monday of last week). This way:

- **Right now (Feb 10, 2026)**: Shows 2 weeks (02/02 - 02/08 and 02/09 - 02/15)
- **Next week**: Shows 3 weeks
- **Keeps growing** until it hits the 10-week cap, then the oldest week drops off

## Change

### File: `src/components/dashboard/DashboardWeekSelector.tsx`

**Line 20**: Change the anchor date:

```
// Before
const ANCHOR_DATE = new Date('2025-02-03T05:00:00.000Z');

// After
const ANCHOR_DATE = new Date('2026-02-02T05:00:00.000Z');
```

This is Monday, February 2, 2026 at midnight EST (05:00 UTC), which is the start of last week.

## Result

| Week | What the selector shows |
|------|------------------------|
| Current (Feb 10) | 02/02 - 02/08, 02/09 - 02/15 |
| Feb 17 | 02/02 - 02/08, 02/09 - 02/15, 02/16 - 02/22 |
| ... | Grows by 1 each week |
| After 10 weeks | Oldest week drops off, always 10 max |

Only 1 line changes in 1 file.

