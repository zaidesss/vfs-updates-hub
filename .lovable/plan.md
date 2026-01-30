

# Rolling 2-Week Dashboard with Automatic Archive

## Overview

Implement a **rolling 2-week window** (Monday-Sunday weeks) for the Ticket Logs dashboard that:
1. Always shows **previous week + current week**
2. Automatically **exports** logs older than the displayed range to storage
3. Automatically **deletes** those archived logs from the database
4. Runs cleanup on a **weekly schedule** (every Monday)

---

## Week Logic (Monday-Sunday)

Based on today (Friday, January 30, 2026):
- **Current week**: Mon 1/26 → Sun 2/1
- **Next week**: Mon 2/2 → Sun 2/8
- **Dashboard shows**: 1/26 - 2/8 (current + next partial)

When Monday 2/9 arrives:
- **Previous week**: Mon 2/2 → Sun 2/8
- **Current week**: Mon 2/9 → Sun 2/15
- **Dashboard shows**: 2/2 - 2/15
- **Archive**: Everything before 2/2

---

## Implementation Steps

### Step 1: Update Date Calculation Logic

**File:** `src/lib/ticketLogsApi.ts`

Add a helper function to calculate the rolling 2-week window:

```text
function getRollingTwoWeekRange() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, etc.
  
  // Calculate Monday of current week
  // If today is Sunday (0), go back 6 days; otherwise go back (dayOfWeek - 1) days
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const currentWeekMonday = new Date(today);
  currentWeekMonday.setDate(today.getDate() - daysFromMonday);
  
  // Previous week's Monday (7 days before current Monday)
  const previousWeekMonday = new Date(currentWeekMonday);
  previousWeekMonday.setDate(currentWeekMonday.getDate() - 7);
  
  // Current week's Sunday (6 days after current Monday)
  const currentWeekSunday = new Date(currentWeekMonday);
  currentWeekSunday.setDate(currentWeekMonday.getDate() + 6);
  
  return {
    startDate: format(previousWeekMonday, 'yyyy-MM-dd'),
    endDate: format(currentWeekSunday, 'yyyy-MM-dd'),
    displayLabel: `${format(previousWeekMonday, 'M/d')} - ${format(currentWeekSunday, 'M/d')}`
  };
}
```

Update `fetchDashboardData` to use this rolling window instead of static 14 days.

### Step 2: Update Dashboard Badge

**File:** `src/components/ticket-logs/TicketDashboard.tsx`

Change the badge to show the dynamic date range (e.g., "1/26 - 2/8").

### Step 3: Update Cleanup Edge Function

**File:** `supabase/functions/cleanup-ticket-logs/index.ts`

Modify the cutoff logic to use the start of the previous week (Monday) as the archive boundary:

```text
// Calculate previous week's Monday as the cutoff
const today = new Date();
const dayOfWeek = today.getDay();
const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
const currentWeekMonday = new Date(today);
currentWeekMonday.setDate(today.getDate() - daysFromMonday);
const previousWeekMonday = new Date(currentWeekMonday);
previousWeekMonday.setDate(currentWeekMonday.getDate() - 7);

// Archive anything BEFORE previous week's Monday
const cutoffDate = previousWeekMonday.toISOString();
```

### Step 4: Schedule Weekly Cleanup (Database)

Add a cron job to run every Monday at 1:00 AM EST (6:00 AM UTC):

```sql
-- Enable pg_cron and pg_net extensions if not already enabled
-- Schedule weekly cleanup every Monday at 6 AM UTC
SELECT cron.schedule(
  'weekly-ticket-logs-cleanup',
  '0 6 * * 1',
  $$
  SELECT net.http_post(
    url:='https://rsjjvgyobtazxgeedmvi.supabase.co/functions/v1/cleanup-ticket-logs',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer [service_role_key]"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
```

---

## Archive File Access

Archived files are stored in the **`ticket-archives`** storage bucket with names like:
- `ticket-logs-archive-2026-02-03.json`

To access these files, you can view them in your Lovable Cloud backend storage section.

---

## File Changes Summary

| File | Changes |
|------|---------|
| `src/lib/ticketLogsApi.ts` | Add `getRollingTwoWeekRange()` helper; update `fetchDashboardData` to use rolling window; export the range for UI |
| `src/components/ticket-logs/TicketDashboard.tsx` | Receive and display dynamic date range in badge |
| `supabase/functions/cleanup-ticket-logs/index.ts` | Update cutoff logic to use Monday-based week calculation |
| Database migration | Add cron job for weekly cleanup |

---

## Optional Enhancement

Would you like me to add an **Archive Viewer** section to the Ticket Logs page where admins can:
- See a list of available archive files
- Download archive files directly

