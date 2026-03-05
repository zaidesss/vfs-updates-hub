

## Plan: Add Open Tickets with Agent Name Counter via Views API

### Summary
Add a new "Open Tickets" section to the New Tickets Monitor by fetching ticket data from pre-built Zendesk Views using the Views API. The view execute endpoint returns tickets with custom field values, which we'll use to extract agent names from the custom fields (ZD1: `14923047306265`, ZD2: `44524282221593`).

### Step 1: Update `fetch-zendesk-realtime` edge function
- Add `fetchOpenTicketsFromView()` that calls `/api/v2/views/{id}/execute.json` for each instance
  - ZD1 View ID: `55735766685081`, custom field: `14923047306265`
  - ZD2 View ID: `55551228002585`, custom field: `44524282221593`
- Parse the response rows, extract the agent name from each ticket's custom field value
- Group by agent name → `{ total: number, byAgent: { name: string, count: number }[] }`
- Include in the existing result object as `zd1.openTickets` and `zd2.openTickets`
- Covered by the same 3-minute DB cache — no extra API pressure

### Step 2: Update `src/lib/zendeskRealtimeApi.ts`
- Add `OpenTicketAgent` interface: `{ name: string, count: number }`
- Add `OpenTicketsData` interface: `{ total: number, byAgent: OpenTicketAgent[] }`
- Add `openTickets?: OpenTicketsData` to `InstanceStats`

### Step 3: Update `src/components/dashboard/NewTicketsCounter.tsx`
- Add a new section below existing metrics showing:
  - **Open Tickets** total with ZD1/ZD2 split (using existing `MetricRow`)
  - Collapsible agent breakdown table sorted by count descending
  - Agents with no name value shown as "Unassigned"

### Files Modified
- `supabase/functions/fetch-zendesk-realtime/index.ts` — add Views API fetch with custom field extraction
- `src/lib/zendeskRealtimeApi.ts` — add open tickets types
- `src/components/dashboard/NewTicketsCounter.tsx` — render open tickets section

