

# SLA Response Tracker — Plan

## Overview

Build a dedicated **Responsiveness** page (`/operations/reports/responsiveness`) that replaces the current placeholder, plus a **compact summary widget** on the Agent Dashboard. The page provides four core metrics to track the 2-hour New Ticket SLA across both ZD1 and ZD2.

---

## Metrics

| # | Metric | Source | Detail |
|---|--------|--------|--------|
| 1 | **Last 60 min: New vs Responded** | Zendesk Search API — `created>=now-1h status:new` vs `created>=now-1h status>new` | Rolling window, per instance |
| 2 | **Remaining Yesterday Tickets** | Zendesk Search API — `created:yesterday status:new` | Still-unanswered from prior day |
| 3 | **Oldest New Ticket** | Search API sorted by `created_at asc`, pick first result | Shows creation timestamp + age in hours/minutes |
| 4 | **Resolution Time** | Zendesk Ticket Metrics API — `full_resolution_time` and `reply_time_in_minutes.calendar` per ticket | Both First Reply Time and Full Resolution Time; displayed as averages + distribution chart |

---

## Architecture

### 1. New Edge Function: `fetch-sla-responsiveness`

Single function that queries both ZD instances in parallel and returns:

```text
{
  zd1: {
    lastHourNew: number,
    lastHourResponded: number,
    remainingYesterday: number,
    oldestNewTicket: { id, created_at, subject, age_minutes },
    resolution: {
      avgFirstReplyMinutes: number,
      avgFullResolutionMinutes: number,
      distribution: { bucket: string, count: number }[]  // e.g. "<30m", "30m-1h", "1-2h", "2-4h", "4h+"
    }
  },
  zd2: { ...same shape },
  fetchedAt: string
}
```

- Uses `ZENDESK_API_TOKEN_ZD1`, `ZENDESK_API_TOKEN_ZD2`, and `ZENDESK_ADMIN_EMAIL` (all already configured).
- Resolution metrics: fetch tickets solved today (`type:ticket status:solved solved>=today`), then batch-fetch their metrics via `/api/v2/tickets/{id}/metrics` (or the list endpoint) to get `reply_time_in_minutes` and `full_resolution_time_in_minutes`.
- Distribution buckets: `<30m`, `30m–1h`, `1–2h`, `2–4h`, `4h+`.

### 2. Responsiveness Page (`src/pages/operations/Responsiveness.tsx`)

Full rewrite of the placeholder. Layout:

- **ZD Instance tabs** (ZD1 / ZD2 / Combined) at the top
- **4 summary cards** in a grid:
  - Last Hour New vs Responded (with inline comparison)
  - Remaining Yesterday
  - Oldest New Ticket (age + creation date)
  - Avg First Reply / Full Resolution
- **Distribution chart** (Recharts BarChart) showing resolution time buckets
- Auto-refresh every 60 seconds, manual refresh button
- Date defaults to "today" in EST

### 3. Dashboard Widget Enhancement (`NewTicketsCounter.tsx`)

Add 2 compact rows below existing metrics:
- **Remaining Yesterday** count (with ZD1/ZD2 split)
- **Oldest New Ticket** age (e.g. "2h 15m ago")

These use the same `fetch-sla-responsiveness` edge function (or piggyback on `fetch-zendesk-realtime` if we extend it).

---

## Implementation Steps (sequential)

1. **Create the `fetch-sla-responsiveness` edge function** — all Zendesk API queries, resolution metric fetching, distribution bucketing.
2. **Build the Responsiveness page** — replace placeholder with the full UI (cards, chart, tabs, auto-refresh).
3. **Extend the Dashboard widget** — add Remaining Yesterday + Oldest Ticket rows to `NewTicketsCounter`.

---

## Considerations Before We Start

- **Zendesk API rate limits**: The Search API is rate-limited to ~5 requests/minute per account. This function makes ~8-10 search calls (4-5 per instance). We may need to stagger or cache results. The edge function will cache in a DB table (`sla_responsiveness_cache`) with a 5-minute TTL to avoid hitting limits on every page load.
- **Resolution time data availability**: Zendesk only provides metric data for tickets that have been responded to or solved. New/unresponded tickets won't have resolution data yet.
- **Ticket volume for distribution**: If there are many solved tickets per day, we may need to paginate the metrics fetch. We'll cap at the most recent 200 solved tickets for the distribution chart.

Shall I proceed with Step 1 (the edge function)?

