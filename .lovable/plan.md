

## OT Backfill for Richelle — Feb 9

### Summary
Mark Richelle's last 35 tickets (by timestamp in EST) on Feb 9 as `is_ot = true`. This will result in 123 regular + 35 OT = 158 total.

---

### Step 1 — Update the last 35 tickets

Run an UPDATE query that sets `is_ot = true` on the 35 most recent ticket entries for Richelle on Feb 9 (EST):

```sql
UPDATE ticket_logs
SET is_ot = true
WHERE id IN (
  SELECT id
  FROM ticket_logs
  WHERE agent_name = 'richelle'
    AND (timestamp AT TIME ZONE 'America/New_York')::date = '2026-02-09'
  ORDER BY timestamp DESC
  LIMIT 35
);
```

### Step 2 — Verify the result

Confirm the final counts:
- 123 regular (non-OT) tickets
- 35 OT tickets
- 158 total

---

### Technical Details
- No code changes needed — this is a data-only update
- The dashboard already supports OT display (violet progress bar) when `is_ot = true`
- The scorecard function already separates OT vs regular email counts
