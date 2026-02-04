

# Fix Zendesk Metrics Fetch - Use Correct APIs for Historical Data

## Summary
Rewrite the `fetch-zendesk-metrics` edge function to use the correct Zendesk API endpoints that support historical weekly data queries instead of current-day-only stats endpoints.

## Problem Identified
The current implementation uses `/api/v2/channels/voice/stats/agents_activity.json` which only returns **same-day** data (midnight to now in the account's timezone). This is why all weekly queries return null even with correct agent IDs.

## Solution Overview

| Metric | Current (Broken) | New (Correct) |
|--------|-----------------|---------------|
| **Call AHT** | `agents_activity` (same-day only) | `/incremental/calls.json` with pagination |
| **Chat AHT** | Ticket search (limited) | Ticket metrics aggregation |
| **Chat FRT** | Ticket search + individual metrics | Ticket metrics aggregation |

---

## Implementation Steps

### Step 1: Rewrite `fetchCallMetrics` Function

Replace the `agents_activity` approach with the Talk Incremental Exports API:

**New Logic:**
1. Convert `weekStart` to Unix epoch timestamp
2. Call `/api/v2/channels/voice/stats/incremental/calls.json?start_time={epoch}`
3. Paginate through all results using `next_page` URLs
4. Filter calls where `agent_id` matches the target Zendesk User ID
5. Filter calls where timestamp falls within `weekStart` to `weekEnd` range
6. Calculate: `AHT = sum(talk_time + wrap_up_time) / call_count`

**Rate Limiting:** The API allows 10 requests/minute - add 6-second delays between paginated requests.

---

### Step 2: Improve `fetchChatMetrics` Function

Keep the ticket search approach but make it more robust:

**Changes:**
1. Use `updated>={weekStart} updated<={weekEnd}` for broader date matching
2. Add `via:chat` OR `channel:messaging` to catch both legacy and new chat
3. Batch ticket metric requests more efficiently (parallel with concurrency limit)
4. Calculate AHT from `agent_wait_time_in_minutes.calendar`
5. Calculate FRT from `reply_time_in_minutes.calendar` (already using this)

---

### Step 3: Add Pagination Helper

Create a reusable function for handling Zendesk's incremental export pagination:

```text
function paginateZendeskExport(initialUrl, config):
  results = []
  url = initialUrl
  while url:
    response = fetch(url)
    results.push(...response.calls)
    url = response.next_page
    if url: delay(6000)  // Rate limit: 10 req/min
  return results
```

---

### Step 4: Update Date Range Filtering

Ensure the incremental API results are filtered to only include calls/chats within the exact week boundary:

```text
For each call in incrementalResults:
  callDate = new Date(call.updated_at or call.timestamp)
  if callDate >= weekStart AND callDate <= weekEnd:
    include in calculations
```

---

## Updated Function Signatures

### `fetchCallMetrics` (rewritten)
```text
Input: config, zendeskUserId, weekStart, weekEnd
Process:
  1. startEpoch = Date.parse(weekStart) / 1000
  2. calls = paginateIncrementalCalls(startEpoch)
  3. agentCalls = calls.filter(c => c.agent_id === zendeskUserId)
  4. weekCalls = agentCalls.filter(c => inDateRange(c, weekStart, weekEnd))
  5. AHT = sum(talk_time + wrap_up_time) / count
Output: { ahtSeconds, totalCalls }
```

### `fetchChatMetrics` (improved)
```text
Input: config, zendeskUserId, weekStart, weekEnd
Process:
  1. Search for chat/messaging tickets assigned to user in date range
  2. Batch-fetch ticket metrics (5 concurrent requests)
  3. Calculate avg FRT from reply_time_in_minutes.calendar
  4. Calculate avg AHT from agent_wait_time_in_minutes.calendar
Output: { ahtSeconds, frtSeconds, totalChats }
```

---

## Technical Details

### Zendesk Talk Incremental Calls API
- **Endpoint**: `GET /api/v2/channels/voice/stats/incremental/calls.json`
- **Parameter**: `start_time` (Unix epoch)
- **Rate Limit**: 10 requests/minute
- **Key Fields**: `agent_id`, `talk_time`, `wrap_up_time`, `updated_at`

### Zendesk Ticket Metrics API
- **Endpoint**: `GET /api/v2/tickets/{id}/metrics.json`
- **Key Fields**:
  - `reply_time_in_minutes.calendar` → FRT
  - `agent_wait_time_in_minutes.calendar` → AHT component

### Batch Processing
- Continue processing 10 agents per batch with 5-second delays
- Within each agent: paginate calls with 6-second delays (rate limit)
- Chat ticket metrics: 5 concurrent requests with 100ms stagger

---

## Expected Outcome

After this fix:
1. **Desiree's Call AHT** will be calculated from actual Talk call records for Jan 26 – Feb 1
2. **Chat AHT/FRT** will aggregate properly from ticket metrics
3. Weekly cron job (Tuesdays 2:00 AM EST) will fetch accurate historical data

---

## Testing Plan

After deployment:
1. Clear cached metrics for Jan 26 week
2. Trigger function for Desiree specifically
3. Verify logs show incremental API pagination
4. Confirm non-null AHT values are stored in `zendesk_agent_metrics`

