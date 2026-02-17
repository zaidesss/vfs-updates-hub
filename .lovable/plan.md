

## Chunked Metric Fetching for Zendesk Insights

### Problem
Fetching ART/FRT metrics requires 2 API calls per ticket. For weeks with 900+ tickets, that's 1,800+ API calls in a single edge function call, causing timeouts (60-second limit).

### Solution: Two-Phase Approach

**Phase 1 -- Quick response (ticket count + CSAT)**
The edge function searches tickets and fetches CSAT (fast). Returns the ticket count, CSAT, and the list of ticket IDs -- but does NOT fetch per-ticket metrics yet.

**Phase 2 -- Chunked metric fetching (500 at a time)**
The frontend sends chunks of 500 ticket IDs to the edge function. Each chunk call fetches metrics for those 500 tickets and returns running totals. The frontend accumulates the results and computes final averages once all chunks are done.

### Changes

**1. Edge Function (`fetch-zendesk-insights/index.ts`)**
- Add a new `mode` parameter: `"search"` (Phase 1) or `"metrics"` (Phase 2)
- `mode: "search"` -- searches tickets, fetches CSAT, returns `{ ticketIds, totalTickets, csat, ... }`
- `mode: "metrics"` -- accepts `ticketIds` (up to 500), fetches per-ticket ART/FRT/Full Resolution, returns raw totals and counts (not averages)
- Cache check still happens first -- if cached with valid metrics, returns immediately (no phases needed)
- After all chunks are processed, the frontend sends a final `mode: "cache"` call to save the combined results to the database

**2. Frontend (`ZendeskInsights.tsx`)**
- Replace the single `fetchInsights` call with a multi-step flow:
  1. Call with `mode: "search"` to get ticket count + CSAT instantly (UI shows ticket count and CSAT right away)
  2. Automatically fire chunk calls (500 IDs each) in sequence
  3. Show a progress indicator: "Fetching metrics... 500/900 tickets processed"
  4. Once all chunks return, compute final averages and save to cache
  5. Update the UI with complete data
- The "Cached" badge and refresh button continue to work as before
- Add a progress bar or text showing chunk progress during live fetches

### Flow Diagram

```text
User selects week
       |
  [Check cache] --> HIT --> Show cached data (instant)
       |
      MISS
       |
  Phase 1: Search tickets + CSAT
       |
  Show ticket count + CSAT immediately
  Show "Fetching metrics..." with progress
       |
  Phase 2: Send chunk 1 (IDs 1-500) --> accumulate totals
  Phase 2: Send chunk 2 (IDs 501-900) --> accumulate totals
       |
  Compute final averages
  Save to cache
  Show complete data
```

### Step-by-Step Implementation Order

**Step 1**: Update the edge function to support `mode` parameter (search / metrics / cache)

**Step 2**: Update the frontend to use the multi-phase fetch with progress indicator

**Step 3**: Clear bad cached entries (weeks with 0 tickets or null metrics from previous attempts)

**Step 4**: Deploy and test

