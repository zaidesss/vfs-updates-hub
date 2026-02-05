

# Implementation Plan: Portal Optimizations

This plan covers performance optimizations, maintainability improvements, and feature enhancements across the portal. The work is organized into logical phases.

---

## Phase 1: Database RPC Consolidation

### 1.1 Team Scorecard RPC Function

**Problem**: `TeamScorecard.tsx` makes 8+ parallel database calls per load.

**Solution**: Create a PostgreSQL function `get_weekly_scorecard_data` that consolidates:
- Eligible agents fetch
- Ticket logs aggregation
- QA evaluations averages
- Profile events (login counts)
- Leave requests
- Zendesk metrics
- Saved scorecards
- Revalida attempts

**Database Migration**:
```sql
CREATE OR REPLACE FUNCTION get_weekly_scorecard_data(
  p_week_start DATE,
  p_week_end DATE,
  p_support_type TEXT
) RETURNS TABLE (
  agent_id UUID,
  agent_email TEXT,
  agent_name TEXT,
  position TEXT,
  -- ... all scorecard fields
) AS $$ ... $$
```

**Files to modify**:
- Create new database function via migration
- Update `src/lib/scorecardApi.ts` to use RPC call instead of multiple queries

---

### 1.2 Agent Dashboard RPC Function

**Problem**: `AgentDashboard.tsx` makes 6+ sequential calls in `loadDashboardData`.

**Solution**: Create `get_agent_dashboard_data` RPC:
- Profile + status in one call
- Week events consolidated
- Ticket counts + gap data combined

**Files to modify**:
- Create database function via migration
- Update `src/lib/agentDashboardApi.ts` to add consolidated RPC function
- Update `src/pages/AgentDashboard.tsx` to use new function

---

## Phase 2: QA Evaluations Server-Side Filtering

**Problem**: `fetchQAEvaluations` loads ALL evaluations, then filters client-side.

**Solution**: Add server-side date filtering parameters.

**Changes to `src/lib/qaEvaluationsApi.ts`**:
```typescript
export async function fetchQAEvaluations(filters?: {
  year?: number;
  month?: number;
  weekStart?: string;
  agentEmail?: string;
}): Promise<QAEvaluation[]>
```

**Changes to `src/pages/QAEvaluations.tsx`**:
- Pass date filters to query
- Update query key to include filter parameters
- Remove client-side date filtering logic

---

## Phase 3: Leave Request Audit Log Enhancement

**Problem**: No visible admin action audit trail in the UI.

**Solution**: Add a dedicated "Actions Log" tab/section showing:
- Status changes with timestamps
- Who made the decision
- Any remarks added

**New Component**: `src/components/leave/LeaveAuditLog.tsx`
- Display `leave_request_history` entries
- Show actor, action type, timestamp
- Format changes in human-readable way

**Update**: `src/pages/LeaveRequest.tsx`
- Add audit log dialog/tab for admins viewing requests
- Show history when clicking on a request

---

## Phase 4: Scorecard Export Functionality

**Problem**: No way to export scorecard data for reporting.

**Solution**: Add CSV/Excel export button to Team Scorecard.

**New utility**: `src/lib/exportUtils.ts`
```typescript
export function exportToCSV(data: any[], filename: string): void
export function downloadCSV(csvContent: string, filename: string): void
```

**Update**: `src/pages/TeamScorecard.tsx`
- Add Export button next to Save Scorecard
- Export filtered/displayed data as CSV
- Include all visible columns

---

## Phase 5: Real-Time Team Activity Feed

**Problem**: No live view of agent status changes.

**Solution**: Create a lightweight real-time activity component.

**New Component**: `src/components/team/LiveActivityFeed.tsx`
- Subscribe to `profile_events` and `profile_status` changes
- Show last 10-20 status changes
- Auto-refresh with Supabase Realtime

**Integration Points**:
- Add to Team Status page sidebar
- Optional: Add to admin dashboard

---

## Phase 6: Edge Function Consolidation

**Problem**: 42 separate edge functions, many with duplicate code patterns.

**Solution**: Create a unified notification dispatcher.

**Note**: This is a larger refactoring effort. For now, we'll:
1. Document the consolidation pattern
2. Fix the import patterns to use `npm:` specifiers per project standards
3. Update functions that use deprecated `esm.sh` imports

**Functions to update** (fix imports only, minimal changes):
- `send-notifications/index.ts`
- `send-qa-notification/index.ts`
- Other functions using `https://esm.sh/` imports

---

## Phase 7: Mock Data and Code Cleanup

### 7.1 Remove Unused Mock Data

**Problem**: `src/lib/mockData.ts` contains stale demo data.

**Solution**: 
- Remove `USE_MOCK_DATA` flag checks from `src/lib/api.ts`
- Remove mock fallbacks (DB is now stable)
- Keep `mockData.ts` as minimal reference only

**Files to modify**:
- `src/lib/api.ts` - Remove mock fallback logic
- `src/lib/mockData.ts` - Minimize or deprecate

### 7.2 Standardize API Response Types

**Problem**: Inconsistent `{ data, error }` vs direct returns.

**Solution**: Ensure all API functions return `ApiResponse<T>`:
```typescript
interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
```

**Files to audit**:
- `src/lib/scorecardApi.ts`
- `src/lib/agentDashboardApi.ts`
- `src/lib/qaEvaluationsApi.ts`

---

## Implementation Order (Step by Step)

We'll implement these one at a time, verifying each before proceeding:

1. **Step 1**: QA Evaluations server-side filtering (simplest, high impact)
2. **Step 2**: Mock data cleanup (low risk)
3. **Step 3**: Scorecard CSV export (user-facing feature)
4. **Step 4**: Leave Request audit log enhancement
5. **Step 5**: Real-time activity feed
6. **Step 6**: Edge function import fixes
7. **Step 7**: Team Scorecard RPC (larger change)
8. **Step 8**: Agent Dashboard RPC (larger change)

---

## Files Summary

| File | Action | Phase |
|------|--------|-------|
| `src/lib/qaEvaluationsApi.ts` | Add filtered fetch function | 2 |
| `src/pages/QAEvaluations.tsx` | Pass filters to query | 2 |
| `src/lib/api.ts` | Remove mock fallbacks | 7 |
| `src/lib/mockData.ts` | Minimize content | 7 |
| `src/lib/exportUtils.ts` | Create new file | 4 |
| `src/pages/TeamScorecard.tsx` | Add export button | 4 |
| `src/components/leave/LeaveAuditLog.tsx` | Create new component | 3 |
| `src/pages/LeaveRequest.tsx` | Add audit log UI | 3 |
| `src/components/team/LiveActivityFeed.tsx` | Create new component | 5 |
| `supabase/functions/*/index.ts` | Fix imports | 6 |
| `supabase/migrations/` | Add RPC functions | 1 |
| `src/lib/scorecardApi.ts` | Add RPC call | 1 |
| `src/lib/agentDashboardApi.ts` | Add RPC call | 1 |

---

## Acceptance Criteria

### QA Evaluations Filtering
- Query only fetches data for selected date range
- Page loads faster for current month view
- Network payload reduced by ~80%

### Export Functionality
- CSV downloads with correct formatting
- Includes all visible columns
- Filename includes date range

### Leave Audit Log
- Shows all status changes chronologically
- Displays actor name and timestamp
- Accessible from request detail view

### Real-time Feed
- Updates within 2 seconds of status change
- Shows agent name, old status, new status
- Scrollable list of recent events

### Code Cleanup
- No mock data fallbacks in production paths
- Consistent API response patterns
- Edge functions use `npm:` imports

