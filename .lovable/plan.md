

## Fix Duplicate Webhook Entries + Prevent Future Duplicates

### Summary
The webhook currently has no deduplication logic, allowing Zendesk to fire multiple events for the same ticket within seconds, inflating counts. There are **52 duplicate entries** across the entire `ticket_logs` table, and we need to both clean them up and prevent future ones.

### Deduplication Rule
**Same `ticket_id` + `agent_name` + `zd_instance` with timestamps within 120 seconds = duplicate webhook fire.** Keep only the earliest entry.

---

### Step 1 — Clean up existing duplicates (data change)

Run a DELETE query that removes duplicate rows (keeping the earliest entry per group):

```sql
DELETE FROM ticket_logs
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY ticket_id, agent_name, zd_instance,
          -- Group entries within 120-second windows
          FLOOR(EXTRACT(EPOCH FROM timestamp) / 120)
        ORDER BY timestamp ASC
      ) as rn
    FROM ticket_logs
  ) ranked
  WHERE rn > 1
);
```

This removes ~52 duplicate rows while keeping the first occurrence of each.

---

### Step 2 — Add deduplication check to the webhook

Update `zendesk-ticket-webhook/index.ts` to check for an existing entry with the same `ticket_id` + `agent_name` + `zd_instance` within the last 120 seconds before inserting. If a match is found, skip the insert and return a success response indicating it was a duplicate.

```typescript
// Before inserting, check for recent duplicate
const twoMinAgo = new Date(new Date(payload.timestamp).getTime() - 120000).toISOString();
const { data: existing } = await supabase
  .from('ticket_logs')
  .select('id')
  .eq('ticket_id', payload.ticket_id)
  .eq('agent_name', payload.agent_name)
  .eq('zd_instance', payload.zd_instance)
  .gte('timestamp', twoMinAgo)
  .limit(1);

if (existing && existing.length > 0) {
  console.log(`Duplicate webhook detected for ticket ${payload.ticket_id}, skipping`);
  return new Response(
    JSON.stringify({ success: true, duplicate: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

---

### What This Fixes
- Removes 52 inflated entries from historical data
- Prevents future duplicate webhook fires from Zendesk from creating extra rows
- Legitimate re-works of the same ticket (more than 2 minutes apart) will still be logged normally

