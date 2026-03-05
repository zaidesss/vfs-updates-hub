

## Plan: Fix Open Tickets Agent Name Extraction + Move Position

### Two issues to fix

**1. UI Position**: Move `OpenTicketsSection` from between "Remaining Yesterday" and "Oldest New Ticket" to **after** "Oldest New Ticket".

**2. Agent name extraction**: The current code reads `custom_fields` from row data, but the Views execute endpoint doesn't include `custom_fields` in rows. Since the custom field IS a column in the view, the execute endpoint returns column values differently — each row has a `group` property or the columns appear in the response's `columns` array mapped to row values.

### Approach for agent name extraction

The Views API `/execute.json` response structure is:
- `columns`: array of column definitions with `id` and `title`
- `rows`: array of row objects, each with a `ticket` object containing standard fields + `custom_fields`

Actually, since the view **groups by** the Agent Name custom field, the response may include group headers. But the simpler approach: the execute endpoint **does** return `custom_fields` on each `row.ticket` — the current code looks at `row.ticket.custom_fields` which should work. But the issue might be that the execute endpoint returns a **slimmed** ticket object.

**Better approach**: Since the view is already grouped by Agent Name, we can use the `/api/v2/views/{id}/count.json` for the total, and then use the **Zendesk Search API** with the same filter criteria to get custom field values. But that defeats the purpose.

**Simplest fix**: Log the actual response structure from the execute endpoint to understand what we're getting, then adjust parsing. But since the user confirmed the custom field IS a column, we should look at the `columns` array in the response and map column index to row values.

Actually, looking at the Zendesk Views API docs more carefully: the execute endpoint returns rows where each row has a `ticket` property that IS a full ticket object including `custom_fields`. The issue is likely that we need to paginate (only 100 rows per page, but 2400+ tickets in ZD1).

**For the agent name grouping with 2400+ tickets**, fetching all pages would be too many API calls. Better alternatives:
- Use `/api/v2/views/{id}/count.json` for total count (already works)
- For agent breakdown, fetch ALL pages of the view (up to 25 pages for ZD1) — too expensive
- **Best**: Since the view is grouped by Agent Name in Zendesk, we could potentially read group counts from the response. But the API doesn't expose group aggregations.
- **Practical**: Paginate through all results but only extract the custom field value (lightweight processing). With `per_page=100`, ZD1 needs ~25 calls. This is too many for a 3-min cached endpoint.

**Recommended approach**: Fetch up to 3-4 pages (300-400 tickets) which covers most scenarios, use the `count` from page 1 for the total, and note that agent breakdown is based on a sample if total > fetched rows.

### Changes

#### Step 1: Fix edge function — paginate and extract from `custom_fields`
- Fetch multiple pages (up to 1000 tickets via 10 pages) to get reasonable agent coverage
- Keep reading `custom_fields` from `row.ticket` but add fallback logging
- Use `data.count` for accurate total

#### Step 2: Move OpenTicketsSection below Oldest New Ticket in the UI
- Swap the order in `NewTicketsCounter.tsx`

### Files Modified
- `supabase/functions/fetch-zendesk-realtime/index.ts` — add pagination to view fetch
- `src/components/dashboard/NewTicketsCounter.tsx` — move Open Tickets below Oldest New Ticket

