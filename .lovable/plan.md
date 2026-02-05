
# Implementation Plan: Agent Dashboard RPC Integration + Team Scorecard RPC

This plan covers connecting the Agent Dashboard to use the new RPC function, then creating a consolidated Scorecard RPC.

---

## Phase 1: Agent Dashboard RPC Integration

### Current State Analysis
The `get_agent_dashboard_data` RPC consolidates:
- Profile info (email, name, position, quotas, schedules)
- Real-time status (current_status, status_since)
- Login data (latest_login_time, status_counter)
- Ticket metrics (total_tickets_week, total_tickets_today, avg_response_gap_seconds)

However, the RPC is **missing** several fields the dashboard needs:
- `weekday_schedule`, `weekend_schedule` (schedule fallbacks)
- `break_schedule` (ProfileHeader display)
- `quota` (legacy field from agent_directory)
- `support_account` (ProfileHeader display)
- `upwork_contract_id` (Upwork integration)
- OT schedules (`mon_ot_schedule` through `sun_ot_schedule`)

### Recommended Approach
Rather than heavily modifying the existing RPC (which could break other consumers), create a **wrapper function** that:
1. Calls the RPC for consolidated status/metrics data
2. Keeps the existing `fetchDashboardProfile` for complete profile data
3. Merges results to reduce overall query count

### Changes Required

**File: `src/lib/agentDashboardApi.ts`**

Add new function to call the RPC:
```typescript
export async function fetchAgentDashboardRPC(profileId: string) {
  const { data, error } = await supabase.rpc('get_agent_dashboard_data', {
    p_profile_id: profileId
  });
  if (error) return { data: null, error: error.message };
  return { data: data?.[0] || null, error: null };
}
```

**File: `src/pages/AgentDashboard.tsx`**

Update `loadDashboardData` to optionally use RPC for status/metrics:
- Replace separate `getProfileStatus` call with RPC data
- Replace `getTodayTicketCountByType` + `getTodayGapData` with RPC data
- Keep `fetchDashboardProfile` for full profile fields
- Keep attendance/events calculations as-is (complex client-side logic)

### Benefits
- Reduces 4+ queries to 2 queries on initial load
- Status, login time, and ticket counts come from single call
- Minimal risk - existing profile fetching unchanged

---

## Phase 2: Team Scorecard RPC

### Current State (from scorecardApi.ts)
The `fetchWeeklyScorecard` function makes **10+ parallel queries**:
1. `fetchEligibleAgents` - agent_profiles
2. `fetchScorecardConfig` - scorecard_config (per support type)
3. `ticket_logs` - weekly tickets
4. `qa_evaluations` - weekly QA scores
5. `profile_events` - LOGIN events for reliability
6. `leave_requests` - approved leaves
7. `fetchZendeskMetrics` - zendesk_agent_metrics
8. `fetchSavedScorecard` - saved_scorecards
9. `revalida_batches` - batches for the week
10. `revalida_attempts` - attempt scores

### RPC Design Challenges
- **Mixed key types**: Some tables use `email`, others use `profile_id`
- **Complex aggregations**: Ticket counts by type, QA averages, reliability calculations
- **Dynamic config**: Different support types have different metrics
- **Saved data**: Need to check if week is already saved

### Recommended RPC: `get_weekly_scorecard_data`

**Parameters:**
- `p_week_start DATE`
- `p_week_end DATE`
- `p_support_type TEXT` (or 'all')

**Returns:** Table with pre-aggregated data per agent:
```text
agent_email, agent_name, position,
productivity_count, email_count, chat_count, call_count,
qa_average, revalida_score,
scheduled_days, days_present, approved_leave_days,
call_aht_seconds, chat_aht_seconds, chat_frt_seconds,
is_saved
```

### SQL Structure

