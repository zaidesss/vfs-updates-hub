
# Zendesk Explore–Aligned Chat AHT and FRT Implementation (ZD1 Only)

## Executive Summary

Update the `fetch-zendesk-metrics` edge function to calculate **Chat AHT** (Handle Time) and **FRT** (First Response Time) that match Zendesk Explore within ±1 second. This involves switching from the incorrect `agent_wait_time` metric to the proper `agent_work_time` from the Ticket Metric Events API.

---

## Current Problems Identified

### Chat AHT (Handle Time)
**Current Implementation:**
```javascript
ahtMinutes: metrics?.agent_wait_time_in_minutes?.calendar || null
```

**Problem:** `agent_wait_time` is the time a customer waited for an agent response, **NOT** the agent's handling time. This is fundamentally wrong.

**Correct Metric:** `agent_work_time` from Ticket Metric Events API - tracks cumulative time agent spent actively working (pauses when status is Pending/On-hold/Solved).

### Chat FRT (First Response Time)
**Current Implementation:**
```javascript
frtMinutes: metrics?.reply_time_in_minutes?.calendar || null
```

**Status:** The field is correct, but:
- Not filtering out bot-only conversations
- Uses `updated>=` instead of `created>=` which may include tickets from previous weeks
- Needs to ensure `reply_time_in_seconds.calendar` is used for precision

---

## Technical Solution

### 1. Use Ticket Metric Events API for AHT

The Ticket Metric Events API tracks `agent_work_time` with `update_status` events that contain the cumulative calendar time.

**API Endpoint:**
```
GET /api/v2/tickets/{ticket_id}/metric_events.json
```

**Response contains:**
```json
{
  "metric": "agent_work_time",
  "type": "update_status",
  "status": {
    "calendar": 180,  // seconds of agent work time
    "business": 120
  }
}
```

### 2. Updated Data Flow

```text
For each chat/messaging ticket:
1. Fetch ticket via search (filter: via:chat OR channel:messaging OR channel:web)
2. Filter: tickets created within week (not just updated)
3. Filter: exclude tickets with 0 agent replies (bot-only/abandoned)
4. For each valid ticket:
   a. Fetch metric events: /tickets/{id}/metric_events.json
   b. Extract agent_work_time (last update_status event)
   c. Extract reply_time from ticket metrics (in seconds for precision)
5. Calculate per-conversation averages:
   - Chat AHT = AVG(agent_work_time.calendar seconds)
   - Chat FRT = AVG(reply_time_in_seconds.calendar)
```

### 3. Filtering Criteria (Explore Aligned)

**Include:**
- Tickets with `via = "Chat"` OR `channel = "messaging"` OR `channel = "web"`
- Tickets created within the date range (`created>=` and `created<=`)
- Tickets with at least one agent reply (has agent_work_time events)

**Exclude:**
- Bot-only conversations (no agent_work_time fulfill/update_status events)
- Abandoned chats (no agent response)

---

## Implementation Details

### File: `supabase/functions/fetch-zendesk-metrics/index.ts`

#### A. Add New Interface for Metric Events

```typescript
interface TicketMetricEvent {
  id: number;
  ticket_id: number;
  metric: string;  // "agent_work_time", "reply_time", etc.
  type: string;    // "activate", "pause", "fulfill", "update_status"
  time: string;
  status?: {
    calendar: number;  // seconds
    business: number;
  };
}
```

#### B. New Function: Fetch Ticket Metric Events

