

# SLA Responsiveness: Historical Charts (All Time / Weekly / Daily)

## Overview

Add historical tracking starting Feb 26, 2026, with three chart views (All Time, Weekly, Daily) showing ZD1 and ZD2 side-by-side. This requires a database table for daily snapshots, a backfill function, a daily cron job, and a redesigned frontend.

## Step 1: Create `sla_daily_snapshots` table

Database migration to store daily metrics per Zendesk instance:

```sql
CREATE TABLE public.sla_daily_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  zd_instance text NOT NULL CHECK (zd_instance IN ('ZD1', 'ZD2')),
  total_new integer NOT NULL DEFAULT 0,
  total_responded integer NOT NULL DEFAULT 0,
  remaining_unanswered integer NOT NULL DEFAULT 0,
  avg_first_reply_minutes integer,
  avg_full_resolution_minutes integer,
  distribution jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE (date, zd_instance)
);

ALTER TABLE public.sla_daily_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read snapshots"
  ON public.sla_daily_snapshots FOR SELECT TO authenticated USING (true);
```

Columns: date (EST), instance, total new tickets, responded, remaining, avg first reply, avg full resolution, resolution distribution buckets as JSONB.

## Step 2: Create `backfill-sla-snapshots` edge function

A one-time backfill function that iterates each day from `2026-02-26` to yesterday (in EST), querying Zendesk for each day per instance:
- `type:ticket created>={date} created<{next_date}` → total_new
- `type:ticket status>new created>={date} created<{next_date}` → total_responded  
- `type:ticket status:new created>={date} created<{next_date}` → remaining
- Fetch resolution metrics (solved tickets per day) for avg first reply and full resolution times + distribution

Inserts rows into `sla_daily_snapshots` with `ON CONFLICT DO NOTHING` to avoid duplicates. Rate-limited with delays between days to avoid Zendesk API limits.

## Step 3: Create `snapshot-sla-daily` edge function + cron

A lightweight daily function (runs at 11:59 PM EST via cron) that snapshots the current day's data for both ZD1 and ZD2 into `sla_daily_snapshots`. Same queries as the backfill but for a single day.

Cron schedule: `55 3 * * *` (3:55 AM UTC = 11:55 PM EST, capturing end-of-day)

## Step 4: Update `slaResponsivenessApi.ts`

Add a new hook `useSlaHistory()` that reads from `sla_daily_snapshots` directly via Supabase client:
- Fetches all rows `WHERE date >= '2026-02-26'` ordered by date
- Returns typed array of daily snapshots
- Provides helper functions to aggregate into weekly buckets (Mon-Sun)

## Step 5: Redesign Responsiveness page

Keep existing real-time cards at the top. Below them, add a new tabbed section:

**Tabs: All Time | Weekly | Daily**

### All Time tab
- Line/bar chart showing total new tickets per day since Feb 26, with ZD1 and ZD2 as separate colored bars (side-by-side grouped bar chart)
- Summary cards: Total tickets since Feb 26, avg daily volume, avg first reply, avg resolution

### Weekly tab  
- Bar chart with weekly summary bars (Mon-Sun grouped), ZD1/ZD2 side-by-side
- Click a week bar to drill down into daily view for that week
- Table below with weekly totals: New, Responded, Remaining, Avg FRT, Avg Resolution

### Daily tab
- Week selector (defaulting to current week)
- Daily bar chart for the selected week, ZD1/ZD2 side-by-side
- Table with daily breakdown: Date, New, Responded, Remaining, Avg FRT, Avg Resolution, Distribution

All charts use Recharts (already installed). ZD1 uses one color, ZD2 another.

## Implementation Order
1. Create database table (migration)
2. Create backfill edge function
3. Create daily snapshot edge function + cron
4. Update API hook (`useSlaHistory`)
5. Build All Time chart section
6. Build Weekly chart section  
7. Build Daily chart section
8. Test end-to-end

