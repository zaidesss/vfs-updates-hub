

## Recover Dropped Auto-Solved Chat Tickets (Feb 9 - Present)

### Problem
Since February 9, all auto-solved chat tickets were silently dropped due to a missing comma in the Zendesk trigger JSON. The "Auto-End Session" trigger was the **only** capture point for these tickets. Result: **0 autosolved records** in the database out of 33,190 total tickets.

### Recovery Approach
Create a one-time recovery edge function (`recover-autosolved-tickets`) that:
1. Queries the Zendesk Search API on **both instances** for tickets tagged `chat_autosolved` since Feb 9
2. Extracts the agent name from the custom field (ZD1: `14923047306265`, ZD2: `44524282221593`)
3. Looks up `agent_email` from `agent_directory` (same logic as the webhook)
4. Inserts each ticket into `ticket_logs` with `is_autosolved: true` and `ticket_type: 'Chat'`
5. Skips any ticket that already exists (by `ticket_id` + `zd_instance`) to avoid duplicates

### Before I Proceed, Consider These

1. **OT status**: The webhook normally checks if the agent is currently ON_OT at the moment the ticket arrives. For historical recovery, we can't know past OT status -- these will all be inserted with `is_ot: false`. Is that acceptable?

2. **Timestamp accuracy**: The recovery will use the ticket's `updated_at` timestamp from Zendesk (same as what the trigger would have sent). This should be accurate.

3. **Zendesk API rate limits**: The Search API has a limit of ~380 requests per minute. If there are thousands of auto-solved tickets, the function will paginate with delays. It may take a minute or two to complete.

4. **Duplicate ticket IDs**: Some of these auto-solved tickets might already exist in `ticket_logs` from a different trigger (e.g., if a regular solved trigger also fired for the same ticket). The function will skip those to avoid double-counting. Do you want it to **update** existing records to mark them as `is_autosolved: true` instead, or only insert net-new ones?

### Technical Details

**New file**: `supabase/functions/recover-autosolved-tickets/index.ts`

- Uses the same Zendesk auth pattern as `fetch-zendesk-ticket` (Basic auth with admin email + API token)
- Search query: `type:ticket tags:chat_autosolved created>2025-02-09`
- Processes both ZD1 (`customerserviceadvocates`) and ZD2 (`customerserviceadvocateshelp`)
- For each ticket found:
  - Extracts agent tag from the instance-specific custom field
  - Looks up agent email from `agent_directory`
  - Checks if ticket already exists in `ticket_logs`
  - Inserts with `ticket_type: 'Chat'`, `is_autosolved: true`, `is_ot: false`
- Returns a summary: total found, inserted, skipped (duplicates)
- One-time use -- invoke manually, then delete

**Invocation**: Call it once via the backend function invoke after deployment. No UI changes needed.

