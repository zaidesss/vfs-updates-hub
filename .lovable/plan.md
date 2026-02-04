
# Use Zendesk User IDs for Metrics Fetching

## Summary
Update the edge function to use Zendesk User IDs directly instead of searching by email, which will correctly fetch Call AHT, Chat AHT, and Chat FRT metrics.

## Problem Identified
The current implementation:
1. Constructs email `support{number}@virtualfreelancesolutions.com` 
2. Searches Zendesk API by email to find User ID
3. This search may be failing (returns 0 results) even though the agents exist

You've provided the actual Zendesk User IDs (Support 1-17), which we can use directly.

## Solution

### Step 1: Add `zendesk_user_id` column to `agent_profiles`
Store the Zendesk User ID mapping in the database for each agent.

```sql
ALTER TABLE public.agent_profiles 
ADD COLUMN IF NOT EXISTS zendesk_user_id text;
```

### Step 2: Populate the User IDs for Support 1-17
| Support Account | Zendesk User ID |
|-----------------|-----------------|
| 1 | 903432372303 |
| 2 | 11436740426393 |
| 3 | 13751087693337 |
| 4 | 13751086800409 |
| 5 | 26969565500569 |
| 6 | 27511291800345 |
| 7 | 35402612196249 |
| 8 | 35402662864409 |
| 9 | 35451699998489 |
| **10** | **36942189588121** |
| 11 | 37286573168793 |
| 12 | 37286683884697 |
| 13 | 37286671337113 |
| 14 | 37286736245145 |
| 15 | 37286723394201 |
| 16 | 37286752550169 |
| 17 | 37286802035225 |

### Step 3: Update Edge Function

**Modify `fetchCallMetrics`**:
- Accept `zendeskUserId` parameter instead of searching by email
- Skip the user search API call entirely

**Modify `fetchChatMetrics`**:
- Use `assignee_id:${zendeskUserId}` in search query instead of `assignee:${email}`

**Update batch processing**:
- Fetch `zendesk_user_id` from agent_profiles
- Skip agents without a zendesk_user_id
- Pass the User ID directly to both metric functions

### Step 4: Test with Support 10
Trigger a manual fetch for the Jan 26 - Feb 1 week to verify metrics are retrieved.

## Files to Modify
| File | Change |
|------|--------|
| Database | Add `zendesk_user_id` column + populate data |
| `supabase/functions/fetch-zendesk-metrics/index.ts` | Use User ID directly |

## Expected Outcome
After implementation, the function will:
1. Look up the Zendesk User ID from the profile
2. Query Call metrics using the User ID directly (no email search)
3. Query Chat tickets using `assignee_id:{userId}` 
4. Successfully populate metrics in `zendesk_agent_metrics` table

## Technical Details

### Edge Function Changes

**Function signatures**:
```typescript
// Before
fetchCallMetrics(config, agentEmail, startDate, endDate)
fetchChatMetrics(config, agentEmail, startDate, endDate)

// After
fetchCallMetrics(config, zendeskUserId, startDate, endDate)
fetchChatMetrics(config, zendeskUserId, startDate, endDate)
```

**Chat search query change**:
```typescript
// Before
const query = `type:ticket channel:chat assignee:${agentEmail} solved>=${startDate} solved<=${endDate}`;

// After  
const query = `type:ticket channel:chat assignee_id:${zendeskUserId} solved>=${startDate} solved<=${endDate}`;
```

**Agents query update**:
```typescript
.select('email, zendesk_instance, support_account, zendesk_user_id')
```
