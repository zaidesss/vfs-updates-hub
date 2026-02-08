

# Fix Upwork Time Display for Selected Day

## Problem
When selecting a specific day in the Work Tracker, all metrics update correctly **except Upwork Hours** - it continues to show the weekly total instead of the selected day's hours.

## Root Cause
The `handleDayChange` function in `AgentDashboard.tsx` doesn't call a single-day Upwork fetch function.

---

## Implementation

### Step 1: Add Single-Day Upwork Fetch Function
**File:** `src/lib/agentDashboardApi.ts`

Create a new function:

```text
fetchUpworkTimeForDay(contractId: string, date: Date)
  → Query upwork_daily_logs for that specific date
  → Return { hours, syncedAt, error }
```

This is essentially a simplified version of `fetchUpworkTimeForWeek` but for a single date.

### Step 2: Update handleDayChange in AgentDashboard
**File:** `src/pages/AgentDashboard.tsx`

Add Upwork fetch call inside `handleDayChange`:

```text
handleDayChange(date)
  ├── getDayTicketCountByType(tag, date)   ✓ already done
  ├── getDayAvgGapData(tag, date)          ✓ already done
  ├── getDayPortalHours(profileId, date)   ✓ already done
  └── fetchUpworkTimeForDay(contractId, date)  ← NEW
```

Only call if the agent has an `upwork_contract_id` configured.

### Step 3: Update Initial Load Default Day Selection
**File:** `src/pages/AgentDashboard.tsx`

When the dashboard first loads and sets `selectedDay`, also fetch Upwork for that specific day (not weekly).

---

## Technical Details

### New Function Signature
```typescript
export async function fetchUpworkTimeForDay(
  contractId: string,
  date: Date
): Promise<{ 
  hours: number | null; 
  syncedAt: string | null;
  error: string | null 
}>
```

### Database Query
```sql
SELECT total_hours, fetched_at 
FROM upwork_daily_logs 
WHERE contract_id = :contractId AND date = :dateStr
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/agentDashboardApi.ts` | Add `fetchUpworkTimeForDay()` function |
| `src/pages/AgentDashboard.tsx` | Call `fetchUpworkTimeForDay()` in `handleDayChange` and initial load |

---

## Summary

This fix ensures when you pick "Monday" in the Day Selector, you'll see:
- Monday's tickets ✓
- Monday's avg gap ✓  
- Monday's portal time ✓
- **Monday's Upwork time** ← Fixed!

