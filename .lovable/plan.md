

## Update Recovery Function: Skip Only Existing Chat Duplicates

### Problem
The current duplicate check looks for any existing `ticket_id` regardless of `ticket_type`. Since we're recovering Chat tickets, we should only skip if that ticket already exists as a **Chat** type. If the same ticket ID exists as an Email type, we still need to insert the Chat record.

### Change
**File**: `supabase/functions/recover-autosolved-tickets/index.ts`

Update the duplicate-check query (lines 168-175) to also filter by `ticket_type = 'Chat'`:

**Before:**
```typescript
const { data: existing } = await supabase
  .from('ticket_logs')
  .select('ticket_id')
  .eq('zd_instance', instance.key)
  .in('ticket_id', ticketIds)

const existingSet = new Set((existing || []).map((e: any) => e.ticket_id))
```

**After:**
```typescript
const { data: existing } = await supabase
  .from('ticket_logs')
  .select('ticket_id')
  .eq('zd_instance', instance.key)
  .eq('ticket_type', 'Chat')
  .in('ticket_id', ticketIds)

const existingSet = new Set((existing || []).map((e: any) => e.ticket_id))
```

This is a one-line addition (`.eq('ticket_type', 'Chat')`) that ensures:
- If ticket 12345 exists as **Chat** -- skip (already counted)
- If ticket 12345 exists as **Email** only -- insert the Chat record (different interaction type)
- If ticket 12345 doesn't exist at all -- insert

