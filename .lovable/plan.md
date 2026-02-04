

# Updated Plan: Scheduled Weekly Zendesk Metrics Fetch + Saved Scorecard

## Summary
Update the scorecard system to:
1. **Scheduled Weekly Fetch**: Run Zendesk metrics computation every Monday at 2 AM EST instead of on-demand
2. **Batch Processing**: Respect Zendesk API rate limits with smart batching
3. **Saved Scorecard**: Allow admins to permanently save/freeze scorecard values
4. **Minimum Date**: Jan 26, 2026 - no metrics computed before this date

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        SCHEDULED FETCH (Monday 2 AM EST)            │
│                                                                     │
│  ┌──────────────────┐      ┌───────────────────┐                    │
│  │ Cron Job Trigger │ ──▶  │ fetch-zendesk-    │                    │
│  │ (pg_cron)        │      │ metrics (Edge Fn) │                    │
│  └──────────────────┘      └───────────────────┘                    │
│                                     │                               │
│            ┌────────────────────────┼────────────────────────┐      │
│            ▼                        ▼                        ▼      │
│   ┌────────────────┐    ┌────────────────┐    ┌──────────────────┐  │
│   │ Zendesk Talk   │    │ Zendesk Chat   │    │ zendesk_agent_   │  │
│   │ API (ZD1/ZD2)  │    │ API (ZD1/ZD2)  │    │ metrics (cache)  │  │
│   └────────────────┘    └────────────────┘    └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        SCORECARD PAGE                               │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Week: Jan 26 - Feb 1, 2026    Support: Hybrid   [Save ▼]   │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  Agent Name  │ Prod │ AHT │ QA │ Reliability │ Final Score  │   │
│  │──────────────│──────│─────│────│─────────────│──────────────│   │
│  │  Jane Doe    │ 95%  │ 4:30│ 96 │    100%     │    97.2%     │   │
│  │  (saved)     │      │     │    │             │              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────┐   ┌─────────────────────────────────┐  │
│  │ saved_scorecards table  │   │ Live calculation (falls back   │  │
│  │ (frozen values)         │   │ if not saved)                  │  │
│  └─────────────────────────┘   └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Changes

### New Table: `saved_scorecards` (Frozen/Saved Values)

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| week_start | date | Monday of the week |
| week_end | date | Sunday of the week |
| support_type | text | 'Hybrid Support', etc. |
| agent_email | text | Agent's email |
| agent_name | text | Full name at time of save |
| productivity | numeric | Frozen productivity % |
| productivity_count | integer | Frozen ticket count |
| call_aht_seconds | numeric | Frozen Call AHT |
| chat_aht_seconds | numeric | Frozen Chat AHT |
| chat_frt_seconds | numeric | Frozen Chat FRT |
| qa | numeric | Frozen QA score |
| revalida | numeric | Frozen Revalida (if available) |
| reliability | numeric | Frozen reliability % |
| ot_productivity | numeric | Frozen OT productivity |
| final_score | numeric | Frozen final weighted score |
| scheduled_days | integer | Days scheduled that week |
| days_present | integer | Days with LOGIN |
| approved_leave_days | integer | Leave days |
| is_on_leave | boolean | Was on full-week leave |
| saved_by | text | Email of admin who saved |
| saved_at | timestamptz | When saved |
| created_at | timestamptz | |

**RLS**: 
- Everyone can SELECT (view saved scorecards)
- Only admins/super_admins can INSERT/UPDATE (save scorecard)

### Modify Table: `zendesk_agent_metrics`

Add unique constraint for upsert operations:
```sql
ALTER TABLE zendesk_agent_metrics 
ADD CONSTRAINT zendesk_agent_metrics_unique_week 
UNIQUE (agent_email, week_start, week_end);
```

---

## Cron Job Setup

**Schedule**: Every Monday at 7:00 AM UTC (2:00 AM EST)

```sql
SELECT cron.schedule(
  'weekly-zendesk-metrics-fetch',
  '0 7 * * 1',  -- Every Monday at 7 AM UTC (2 AM EST)
  $$
  SELECT net.http_post(
    url := 'https://rsjjvgyobtazxgeedmvi.supabase.co/functions/v1/fetch-zendesk-metrics',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <ANON_KEY>"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  ) AS request_id;
  $$
);
```

---

## Edge Function: `fetch-zendesk-metrics` (Updated)

### Request Modes

**1. Scheduled Mode (Cron Trigger)**
```json
{ "scheduled": true }
```
- Automatically computes metrics for the **previous week**
- Processes all agents in batches to respect rate limits
- Minimum date check: Skip if week_start < Jan 26, 2026

**2. Manual/On-Demand Mode**
```json
{ 
  "weekStart": "2026-01-26", 
  "weekEnd": "2026-02-01",
  "agentEmails": ["agent@example.com"]  // optional
}
```
- Returns cached data if fresh (< 1 hour old)
- Otherwise returns "pending" (requires scheduled run)

### Batch Processing Logic

```typescript
const BATCH_SIZE = 10;  // Agents per batch
const BATCH_DELAY_MS = 5000;  // 5 seconds between batches
const REQUEST_DELAY_MS = 500;  // 500ms between individual API calls

async function processInBatches(agents: Agent[]): Promise<void> {
  for (let i = 0; i < agents.length; i += BATCH_SIZE) {
    const batch = agents.slice(i, i + BATCH_SIZE);
    
    for (const agent of batch) {
      await fetchAgentMetrics(agent);
      await delay(REQUEST_DELAY_MS);
    }
    
    // Delay between batches to stay under rate limit
    if (i + BATCH_SIZE < agents.length) {
      await delay(BATCH_DELAY_MS);
    }
  }
}
```

