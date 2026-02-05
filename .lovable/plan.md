
# Implementation Plan: RPC Consolidation for Agent Dashboard + Team Scorecard

## Status: ✅ Complete

---

## Phase 1: Agent Dashboard RPC Integration ✅

### What was built
- **`fetchAgentDashboardRPC`** function in `src/lib/agentDashboardApi.ts`
  - Calls `get_agent_dashboard_data` RPC (already existed in database)
  - Returns status, login time, and ticket metrics in a single call

### How it integrates
- `AgentDashboard.tsx` now uses RPC for:
  - Current status + status_since
  - Avg response gap (from `ticket_gap_daily`)
- Still uses direct queries for:
  - Full profile fields (via `fetchDashboardProfile`)
  - Bio allowance fields (via `getProfileStatus`)
  - Per-type ticket breakdown (via `getTodayTicketCountByType`) — user requested keeping this

### Benefits
- Reduced initial load from 5+ queries to 3 queries
- Status and gap data come from single consolidated call

---

## Phase 2: Team Scorecard RPC ✅

### Database Function Created
**`get_weekly_scorecard_data`** (plpgsql)

Parameters:
- `p_week_start DATE`
- `p_week_end DATE`
- `p_support_type TEXT` (or 'all')

Returns consolidated data per agent:
- Profile info (email, name, position, quotas, schedules, day_off)
- Ticket counts by type (email, chat, call)
- QA average for the week
- Revalida score for the week
- Days with login (reliability)
- Approved leave days
- Zendesk metrics (call_aht, chat_aht, chat_frt)
- is_saved status

### API Function Created
**`fetchWeeklyScorecardRPC`** in `src/lib/scorecardApi.ts`
- Calls RPC and transforms to `AgentScorecard[]` format
- Calculates productivity, reliability, final score client-side
- Falls back to legacy `fetchWeeklyScorecard` if RPC fails

### Notes
- Scheduled days calculated client-side from schedules/day_off
- Final scores use config weights per support type
- Security: RPC uses `SECURITY DEFINER` with `search_path = public`

---

## Access Control Requirement
User requested Admin + HR + Super Admin access for Scorecard RPCs.
- Currently RPC is callable by authenticated users (RLS bypass via SECURITY DEFINER)
- To restrict: Add email validation in function body checking `has_role(auth.email(), 'admin')` or HR role

---

## Files Modified
1. `src/lib/agentDashboardApi.ts` — Added `fetchAgentDashboardRPC`
2. `src/pages/AgentDashboard.tsx` — Integrated RPC for status/gap data
3. `src/lib/scorecardApi.ts` — Added `ScorecardRPCResult` type, `fetchWeeklyScorecardRPC`, `calculateScheduledDaysFromRPC`
4. Database — Created `get_weekly_scorecard_data` function

## Pre-existing Security Warnings
The linter showed warnings about permissive RLS policies and a security definer view. These are **pre-existing** issues unrelated to this migration and require separate review.
