
# Agent Reports + Enhanced Status Controls Plan

## Overview
This plan implements two interconnected features:
1. **Agent Reports** - A behavioral compliance investigation page for Team Leads
2. **Enhanced Status Controls** - Timer-based Device Restart (5 min limit) and Bio Break (consumable time based on shift length)
3. **Auto-Logout System** - Automatically logs out agents who forgot to log out from the previous day

---

## Part 1: Agent Reports Page

### Database Schema

**New Table: `agent_reports`**
```sql
CREATE TABLE public.agent_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_email text NOT NULL,
  agent_name text NOT NULL,
  profile_id uuid REFERENCES public.agent_profiles(id),
  incident_type text NOT NULL,
  incident_date date NOT NULL,
  severity text DEFAULT 'medium',
  status text DEFAULT 'open',
  details jsonb DEFAULT '{}',
  frequency_count integer DEFAULT 1,
  reviewed_by text,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Incident Types:**
| Type | Detection Rule |
|------|----------------|
| `QUOTA_NOT_MET` | Daily ticket count below agent's quota |
| `NO_LOGOUT` | LOGIN event exists but no LOGOUT for the day |
| `HIGH_GAP` | Avg gap > threshold AND quota not met |
| `EXCESSIVE_RESTARTS` | Device restart > 5 mins OR > 3x/day |
| `TIME_NOT_MET` | Portal/Upwork time below required hours |
| `LATE_LOGIN` | Login > 10 min after scheduled start |
| `EARLY_OUT` | Logout before scheduled end time |
| `BIO_OVERUSE` | Bio break exceeded allowed time |

### UI Components

**List Page (`/team-performance/agent-reports`):**
- Year/Month/Week dropdown filters (matching QA Evaluations style)
- Agent filter dropdown
- Incident type filter
- Status filter (Open/Reviewed/Validated/Dismissed)
- Summary cards: Total Reports, Open, Reviewed this month
- Sortable table with Agent, Incident Type, Date, Severity, Frequency, Status

**Detail Dialog:**
- Agent info header
- Incident summary with contextual metrics
- Timeline of related events
- Status update controls
- Notes input for Team Lead comments

**Agent Analytics Panel:**
- Incidents over time chart
- Breakdown by incident type
- Trend indicators

### Files to Create
- `src/pages/AgentReports.tsx`
- `src/lib/agentReportsApi.ts`
- `src/components/agent-reports/ReportFilters.tsx`
- `src/components/agent-reports/ReportDetailDialog.tsx`
- `src/components/agent-reports/ReportSummaryCards.tsx`
- `src/components/agent-reports/AgentAnalyticsPanel.tsx`

---

## Part 2: Enhanced Status Controls

### A. Device Restart Timer (5 min limit)

**Current State:** Device Restart is a toggle button with no time limit.

**New Behavior:**
1. When "Device Restart" is clicked, start a 5-minute countdown timer
2. Display timer inside the button (e.g., "4:32" remaining)
3. Button changes to "End Restart (4:32)" format
4. If 5 minutes exceeded:
   - Auto-generate `EXCESSIVE_RESTARTS` report in `agent_reports`
   - Send email + Slack notification to Team Leads
   - Change button color to red/warning state
   - Agent can still click to end, but violation is recorded

**Implementation:**
- Store restart start time in `profile_status.status_since`
- Add real-time timer in `StatusButtons.tsx`
- Create edge function `send-status-alert-notification` for Team Lead alerts
- Modify `updateProfileStatus` to check duration on `DEVICE_RESTART_END`

### B. Bio Break (New Status Type)

**New Status:** `ON_BIO` (similar to `ON_BREAK` but with consumable time)

**Rules:**
- For shifts >= 8 hours: 2 breaks × 2 mins = 4 mins total (consumable)
- For shifts < 8 hours: 1 break × 2 mins = 2 mins total
- Timer starts when Bio is clicked and pauses when Bio ends
- Remaining time persists across the workday
- If all time used, button becomes disabled
- If exceeded, generate `BIO_OVERUSE` report + notify Team Leads

**New Database Column:**
- Add `bio_time_remaining_seconds` to `profile_status` table
- Reset daily (or on LOGIN event)

**UI Changes:**
- Add "Bio" button next to Device Restart in `StatusButtons.tsx`
- Show countdown timer when active: "Bio (1:45)"
- Show remaining time when not active: "Bio (2:00 left)"
- Button disabled when 0 time remaining

**State Machine Updates:**
```text
LOGGED_IN → BIO_START → ON_BIO
ON_BIO → BIO_END → LOGGED_IN
```

### C. Auto-Logout for No Logout

**Problem:** Agents who forget to log out remain in `LOGGED_IN` status, blocking their next login.

**Solution:**
1. Create scheduled edge function `auto-logout-agents` running daily at 6:00 AM EST
2. Find all agents with:
   - `profile_status.current_status` NOT `LOGGED_OUT`
   - `status_since` is from the previous day or earlier
3. For each agent:
   - Insert `LOGOUT` event with `triggered_by: 'system_auto_logout'`
   - Update `profile_status` to `LOGGED_OUT`
   - Create `NO_LOGOUT` report in `agent_reports`
   - Agent can now log in normally for their next shift

**Alternative Approach (Simpler):**
- Instead of scheduled function, perform auto-logout check during LOGIN attempt
- If agent tries to log in while still "logged in" from previous day, auto-generate logout first
- This is more reliable and doesn't require scheduled jobs

### Database Changes Summary

**Modify `profile_status` table:**
```sql
ALTER TABLE public.profile_status 
ADD COLUMN bio_time_remaining_seconds integer DEFAULT NULL,
ADD COLUMN bio_allowance_seconds integer DEFAULT NULL;
```

**Modify `profile_events` table - add new event types:**
- `BIO_START`
- `BIO_END`

**Update state machine in code:**
```typescript
export type ProfileStatus = 'LOGGED_OUT' | 'LOGGED_IN' | 'ON_BREAK' | 'COACHING' | 'RESTARTING' | 'ON_BIO';
export type EventType = 'LOGIN' | 'LOGOUT' | 'BREAK_IN' | 'BREAK_OUT' | 'COACHING_START' | 'COACHING_END' | 'DEVICE_RESTART_START' | 'DEVICE_RESTART_END' | 'BIO_START' | 'BIO_END';
```

---

## Part 3: Notification System

### Edge Function: `send-status-alert-notification`

Triggered when:
- Device Restart exceeds 5 minutes
- Bio Break exceeds allowed time

Sends to:
- All users with `admin`, `hr`, or `super_admin` roles
- Via Email (Resend)
- Via Slack (webhook)

### Edge Function: `generate-agent-reports`

Scheduled daily to scan for:
- Agents with NO_LOGOUT (already auto-logged out)
- Quota not met
- High gap (only when quota not met)
- Excessive restarts (from profile_events)
- Time not met (portal hours vs scheduled hours)
- Late login / Early out (from attendance calculation)

---

## Implementation Order

| Step | Change | Files |
|------|--------|-------|
| 1 | Create `agent_reports` table + RLS | SQL migration |
| 2 | Add `bio_time_remaining_seconds` to `profile_status` | SQL migration |
| 3 | Update state machine types | `agentDashboardApi.ts` |
| 4 | Create `agentReportsApi.ts` | New file |
| 5 | Implement Device Restart timer | `StatusButtons.tsx` |
| 6 | Implement Bio Break button + timer | `StatusButtons.tsx` |
| 7 | Create Agent Reports page | `AgentReports.tsx` + components |
| 8 | Add navigation link | `Layout.tsx`, `App.tsx` |
| 9 | Create notification edge function | `send-status-alert-notification/index.ts` |
| 10 | Create report generator function | `generate-agent-reports/index.ts` |
| 11 | Implement auto-logout logic | `updateProfileStatus` modification |

---

## Technical Details

### Timer Implementation in StatusButtons

```typescript
// Use useState for timer display
const [restartElapsed, setRestartElapsed] = useState(0);
const [bioRemaining, setBioRemaining] = useState(0);

