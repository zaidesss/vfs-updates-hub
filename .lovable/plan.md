

# Week Selector - EST Timezone Alignment

## Problem
The current `DashboardWeekSelector.tsx` uses `new Date()` which reflects the user's local timezone, not EST. This causes inconsistent week detection and boundaries if the user is in a different timezone.

## Solution
Update the week selector to calculate "today" and week boundaries using EST timezone consistently across all logic.

## Technical Changes

### Step 1: Add EST Timezone Helper
Create or use a utility function to get the current date in EST:
```typescript
function getTodayInEST(): Date {
  const now = new Date();
  const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return estTime;
}
```

This converts `now` to EST, then creates a clean Date object representing "today" in EST.

### Step 2: Update Anchor Date Logic
The anchor date (Feb 3, 2025) should be treated as EST:
```typescript
const ANCHOR_DATE = new Date('2025-02-03T00:00:00'); // EST midnight (Feb 3)
```

### Step 3: Update Week Calculation in DashboardWeekSelector.tsx
- Replace `const today = new Date()` with `const today = getTodayInEST()`
- Use this `today` to calculate `currentWeekStart` with `startOfWeek(today, { weekStartsOn: 1 })`
- All week boundaries will now align with EST Monday-Sunday boundaries

### Step 4: Week Generation Logic
```typescript
const weekOptions = useMemo(() => {
  const today = getTodayInEST(); // EST today
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 }); // EST Monday
  const weeksElapsed = differenceInWeeks(currentWeekStart, ANCHOR_DATE);
  
  const startOffset = Math.max(0, weeksElapsed - 9);
  const numWeeks = Math.min(weeksElapsed + 1, 10);
  
  return Array.from({ length: numWeeks }, (_, i) => {
    const weekStart = addWeeks(ANCHOR_DATE, startOffset + i);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const isCurrent = isSameWeek(weekStart, currentWeekStart, { weekStartsOn: 1 });
    
    return {
      id: weekStart.toISOString(),
      label: `${format(weekStart, 'MM/dd')} - ${format(weekEnd, 'MM/dd')}`,
      startDate: weekStart,
      endDate: weekEnd,
      isCurrent,
    };
  });
}, []); // Empty deps - recalculates only at mount, or add a daily refresh trigger
```

### Step 5: Handle AgentDashboard.tsx Integration
Update `AgentDashboard.tsx` to use `getTodayInEST()` for the initial `selectedDate` state:
```typescript
const [selectedDate, setSelectedDate] = useState(() => getTodayInEST());
```

## Files to Modify
| File | Changes |
|------|---------|
| `src/components/dashboard/DashboardWeekSelector.tsx` | Use EST-based `getTodayInEST()` for week calculations |
| `src/pages/AgentDashboard.tsx` | Use `getTodayInEST()` for initial state |
| `src/lib/agentDashboardApi.ts` (optional) | Add `getTodayInEST()` utility function or use existing timezone utility if available |

## Benefits
- **Consistent behavior**: All users see the same week regardless of local timezone
- **Data alignment**: Week boundaries match backend EST calculations (per memory: "EST is the authoritative timezone")
- **No time zone edge cases**: Eliminates off-by-one errors for users near midnight EST in different timezones

## Edge Cases Handled
1. **User in UTC+5 timezone**: Their "today" is tomorrow in EST - correctly uses EST "today"
2. **User in UTC-8 timezone**: Their "today" is yesterday in EST - correctly uses EST "today"
3. **Midnight EST boundary**: Week transitions at EST midnight (05:00:00.000Z)

