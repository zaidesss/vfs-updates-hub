

# Add Day Selector to Work Tracker Component

## Overview
Currently, the Work Tracker shows aggregated weekly data when a week is selected. You want the ability to drill down into **specific days** within that week.

## Feature Behavior

| Week Type | Day Selector Behavior |
|-----------|----------------------|
| **Past week** (e.g., last week) | Show Mon-Sun, all days selectable |
| **Current week** | Show Mon-Sun, only past/current days selectable |
| **Example**: Today is Wednesday | Can select Mon, Tue, Wed. Thu-Sun are disabled |

## UI Design

The Work Tracker header will include a day selector:

```text
┌──────────────────────────────────────────────────────────────┐
│  📊 Work Tracker                        [Mon|Tue|Wed|...|Sun]│
│                                         ~~~~~~ Day Pills ~~~~~│
├──────────────────────────────────────────────────────────────┤
│  Tickets Handled                                             │
│  📧 Email    5/20     💬 Chat    4/20     📞 Calls   0/20    │
│  ───────────────      ───────────────     ───────────────    │
│                                                              │
│  ⏱ Avg Gap   --      🕐 Portal Time   2h 15m                 │
└──────────────────────────────────────────────────────────────┘
```

- **Day Pills**: Clickable buttons showing Mon, Tue, Wed, Thu, Fri, Sat, Sun
- **Selected Day**: Highlighted in primary color
- **Disabled Days**: Future days (for current week) are grayed out and not clickable
- **Data shown**: When a day is selected, shows that day's data only

## Technical Implementation

### 1. Create Day Selector Component
**New file:** `src/components/dashboard/WorkTrackerDaySelector.tsx`

This component will:
- Accept `weekStart`, `weekEnd`, and `selectedDay` props
- Determine which days are selectable based on current date
- Display day abbreviation pills (Mon, Tue, etc.)
- Return the selected date via callback

### 2. Add Single-Day API Function
**File:** `src/lib/agentDashboardApi.ts`

Add `getDayTicketCountByType()` function:
- Takes `agentTag` and a specific `date` (not a range)
- Fetches ticket counts for that single day only
- Uses EST day boundaries for accurate timezone handling

Add `getDayAvgGapData()` function:
- Fetches avg gap for a single date from `ticket_gap_daily`

### 3. Update AgentDashboard.tsx

Add state:
- `selectedDay: Date | null` - the specific day selected within the week (defaults to current day for current week, or Friday for past weeks)

Modify data loading:
- When `selectedDay` changes, fetch data for that specific day instead of the whole week
- Portal time and Upwork time should also be filtered to that specific day

### 4. Update DailyWorkTracker Component

Add props:
- `selectedDay: Date` - the day being displayed
- `weekStart: Date` - start of the selected week
- `weekEnd: Date` - end of the selected week
- `onDayChange: (date: Date) => void` - callback when day changes

The component will render the day selector in its header.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/dashboard/WorkTrackerDaySelector.tsx` | **NEW** - Day selector pill component |
| `src/lib/agentDashboardApi.ts` | Add `getDayTicketCountByType()` and `getDayAvgGapData()` |
| `src/pages/AgentDashboard.tsx` | Add `selectedDay` state, update data fetching logic |
| `src/components/dashboard/DailyWorkTracker.tsx` | Add day selector to header, accept new props |

## Edge Cases

1. **Week changes**: When user picks a different week, reset `selectedDay` to the most recent available day in that week
2. **Current day progression**: If user is viewing the dashboard at 11 PM on Wednesday, and the clock ticks to Thursday, the selector should update to allow Thursday
3. **Empty data**: If no tickets for selected day, show zeros/dashes appropriately

## Default Selection Logic

| Scenario | Default Day Selected |
|----------|---------------------|
| Current week, today is Wed | Wednesday (current day) |
| Past week | Sunday (last day of week) |
| Week selector changes | Auto-select most recent valid day |

