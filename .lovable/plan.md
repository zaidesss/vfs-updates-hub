

## Plan: Reduce Zendesk API Calls via Caching and Disabling

### Summary
Three changes to fix the 429 rate-limit errors breaking the New Tickets Monitor:
1. **Cache `fetch-zendesk-realtime`** in a DB table with 3-min TTL — all users share one cached result
2. **Cache `fetch-sla-responsiveness`** in a DB table with 5-min TTL — same shared approach
3. **Disable `fetch-zendesk-insights`** — the highest API consumer, making 1,000+ calls per invocation

---

### Step 1: Create a `zendesk_cache` table
- Migration: Create `zendesk_cache` table with columns: `cache_key TEXT PRIMARY KEY`, `data JSONB`, `fetched_at TIMESTAMPTZ`
- Used by both realtime and SLA functions as a shared cache

### Step 2: Add caching to `fetch-zendesk-realtime`
- At the start of the function, check `zendesk_cache` for key `'realtime'`
- If `fetched_at` is less than 3 minutes old, return the cached `data` immediately (zero ZD API calls)
- Otherwise, fetch fresh from Zendesk, upsert the result into `zendesk_cache`, then return it
- **Result**: Multiple users polling every 60s all get the same cached result; only 1 actual ZD fetch per 3 minutes

### Step 3: Add caching to `fetch-sla-responsiveness`
- Same pattern with key `'sla_responsiveness'` and 5-minute TTL
- Each invocation checks cache first, only fetches from ZD if stale
- **Result**: Eliminates the per-ticket metrics calls from multiplying across users

### Step 4: Disable `fetch-zendesk-insights`
- In the edge function, return an error/empty response immediately with a message like "Zendesk Insights is temporarily disabled to reduce API load"
- On the frontend (`ZendeskInsights.tsx`), show a banner/alert explaining the feature is paused
- This removes the biggest API consumer (1,000+ per-ticket metric calls per load)

### Files Modified
- **New migration**: Create `zendesk_cache` table
- `supabase/functions/fetch-zendesk-realtime/index.ts` — add Supabase client, cache check/write logic
- `supabase/functions/fetch-sla-responsiveness/index.ts` — same cache pattern
- `supabase/functions/fetch-zendesk-insights/index.ts` — short-circuit with disabled message
- `src/pages/ZendeskInsights.tsx` — show "temporarily disabled" banner