```typescript
async function fetchTicketMetricEvents(
  config: ZendeskConfig,
  ticketId: number
): Promise<TicketMetricEvent[]> {
  const url = `https://${config.subdomain}.zendesk.com/api/v2/tickets/${ticketId}/metric_events.json`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Basic ${btoa(`${config.email}/token:${config.token}`)}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) return [];
  
  const data = await response.json();
  return data.ticket_metric_events || [];
}
```

#### C. Update `batchFetchTicketMetrics` Function

Replace the simple metrics fetch with a more comprehensive approach that:
1. Fetches ticket metrics (for FRT in seconds)
2. Fetches metric events (for agent_work_time)

```typescript
async function batchFetchTicketMetricsExploreAligned(
  config: ZendeskConfig,
  ticketIds: number[]
): Promise<Map<number, { frtSeconds: number | null; ahtSeconds: number | null }>> {
  const results = new Map();

  for (let i = 0; i < ticketIds.length; i += CHAT_CONCURRENT_LIMIT) {
    const batch = ticketIds.slice(i, i + CHAT_CONCURRENT_LIMIT);

    const batchPromises = batch.map(async (ticketId) => {
      try {
        // Fetch standard ticket metrics (for FRT in seconds)
        const metricsUrl = `https://${config.subdomain}.zendesk.com/api/v2/tickets/${ticketId}/metrics.json`;
        const metricsResponse = await fetch(metricsUrl, { headers: authHeaders });
        
        // Fetch metric events (for agent_work_time)
        const eventsUrl = `https://${config.subdomain}.zendesk.com/api/v2/tickets/${ticketId}/metric_events.json`;
        const eventsResponse = await fetch(eventsUrl, { headers: authHeaders });

        let frtSeconds = null;
        let ahtSeconds = null;

        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json();
          // Use seconds for precision
          frtSeconds = metricsData.ticket_metric?.reply_time_in_seconds?.calendar || null;
        }

        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          const events = eventsData.ticket_metric_events || [];
          
          // Find the last update_status event for agent_work_time
          const workTimeEvents = events.filter(
            (e) => e.metric === 'agent_work_time' && e.type === 'update_status'
          );
          
          if (workTimeEvents.length > 0) {
            // Use the last update_status event (cumulative value)
            const lastEvent = workTimeEvents[workTimeEvents.length - 1];
            ahtSeconds = lastEvent.status?.calendar || null;
          }
        }

        return { ticketId, frtSeconds, ahtSeconds };
      } catch (error) {
        return { ticketId, frtSeconds: null, ahtSeconds: null };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    for (const result of batchResults) {
      results.set(result.ticketId, { 
        frtSeconds: result.frtSeconds, 
        ahtSeconds: result.ahtSeconds 
      });
    }

    // Rate limiting delay between batches
    if (i + CHAT_CONCURRENT_LIMIT < ticketIds.length) {
      await delay(200);
    }
  }

  return results;
}
```

#### D. Update `fetchChatMetrics` Function

1. Change search to use `created>=` instead of `updated>=`
2. Filter for agent-replied tickets only
3. Use the new batch fetch function

```typescript
async function fetchChatMetrics(
  config: ZendeskConfig,
  zendeskUserId: string,
  weekStart: string,
  weekEnd: string
): Promise<{ ahtSeconds: number | null; frtSeconds: number | null; totalChats: number }> {
  try {
    // Use created date for accurate week filtering
    const query = `type:ticket assignee_id:${zendeskUserId} created>=${weekStart} created<=${weekEnd} (via:chat OR channel:messaging OR channel:web)`;
    const searchUrl = `https://${config.subdomain}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(query)}&sort_by=created_at&sort_order=desc&per_page=100`;

    const searchResponse = await fetch(searchUrl, { headers: authHeaders });
    if (!searchResponse.ok) {
      return { ahtSeconds: null, frtSeconds: null, totalChats: 0 };
    }

    const searchData = await searchResponse.json();
    
    // Filter out tickets with no agent replies (bot-only/abandoned)
    const tickets = (searchData.results || []).filter((t: any) => 
      t.status !== 'deleted' && 
      (t.comment_count || 0) > 1  // At least one agent reply
    );

    if (tickets.length === 0) {
      return { ahtSeconds: null, frtSeconds: null, totalChats: 0 };
    }

    const ticketIds = tickets.map((t: any) => t.id as number);
    
    // Use Explore-aligned batch fetch
    const metricsMap = await batchFetchTicketMetricsExploreAligned(config, ticketIds);

    // Calculate per-conversation averages (Explore aligned)
    let totalFrt = 0;
    let frtCount = 0;
    let totalAht = 0;
    let ahtCount = 0;

    for (const [_, metrics] of metricsMap) {
      if (metrics.frtSeconds !== null) {
        totalFrt += metrics.frtSeconds;
        frtCount++;
      }
      if (metrics.ahtSeconds !== null) {
        totalAht += metrics.ahtSeconds;
        ahtCount++;
      }
    }

    // AVG per conversation - round only at final step
    const avgFrt = frtCount > 0 ? Math.round(totalFrt / frtCount) : null;
    const avgAht = ahtCount > 0 ? Math.round(totalAht / ahtCount) : null;

    return { 
      ahtSeconds: avgAht, 
      frtSeconds: avgFrt, 
      totalChats: tickets.length 
    };

  } catch (error) {
    console.error(`Error fetching chat metrics:`, error);
    return { ahtSeconds: null, frtSeconds: null, totalChats: 0 };
  }
}
```

---

## UI Label Updates

### File: `src/pages/TeamScorecard.tsx`

Update column headers to clarify calculation method:

| Current | New |
|---------|-----|
| Chat AHT | Chat AHT |
| Chat FRT | Chat FRT |

**Add tooltips:**
- Chat AHT: "per conversation — Explore aligned"
- Chat FRT: "first agent reply — Explore aligned"

---

## Rate Limiting Considerations

The Metric Events API has a rate limit. With the additional API call per ticket, we need to:
- Increase batch delay from 100ms to 200ms
- Monitor for 429 errors and implement exponential backoff if needed

---

## Validation Criteria

After implementation:
```
|Lovable Chat AHT - Zendesk Explore Handle Time| ≤ 1 second
|Lovable Chat FRT - Zendesk Explore First Reply Time| ≤ 1 second
```

---

## Edge Cases

1. **No agent_work_time events**: Ticket has no agent interaction → exclude from AHT average
2. **Bot-only tickets**: Filtered out by `comment_count > 1` check
3. **Transferred tickets**: Include - agent_work_time tracks per-agent cumulative work
4. **Reopened tickets**: Include - Explore includes cumulative handle time across reopens

---

## Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/fetch-zendesk-metrics/index.ts` | Add `TicketMetricEvent` interface |
| `supabase/functions/fetch-zendesk-metrics/index.ts` | New `batchFetchTicketMetricsExploreAligned` function |
| `supabase/functions/fetch-zendesk-metrics/index.ts` | Update `fetchChatMetrics` to use `created>=` filter |
| `supabase/functions/fetch-zendesk-metrics/index.ts` | Filter out bot-only/abandoned tickets |
| `supabase/functions/fetch-zendesk-metrics/index.ts` | Use `reply_time_in_seconds` for FRT precision |
| `src/pages/TeamScorecard.tsx` | Add tooltips to Chat AHT and Chat FRT headers |

---

## Formula Summary

**Chat AHT (Explore Aligned):**
```
AVG(ticket.agent_work_time.calendar_seconds)
```

**Chat FRT (Explore Aligned):**
```
AVG(ticket.reply_time_in_seconds.calendar)
```

Both are per-conversation averages, not totals ÷ count, and round only at final output.
