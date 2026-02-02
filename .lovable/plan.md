
# Performance Optimization Plan

## Overview
This plan implements the performance optimizations identified in the previous analysis, excluding QA Evaluations as requested. The changes focus on caching strategies, query consolidation, and loading optimizations across the portal.

---

## Phase 1: Global Query Client Configuration

### 1.1 Configure TanStack Query with Smart Defaults
**File:** `src/App.tsx`

Update the QueryClient initialization with optimized defaults:
- Set `staleTime: 5 * 60 * 1000` (5 minutes) - prevents refetching data that was just fetched
- Set `gcTime: 10 * 60 * 1000` (10 minutes) - keeps cached data longer
- Disable `refetchOnWindowFocus` - prevents unnecessary refetches when user switches tabs
- Set `retry: 1` - reduces retry attempts for faster failure feedback

```text
Current:
const queryClient = new QueryClient();

Updated:
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

**Impact:** 20-30% improvement on repeated page visits

---

## Phase 2: Cache User Profile ID in AuthContext

### 2.1 Move Profile ID Fetch from Layout to AuthContext
**Files:** `src/context/AuthContext.tsx`, `src/components/Layout.tsx`

**Problem:** Currently, `Layout.tsx` fetches the user's profile ID on every page navigation (lines 46-62), adding 50-100ms latency to every single page load.

**Solution:** 
1. Add `profileId` state to AuthContext
2. Fetch profile ID once during login/session restoration
3. Expose `profileId` via context
4. Remove the useEffect fetch from Layout and use context value instead

**AuthContext Changes:**
- Add `profileId: string | null` to AuthContextType
- Fetch profile ID alongside role checks in the auth state listener
- Return profileId in context value

**Layout Changes:**
- Remove the `useEffect` that fetches `userProfileId`
- Get `profileId` directly from `useAuth()` hook
- Use context value for dashboard navigation links

**Impact:** Eliminates 50-100ms latency on every page navigation

---

## Phase 3: Lazy Load UpdatesContext

### 3.1 Convert UpdatesContext to Lazy Loading Pattern
**Files:** `src/context/UpdatesContext.tsx`, `src/App.tsx`

**Problem:** UpdatesProvider loads ALL updates and acknowledgements on initial app load, even when visiting pages that don't need this data.

**Solution:** Implement lazy initialization - only fetch data when first accessed by a component.

**UpdatesContext Changes:**
```text
Current behavior:
- useEffect fetches on mount
- All pages wait for updates to load

New behavior:
- Add `initialized` state flag
- Replace automatic useEffect with on-demand loading
- First component that calls useUpdates() triggers the fetch
- Subsequent calls use cached data
```

Key changes:
1. Add `initialized: boolean` state (starts false)
2. Export a `ensureLoaded()` function that fetches if not initialized
3. Pages that need updates call `ensureLoaded()` 
4. Other pages skip the wait entirely

**Impact:** 200-500ms faster load on non-update pages (Dashboard, Calendar, Profile, etc.)

---

## Phase 4: Parallelize Agent Dashboard Fetches

### 4.1 Restructure Agent Dashboard Data Loading
**File:** `src/pages/AgentDashboard.tsx`

**Problem:** The dashboard has a 4-stage sequential waterfall:
1. Fetch profile + status
2. Wait, then fetch events + leaves
3. Wait, then fetch agent tag
4. Wait, then fetch ticket count + gap data + Upwork time

**Solution:** Restructure to maximize parallelization using Promise.all and remove unnecessary sequential dependencies.

**Changes:**
1. Combine profile fetch with agent_directory lookup in a single database call or parallel Promise.all
2. Fetch agent tag in parallel with events/leaves (it only depends on email, not the full profile)
3. Pre-fetch ticket data and Upwork data in the same parallel batch
4. Move late-login auto-generation to a non-blocking background task

**Optimized Flow:**
```text
Stage 1 (parallel):
- fetchDashboardProfile(profileId)
- getProfileStatus(profileId)

Stage 2 (parallel, needs profile.email):
- getWeekLoginEvents(profileId, weekStart, weekEnd)
- getWeekAllEvents(profileId, weekStart, weekEnd)
- getApprovedLeavesForWeek(email, weekStart, weekEnd)
- getAgentTagByEmail(email)

