

# Plan: Fix Portal/Upwork Hours Display + Track First Upwork Time

## Problem Summary

Based on my investigation, there are **3 issues** to fix plus **1 new feature** to add:

### Issues Identified

| Issue | Root Cause | Impact |
|-------|-----------|--------|
| Portal Hours not showing for all users | Both Portal and Upwork hour sections are wrapped in `hasUpworkContract` check | Agents without Upwork contracts cannot see their Portal logged hours |
| Upwork Hours not showing even when contract exists | Dashboard reads `upwork_contract_id` from `agent_directory` which is NULL, but it exists in `agent_profiles` | Data sync mismatch between tables |
| Hours sections missing entirely | Conditional rendering logic too restrictive | UI appears broken |

### New Feature Request

**Track First Upwork Time Start**: Display when the user first enabled Upwork time tracking each day (similar to how Portal shows login time).

---

## Implementation Plan

### Step 1: Fix Dashboard to Read Upwork Contract ID from Source of Truth

**File:** `src/lib/agentDashboardApi.ts`

Currently, `fetchDashboardProfile` reads from `agent_directory`. We need to also check `agent_profiles` for `upwork_contract_id` since that's where it's stored:

- Modify the query to fetch `upwork_contract_id` from `agent_profiles` table (source of truth)
- Use `agent_profiles.upwork_contract_id` as the primary source, falling back to `agent_directory` for backwards compatibility

### Step 2: Fix DailyWorkTracker Conditional Rendering

**File:** `src/components/dashboard/DailyWorkTracker.tsx`

Update the rendering logic:

- **Portal Hours**: Always show (calculated from login/logout events)
- **Upwork Hours**: Only show when `hasUpworkContract` is true
- This ensures all agents see their Portal hours while Upwork-specific columns appear only for contracted agents

### Step 3: Create Database Table for Upwork Daily Time Logs

**Migration:** Create `upwork_daily_logs` table

```sql
CREATE TABLE upwork_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id TEXT NOT NULL,
  agent_email TEXT NOT NULL,
  date DATE NOT NULL,
  first_cell_time TIME,          -- Time tracking started
  last_cell_time TIME,           -- Time tracking ended  
  total_cells INTEGER DEFAULT 0, -- Number of 10-min cells
  total_hours NUMERIC(5,2),      -- Calculated hours
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contract_id, date)
);
```

This stores:
- The first time slot when tracking started
- The last time slot when tracking ended
- Total tracked time for historical reference

### Step 4: Update Edge Function to Extract and Store First/Last Cell Times

**File:** `supabase/functions/fetch-upwork-time/index.ts`

The current GraphQL query already fetches `workDiary.cells`. We need to:

1. Request additional fields from cells if available (like index/position)
2. Calculate first/last tracking times from cell positions (each cell = 10 min slot)
3. Save the data to `upwork_daily_logs` table
4. Return `firstCellTime` in the response

### Step 5: Update Dashboard to Display Upwork Start Time

**Files:** 
- `src/components/dashboard/DailyWorkTracker.tsx`
- `src/lib/agentDashboardApi.ts`
- `src/pages/AgentDashboard.tsx`

Add new UI elements:
- Show "Upwork Start: 8:00 AM" similar to Portal login time
- Fetch and display the first tracking time from database or API response

---

## Technical Details

### Database Changes

| Table | Action | Description |
|-------|--------|-------------|
| `upwork_daily_logs` | CREATE | Store daily Upwork tracking data including start/end times |

### File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/lib/agentDashboardApi.ts` | Modify | Fetch `upwork_contract_id` from `agent_profiles` instead of just `agent_directory` |
| `src/components/dashboard/DailyWorkTracker.tsx` | Modify | 1) Always show Portal Hours, 2) Add Upwork Start Time display |
| `supabase/functions/fetch-upwork-time/index.ts` | Modify | Calculate and return first cell time, store to database |
| `src/pages/AgentDashboard.tsx` | Modify | Pass new upwork start time data to component |

### Upwork API Time Calculation

The Upwork Work Diary divides each day into 10-minute cells (144 cells per day). The first cell at index 0 represents 00:00 (midnight), and each subsequent cell adds 10 minutes:

- Cell index 0 = 00:00
- Cell index 48 = 08:00 (start of typical workday)
- Cell index 102 = 17:00

By identifying the minimum cell index in the returned data, we can calculate the first tracking start time.

---

## Verification Steps

After implementation:

1. Navigate to Agent Dashboard for an agent WITH Upwork contract
   - Should see: Tickets, Avg Gap, Portal Time, Upwork Time, Upwork Start
2. Navigate to Agent Dashboard for an agent WITHOUT Upwork contract  
   - Should see: Tickets, Avg Gap, Portal Time only
3. Check database for stored Upwork daily logs
4. Verify times match between Upwork dashboard and Portal display

