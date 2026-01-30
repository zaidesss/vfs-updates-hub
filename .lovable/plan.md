

# Fix Upwork Integration: Alternative Approach

## Problem Summary

The OAuth tokens have been refreshed, but the `Contract.workDiaryTimeCells` field is blocked by scope restrictions. Despite enabling "Fetch workdiary snapshots information" and "Grants read-only access to time-sheet data" scopes, the GraphQL API returns:

```
The client or authentication token doesn't have enough oauth2 permissions/scopes to access: [Contract.workDiaryTimeCells, DateTime.rawValue]
```

## Analysis

Based on Upwork's GraphQL documentation, the `contract` query has two work-related fields:
- `workDiaryTimeCells` - Granular 10-minute time tracking segments (currently blocked)
- `workDays` - Aggregated daily hours (may have different/lower permission requirements)

## Proposed Solution

Modify the edge function to use `workDays` instead of `workDiaryTimeCells`. This field returns pre-calculated daily hours which is exactly what we need, and may have fewer permission restrictions.

---

## Implementation Steps

### Step 1: Update the GraphQL Query

Replace the current query targeting `workDiaryTimeCells` with one using `workDays`:

**Current Query (blocked):**
```graphql
query GetContractTimeCells($id: ID!, $date: String!) {
  contract(id: $id) {
    id
    title
    status
    workDiaryTimeCells(date: $date) {
      cellDateTime { rawValue }
    }
  }
}
```

**New Query (using workDays):**
```graphql
query GetContractWorkDays($id: ID!, $date: String!) {
  contract(id: $id) {
    id
    title
    status
    workDays(date: $date) {
      date
      hours
    }
  }
}
```

---

### Step 2: Update Response Parsing

- Remove the cell-counting logic (10 min per cell calculation)
- Directly extract the `hours` field from `workDays` response
- Handle the case where no work day data exists for the date

---

### Step 3: Add Fallback Error Handling

If `workDays` is also blocked, provide a clear message indicating which specific scope is needed based on the error response.

---

## Technical Details

### File to Modify

| File | Changes |
|------|---------|
| `supabase/functions/fetch-upwork-time/index.ts` | Update GraphQL query and response parsing |

### Changes Overview

1. Replace `CONTRACT_TIME_CELLS_QUERY` with `CONTRACT_WORK_DAYS_QUERY`
2. Update the `WorkDiaryTimeCell` interface to `WorkDay` interface
3. Simplify hours extraction (directly read `hours` field)
4. Remove the DateTime introspection query (no longer needed)
5. Update console logging for new response format

---

## Testing Plan

After implementation:
1. Deploy the updated edge function
2. Test with Malcom's contract ID (40482492) and date (2026-01-29)
3. Verify hours are returned correctly (expecting ~7 hours)

---

## Alternative: If workDays is Also Blocked

If the `workDays` field is also blocked by permissions, we have two options:

**Option A**: Contact Upwork API Support to request the specific GraphQL scope needed for work diary access

**Option B**: Use Upwork's GQL Explorer tool (https://www.upwork.com/developer/explorer/) to test queries directly and identify which scopes enable which fields

---

## Expected Outcome

After this change:
- Malcom's 7 hours of Upwork time should display correctly on his dashboard
- The integration will use a simpler, more direct data path
- All agents with Upwork contracts will have accurate time tracking

