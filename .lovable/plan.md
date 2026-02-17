

## Plan: Add Call Count Tracking via Zendesk Talk API (ZD1 Only)

### Problem
There is no Zendesk trigger configured to push call/voice ticket data to the portal via webhook. As a result, the "Call" column in Ticket Logs always shows 0 for all agents. Rather than setting up a Zendesk trigger, we will pull call counts directly from the Zendesk Talk Incremental Legs API using each agent's `zendesk_user_id`.

### Approach
Create a new edge function that fetches daily call counts from the Talk API for ZD1 agents, stores them in a dedicated table, and merges them into the existing Ticket Logs dashboard -- replacing the webhook-based call column for ZD1.

### Step 1: Create `call_count_daily` table

A new table to store daily call counts fetched from the Talk API:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| agent_email | text | Agent email (from agent_profiles) |
| agent_name | text | Agent tag (for joining with ticket_logs dashboard) |
| date | date | The day the calls occurred |
| call_count | integer | Number of call legs for that day |
| fetched_at | timestamptz | When the data was last fetched |

Unique constraint on `(agent_email, date)` for upsert support. RLS: SELECT for authenticated, all ops for service role.

### Step 2: Create `fetch-call-counts` edge function

This function will:
1. Query `agent_profiles` for ZD1 agents with a `zendesk_user_id`
2. Use the Talk Incremental Legs API (same approach as `fetch-zendesk-metrics`) to paginate through legs
3. Filter legs by `agent_id = zendesk_user_id` and `type = 'agent'`, excluding missed/declined
4. Group legs by date (EST timezone) to get daily counts per agent
5. Upsert results into `call_count_daily`
6. Support parameters: `date` (specific day, defaults to today) or `scheduled: true` (fetches for today)

Rate limiting: Reuse the same incremental legs pagination with 6-second delays between pages (10 req/min Zendesk limit). Since all agents share the same legs endpoint, we only need to paginate once and then filter per agent -- very efficient.

### Step 3: Update `get_ticket_dashboard_data` database function

Modify the RPC to merge call counts from `call_count_daily` into the results for ZD1:
- Add a CTE that reads from `call_count_daily` for the given date range
- For ZD1 agents, use `call_count_daily.call_count` instead of counting `ticket_type = 'call'` from `ticket_logs`
- ZD2 continues using the existing webhook-based `ticket_logs` call counts (unchanged)

### Step 4: Add refresh button to Ticket Logs UI

Add a small refresh icon button on the ZD1 dashboard card that:
- Calls the `fetch-call-counts` function for today's date
- Shows a loading spinner while fetching
- Displays a toast on success/failure

### Step 5: Schedule via cron

Set up a `pg_cron` job to run `fetch-call-counts` every 30 minutes during business hours (or a fixed interval) so data stays relatively fresh without manual refreshing.

### Additional Considerations

1. **Timezone**: Call legs will be grouped by EST date (America/New_York) to match the existing ticket_logs date logic.
2. **Historical data**: On first run, we can backfill the rolling 2-week window by adjusting the start epoch.
3. **Deduplication**: The upsert on `(agent_email, date)` ensures repeated fetches don't create duplicates.
4. **Agents without zendesk_user_id**: Will show 0 calls (same as current behavior). A console warning will be logged.
5. **Cleanup**: The existing `cleanup-ticket-logs` function should also clean old `call_count_daily` records (before the 2-week window cutoff).
6. **ZD2 unchanged**: ZD2 call column continues to rely on webhook data (or shows 0 if no webhook is set up there either).

### Technical Summary

| What | Details |
|------|---------|
| New table | `call_count_daily` |
| New edge function | `fetch-call-counts` |
| Modified RPC | `get_ticket_dashboard_data` (merge call counts for ZD1) |
| Modified component | `TicketDashboard.tsx` (refresh button for ZD1) |
| Modified cleanup | `cleanup-ticket-logs` (purge old call_count_daily rows) |
| Cron job | Every 30 minutes via pg_cron |

