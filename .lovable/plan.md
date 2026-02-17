

## Exclude Logistics from Ticket Counts Only

### What changes
Currently, Logistics agents are fully excluded from all analytics (attendance, tickets, compliance, time) alongside Team Lead and Technical Support. The change will keep Logistics agents in attendance, compliance, and time calculations but exclude their tickets from the ticket count and quota metrics.

### Affected areas
- EOD Team Analytics (daily)
- EOW Team Analytics (weekly)
- Individual Agent Analytics: no change needed (it's per-agent, not team-wide)

### Technical Details

**Step 1: Update `generate-eod-analytics` edge function**

- Change `EXCLUDED_POSITIONS` to only `['Team Lead', 'Technical Support']` for the profile query (so Logistics agents are included in attendance/compliance/time)
- Add a separate `TICKET_EXCLUDED_POSITIONS` = `['Team Lead', 'Technical Support', 'Logistics']`
- When aggregating tickets (lines 60-68), filter out tickets from Logistics agents by checking the profile's position before counting
- When calculating quota (lines 122-123), skip Logistics agents

**Step 2: Update `generate-weekly-analytics` edge function**

- Same pattern: narrow `EXCLUDED_POSITIONS` to `['Team Lead', 'Technical Support']`
- Add `TICKET_EXCLUDED_POSITIONS` including Logistics
- Filter ticket aggregation and quota calculation to exclude Logistics agents
- Keep Logistics in attendance, time, and compliance loops

### Implementation approach
- Build a set of Logistics agent emails from the profiles query
- When iterating tickets, skip entries whose `agent_email` belongs to a Logistics agent
- When calculating quota per agent, skip if agent position is Logistics
- No frontend changes needed -- the response shape stays the same

