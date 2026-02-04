
# Fetch Zendesk Metrics Using Support Account

## Summary
Update the edge function to use the `support_account` field from agent profiles to construct the correct Zendesk email (`support{number}@virtualfreelancesolutions.com`) instead of using the agent's personal email.

## Current Issue
- The edge function queries Zendesk using the agent's personal email (e.g., `hannhash1607@gmail.com`)
- Agents actually use shared Zendesk accounts based on `support_account` (e.g., `support10@virtualfreelancesolutions.com`)
- This mismatch means no metrics are being fetched

## Solution Overview
1. Modify the edge function to fetch `support_account` from `agent_profiles`
2. Construct Zendesk email as: `support{support_account}@virtualfreelancesolutions.com`
3. Use this constructed email to query Zendesk APIs
4. Store results keyed by the agent's personal email for scorecard lookups
5. Trigger a manual fetch for the Jan 26 - Feb 1 week

## Technical Details

### Edge Function Changes (`supabase/functions/fetch-zendesk-metrics/index.ts`)

**1. Update Agent Query**
```typescript
// Before
.select('email, zendesk_instance')

// After  
.select('email, zendesk_instance, support_account')
```

**2. Update Agent Interface**
```typescript
// Before
agents: { email: string; zendesk_instance: string | null }[]

// After
agents: { email: string; zendesk_instance: string | null; support_account: string | null }[]
```

**3. Add Zendesk Email Constructor**
```typescript
function getZendeskEmail(supportAccount: string | null): string | null {
  if (!supportAccount || supportAccount.trim() === '') return null;
  return `support${supportAccount}@virtualfreelancesolutions.com`;
}
```

**4. Update Batch Processing**
- Skip agents without `support_account`
- Use constructed Zendesk email for API calls
- Continue storing results keyed by personal email

### Files to Modify
| File | Change |
|------|--------|
| `supabase/functions/fetch-zendesk-metrics/index.ts` | Add support_account logic |

### Data Flow
```
agent_profiles.support_account (e.g., "10")
        ↓
Constructed Email: support10@virtualfreelancesolutions.com
        ↓
Zendesk API Query (user search, tickets, metrics)
        ↓
Results stored with agent_profiles.email as key
        ↓
Scorecard lookup by agent email
```

## After Implementation
Once the edge function is updated, I'll manually trigger a fetch for the week of Jan 26 - Feb 1 to populate the `zendesk_agent_metrics` table, and then you can verify the data appears in the scorecard.
