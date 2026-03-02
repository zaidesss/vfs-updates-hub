

## Plan: Fix Backfill, Manual Insert 108 Tickets, Build Reconciliation Function

### Summary of 3 tasks

**Task 1: Fix the existing `zd-backfill-email-counted` edge function**
- Remove the solved/closed skip on line 169 — this is why it wasn't working. Those are exactly the tickets that need `email_counted` tagging.
- Keep the rest of the logic intact (rate limiting, cursor pagination, job tracking, auto-chain).

**Task 2: Manual insert 108 ticket logs for Nikki and Joy**
- Insert ~108 rows into `ticket_logs` for Feb 23 – Mar 1, 2026
- Agent details: `nikki` / `ignacionikki7@gmail.com` (~101 unique tickets) and `rezajoy` / `joydocto56@gmail.com` (7 unique tickets)
- All entries: `zd_instance = 'customerserviceadvocateshelp'`, `ticket_type = 'Email'`, `status = 'Solved'`, `is_ot = false`, `is_autosolved = false`
- Timestamps distributed across the 7 days during EST business hours (9am–5pm)

**Task 3: Build a new reconciliation edge function for chat-to-email conversions**
- New function: `zd-reconcile-converted-emails`
- Purpose: Find messaging/chat tickets that had 2+ public agent email replies but were never counted as Email in `ticket_logs`
- Process:
  1. Accept parameters: `agent_name`, `start_date`, `end_date`, `dry_run`
  2. Query Zendesk Search API for the agent's messaging/chat tickets in that date range
  3. For each ticket, check audits for 2+ public agent replies (reuse the `countPublicAgentReplies` logic)
  4. Cross-check against `ticket_logs` to see if an Email entry already exists for that ticket
  5. If missing: insert into `ticket_logs` as `ticket_type = 'Email'` with the agent's details
  6. Log results to `zd_backfill_job_items` for audit trail
- Add a UI section in the BackfillManager to trigger this reconciliation with agent/date filters

### Execution order
We'll do these one step at a time. Step 1 first (fix the backfill function), then step 2 (manual insert), then step 3 (reconciliation function).