```sql
CREATE OR REPLACE FUNCTION public.get_weekly_scorecard_data(
  p_week_start DATE,
  p_week_end DATE,
  p_support_type TEXT DEFAULT 'all'
)
RETURNS TABLE (
  agent_email TEXT,
  agent_name TEXT,
  agent_position TEXT,
  quota_email INTEGER,
  quota_chat INTEGER,
  quota_phone INTEGER,
  day_off TEXT[],
  email_count BIGINT,
  chat_count BIGINT,
  call_count BIGINT,
  qa_average NUMERIC,
  revalida_score NUMERIC,
  scheduled_days INTEGER,
  days_with_login INTEGER,
  approved_leave_days INTEGER,
  call_aht_seconds INTEGER,
  chat_aht_seconds INTEGER,
  chat_frt_seconds INTEGER,
  is_saved BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
WITH eligible_agents AS (
  SELECT id, email, full_name, agent_name, position,
         quota_email, quota_chat, quota_phone, day_off,
         mon_schedule, tue_schedule, wed_schedule, 
         thu_schedule, fri_schedule, sat_schedule, sun_schedule
  FROM agent_profiles
  WHERE employment_status != 'Terminated'
    AND position NOT IN ('Team Lead', 'Technical Support')
    AND (p_support_type = 'all' OR position = p_support_type)
),
ticket_counts AS (
  SELECT 
    LOWER(tl.agent_email) as email,
    COUNT(*) FILTER (WHERE LOWER(ticket_type) = 'email') as email_count,
    COUNT(*) FILTER (WHERE LOWER(ticket_type) = 'chat') as chat_count,
    COUNT(*) FILTER (WHERE LOWER(ticket_type) = 'call') as call_count
  FROM ticket_logs tl
  WHERE tl.timestamp >= p_week_start::timestamptz
    AND tl.timestamp < (p_week_end + 1)::timestamptz
  GROUP BY LOWER(tl.agent_email)
),
qa_scores AS (
  SELECT 
    LOWER(agent_email) as email,
    AVG(percentage) as qa_average
  FROM qa_evaluations
  WHERE audit_date >= p_week_start AND audit_date <= p_week_end
  GROUP BY LOWER(agent_email)
),
revalida_scores AS (
  SELECT 
    LOWER(ra.agent_email) as email,
    ra.final_percent as score
  FROM revalida_attempts ra
  JOIN revalida_batches rb ON ra.batch_id = rb.id
  WHERE rb.start_at >= p_week_start::timestamptz
    AND rb.start_at < (p_week_end + 1)::timestamptz
    AND ra.status = 'graded'
),
login_counts AS (
  SELECT 
    pe.profile_id,
    COUNT(DISTINCT DATE(pe.created_at AT TIME ZONE 'America/New_York')) as days_with_login
  FROM profile_events pe
  WHERE pe.event_type = 'LOGIN'
    AND pe.created_at >= p_week_start::timestamptz
    AND pe.created_at < (p_week_end + 1)::timestamptz
  GROUP BY pe.profile_id
),
leave_days AS (
  -- Count approved leave days overlapping the week
  SELECT 
    LOWER(agent_email) as email,
    COUNT(DISTINCT d.dt) as leave_day_count
  FROM leave_requests lr
  CROSS JOIN LATERAL generate_series(
    GREATEST(lr.start_date::date, p_week_start),
    LEAST(lr.end_date::date, p_week_end),
    '1 day'::interval
  ) as d(dt)
  WHERE lr.status = 'approved'
    AND lr.start_date <= p_week_end
    AND lr.end_date >= p_week_start
  GROUP BY LOWER(agent_email)
),
zendesk_metrics AS (
  SELECT agent_email, call_aht_seconds, chat_aht_seconds, chat_frt_seconds
  FROM zendesk_agent_metrics
  WHERE week_start = p_week_start::text AND week_end = p_week_end::text
),
saved_status AS (
  SELECT DISTINCT LOWER(agent_email) as email
  FROM saved_scorecards
  WHERE week_start = p_week_start::text AND week_end = p_week_end::text
)
SELECT 
  ea.email,
  COALESCE(ea.agent_name, ea.full_name) as agent_name,
  ea.position as agent_position,
  ea.quota_email,
  ea.quota_chat,
  ea.quota_phone,
  ea.day_off,
  COALESCE(tc.email_count, 0) as email_count,
  COALESCE(tc.chat_count, 0) as chat_count,
  COALESCE(tc.call_count, 0) as call_count,
  qs.qa_average,
  rs.score as revalida_score,
  -- scheduled_days calculated client-side from day_off + schedules
  0 as scheduled_days,
  COALESCE(lc.days_with_login, 0)::INTEGER as days_with_login,
  COALESCE(ld.leave_day_count, 0)::INTEGER as approved_leave_days,
  zm.call_aht_seconds,
  zm.chat_aht_seconds,
  zm.chat_frt_seconds,
  (ss.email IS NOT NULL) as is_saved
FROM eligible_agents ea
LEFT JOIN ticket_counts tc ON LOWER(ea.email) = tc.email
LEFT JOIN qa_scores qs ON LOWER(ea.email) = qs.email
LEFT JOIN revalida_scores rs ON LOWER(ea.email) = rs.email
LEFT JOIN login_counts lc ON ea.id = lc.profile_id
LEFT JOIN leave_days ld ON LOWER(ea.email) = ld.email
LEFT JOIN zendesk_metrics zm ON LOWER(ea.email) = LOWER(zm.agent_email)
LEFT JOIN saved_status ss ON LOWER(ea.email) = ss.email
ORDER BY ea.full_name;
$$;
```

### API Layer Changes

**File: `src/lib/scorecardApi.ts`**

Add new function:
```typescript
export async function fetchWeeklyScorecardRPC(
  weekStart: Date,
  weekEnd: Date,
  supportType: string
): Promise<AgentScorecard[]> {
  const { data, error } = await supabase.rpc('get_weekly_scorecard_data', {
    p_week_start: format(weekStart, 'yyyy-MM-dd'),
    p_week_end: format(weekEnd, 'yyyy-MM-dd'),
    p_support_type: supportType
  });
  
  if (error) throw error;
  
  // Transform RPC data to AgentScorecard format
  // Apply config weights and calculate final scores client-side
}
```

---

## Implementation Steps

### Step 1: Agent Dashboard RPC Integration
1. Add `fetchAgentDashboardRPC` helper function
2. Update `loadDashboardData` to use RPC for status/metrics
3. Merge RPC data with existing profile fetch
4. Test dashboard still works correctly

### Step 2: Create Scorecard RPC Migration
1. Create SQL migration for `get_weekly_scorecard_data`
2. Wait for approval and apply

### Step 3: Integrate Scorecard RPC
1. Add `fetchWeeklyScorecardRPC` function
2. Update Team Scorecard page to use new function
3. Keep fallback to existing logic if RPC fails

---

## Technical Notes

- **Scheduled days** calculation remains client-side (requires parsing schedule strings for each day)
- **Final score** calculation remains client-side (requires dynamic config weights per support type)
- **Saved scorecards** are still fetched separately when viewing saved data
- Both RPCs use `SECURITY DEFINER` with explicit `search_path` for security
