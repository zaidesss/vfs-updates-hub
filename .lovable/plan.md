

# Default All Date Selectors to Current Week

## Overview
Update all week-based date selectors across the portal so they default to the **current week** instead of "last week" or "all".

## Changes (3 files)

### 1. TeamScorecard (`src/pages/TeamScorecard.tsx`)
- Change the initial `selectedYear`, `selectedMonth`, and `selectedWeek` state from being derived from `getLastWeekStart(portalNow)` to being derived from the **current week start** (`startOfWeek(portalNow, { weekStartsOn: 1 })`).

### 2. QA Evaluations (`src/pages/QAEvaluations.tsx`)
- Change the default `selectedWeek` state from `'all'` to the **current week's start date** (formatted as ISO string), so the page loads showing only the current work week's evaluations.

### 3. DashboardWeekSelector (`src/components/dashboard/DashboardWeekSelector.tsx`)
- Update the fallback logic (line 66) from defaulting to "last week" to defaulting to the **current week**, so the Agent Dashboard week selector consistently selects the current week.

## What stays the same
- **Agent Reports**: Already defaults to current month/year -- no change needed since it operates at monthly granularity.
- **Dashboard** (admin acknowledgement page): Has no date selector -- not affected.
- The `getLastWeekStart` utility in `weekConstants.ts` will remain available for any future use but will no longer be the default.

