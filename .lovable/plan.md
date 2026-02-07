

# Week Selector for Agent Dashboard

## Summary

Add a **week selector** to the Agent Dashboard that controls the data displayed in:
- **Shift Schedule** (attendance data for the selected week)
- **Work Tracker** (renamed from "Daily Work Tracker" - ticket counts and hours)
- **Weekly Summary** (metrics aggregated for the selected week)

The selector will **NOT affect**:
- **Today's Activity** (always shows today's events)
- **Current Status** (always shows real-time status)

---

## User Experience

### Selector Placement
The week selector will be placed inside the **Shift Schedule** card header (since that's the natural anchor point). The date range will be displayed in the format **"Jan 27 - Feb 2, 2025"** with navigation arrows.

### Selection Behavior
- **Default**: Current week (Monday-Sunday)
- **Navigation**: Previous/Next week arrows
- **Display**: Shows week date range in header; all dependent cards update accordingly

### Visual Changes

| Card | Current State | After Change |
|------|---------------|--------------|
| Shift Schedule | Shows "Jan 27 - Feb 2, 2025" static | Week selector with arrows |
| Work Tracker | Title "Daily Work Tracker" | Title "Work Tracker" (aggregates for selected week) |
| Weekly Summary | Shows current week always | Shows selected week range |
| Today's Activity | Today only | No change (always today) |
| Current Status | Real-time | No change (always real-time) |

---

## Implementation Steps

### Step 1: Create Week Selector Component
New component `DashboardWeekSelector.tsx` with:
- Previous/Next week navigation buttons
- Date range display (e.g., "Jan 27 - Feb 2, 2025")
- Exports `selectedWeekStart` and `selectedWeekEnd` dates

### Step 2: Lift State to AgentDashboard
Move week calculation from hardcoded `new Date()` to a `useState`:
```typescript
const [selectedDate, setSelectedDate] = useState(new Date());
const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
```

### Step 3: Update Data Fetching Functions

| Function | Current Behavior | Updated Behavior |
|----------|------------------|------------------|
| `getWeekLoginEvents` | Already accepts `weekStart`, `weekEnd` | No change needed |
| `getWeekAllEvents` | Already accepts `weekStart`, `weekEnd` | No change needed |
| `getApprovedLeavesForWeek` | Already accepts `weekStart`, `weekEnd` | No change needed |
| `getTodayTicketCountByType` | Hardcoded to today | New: `getWeekTicketCountByType(agentTag, startDate, endDate)` |
| `fetchAgentDashboardRPC` | Hardcoded to current week | Update RPC to accept reference date |
| `fetchUpworkTimeFromCache` | Single date | New: `fetchUpworkTimeForWeek(contractId, startDate, endDate)` |

### Step 4: Update SQL RPC Function
Modify `get_agent_dashboard_data` to accept an optional `p_reference_date` parameter for calculating the week boundaries.

### Step 5: Update Components to Use Props

**ShiftScheduleTable.tsx**:
- Accept `weekStart` and `weekEnd` as props
- Remove internal week calculation
- Integrate week selector into header

**WeeklySummaryCard.tsx**:
- Accept `weekStart` and `weekEnd` as props
- Remove internal week calculation

**DailyWorkTracker.tsx**:
- Rename to **"Work Tracker"**
- No structural changes needed (already receives data via props)

### Step 6: Add Week-Based Ticket Query
Create `getWeekTicketCountByType` function that aggregates tickets across a date range:
```typescript
export async function getWeekTicketCountByType(
  agentTag: string,
  startDate: string,
  endDate: string
): Promise<{ data: TicketCountByType; error: string | null }> {
  // Query ticket_logs for the date range
  // Aggregate email, chat, call counts
}
```

### Step 7: Add Week-Based Upwork Query
Create `fetchUpworkTimeForWeek` function that sums Upwork hours across dates:
```typescript
export async function fetchUpworkTimeForWeek(
  contractId: string,
  startDate: string,
  endDate: string
): Promise<{ hours: number; error: string | null }> {
  // Query upwork_time_cache for all dates in range
  // Sum hours_worked
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/DashboardWeekSelector.tsx` | **New file** - Week navigation component |
| `src/pages/AgentDashboard.tsx` | Add week state, integrate selector, update data fetching calls |
| `src/components/dashboard/ShiftScheduleTable.tsx` | Accept `weekStart`/`weekEnd` props, integrate selector in header |
| `src/components/dashboard/WeeklySummaryCard.tsx` | Accept `weekStart`/`weekEnd` props |
| `src/components/dashboard/DailyWorkTracker.tsx` | Rename title from "Daily Work Tracker" to "Work Tracker" |
| `src/lib/agentDashboardApi.ts` | Add `getWeekTicketCountByType` and `fetchUpworkTimeForWeek` functions |
| `supabase/migrations/[new].sql` | Update `get_agent_dashboard_data` RPC to accept reference date |

---

## Technical Details

### Week Selector Component
```typescript
interface DashboardWeekSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

// Navigation: clicking prev/next moves by 7 days
// Display format: "MMM d - MMM d, yyyy"
```

### Updated RPC Signature
```sql
CREATE OR REPLACE FUNCTION get_agent_dashboard_data(
  p_profile_id UUID,
  p_reference_date DATE DEFAULT CURRENT_DATE
)
```

### Data Flow
```
Week Selector (user interaction)
    ↓
selectedDate state updated
    ↓
weekStart/weekEnd recalculated
    ↓
All dependent queries re-run with new dates
    ↓
ShiftScheduleTable, WeeklySummary, WorkTracker re-render
```

---

## Edge Cases Handled

1. **Future weeks**: Attendance shows "Pending" for days that haven't occurred
2. **No ticket data**: Gracefully shows 0 counts
3. **No Upwork cache**: Shows "--" with appropriate message
4. **Loading states**: Spinner while fetching new week's data

---

## Migration Notes

- **Database change required**: Update `get_agent_dashboard_data` RPC
- **No breaking changes**: Current behavior preserved when no selector interaction
- **Backward compatible**: Default to current week on page load

