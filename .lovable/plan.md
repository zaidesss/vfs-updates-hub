
# Ticket Logs Feature - Updated Implementation Plan

## Changes Based on Your Feedback

1. **Dashboard Format**: Fixed to match your image exactly - Agent column on left, date columns spanning across, with ticket types (Email/Chat/Call) as rows under each agent, color-coded.

2. **Ticket Gap**: Changed from per-ticket tracking to **daily average** calculation, recorded per agent.

3. **Active Status Prerequisite**: Ticket gap tracking will only apply to agents with `employment_status = 'Active'` in `agent_profiles`.

---

## What You Need to Do in Zendesk

### 1. Create Webhook

In Zendesk Admin Center > Apps and Integrations > Webhooks:

| Setting | Value |
|---------|-------|
| Name | Lovable Ticket Logger |
| Endpoint URL | `https://rsjjvgyobtazxgeedmvi.supabase.co/functions/v1/zendesk-ticket-webhook` |
| Request method | POST |
| Request format | JSON |
| Authentication | Bearer Token |

### 2. Create Trigger

In Zendesk Admin Center > Objects and rules > Triggers:

**Trigger conditions** (meet ANY):
- Ticket is Created
- Ticket is Updated

**Actions**:
- Notify webhook: Lovable Ticket Logger
- JSON body:

```json
{
  "zd_instance": "{{ticket.account}}",
  "ticket_id": "{{ticket.id}}",
  "status": "{{ticket.status}}",
  "timestamp": "{{ticket.updated_at_with_timestamp}}",
  "ticket_type": "{{ticket.via}}",
  "agent_name": "{{ticket.assignee.name}}"
}
```

### 3. Set Bearer Token

I will provide you with a secret key to use as the Bearer token. You'll enter this in both:
- Zendesk webhook authentication field
- Lovable secrets configuration

---

## Dashboard Layout (Matching Your Image)

Based on your reference image, the dashboard will display:

```text
┌─────────────┬─────────────────────────┬─────────────────────────┐
│             │       1/27/2026         │       1/28/2026         │
│   Agent     ├─────────┬───────────────┼─────────┬───────────────┤
│             │ Type    │    Count      │ Type    │    Count      │
├─────────────┼─────────┼───────────────┼─────────┼───────────────┤
│             │ Email   │      50       │ Email   │      45       │
│   Malcom    │ Chat    │      10       │ Chat    │      12       │
│             │ Call    │       0       │ Call    │       3       │
├─────────────┼─────────┼───────────────┼─────────┼───────────────┤
│             │ Email   │      50       │ Email   │      48       │
│   Joseph    │ Chat    │      10       │ Chat    │       8       │
│             │ Call    │       0       │ Call    │       5       │
└─────────────┴─────────┴───────────────┴─────────┴───────────────┘
```

