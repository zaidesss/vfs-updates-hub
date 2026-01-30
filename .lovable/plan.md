

# Fix Upwork Integration: Add Organization Context Header

## Root Cause Identified

The Upwork API requires an `X-Upwork-API-TenantId` header to specify which organization context to use. Without it, requests default to the **personal account context** of whoever authorized the OAuth flow—even if that person has agency/company access to the contracts.

Since you authorized from your agency account but the header is missing, the API is executing under your personal context, which cannot see Malcom's contract.

## Solution Overview

1. **Add organization discovery** - Query your available organizations via `companySelector`
2. **Store the organization ID** - Save the chosen org in a new database column or settings table
3. **Include the header** - Add `X-Upwork-API-TenantId` to all GraphQL requests
4. **Auto-detect with manual override** - Try orgs automatically, allow admin override

---

## Implementation Steps

### Step 1: Discover Available Organizations

Add a new edge function or endpoint that queries available organizations:

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

This returns all organizations the authenticated user has access to.

---

### Step 2: Database Changes

Add storage for the selected organization:

| Table | Change |
|-------|--------|
| `upwork_tokens` | Add `organization_id TEXT` column |
| `upwork_tokens` | Add `organization_name TEXT` column (for display) |

---

### Step 3: Update fetch-upwork-time Edge Function

Modify `executeGraphQLQuery()` to include the tenant header:

```typescript
// Before (missing header)
headers: {
  'Authorization': `Bearer ${accessToken.trim()}`,
  'Content-Type': 'application/json',
}

// After (with organization context)
headers: {
  'Authorization': `Bearer ${accessToken.trim()}`,
  'Content-Type': 'application/json',
  'X-Upwork-API-TenantId': organizationId,  // ← Add this
}
```

---

### Step 4: Auto-Detection Logic

When no organization is configured:
1. Call `companySelector` to list available orgs
2. For each org, try fetching a test contract
3. When one succeeds, save that org ID
4. Use it for all future requests

---

### Step 5: Admin Override UI (Optional)

Add a simple admin setting in the Master Directory or a dedicated Upwork settings section:
- Show available organizations
- Allow manual selection
- Display currently active org

---

## File Changes Summary

| File | Changes |
|------|---------|
| `supabase/functions/fetch-upwork-time/index.ts` | Add `X-Upwork-API-TenantId` header, add org discovery logic |
| `supabase/functions/upwork-oauth-callback/index.ts` | Query orgs after token exchange, store first org ID |
| Migration | Add `organization_id` and `organization_name` columns to `upwork_tokens` |
| (Optional) UI component | Add Upwork org selector in admin settings |

---

## Testing Plan

1. Deploy updated edge function
2. Re-run OAuth flow (to populate organization ID)
3. Test fetch-upwork-time with Malcom's contract
4. Verify hours appear correctly on dashboard

---

## Why This Will Work

- Your agency account has visibility to Malcom's contract through the agency organization
- By specifying the correct `X-Upwork-API-TenantId`, the API will execute in agency context
- The same token works for multiple orgs—you just need to tell the API which context to use

---

## Future Considerations

Since you need multiple orgs support:
- Store a list of organization IDs (not just one)
- Consider mapping each agent's contract to the org that can see it
- The auto-detect logic handles this by trying orgs until one works

