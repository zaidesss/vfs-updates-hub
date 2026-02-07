

# Reliability Calculation with Outage-Based Deductions

## Summary

This update modifies how **Reliability** is calculated in the Team Scorecard. Instead of the current formula that adjusts scheduled days by approved leave, the new approach starts at 100% reliability and **deducts 1% for each outage day** from the Outages page, **except for "Planned Leave"** which has no deduction.

## Current Behavior

Currently, reliability is calculated as:
```
adjustedScheduledDays = scheduledDays - approved_leave_days
reliability = (daysPresent / adjustedScheduledDays) × 100
```

This effectively "excuses" all approved outages from the calculation, meaning an agent with approved leave doesn't get penalized.

## New Behavior

The new formula will be:
```
reliability = 100 - (unplanned_outage_days × 1)
```

Where:
- **Planned Leave**: No deduction (fully excused)
- **All other outage reasons**: 1% deduction per day
  - Medical Leave: 1% per day
  - Late Login: 1% per day  
  - Power Outage: 1% per day
  - Wi-Fi Issue: 1% per day
  - Equipment Issue: 1% per day
  - Undertime: 1% per day
  - Unplanned: 1% per day

**Example**: Agent has 2 days Medical Leave + 1 day Planned Leave + 1 day Late Login
- Deduction = 2% (Medical) + 0% (Planned) + 1% (Late Login) = 3%
- Reliability = 100% - 3% = 97%

---

## Implementation Steps

### Step 1: Update SQL RPC Function (get_weekly_scorecard_data)
Modify the `leave_days` CTE to return separate counts:
- `planned_leave_days`: Days where `outage_reason = 'Planned Leave'`
- `unplanned_outage_days`: Days where `outage_reason != 'Planned Leave'`

Add new return columns to the function signature.

### Step 2: Update TypeScript Interface
Add `unplanned_outage_days` to:
- `ScorecardRPCResult` interface
- `AgentScorecard` interface

### Step 3: Update Reliability Calculation
Change the calculation logic in both:
- `fetchWeeklyScorecardRPC()` function
- `fetchWeeklyScorecard()` legacy function

New logic:
```typescript
// Start at 100% and deduct 1% per unplanned outage day
const reliability = Math.max(0, 100 - unplannedOutageDays);
```

### Step 4: Update countApprovedLeaveDays Function
Create a new function `countOutageDaysByType()` that returns:
```typescript
{
  plannedLeaveDays: number;
  unplannedOutageDays: number;
}
```

### Step 5: Preserve Data in Saved Scorecards
Ensure `unplanned_outage_days` is saved when admin freezes scorecard results.

---

## Technical Details

### Database Migration SQL

```sql
-- Update get_weekly_scorecard_data RPC to return outage breakdown
-- Modify leave_days CTE:
leave_days AS (
  SELECT 
    LOWER(lr.agent_email) as email,
    COUNT(DISTINCT d.dt::date) FILTER (
      WHERE lr.outage_reason = 'Planned Leave'
    ) as planned_leave_days,
    COUNT(DISTINCT d.dt::date) FILTER (
      WHERE lr.outage_reason != 'Planned Leave'
    ) as unplanned_outage_days
  FROM leave_requests lr
  CROSS JOIN LATERAL generate_series(
    GREATEST(lr.start_date, p_week_start),
    LEAST(lr.end_date, p_week_end),
    '1 day'::interval
  ) as d(dt)
  WHERE lr.status = 'approved'
    AND lr.start_date <= p_week_end
    AND lr.end_date >= p_week_start
  GROUP BY LOWER(lr.agent_email)
)
```

### Interface Updates

```typescript
interface ScorecardRPCResult {
  // ... existing fields
  planned_leave_days: number;
  unplanned_outage_days: number;
}

interface AgentScorecard {
  // ... existing fields
  plannedLeaveDays: number;
  unplannedOutageDays: number;
}
```

### Reliability Calculation

```typescript
// In fetchWeeklyScorecardRPC and fetchWeeklyScorecard:
const reliability = Math.max(0, 100 - row.unplanned_outage_days);

// isOnLeave check: agent is considered on leave only if 
// they have planned leave covering all scheduled days
const isOnLeave = row.planned_leave_days >= scheduledDays;
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/[new].sql` | Update RPC to return outage breakdown |
| `src/lib/scorecardApi.ts` | Update interfaces, calculation logic, and legacy function |
| `saved_scorecards` table | Add `unplanned_outage_days` column for persistence |

---

## Outage Reasons Reference

From the database:
| Outage Reason | Deduction |
|---------------|-----------|
| Planned Leave | 0% (exempt) |
| Medical Leave | 1% per day |
| Late Login | 1% per day |
| Power Outage | 1% per day |
| Wi-Fi Issue | 1% per day |
| Equipment Issue | 1% per day |
| Undertime | 1% per day |
| Unplanned | 1% per day |

---

## UI Impact

The scorecard display will show reliability as before, but the underlying calculation changes:
- An agent with 0 unplanned outage days: 100% reliability
- An agent with 3 unplanned outage days: 97% reliability
- An agent on 5-day Planned Leave: Shows "On Leave" status (no score)

