
# Fix Upwork GraphQL Query - Use Correct Schema Fields

## Current Issue

The `fetch-upwork-time` edge function successfully connects to Upwork with the correct organization context, but the GraphQL query uses a non-existent field `cellTime`:

```
Validation error: Field 'cellTime' in type 'Cell' is undefined
```

## Solution

Update the GraphQL query to use the correct Upwork API schema fields. Based on Upwork's Work Diary API, we should use aggregated hours from `workDays` rather than individual cell data.

---

## Implementation

### Step 1: Update the GraphQL Query

Replace the current `CONTRACT_WORK_DAYS_QUERY` with correct field names:

```graphql
query GetContractWorkDays($id: ID!, $timeRange: DateTimeRange!) {
  contract(id: $id) {
    id
    title
    status
    workDays(timeRange: $timeRange) {
      date
      totalHoursWorked    # Use aggregated hours field
      totalCharges        # Optional: billing info
    }
  }
}
```

Alternative approach - if `totalHoursWorked` doesn't exist, try:
- `hoursWorked`
- `trackedHours`
- Or query the workDiary without cells and just count entries

### Step 2: Update the Response Parsing

Modify the code to read from the correct response structure:

```typescript
// Before - counting cells
totalMinutes += day.workDiary.cells.length * 10;

// After - using aggregated hours
totalHours = workDaysResult.data?.contract?.workDays?.[0]?.totalHoursWorked ?? 0;
```

---

## File Changes

| File | Changes |
|------|---------|
| `supabase/functions/fetch-upwork-time/index.ts` | Update `CONTRACT_WORK_DAYS_QUERY` to use correct field names; update parsing logic |

---

## Technical Notes

The Upwork GraphQL API has different permission levels:
- **Contract-level fields** (id, title, status) - require basic scopes
- **Work Diary cells** (10-minute snapshots) - require "Fetch workdiary snapshots" scope
- **Aggregated daily hours** - typically more accessible with basic scopes

We'll use aggregated fields which are more likely to work with the current scopes.

---

## Testing Plan

After the fix:
1. Deploy the updated edge function
2. Test with Malcom's actual contract ID (`40482492`)
3. Verify hours are returned correctly

