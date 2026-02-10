

## Fix Ticket Logs Accuracy — 3 Issues

### Problem Summary
Richelle has **160 tickets** in the database for Feb 9, but the UI shows only **61**. Additionally, none of the 35 expected OT tickets are flagged as OT.

Three root causes were identified:

---

### Issue 1: Frontend Overwrite Bug (Critical — Shows 61 instead of 160)

**Root Cause:** The RPC `get_ticket_dashboard_data` groups by `(agent_name, agent_email)`. When the same agent has tickets with different `agent_email` values (NULL vs actual email), it returns multiple rows for the same date. The frontend aggregation code overwrites instead of summing:

```text
Row 1: richelle / NULL       → 97 email, 2 chat
Row 2: richelle / laraine@   → 61 email, 0 chat
Frontend keeps only Row 2    → Shows 61
```

**Fix:** Update the RPC to group by `agent_name` only (not `agent_email`), using `MAX(agent_email)` to pick the non-null email. This eliminates duplicate rows at the database level.

---

### Issue 2: Webhook Email Lookup Inconsistency (99 tickets with NULL email)

**Root Cause:** The `zendesk-ticket-webhook` edge function looks up `agent_directory.agent_tag` to find the agent's email. For 99 of 160 tickets, this lookup returned NULL — possibly due to a transient issue or the directory entry being unavailable at the time.

**Fix (two parts):**
- **Backfill:** Run a one-time SQL update to fill in missing `agent_email` values using the current directory data.
- **Webhook resilience:** No code change needed — the lookup logic is correct (`.ilike('agent_tag', ...)`). The backfill resolves the historical gap.

---

### Issue 3: OT Tickets Not Flagged (0 OT instead of 35)

**Root Cause:** The webhook's OT detection depends on finding `agent_email` first (to look up the profile and status). When `agent_email` is NULL (Issue 2), the OT check is skipped entirely, defaulting to `is_ot=false`. Even for the 61 tickets with a valid email, the agent may not have had `ON_OT` status active at ticket receipt time.

**Fix:** This is partially resolved by fixing Issue 2 (ensuring email is always found). However, for accurate OT flagging, the webhook should also be able to look up the profile directly by `agent_tag` without requiring the email intermediary step. Additionally, a backfill query can correct historical OT flags based on status log timestamps.

---

### Implementation Steps

**Step 1 — Fix the RPC (database migration)**
Update `get_ticket_dashboard_data` to group by `agent_name` only, using `MAX(agent_email) FILTER (WHERE agent_email IS NOT NULL)` to collapse duplicate rows.

**Step 2 — Backfill missing agent_email values**
Run an UPDATE on `ticket_logs` joining `agent_directory` to fill NULL `agent_email` where `agent_tag` matches.

**Step 3 — Improve webhook OT detection**
Update `zendesk-ticket-webhook` to look up the agent profile directly via `agent_tag` (through `agent_directory` -> `agent_profiles`) instead of requiring `agent_email` as an intermediary. This makes both the email assignment and OT check more resilient.

**Step 4 — Backfill OT flags**
Provide a query to retroactively mark tickets as `is_ot=true` based on the agent's status log timestamps for Feb 9 (requires knowing when OT status was active).

---

### Technical Details

**RPC Change (Step 1):**
```sql
-- In the ticket_counts CTE, change grouping:
GROUP BY tl.agent_name, (tl.timestamp AT TIME ZONE 'America/New_York')::date
-- Use MAX(tl.agent_email) FILTER (WHERE tl.agent_email IS NOT NULL) as agent_email
```

**Backfill Query (Step 2):**
```sql
UPDATE ticket_logs tl
SET agent_email = ad.email
FROM agent_directory ad
WHERE LOWER(tl.agent_name) = LOWER(ad.agent_tag)
  AND tl.agent_email IS NULL;
```

**Webhook Improvement (Step 3):**
Look up profile_status via agent_directory -> agent_profiles join chain using agent_tag directly, removing the email dependency for OT detection.

