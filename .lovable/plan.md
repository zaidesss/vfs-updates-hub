

# Upwork API Migration: REST to GraphQL

## Problem Summary

Malcom has logged 7 hours on Upwork today, but the dashboard shows 0 hours. Investigation reveals:

- **Current Issue**: The v3 REST Work Diary endpoint (`/api/v3/workdiary/contracts/{contractId}/{date}`) returns 404 errors
- **Root Cause**: Upwork has deprecated their REST API in favor of GraphQL
- **Evidence**: Upwork documentation states "Legacy REST API Docs - Note that these APIs are planned to be sunset"

## Solution: Migrate to GraphQL API

The edge function needs to be updated to use Upwork's GraphQL API instead of the deprecated REST endpoint.

---

## Implementation Steps

### Step 1: Update Edge Function to Use GraphQL

Replace the REST API call with a GraphQL query to fetch work diary data.

**New GraphQL Query Structure:**
```graphql
query contract($id: ID!) {
  contract(id: $id) {
    workDays {
      date
      hours
    }
    workDiaryTimeCells {
      cellTime
      timeTracked
    }
  }
}
```

**API Endpoint Change:**
- Old: `https://www.upwork.com/api/v3/workdiary/contracts/{contractId}/{date}`
- New: `https://api.upwork.com/graphql`

**Required Headers:**
- `Authorization: Bearer {access_token}`
- `Content-Type: application/json`
- `X-Upwork-API-TenantId: {organization_id}` (may be required for org context)

---

### Step 2: Fetch Organization/Tenant ID

Before making work diary requests, we may need to fetch the organization context using:

```graphql
query {
  companySelector {
    items {
      title
      organizationId
    }
  }
}
```

This `organizationId` is used in the `X-Upwork-API-TenantId` header.

---

### Step 3: Update Contract ID Format

The GraphQL API may use different ID formats:
- `termId` - Contract term ID (legacy contract assignment RID)
- `id` - Contract ID (legacy virtual rollup ID)

We need to verify which ID format Malcom's `40482492` corresponds to and adjust accordingly.

---

### Step 4: Handle Date Filtering

The GraphQL `contract` query accepts an optional `date` parameter in ISO format:
- Format: `yyyy-MM-ddThh:mm+HHmm` or `yyyy-MM-dd`
- This filters the work diary data to the specific date

---

## Technical Implementation

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/fetch-upwork-time/index.ts` | Replace REST call with GraphQL query |

### New Function Logic

1. Construct GraphQL query for work diary data
2. Send POST request to `https://api.upwork.com/graphql`
3. Parse response to extract hours from `workDiaryTimeCells`
4. Calculate total hours (each cell = 10 minutes typically)

---

## Alternative Considerations

Before implementing, I want to confirm a few things with you:

1. **API Scopes**: Does your Upwork API key have the "Offer - Read-Only Access" scope? This is required for contract/work diary queries.

2. **Contract ID Verification**: Is `40482492` the contract ID or term ID? We may need to try both `contract(id: "40482492")` and `contractByTerm(termId: "40482492")`.

3. **Testing Access**: Would you like me to first test a simple GraphQL query (like fetching user info) to verify the tokens work with the GraphQL endpoint before changing the work diary logic?

---

## Expected Outcome

After implementation:
- Upwork hours will display correctly on Malcom's dashboard
- The integration will be future-proof using Upwork's current API
- All agents with Upwork contracts will have accurate time tracking