// useEffect with interval when in RESTARTING or ON_BIO status
useEffect(() => {
  if (currentStatus === 'RESTARTING' && statusSince) {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(statusSince).getTime()) / 1000);
      setRestartElapsed(elapsed);
      
      // Check if exceeded 5 minutes (300 seconds)
      if (elapsed >= 300 && !hasExceededNotified) {
        triggerExceededNotification();
      }
    }, 1000);
    return () => clearInterval(interval);
  }
}, [currentStatus, statusSince]);
```

### Bio Break Allowance Calculation

```typescript
function calculateBioAllowance(schedule: string | null): number {
  if (!schedule) return 2 * 60; // Default 2 minutes
  
  const parsed = parseScheduleRange(schedule);
  if (!parsed) return 2 * 60;
  
  let durationMinutes = parsed.endMinutes - parsed.startMinutes;
  if (durationMinutes < 0) durationMinutes += 24 * 60;
  
  // 8+ hours = 4 mins, less = 2 mins
  return durationMinutes >= 480 ? 4 * 60 : 2 * 60; // Return seconds
}
```

### Auto-Logout on Login Attempt

```typescript
// In updateProfileStatus, before LOGIN event:
if (eventType === 'LOGIN') {
  const { data: currentStatusData } = await getProfileStatus(profileId);
  
  if (currentStatusData?.current_status !== 'LOGGED_OUT') {
    const statusSince = new Date(currentStatusData?.status_since || '');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // If status_since is from before today, auto-logout first
    if (statusSince < today) {
      await forceLogout(profileId, 'system_auto_logout');
      await createAgentReport({
        agent_email: triggeredBy,
        incident_type: 'NO_LOGOUT',
        incident_date: format(statusSince, 'yyyy-MM-dd'),
        details: { auto_logged_out: true }
      });
    }
  }
}
```

---

## Access Control

**Agent Reports Page:**
- Team Leads, Admins, HR, Super Admins: Full access (view all, update status, add notes)
- Regular agents: Can view only their own reports (read-only)

**Bio Break Rules:**
- Enforced per-agent based on their daily schedule
- Allowance resets on each new LOGIN event

---

## Files Summary

### New Files
- `src/pages/AgentReports.tsx`
- `src/lib/agentReportsApi.ts`
- `src/components/agent-reports/ReportFilters.tsx`
- `src/components/agent-reports/ReportDetailDialog.tsx`
- `src/components/agent-reports/ReportSummaryCards.tsx`
- `src/components/agent-reports/AgentAnalyticsPanel.tsx`
- `supabase/functions/send-status-alert-notification/index.ts`
- `supabase/functions/generate-agent-reports/index.ts`

### Modified Files
- `src/App.tsx` - Add route for Agent Reports
- `src/components/Layout.tsx` - Add nav item under Team Performance
- `src/components/dashboard/StatusButtons.tsx` - Add Bio button + timers
- `src/lib/agentDashboardApi.ts` - Update types, state machine, add bio/auto-logout logic
- `src/pages/AgentDashboard.tsx` - Pass schedule info for bio allowance calculation