### Minimum Date Check

```typescript
const MINIMUM_DATE = new Date('2026-01-26');

if (weekStart < MINIMUM_DATE) {
  console.log('Skipping: Week before minimum date (Jan 26, 2026)');
  return { skipped: true, reason: 'before_minimum_date' };
}
```

### Zendesk API Integration

**Talk API (Calls)**:
```typescript
// GET /api/v2/channels/voice/calls.json
// Filters: start_time, end_time
// Compute: AHT = (talk_time + wrap_up_time) / call_count
```

**Chat/Messaging API**:
```typescript
// GET /api/v2/search.json?query=type:ticket channel:chat solved>YYYY-MM-DD
// For each ticket, fetch comments
// FRT = first_agent_reply_time - ticket_created_at
// Chat AHT = total_agent_time / chat_count
```

---

## Frontend Changes

### Save Button (Admin Only)

Location: Upper right of Scorecard page

**Behavior**:
- Only visible to users with admin/super_admin role
- Saves ALL agents' scores for the current week and support type
- Overwrites existing saved data if re-saved
- Shows loading state during save
- Toast notification on success/failure

### Display Logic

```typescript
// Fetch both live and saved data
const liveScorecard = await fetchWeeklyScorecard(weekStart, weekEnd, supportType);
const savedScorecard = await fetchSavedScorecard(weekStart, weekEnd, supportType);

// Merge: Show saved value if exists, otherwise show live
const displayData = liveScorecard.map(live => {
  const saved = savedScorecard.find(s => s.agent_email === live.agent.email);
  return {
    ...live,
    isSaved: !!saved,
    displayValues: saved || live,  // Use saved values if available
  };
});
```

### Visual Indicators

- **Saved Badge**: Small "(saved)" or checkmark icon next to saved rows
- **Unsaved Warning**: If viewing old week with no saved data: "⚠️ Data may be incomplete - backend data expires after 2 weeks"
- **Save Button State**: "Save" → "Saving..." → "Saved ✓"

---

## API Changes: `src/lib/scorecardApi.ts`

### New Functions

```typescript
// Save scorecard for a week (admin only)
export async function saveScorecard(
  weekStart: Date,
  weekEnd: Date,
  supportType: string,
  scorecards: AgentScorecard[],
  savedBy: string
): Promise<void>;

// Fetch saved scorecard (returns null if not saved)
export async function fetchSavedScorecard(
  weekStart: Date,
  weekEnd: Date,
  supportType: string
): Promise<SavedScorecard[] | null>;

// Check if week is saved
export async function isWeekSaved(
  weekStart: Date,
  weekEnd: Date,
  supportType: string
): Promise<boolean>;
```

---

## Implementation Steps

### Step 1: Database Migration
- Create `saved_scorecards` table with RLS
- Add unique constraint to `zendesk_agent_metrics`
- Enable pg_cron and pg_net extensions (if not already)

### Step 2: Create Cron Job
- Schedule weekly fetch for Monday 7 AM UTC

### Step 3: Update Edge Function
- Add scheduled mode support
- Implement Zendesk Talk API integration
- Implement Zendesk Chat/Messaging API integration
- Add batch processing with delays
- Add minimum date check (Jan 26, 2026)

### Step 4: Update Scorecard API
- Add `saveScorecard()` function
- Add `fetchSavedScorecard()` function
- Update display logic to merge live/saved data

### Step 5: Update Scorecard Page
- Add Save button (admin only)
- Add saved indicator badges
- Add unsaved data warning for old weeks
- Implement save confirmation and loading states

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| Database Migration | Create | saved_scorecards table, unique constraint, cron job |
| `supabase/functions/fetch-zendesk-metrics/index.ts` | Modify | Full Zendesk API integration with batch processing |
| `src/lib/scorecardApi.ts` | Modify | Add save/fetch saved scorecard functions |
| `src/pages/TeamScorecard.tsx` | Modify | Add Save button, saved indicators, merge display logic |

---

## Test Week: Jan 26 - Feb 1, 2026

For verification:
1. Manually trigger the edge function with `weekStart: "2026-01-26"` and `weekEnd: "2026-02-01"`
2. Verify data is pulled from Zendesk correctly
3. Compare computed AHT/FRT values with Zendesk Explore reports
4. Test the Save functionality with this week

---

## Rate Limit Safety

| Zendesk Tier | Rate Limit | Our Usage |
|--------------|------------|-----------|
| Essential | 200 req/min | ~20 req/min (with delays) |
| Team | 400 req/min | ~20 req/min (with delays) |
| Professional | 400 req/min | ~20 req/min (with delays) |

With 10 agents per batch, 500ms between requests, and 5s between batches:
- 10 agents × 2 API calls (Talk + Chat) = 20 requests per batch
- 20 requests / 10 seconds = ~120 requests/minute max
- Well within all Zendesk tier limits

---

## Edge Cases

1. **No Zendesk data for agent**: Store null values, still save other metrics
2. **Agent not in agent_directory**: Skip Zendesk metrics, still compute reliability/productivity
3. **Week before Jan 26, 2026**: Show "No data available" message
4. **Saving already-saved week**: Overwrite silently (per user choice)
5. **Viewing old unsaved week**: Show live calculations with warning about potential data loss

