

# Uniform Anchor-Based Week Selection + Default to Last Week

## Status: ✅ COMPLETE

## What Was Done

### 1. ✅ Created shared `src/lib/weekConstants.ts`
- Exports `ANCHOR_DATE` (Monday, Feb 2, 2026 normalized via `startOfWeek`)
- Exports `getLastWeekStart(now)` helper for portal-wide last-week default

### 2. ✅ Updated `DashboardWeekSelector`
- Imports `ANCHOR_DATE` from shared constant (removed local definition)
- Default selection changed from current week to **last week**
- Current week still shows with ✓ checkmark

### 3. ✅ Refactored `TeamScorecard` week generation
- Replaced `eachWeekOfInterval` with anchor-based `addWeeks` from `ANCHOR_DATE`
- Weeks filtered to overlap with selected Year/Month
- Current week marked with ✓ and `text-primary` styling
- Default Year/Month/Week initialized from **last week's** date
- Removed `'current'` sentinel value — uses actual date string
- Year dropdown uses `portalNow` instead of `new Date()`

### 4. ✅ Both selectors produce identical week boundaries
- All weeks are integer multiples of 7 days from `ANCHOR_DATE`
- Dashboard and Scorecard are guaranteed to align
