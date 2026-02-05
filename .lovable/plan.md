# Implementation Plan: Portal Optimizations

This plan covers performance optimizations, maintainability improvements, and feature enhancements across the portal. The work is organized into logical phases.

---

## Completed Steps

### ✅ Step 1: QA Evaluations Server-Side Filtering
- Added `QAEvaluationFilters` interface to `src/lib/qaEvaluationsApi.ts`
- `fetchQAEvaluations` now accepts year/month/week/agent filters
- `src/pages/QAEvaluations.tsx` passes date filters to query

### ✅ Step 2: Mock Data Cleanup  
- Removed `USE_MOCK_DATA` flag from `src/lib/api.ts`
- Removed mock fallbacks for updates and acknowledgments

### ✅ Step 3: Scorecard CSV Export
- Created `src/lib/exportUtils.ts` with `exportToCSV` and `downloadCSV` functions
- Added Export button to `src/pages/TeamScorecard.tsx`

### ✅ Step 4: Leave Request Audit Log
- Created `src/components/leave/LeaveAuditLog.tsx` component
- Integrated into `src/pages/LeaveRequest.tsx` (replaces old history dialog)
- Shows chronological status changes with actor and timestamp

### ✅ Step 5: Real-Time Activity Feed
- Created `src/components/team/LiveActivityFeed.tsx`
- Integrated into `src/pages/TeamStatusBoard.tsx` (right column)
- Subscribes to `profile_events` via Supabase Realtime

### ✅ Step 6: Agent Dashboard RPC (Partial)
- Created `get_agent_dashboard_data` PostgreSQL function
- Consolidates profile, status, login, and ticket data into single call
- Note: Frontend integration pending (API layer update needed)

---

## Remaining Steps

### 🔲 Step 7: Edge Function Import Fixes
Fix `npm:` import specifiers in edge functions that use deprecated `esm.sh` imports.

**Functions to audit:**
- `supabase/functions/send-notifications/index.ts`
- `supabase/functions/send-qa-notification/index.ts`

### 🔲 Step 8: Team Scorecard RPC
Due to schema complexity (10+ tables, mixed column names), the scorecard RPC requires careful design:
- Join agent_profiles with profile_events via profile_id
- Aggregate ticket_logs, qa_evaluations by email
- Handle leave_requests date overlaps
- Merge zendesk_agent_metrics and saved_scorecards

**Files to modify:**
- Create database function via migration
- Update `src/lib/scorecardApi.ts` to add RPC option
- Update `src/pages/TeamScorecard.tsx` to use new function

### 🔲 Step 9: API Layer Updates for RPC
- Update `src/lib/agentDashboardApi.ts` to call `get_agent_dashboard_data` RPC
- Update `src/pages/AgentDashboard.tsx` to use consolidated function

---

## Files Summary

| File | Action | Status |
|------|--------|--------|
| `src/lib/qaEvaluationsApi.ts` | Add filtered fetch | ✅ Done |
| `src/pages/QAEvaluations.tsx` | Pass filters to query | ✅ Done |
| `src/lib/api.ts` | Remove mock fallbacks | ✅ Done |
| `src/lib/exportUtils.ts` | Create new file | ✅ Done |
| `src/pages/TeamScorecard.tsx` | Add export button | ✅ Done |
| `src/components/leave/LeaveAuditLog.tsx` | Create new component | ✅ Done |
| `src/pages/LeaveRequest.tsx` | Add audit log UI | ✅ Done |
| `src/components/team/LiveActivityFeed.tsx` | Create new component | ✅ Done |
| `src/pages/TeamStatusBoard.tsx` | Add activity feed | ✅ Done |
| `supabase/functions/` | RPC functions | 🔲 Scorecard pending |
| `src/lib/agentDashboardApi.ts` | Add RPC call | 🔲 Pending |

---

## Database Functions Created

### `get_agent_dashboard_data(p_profile_id UUID)`
Returns consolidated agent data including:
- Profile info (name, email, position, quotas)
- Status info (current_status, status_since)
- Login data (latest_login_time, status_counter)
- Ticket counts (week total, today total)
- Gap data (avg_response_gap_seconds)

---

## Notes

- Security linter warnings shown are **pre-existing** RLS policy issues, not from this implementation
- The scorecard RPC is complex due to many table joins; may implement incrementally
- All new components follow existing design patterns and use Tailwind design tokens
