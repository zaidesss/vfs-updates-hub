

## Fix Ticket Logs: Agent Filter, Default Dates, and Export

### Issues Found

1. **Agent filter broken**: `fetchUniqueAgents()` queries the entire `ticket_logs` table (hitting the 1000-row Supabase limit) just to extract agent names. The dropdown shows "--" entries because of incomplete/duplicate data. Fix: use a SQL `DISTINCT` approach or query from `agent_profiles` instead.

2. **Start/End date defaults to empty**: Currently both dates start blank, requiring the user to manually set them. Fix: default both to today's date in EST.

3. **No export option**: Need to add an "Export" button that downloads the filtered search results as a CSV/Excel file using the existing `exportToCSV` utility.

### Technical Details

**File: `src/lib/ticketLogsApi.ts`**
- Replace `fetchUniqueAgents()` to use a more reliable approach: query `ticket_logs` with a `.select('agent_name')` but use a database RPC or simply query `agent_profiles` for the `agent_tag` field (which is what `agent_name` maps to). The simplest fix: use Supabase's distinct-on or just query the `agent_profiles` table for agent tags.
- Since the current approach scans the whole table and deduplicates client-side (hitting the 1000-row default limit), switching to querying agent_profiles for agent_tag values will be both faster and complete.

**File: `src/components/ticket-logs/TicketSearch.tsx`**
- **Default dates**: Initialize `startDate` and `endDate` state to today's date in EST (using the existing `getESTDate`-style logic or `format(new Date(), 'yyyy-MM-dd')`).
- **Agent filter fix**: Update to use the corrected `fetchUniqueAgents` that returns actual agent names.
- **Export button**: Add a "Download CSV" button next to the results count header. Uses `exportToCSV` from `exportUtils.ts` with columns: Ticket ID, Agent, Status, Type, Timestamp, ZD Instance.

### Step-by-Step

1. **Step 1**: Fix `fetchUniqueAgents` in `ticketLogsApi.ts` to query `agent_profiles.agent_tag` for reliable, complete agent list
2. **Step 2**: Update `TicketSearch.tsx` to default Start/End dates to today, and add Export CSV button
