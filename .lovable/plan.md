

# Step 2: Create Cron Job for Weekly Zendesk Metrics Fetch

## Schedule Change
- **Original**: Monday at 2 AM EST
- **Updated**: Tuesday at 2 AM EST (7 AM UTC)

This ensures all data from the previous week (Monday-Sunday) has been fully processed before the metrics computation runs.

## Cron Expression
```
0 7 * * 2
```
- `0` - Minute 0
- `7` - Hour 7 (UTC) = 2 AM EST
- `*` - Any day of month
- `*` - Any month
- `2` - Tuesday (0=Sunday, 1=Monday, 2=Tuesday)

## SQL to Execute

```sql
SELECT cron.schedule(
  'weekly-zendesk-metrics-fetch',
  '0 7 * * 2',
  $$
  SELECT net.http_post(
    url := 'https://rsjjvgyobtazxgeedmvi.supabase.co/functions/v1/fetch-zendesk-metrics',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzamp2Z3lvYnRhenhnZWVkbXZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNzQ0MDEsImV4cCI6MjA4MjY1MDQwMX0.eKpuoZMa9R10NLdJkG7jbNgKKNZPm7z4arog-yjUljk'
    ),
    body := '{"scheduled": true}'::jsonb
  ) AS request_id;
  $$
);
```

## What This Does
1. Every Tuesday at 2 AM EST, the cron job triggers
2. It calls the `fetch-zendesk-metrics` edge function with `{"scheduled": true}`
3. The edge function will:
   - Calculate the previous week's date range (Monday-Sunday)
   - Fetch Zendesk Talk and Chat data for all agents
   - Compute AHT and FRT metrics
   - Cache results in `zendesk_agent_metrics` table

## Next Steps After This
- **Step 3**: Update the edge function with full Zendesk API integration
- **Step 4**: Update scorecard API with save/fetch functions
- **Step 5**: Update TeamScorecard page with Save button

