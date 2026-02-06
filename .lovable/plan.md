

# EOD/Weekly Analytics & Per-Agent Performance Dashboard

## Problem Summary

1. **EOD notifications spam**: The `generate-eod-analytics` edge function sends Slack/Email notifications on every page view because the UI calls it directly to fetch data
2. **Wrong timing**: No dedicated schedule exists for EOD reports at 11:59 PM EST
3. **Missing weekly reports**: No weekly team analytics exist
4. **Missing per-agent analytics**: Current `AgentAnalyticsPanel` only shows incident history, not daily/weekly performance metrics

---

## Solution Overview

| Feature | Implementation |
|---------|---------------|
| EOD Report @ 11:59 PM EST | Add `silent` mode to edge function + new cron job |
| Weekly Report @ Monday 12 AM EST | New edge function + cron job |
| Per-Agent Analytics | New component with day/week selector |

---

## Technical Implementation

### Part 1: Fix EOD Notifications (Stop Page-View Spam)

**File: `supabase/functions/generate-eod-analytics/index.ts`**

Add `silent` flag support to skip notifications when called from UI:

```typescript
// Parse request body
let targetDate: Date;
let silent = false;
try { 
  const body = await req.json(); 
  targetDate = body.date ? new Date(body.date) : new Date(Date.now() - 86400000);
  silent = body.silent === true;
} catch { 
  targetDate = new Date(Date.now() - 86400000); 
}

// Wrap notifications in conditional (lines 138-159)
if (!silent) {
  // Send Slack, Email, In-App notifications
}
```

**File: `src/lib/agentReportsApi.ts`**

Update `fetchEODAnalytics` to pass `silent: true`:

```typescript
body: JSON.stringify({ date, silent: true }),
```

---

### Part 2: EOD Report Cron Job @ 11:59 PM EST

**Schedule**: `59 4 * * *` (4:59 AM UTC = 11:59 PM EST)

This will call `generate-eod-analytics` WITHOUT the silent flag, triggering notifications for **today's** data (same day, end of day).

**SQL to add cron job:**
```sql
SELECT cron.schedule(
  'eod-analytics-daily',
  '59 4 * * *',
  $$
  SELECT net.http_post(
    url:='https://rsjjvgyobtazxgeedmvi.supabase.co/functions/v1/generate-eod-analytics',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer <ANON_KEY>"}'::jsonb,
    body:='{"date": null}'::jsonb
  ) AS request_id;
  $$
);
```

Note: The function will use "today's" date when called at 11:59 PM EST.

---

### Part 3: Weekly Team Analytics

**New Edge Function: `supabase/functions/generate-weekly-analytics/index.ts`**

Aggregates the entire previous week (Mon-Sun) data:
- Attendance summary (total active days, avg on-time rate, avg full-shift rate)
- Productivity summary (total tickets, avg quota rate, avg gap)
- Time summary (total hours, avg hours per day)
- Compliance summary (total incidents, clean rate)
- Top performers / bottom performers lists

**Cron Schedule**: `0 5 * * 1` (5:00 AM UTC = 12:00 AM EST on Monday)

---

### Part 4: Per-Agent Analytics Panel

**New Component: `src/components/agent-reports/IndividualAgentAnalytics.tsx`**

Features:
- Agent selector dropdown (for admins) or auto-select current user
- Date/Week toggle mode
- Date picker (single date or week picker)
- Shows individual agent metrics:
  - Attendance: login time, logout time, hours worked
  - Productivity: tickets by type, quota progress, avg gap
  - Compliance: incidents for the period
  - Time tracking: break duration, bio usage

**Integration points:**
- Uses existing `ticket_logs`, `profile_events`, `agent_reports`, `ticket_gap_daily` tables
- Fetches data via existing APIs or new RPC function

---

## Summary of Changes

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/generate-weekly-analytics/index.ts` | Weekly team analytics edge function |
| `src/components/agent-reports/IndividualAgentAnalytics.tsx` | Per-agent performance panel with date/week selector |

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/generate-eod-analytics/index.ts` | Add `silent` flag support |
| `src/lib/agentReportsApi.ts` | Pass `silent: true` from UI calls; add weekly analytics fetch |
| `src/pages/AgentReports.tsx` | Add individual agent analytics section |

### Database Changes

| Type | Details |
|------|---------|
| Cron Job | `eod-analytics-daily` at 11:59 PM EST |
| Cron Job | `weekly-analytics-monday` at 12:00 AM EST Monday |

---

## Notification Schedule After Fix

| Report | When | Slack | Email | In-App |
|--------|------|-------|-------|--------|
| EOD Team Analytics | 11:59 PM EST daily | ✓ | ✓ | ✓ |
| Weekly Team Analytics | Monday 12:00 AM EST | ✓ | ✓ | ✓ |
| UI Panel View | On demand | ✗ | ✗ | ✗ |

---

## Expected Result

1. **No more Slack spam** - UI views use silent mode
2. **EOD report at 11:59 PM EST** - Same-day summary delivered end of each day
3. **Weekly report on Mondays** - Previous week summary delivered at midnight
4. **Per-agent analytics** - Admins/HR can view individual agent performance with day/week granularity

