
# Plan: Simplify Upwork Tracking - Fetch on Logout

## Summary
Restructure Upwork time tracking to fetch data **only when an agent logs out** instead of on every dashboard load. This reduces API calls and ensures we capture the most accurate end-of-day Upwork hours. Also fix the current authentication failure by documenting the re-authorization step needed.

---

## Problem Analysis

### Current Issues
1. **Authentication Failure**: Upwork tokens expired on Feb 4 and refresh is failing
   - Upwork uses single-use refresh tokens
   - Once a refresh fails, the token chain is broken
   - **Requires manual re-authorization** to fix

2. **Inefficient Calling Pattern**: Currently fetches on every dashboard page load
   - Wastes API calls if agent reloads multiple times
   - May hit rate limits

3. **No Start/End Time Available**: Upwork's Cell schema doesn't expose time fields
   - Cannot determine when tracking started/ended
   - Only `total_cells` count is reliable

---

## Proposed Solution

### Change 1: Fetch Upwork Time on Logout

Move the Upwork API call from dashboard load to the **LOGOUT event** in the status change flow.

```text
Current Flow:
┌─────────────────┐    ┌──────────────────────┐
│ Dashboard Load  │───►│ fetch-upwork-time    │
└─────────────────┘    └──────────────────────┘
                       (Called every page load)

New Flow:
┌─────────────────┐    ┌──────────────────────┐
│ Agent Logs Out  │───►│ fetch-upwork-time    │
└─────────────────┘    └──────────────────────┘
                       (Called once per day on logout)
```

### Change 2: Integrate with `log-profile-event` Edge Function

When a `LOGOUT` event is recorded:
1. Check if agent has `upwork_contract_id`
2. Call Upwork API to get today's hours
3. Save to `upwork_daily_logs`

### Change 3: Display Cached Data on Dashboard

Instead of fetching live from Upwork on dashboard load:
- Read from `upwork_daily_logs` table
- Show "Last synced at: [timestamp]" 
- This is already partially implemented

---

## Technical Implementation

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/log-profile-event/index.ts` | Add Upwork fetch logic for LOGOUT events |
| `src/pages/AgentDashboard.tsx` | Remove live Upwork API call, read from `upwork_daily_logs` instead |
| `src/lib/agentDashboardApi.ts` | Update `fetchUpworkTime` to read from cache, not API |

### Edge Function Logic (log-profile-event)

```typescript
// On LOGOUT event:
if (eventType === 'LOGOUT' && upworkContractId) {
  // Fire and forget - fetch Upwork time in background
  fetch(upworkEndpoint, {
    method: 'POST',
    body: JSON.stringify({
      contractId: upworkContractId,
      date: todayDate,
      agentEmail: email
    })
  }).catch(err => console.log('Upwork fetch failed:', err));
}
```

### Dashboard Changes

```typescript
// Instead of calling fetch-upwork-time API:
const { data: upworkLog } = await supabase
  .from('upwork_daily_logs')
  .select('total_hours, fetched_at')
  .eq('contract_id', contractId)
  .eq('date', today)
  .maybeSingle();

// Display upworkLog.total_hours with "Synced at: {fetched_at}"
```

---

## Immediate Fix Required

### Re-authorize Upwork OAuth

The current tokens are broken. Someone with Upwork account access needs to:

1. Visit: `https://rsjjvgyobtazxgeedmvi.supabase.co/functions/v1/upwork-oauth-callback`
2. Log in to Upwork when prompted
3. Authorize the application
4. Fresh tokens will be stored automatically

---

## Benefits of This Approach

| Aspect | Before | After |
|--------|--------|-------|
| API Calls | Every dashboard load | Once per logout |
| Data Freshness | Live but incomplete | End-of-day accurate |
| Token Usage | More refresh cycles | Fewer refreshes |
| Complexity | Live fetch with retry | Simple cache read |

---

## Implementation Steps

1. **Fix Tokens** (immediate) - Re-authorize Upwork OAuth
2. **Modify log-profile-event** - Add Upwork fetch on LOGOUT
3. **Update Dashboard** - Read from `upwork_daily_logs` cache
4. **Remove live fetch** - Delete the API call on dashboard load
5. **Add "Synced at" label** - Show when data was last fetched

---

## Edge Cases

- **Agent doesn't log out**: Data won't be captured
  - Mitigation: Optional scheduled job to fetch at midnight (future enhancement)
- **Multiple logouts per day**: Data gets updated each time (good - more accurate)
- **Token failure on logout**: Silent fail, don't block logout flow
