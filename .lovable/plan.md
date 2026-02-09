

# Fix: Team Status Board Visibility for All Users

## Problem

Regular (non-admin) users can only see **themselves** on the Team Status Board because the data is fetched directly from `agent_profiles`, which has RLS restricting regular users to their own row only.

## Root Cause

- `teamStatusApi.ts` queries `agent_profiles` for schedule data (shift schedules, OT schedules, day off, break schedule, etc.)
- RLS on `agent_profiles`: regular users can only SELECT their own row
- A security-definer view `agent_profiles_team_status` exists that bypasses RLS, but it only exposes `id, email, full_name, position` -- missing all schedule columns

## Solution

Two changes needed:

### Step 1: Database Migration -- Expand the view

Replace the existing `agent_profiles_team_status` view to include the schedule-related columns needed by the Team Status Board. These are **non-sensitive operational data** (shift times, break times, days off):

```sql
CREATE OR REPLACE VIEW public.agent_profiles_team_status AS
SELECT 
  id, email, full_name, position, employment_status,
  day_off, break_schedule,
  mon_schedule, tue_schedule, wed_schedule, thu_schedule, 
  fri_schedule, sat_schedule, sun_schedule,
  mon_ot_schedule, tue_ot_schedule, wed_ot_schedule, thu_ot_schedule, 
  fri_ot_schedule, sat_ot_schedule, sun_ot_schedule
FROM agent_profiles;
```

This view has no `security_invoker`, so it acts as a security definer and bypasses agent_profiles RLS -- allowing all authenticated users to see all team members' schedules. No PII (addresses, government IDs, emergency contacts) is exposed.

### Step 2: Code Change -- Use the view instead of the table

**File: `src/lib/teamStatusApi.ts`**

Change the query from:
```typescript
supabase.from('agent_profiles').select(...)
```
to:
```typescript
supabase.from('agent_profiles_team_status').select(...)
```

Same columns, same filters -- just reading from the view instead of the base table. This is the only code file that needs to change.

## What Does NOT Change

- `profile_status` table: already has a policy allowing all authenticated users to view all statuses
- `leave_requests` table: already has a policy allowing all users to view pending/approved requests
- No changes to the UI components (`StatusCard`, `TeamStatusBoard`, `LiveActivityFeed`)
- Admin/HR dashboard link visibility still controlled by role checks in the frontend

## Security

- The expanded view still excludes sensitive PII columns (address, government IDs, emergency contacts, bank details, etc.)
- Only operational schedule data is added
- Base table RLS remains unchanged -- direct queries to `agent_profiles` still restricted

