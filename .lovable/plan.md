
# Team Scorecard Enhancement Plan

## Overview
Upgrade the Team Scorecard page with unified date filtering (matching QA Evaluations), enhanced filtering and sorting capabilities, and a unified "All Agents" view with mixed support types.

---

## Current vs. New Design

### Date Selection
**Current**: Simple week navigation (Previous/Next buttons with "Today" shortcut)
**New**: Year, Month, Week dropdown selectors (identical to QA Evaluations)

### Filtering
**Current**: Support Type filter only
**New**: 
- Support Type toggle (including "All Agents" option)
- Agent Name search
- Score range filter

### Sorting
**Current**: Fixed order (alphabetical by agent name)
**New**: Sortable by Final Score (ascending/descending)

---

## Technical Changes

### 1. Update Filter State Management

Add new state variables:
- `selectedYear` - defaults to current year
- `selectedMonth` - defaults to current month  
- `selectedWeek` - 'all' or specific week start date
- `searchQuery` - agent name search text
- `scoreFilter` - 'all', 'excellent' (90+), 'good' (80-89), 'needs-improvement' (below 80)
- `sortOrder` - 'name-asc', 'score-desc', 'score-asc'

### 2. Update Data Fetching Logic

Modify `fetchWeeklyScorecard` API function:
- Add optional parameter to fetch ALL support types at once
- When `supportType = 'all'`, fetch agents from all positions (except excluded ones)
- Each agent's scorecard is still calculated using their own position's config

```
New function signature:
fetchWeeklyScorecard(weekStart, weekEnd, supportType: string | 'all')
```

### 3. Refactored UI Layout

**Filter Card (matching QA Evaluations style)**:
```
Row 1: [Year ▼] [Month ▼] [Week ▼]
Row 2: [Support Type ▼] [Agent Search] [Score ▼] [Sort ▼] [Admin buttons...]
```

### 4. Week Selection Logic

Generate available weeks from the selected month:
- Calculate all Monday-Sunday week ranges within the selected month
- Display format: "Week 1 (02/03 - 02/09)"
- "All Weeks" option shows aggregated monthly data (or most recent week in month)

### 5. Mixed View Columns

When "All Agents" is selected:
- Show all columns: Productivity, Call AHT, Chat AHT, Chat FRT, QA, Revalida, Reliability, OT Prod., Final Score
- Add "Type" column to show each agent's support type
- Cells show "-" for metrics that don't apply to that agent's type
- Final Score is calculated per agent's own position config

### 6. Save All Functionality

When in "All Agents" view:
- "Save Scorecard" button saves all agents in a batch
- Internally groups by support type and calls existing save logic for each group
- Progress indicator shows save status

---

## File Changes

### `src/pages/TeamScorecard.tsx`
- Add Year/Month/Week selectors (copy pattern from QA Evaluations)
- Add "All Agents" option to Support Type dropdown
- Add Agent search input
- Add Score filter dropdown
- Add Sort by dropdown
- Update table to show "Type" column when viewing all
- Implement client-side filtering and sorting
- Update save logic to handle batch saves

### `src/lib/scorecardApi.ts`
- Modify `fetchEligibleAgents` to accept 'all' as support type
- When 'all', fetch all agents (excluding Team Lead/Tech Support positions)
- New function `fetchAllAgentsScorecards` that fetches and calculates for all types

---

## UI Mockup

```
+------------------------------------------------------------------+
| Team Scorecard                              [Save Changes] [Save] |
| Weekly performance metrics by support type                        |
+------------------------------------------------------------------+
| +-------+ +----------+ +---------------+                          |
| | 2026 ▼| | February ▼| | Week 1 (02/03...)▼|                     |
| +-------+ +----------+ +---------------+                          |
|                                                                   |
| +----------------+ +-------------------+ +--------+ +----------+  |
| | All Agents    ▼| | Search agent...   | | Score ▼| | Sort by ▼|  |
| +----------------+ +-------------------+ +--------+ +----------+  |
+------------------------------------------------------------------+
| Type    | Agent Name | Prod | Call | Chat | Chat | QA | Rel | ... |
|         |            |      | AHT  | AHT  | FRT  |    |     |     |
+------------------------------------------------------------------+
| Hybrid  | Agent A    | 95%  | 4:30 | 2:45 | 0:45 | 98%| 100%|     |
| Phone   | Agent B    | -    | 5:12 | -    | -    | 95%| 95% |     |
| Chat    | Agent C    | -    | -    | 3:00 | 0:55 | 92%| 90% |     |
+------------------------------------------------------------------+
```

---

## Score Filter Options
- **All Scores** - No filtering
- **Excellent (90%+)** - Final Score >= 90
- **Good (80-89%)** - Final Score 80-89
- **Needs Improvement (< 80%)** - Final Score < 80
- **On Leave** - isOnLeave = true

---

## Sort Options
- **Name (A-Z)** - Alphabetical ascending (default)
- **Name (Z-A)** - Alphabetical descending
- **Score (High to Low)** - Final score descending
- **Score (Low to High)** - Final score ascending

---

## Edge Cases Handled
1. **Old week data**: Warning banner still appears
2. **Before minimum date**: Data not available message shown
3. **Empty results after filtering**: "No agents match your filters" message
4. **Editing in All view**: Edits work the same, grouped by support type on save
5. **Refresh Metrics**: Works for specific support type only (prompts to select a type if in "All" view)
