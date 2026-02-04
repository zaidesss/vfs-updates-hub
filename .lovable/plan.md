
# Fix Zendesk Chat/Messaging Search Query for ZD1

## Problem Summary

The current search query doesn't find Zendesk Messaging (legacy) tickets because it uses incorrect channel identifiers. The Explore screenshot shows agents with 3-79 messaging tickets, but our API returns 0 results.

## Root Cause

**Current Query:**
```
(via:chat OR channel:messaging OR channel:web)
```

**Issues:**
1. `channel:messaging` and `channel:web` are not valid Zendesk Search API syntax for legacy messaging
2. Zendesk Messaging (legacy) uses `via:messaging` or other `via:` values
3. Need to expand the search to capture all messaging-related tickets

## Solution

Update the search query to use the correct Zendesk Search API syntax that matches all chat and messaging ticket types:

**Corrected Query:**
```
(via:chat OR via:messaging OR via:web_messaging OR via:native_messaging OR via:mobile_sdk)
```

Alternatively, we can remove the channel filter entirely and use a broader approach, then filter by ticket attributes.

## Technical Changes

### File: `supabase/functions/fetch-zendesk-metrics/index.ts`

**Line 317** - Update the search query:

```typescript
// Before (current - broken):
const query = `type:ticket assignee_id:${zendeskUserId} created>=${weekStart} created<=${weekEnd} (via:chat OR channel:messaging OR channel:web)`;

// After (fixed):
const query = `type:ticket assignee_id:${zendeskUserId} created>=${weekStart} created<=${weekEnd} (via:chat OR via:messaging OR via:web_messaging OR via:native_messaging OR via:mobile_sdk)`;
```

## Alternative Approach (If Needed)

If the expanded `via:` query still doesn't capture all tickets, we could:

1. **Remove channel filter entirely** and rely on ticket attributes:
   - Search: `type:ticket assignee_id:{id} created>={start} created<={end}`
   - Then filter results where `ticket.via.channel` includes messaging-related types

2. **Use Zendesk Talk API** to check if the ticket originated from chat/messaging based on the `via` object in ticket details

## Validation

After the fix:
1. Re-run the edge function for week Jan 26 - Feb 1
2. Verify `total_chats` matches Explore (e.g., Customer Care 15 - Pauline should show ~18 tickets)
3. Compare Chat AHT values (e.g., Pauline should show ~17 min handle time)
4. Compare Chat FRT values (e.g., Pauline should show ~1 min first reply)

## Expected Mappings (from Explore screenshot)

| Agent | Tickets | Handle Time | FRT |
|-------|---------|-------------|-----|
| Pauline Carbajosa (CC 15) | 18 | 17 min | 1 min |
| Precious Mae Gagarra (CC 6) | 12 | 15 min | 0 min |
| Kimberly Lacaden (CC 14) | 33 | 10 min | 0 min |
| Jennifer Katigbak (CC 7) | 25 | 7 min | 0 min |
| Will Angeline Reyes (CC 5) | 34 | 6 min | 0 min |
| Desiree Cataytay (CC 2) | 34 | 5 min | 0 min |

## Summary

Single line change to fix the channel filter syntax, then deploy and verify the calculations match Zendesk Explore.