**Color coding**:
- Email rows: Blue background (#DBEAFE)
- Chat rows: Green background (#D1FAE5)
- Call rows: Yellow/Orange background (#FEF3C7)

---

## Ticket Gap Tracking (Daily Average)

### Logic

1. For each agent with `employment_status = 'Active'`:
   - Get all tickets for that day, sorted by timestamp
   - Calculate time gaps between consecutive tickets
   - Compute average gap in minutes
   - Store as daily record

2. Agents with status other than 'Active' will:
   - Not have gap calculations performed
   - Show "N/A" or "Inactive" in gap column

### New Table: `ticket_gap_daily`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| date | DATE | The date |
| agent_name | TEXT | Agent tag from Zendesk |
| agent_email | TEXT | Matched email from agent_directory |
| ticket_count | INTEGER | Total tickets that day |
| total_gap_seconds | INTEGER | Sum of all gaps |
| avg_gap_seconds | INTEGER | Average gap in seconds |
| min_gap_seconds | INTEGER | Shortest gap |
| max_gap_seconds | INTEGER | Longest gap |
| created_at | TIMESTAMPTZ | When calculated |

### Display in Dashboard

Below each agent's ticket counts, show:
- Average gap time (e.g., "Avg Gap: 5m 30s")
- For inactive agents: "Gap tracking disabled"

---

## Database Tables

### Table 1: `ticket_logs`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| zd_instance | TEXT | Zendesk instance |
| ticket_id | TEXT | Ticket ID |
| status | TEXT | Ticket status |
| timestamp | TIMESTAMPTZ | Event time |
| ticket_type | TEXT | Email/Chat/Call |
| agent_name | TEXT | Agent tag from Zendesk |
| agent_email | TEXT | Matched email |
| created_at | TIMESTAMPTZ | Record created |

### Table 2: `ticket_gap_daily`

(As described above)

---

## Auto-Archival (2 Weeks)

### Scheduled Edge Function: `cleanup-ticket-logs`

**Runs**: Daily at 2:00 AM EST via cron

**Process**:
1. Query tickets older than 14 days
2. Export to JSON file in `ticket-archives` storage bucket
3. Filename: `ticket-logs-archive-{date}.json`
4. Delete archived records from database
5. Log cleanup stats

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/TicketLogs.tsx` | Main page with dashboard, search, filters |
| `src/lib/ticketLogsApi.ts` | API functions for tickets and gaps |
| `src/components/ticket-logs/TicketDashboard.tsx` | Grid display matching your image format |
| `src/components/ticket-logs/TicketSearch.tsx` | Search bar and filter controls |
| `src/components/ticket-logs/TicketGapDisplay.tsx` | Gap statistics display |
| `supabase/functions/zendesk-ticket-webhook/index.ts` | Receives Zendesk data |
| `supabase/functions/calculate-daily-gaps/index.ts` | Computes daily gap averages |
| `supabase/functions/cleanup-ticket-logs/index.ts` | Archives and deletes old data |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add route `/team-performance/ticket-logs` |
| `src/components/Layout.tsx` | Add "Team Performance" navigation group after "People" |

---

## Navigation Structure

```text
People
├── My Bio
├── Dashboard
├── Master Directory
├── Team Status

Team Performance (NEW)
├── Ticket Logs
```

---

## Search and Filter Section

Below the dashboard grid:

**Search Bar**: 
- Free text search across ticket ID, agent name, status

**Filters** (dropdowns):
- Agent Name (multi-select from agent_directory)
- Date Range (date pickers for start/end)
- Ticket Type (Email, Chat, Call, or All)

**Results Table**:
| Ticket ID | Agent | Status | Type | Timestamp | ZD Instance |
|-----------|-------|--------|------|-----------|-------------|

---

## Real-Time Updates

Using Supabase Realtime subscriptions:
- Dashboard counts update automatically when new tickets arrive
- No page refresh required
- Visual indicator (subtle pulse) when new data comes in

---

## Implementation Steps

| Step | What Gets Built |
|------|-----------------|
| 1 | Database tables (`ticket_logs`, `ticket_gap_daily`) + RLS + storage bucket |
| 2 | Zendesk webhook edge function |
| 3 | Navigation update (Team Performance tab) |
| 4 | Ticket Logs page with dashboard grid (matching your image format) |
| 5 | Search and filter functionality |
| 6 | Daily gap calculation function |
| 7 | Auto-cleanup/archive function |
| 8 | Real-time updates integration |

---

## Technical Notes

### Agent Status Check for Gaps

```typescript
// Query to check if agent is active before calculating gaps
const { data: agentProfile } = await supabase
  .from('agent_profiles')
  .select('employment_status')
  .eq('email', agentEmail)
  .single();

if (agentProfile?.employment_status !== 'Active') {
  // Skip gap calculation for this agent
  return { gapDisabled: true };
}
```

### Dashboard Data Query

```typescript
// Aggregate tickets by agent, date, and type
const { data } = await supabase
  .from('ticket_logs')
  .select('agent_name, timestamp, ticket_type')
  .gte('timestamp', twoWeeksAgo)
  .order('timestamp', { ascending: false });

// Group by: agent -> date -> type -> count
```

---

Ready to proceed with Step 1 (database setup) when you approve.
