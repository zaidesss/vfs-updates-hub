

## Fix: Reconciliation Search Query Returns No Results

### Root Cause
The Zendesk Search API query uses `via:chat via:messaging` which doesn't work — multiple `via:` filters conflict (AND logic), and `via:messaging` isn't a standard Zendesk search term.

### Fix
**In `supabase/functions/zd-reconcile-converted-emails/index.ts`:**

1. **Remove `via:` filters from the search query** — search broadly for all tickets assigned to the agent in the date range:
   ```
   type:ticket assignee:{email} created>={start} created<={end}
   ```

2. **Keep the channel filter in the loop** (lines 100-104) — the code already checks `ticket.via.channel` for `messaging`, `chat`, or `native_messaging` and skips others. This is the correct place to filter.

3. **Add console logging** for the search URL and result count so we can debug in logs if issues persist.

### Why This Works
- The broad search returns ALL tickets for the agent in the date range
- The existing channel filter on line 100-104 correctly skips non-chat/messaging tickets
- This approach is more reliable than depending on Zendesk's `via:` search syntax

### Expected Behavior After Fix
- **Dry run**: Should show `processed: N` (total tickets found), `skipped: X` (non-chat tickets + already-counted), `inserted: Y` (qualifying tickets that would be added)
- **Live run**: Same but actually inserts the missing Email entries into `ticket_logs`

