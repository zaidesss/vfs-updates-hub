# Team Scorecard - Zendesk Metrics + Save Feature

## ✅ Completed Steps

### Step 1: Database Migration
- Created `saved_scorecards` table with unique constraint
- Added unique constraint to `zendesk_agent_metrics` for upsert
- Enabled `pg_cron` and `pg_net` extensions
- Set up RLS policies (public SELECT, admin-only write)

### Step 2: Cron Job
- Created `weekly-zendesk-metrics-fetch` scheduled job
- Runs every **Tuesday at 2 AM EST** (7 AM UTC)
- Ensures previous week data is fully processed

### Step 3: Edge Function
- Updated `fetch-zendesk-metrics` with:
  - Scheduled mode (`{"scheduled": true}`)
  - Batch processing (10 agents/batch, 5s delays)
  - Zendesk Talk & Chat API integration
  - Minimum date check (Jan 26, 2026)
  - Upsert to cache table

### Step 4: Scorecard API
- Added `saveScorecard()` function
- Added `fetchSavedScorecard()` function
- Added `isWeekSaved()` check
- Added `fetchZendeskMetrics()` for cached AHT/FRT
- Updated `fetchWeeklyScorecard()` to merge saved/live data
- Added `isSaved` flag to AgentScorecard type

### Step 5: TeamScorecard Page
- Added Save button (admin/super_admin only)
- Added "Saved" badge when week is frozen
- Added per-agent saved indicator
- Added warning for old unsaved weeks
- Added warning for weeks before Jan 26, 2026
- Updated legend to include "Saved (frozen)" indicator

## Summary

The system now:
1. **Weekly Cron**: Every Tuesday 2 AM EST, fetches Zendesk Talk/Chat metrics
2. **Caches Data**: Stores AHT/FRT in `zendesk_agent_metrics` table
3. **Displays Metrics**: Shows cached values in scorecard (or "Pending" if not yet fetched)
4. **Save Feature**: Admins can permanently freeze scorecard values
5. **Data Preservation**: Saved data persists beyond 2-week log retention
