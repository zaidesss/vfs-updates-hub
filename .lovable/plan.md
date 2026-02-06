

# Fix: Create Missing Cron Jobs for EOD & Weekly Analytics

## Current Status

The edge functions are fully implemented and working, but the **scheduled cron jobs were never created**. Currently:

- EOD analytics only runs when someone views the Agent Reports page (silent mode - no notifications)
- Weekly analytics edge function exists but is never triggered automatically

---

## Required Cron Jobs

| Job Name | Schedule (UTC) | Schedule (EST) | Function |
|----------|----------------|----------------|----------|
| `eod-analytics-daily` | `59 4 * * *` | 11:59 PM EST | `generate-eod-analytics` |
| `weekly-analytics-monday` | `0 5 * * 1` | Monday 12:00 AM EST | `generate-weekly-analytics` |

---

## SQL to Execute

```sql
-- EOD Analytics: Daily at 11:59 PM EST (4:59 AM UTC)
SELECT cron.schedule(
  'eod-analytics-daily',
  '59 4 * * *',
  $$
  SELECT net.http_post(
    url:='https://rsjjvgyobtazxgeedmvi.supabase.co/functions/v1/generate-eod-analytics',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzamp2Z3lvYnRhenhnZWVkbXZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNzQ0MDEsImV4cCI6MjA4MjY1MDQwMX0.eKpuoZMa9R10NLdJkG7jbNgKKNZPm7z4arog-yjUljk"}'::jsonb,
    body:='{"date": null}'::jsonb
  ) AS request_id;
  $$
);

-- Weekly Analytics: Monday at 12:00 AM EST (5:00 AM UTC)
SELECT cron.schedule(
  'weekly-analytics-monday',
  '0 5 * * 1',
  $$
  SELECT net.http_post(
    url:='https://rsjjvgyobtazxgeedmvi.supabase.co/functions/v1/generate-weekly-analytics',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzamp2Z3lvYnRhenhnZWVkbXZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNzQ0MDEsImV4cCI6MjA4MjY1MDQwMX0.eKpuoZMa9R10NLdJkG7jbNgKKNZPm7z4arog-yjUljk"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
```

---

## After This Change

| Report | Trigger | Slack/Email |
|--------|---------|-------------|
| EOD Team Analytics | 11:59 PM EST daily (auto) | ✅ Yes |
| EOD Team Analytics | Admin views page (manual) | ❌ No (silent) |
| Weekly Team Analytics | Monday 12:00 AM EST (auto) | ✅ Yes |
| Per-Agent Analytics | User views page (manual) | ❌ N/A (no notifications) |

---

## Summary

Only the cron job SQL needs to be executed. All code is already in place and working correctly.

