
# Week Selector Dropdown Implementation

## Overview
Replace the current arrow-based week navigation (`DashboardWeekSelector.tsx`) with a dropdown menu that displays multiple weeks (past, current, and future) for selection. The current week will be the default selected option.

## Design Pattern (from image reference)
The dropdown should display:
- Week 1 (01/26 - 02/01)
- Week 2 (02/02 - 02/08)
- Week 3 (02/09 - 02/15)
- Week 4 (02/16 - 02/22)
- Week 5 (02/23 - 03/01)

The format is: `Week X (MM/DD - MM/DD)`

## Implementation Approach

### Step 1: Redesign `DashboardWeekSelector.tsx`
Replace the arrow navigation component with a dropdown menu:
- **Component**: Use Shadcn's `Select` component (already available in dependencies)
- **Week Options**: Generate 10 weeks total (5 past, current, 4 future) by default
- **Display Format**: "Week X (MM/DD - MM/DD)" where:
  - Week X = Week number relative to current week (1-10)
  - MM/DD - MM/DD = Month/Day format for week start and end dates
- **Default Value**: Current week (pre-selected)
- **Trigger Button**: Shows selected week range with dropdown indicator

### Step 2: Update Component Interface
Keep the same props interface for compatibility:
```typescript
interface DashboardWeekSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  className?: string;
}
```

### Step 3: Week Calculation Logic
- Generate array of week objects containing:
  - `weekNumber`: Display label (Week 1, Week 2, etc.)
  - `startDate`: Monday of that week
  - `endDate`: Sunday of that week
  - `dateRange`: Formatted string for display
- Determine current week index (typically will be week 6 out of 10)
- Make current week the default selected value

### Step 4: UI Layout
- Use Shadcn's `Select` with `SelectTrigger`, `SelectContent`, and `SelectItem`
- Trigger shows: "Week X (MM/DD - MM/DD)" for the selected week
- Content lists all 10 weeks with visual separator or highlighting for current week
- Responsive: Works on mobile and desktop

### Step 5: No Changes Required to `AgentDashboard.tsx`
The component interface remains identical, so the parent component requires no modifications. The `onDateChange` callback will be triggered exactly the same way.

## Files to Modify
| File | Changes |
|------|---------|
| `src/components/dashboard/DashboardWeekSelector.tsx` | Replace arrow navigation with dropdown menu using Shadcn Select |

## Edge Cases
1. **Current week detection**: Use `isSameWeek()` to highlight or identify which week is current
2. **Week numbering**: Weeks before current should count down from current (Week -5 to Week -1, then Week 1=current), or use simple numbering (Week 1-10)
3. **Mobile responsiveness**: Dropdown should work on all screen sizes using Shadcn's default responsive behavior

## Implementation Order
1. Rebuild `DashboardWeekSelector.tsx` with dropdown logic
2. Test week generation and date calculations
3. Test dropdown interaction and date change triggering
4. Verify all three dashboard cards (Shift Schedule, Work Tracker, Weekly Summary) respond to selection