Stage 3 (parallel, needs agentTag OR upworkContractId):
- getTodayTicketCount(agentTag)
- getTodayGapData(agentTag)
- fetchUpworkTime(upworkContractId, date, email)
```

**Impact:** 40-60% faster Agent Dashboard load

---

## Phase 5: Consolidate Ticket Dashboard Queries

### 5.1 Create Optimized Database Function for Ticket Dashboard
**Database Migration**

**Problem:** `fetchDashboardData()` in `ticketLogsApi.ts` makes 5 sequential queries:
1. ticket_logs
2. ticket_gap_daily
3. agent_directory
4. agent_profiles  
5. profile_status

**Solution:** Create a database function that returns pre-aggregated dashboard data in a single call.

**SQL Function:**
```sql
CREATE OR REPLACE FUNCTION get_ticket_dashboard_data(
  p_zd_instance text,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  agent_name text,
  agent_email text,
  log_date date,
  email_count bigint,
  chat_count bigint,
  call_count bigint,
  avg_gap_seconds numeric,
  is_logged_in boolean
) AS $$
BEGIN
  RETURN QUERY
  WITH ticket_counts AS (
    SELECT 
      tl.agent_name,
      tl.agent_email,
      (tl.timestamp AT TIME ZONE 'America/New_York')::date as log_date,
      COUNT(*) FILTER (WHERE LOWER(tl.ticket_type) = 'email') as email_count,
      COUNT(*) FILTER (WHERE LOWER(tl.ticket_type) = 'chat') as chat_count,
      COUNT(*) FILTER (WHERE LOWER(tl.ticket_type) = 'call') as call_count
    FROM ticket_logs tl
    WHERE tl.zd_instance = p_zd_instance
      AND tl.timestamp >= (p_start_date::text || 'T00:00:00Z')::timestamptz
      AND tl.timestamp <= (p_end_date::text || 'T23:59:59.999Z')::timestamptz
    GROUP BY tl.agent_name, tl.agent_email, log_date
  ),
  agent_status AS (
    SELECT 
      ad.agent_tag,
      ad.email,
      ps.current_status = 'LOGGED_IN' as is_logged_in
    FROM agent_directory ad
    LEFT JOIN agent_profiles ap ON LOWER(ad.email) = LOWER(ap.email)
    LEFT JOIN profile_status ps ON ap.id = ps.profile_id
    WHERE ad.agent_tag IS NOT NULL
  ),
  gaps AS (
    SELECT 
      tgd.agent_name,
      tgd.date as log_date,
      tgd.avg_gap_seconds
    FROM ticket_gap_daily tgd
    WHERE tgd.date >= p_start_date AND tgd.date <= p_end_date
  )
  SELECT 
    tc.agent_name,
    tc.agent_email,
    tc.log_date,
    tc.email_count,
    tc.chat_count,
    tc.call_count,
    g.avg_gap_seconds,
    COALESCE(ast.is_logged_in, false)
  FROM ticket_counts tc
  LEFT JOIN gaps g ON tc.agent_name = g.agent_name AND tc.log_date = g.log_date
  LEFT JOIN agent_status ast ON LOWER(tc.agent_name) = LOWER(ast.agent_tag)
  ORDER BY tc.agent_name, tc.log_date;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 5.2 Update ticketLogsApi.ts to Use New Function
**File:** `src/lib/ticketLogsApi.ts`

Replace the `fetchDashboardData()` function to call the new database function instead of making 5 separate queries.

**Impact:** 50%+ faster Ticket Logs page load

---

## Phase 6: Code Splitting for Heavy Pages

### 6.1 Lazy Load Heavy Components
**File:** `src/App.tsx`

Use React.lazy() for pages with heavy dependencies that aren't always needed:

```text
Current:
import MasterDirectory from "./pages/MasterDirectory";
import TicketLogs from "./pages/TicketLogs";
import TeamStatusBoard from "./pages/TeamStatusBoard";

Updated:
const MasterDirectory = lazy(() => import("./pages/MasterDirectory"));
const TicketLogs = lazy(() => import("./pages/TicketLogs"));
const TeamStatusBoard = lazy(() => import("./pages/TeamStatusBoard"));
```

Wrap routes in Suspense with a loading fallback.

**Impact:** 100-300ms faster initial bundle load

---

## Implementation Order

| Step | Change | Files Affected | Risk |
|------|--------|----------------|------|
| 1 | Query Client defaults | App.tsx | Low |
| 2 | Cache profile ID in AuthContext | AuthContext.tsx, Layout.tsx | Low |
| 3 | Lazy UpdatesContext | UpdatesContext.tsx | Low |
| 4 | Parallelize Agent Dashboard | AgentDashboard.tsx | Medium |
| 5 | Create ticket dashboard DB function | SQL migration, ticketLogsApi.ts | Medium |
| 6 | Code splitting | App.tsx | Low |

---

## Technical Notes

### Files to Modify:
- `src/App.tsx` - Query client config + code splitting
- `src/context/AuthContext.tsx` - Add profileId caching
- `src/components/Layout.tsx` - Remove profile fetch
- `src/context/UpdatesContext.tsx` - Lazy initialization
- `src/pages/AgentDashboard.tsx` - Parallel data loading
- `src/lib/ticketLogsApi.ts` - Use consolidated DB function
- New SQL migration - Ticket dashboard function

### Expected Overall Impact:
- **Page navigation:** 50-150ms faster (profile ID caching)
- **Non-update pages:** 200-500ms faster (lazy UpdatesContext)
- **Agent Dashboard:** 40-60% faster
- **Ticket Logs:** 50%+ faster
- **Initial load:** 100-300ms faster (code splitting)
