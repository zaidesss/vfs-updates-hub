

## New Page: Zendesk Insights (Team Performance)

A new page under Team Performance that shows team-wide averages for **Average Resolution Time**, **Full Resolution Time**, **CSAT Score**, and **First Response Time** -- fetched live from the Zendesk API for both ZD1 and ZD2 instances. Users select a week range and see results immediately.

### What You'll See

- **Week selector** matching the same Year > Month > Week pattern used on the Scorecard page
- **Two cards** (one per Zendesk instance: ZD1 and ZD2), each showing:
  - Avg Resolution Time (agent handle time only, in minutes/seconds)
  - Full Resolution Time (ticket created to solved, in hours/minutes)
  - CSAT Score (percentage of "good" ratings out of total rated tickets)
  - First Response Time (average first reply time, in minutes/seconds)
  - Total tickets processed for context
- **Loading state** while data is fetched live from Zendesk
- Accessible to all users (same as other Team Performance pages)

### Related Considerations

Before we start, here are some things worth thinking about:

1. **Rate limiting**: Zendesk APIs have rate limits (10 req/min for Talk, standard limits for Support). Fetching all tickets for a week across both instances could be slow. Should we add a simple cache table to avoid re-fetching the same week repeatedly?
2. **Ticket scope**: Should CSAT and resolution times include ALL ticket types (email, chat, call), or only specific channels?
3. **Empty weeks**: Some weeks may have no CSAT ratings. Should we show "No data" or 0%?

### Technical Details

**Step 1: Create the edge function `fetch-zendesk-insights`**

New file: `supabase/functions/fetch-zendesk-insights/index.ts`

This function accepts `{ weekStart, weekEnd, zdInstance }` and returns team-wide averages by:
- Searching all solved tickets in the week range using the Zendesk Search API (`solved>={weekStart} solved<={weekEnd}`)
- Fetching ticket metrics for resolution times via `/api/v2/tickets/{id}/metrics.json` (batch processing)
- Fetching CSAT via `/api/v2/satisfaction_ratings.json?start_time={epoch}&end_time={epoch}` filtered by the week
- Computing and returning averages for all four metrics
- Uses existing `ZENDESK_API_TOKEN_ZD1`, `ZENDESK_API_TOKEN_ZD2`, and `ZENDESK_ADMIN_EMAIL` secrets (already configured)

**Step 2: Create the page component**

New file: `src/pages/ZendeskInsights.tsx`

- Uses the same Year/Month/Week selector pattern from TeamScorecard
- Renders two `InsightsCard` components (one per ZD instance)
- Each card calls the edge function on mount/week change
- Displays the four metrics in a clean card grid with appropriate formatting (time in mm:ss or hh:mm, CSAT as percentage)

**Step 3: Add route and navigation**

- `src/App.tsx`: Add route `/team-performance/zendesk-insights`
- `src/components/Layout.tsx`: Add nav item "Zendesk Insights" under Team Performance group (using `TrendingUp` or `LineChart` icon from lucide)
- `supabase/config.toml`: Add `[functions.fetch-zendesk-insights]` with `verify_jwt = false`

