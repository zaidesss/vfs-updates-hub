
# Enhanced Notification System + Case-Sensitivity Fix + EOW Analytics Panel

## Overview

This plan addresses multiple requirements:

1. **Fix ticket case-sensitivity** - Query tickets using case-insensitive matching
2. **Update EOD/EOW Team Analytics** - Exclude Team Leads, Technical Support, Logistics from team metrics
3. **Create EOW (End of Week) Analytics Panel** - New UI component for weekly team summary
4. **Expand notification recipients** - EOD/EOW sent to ALL users, not just admins
5. **Update Slack channel** - Change from `a_pb_mgt` to `a_agent_reports` for all notifications

---

## Position Filtering Matrix

| Position | EOD/EOW Team Analytics | Individual Agent Analytics |
|----------|------------------------|---------------------------|
| Email Support | ✅ Included | ✅ Included |
| Chat Support | ✅ Included | ✅ Included |
| Phone Support | ✅ Included | ✅ Included |
| Hybrid Support | ✅ Included | ✅ Included |
| Team Lead | ❌ Excluded | ✅ Included |
| Technical Support | ❌ Excluded | ✅ Included |
| Logistics | ❌ Excluded | ✅ Included |

---

## Notification Distribution Matrix

| Notification Type | Email Recipients | Slack Channel | In-App |
|-------------------|------------------|---------------|--------|
| EOD Analytics | ALL users (agents, admins, HR) | `a_agent_reports` | Admins/HR |
| EOW Analytics | ALL users (agents, admins, HR) | `a_agent_reports` | Admins/HR |
| Incident Reports (real-time) | Admins, HR, Super Admins | `a_agent_reports` | Admins/HR |

---

## Changes Required

### 1. Fix Case-Sensitivity in Individual Agent Analytics

**File**: `src/components/agent-reports/IndividualAgentAnalytics.tsx`

**Current query**:
```typescript
.or(`agent_email.eq.${email},agent_name.eq.${agentTag}`)
```

**Fixed** - Use case-insensitive matching:
```typescript
.or(`agent_email.ilike.${email},agent_name.ilike.${agentTag}`)
```

This ensures "malcom" matches "Malcom" in ticket lookups.

---

### 2. Update EOD Analytics Edge Function

**File**: `supabase/functions/generate-eod-analytics/index.ts`

#### 2a. Add Position Filter (Line 34)
```typescript
const EXCLUDED_POSITIONS = ['Team Lead', 'Technical Support', 'Logistics'];

const { data: profiles } = await supabase
  .from("agent_profiles")
  .select("id, email, position, quota_email, quota_chat, quota_phone")
  .not('position', 'in', `(${EXCLUDED_POSITIONS.map(p => `"${p}"`).join(',')})`);
```

#### 2b. Update EST Timezone Boundaries (Line 40)
```typescript
// EST boundaries: midnight EST = 5:00 AM UTC
const startOfDayEST = `${dateStr}T05:00:00.000Z`;
const nextDateForEnd = new Date(dateStr);
nextDateForEnd.setDate(nextDateForEnd.getDate() + 1);
const endOfDayEST = `${nextDateForEnd.toISOString().split("T")[0]}T04:59:59.999Z`;
```

#### 2c. Expand Email Recipients (Line 145)
```typescript
// Fetch ALL users for email notifications (agents + admins)
const { data: allProfiles } = await supabase
  .from("agent_profiles")
  .select("email")
  .neq("employment_status", "Terminated");

const { data: admins } = await supabase
  .from("user_roles")
  .select("email")
  .in("role", ["admin", "hr", "super_admin"]);

const allEmails = new Set<string>();
allProfiles?.forEach(p => allEmails.add(p.email.toLowerCase()));
admins?.forEach(a => allEmails.add(a.email.toLowerCase()));
```

#### 2d. Change Slack Channel (Line 164)
```typescript
// Change from: channel: "#a_pb_mgt"
// To:
channel: "a_agent_reports"
```

---

### 3. Update Weekly Analytics Edge Function

**File**: `supabase/functions/generate-weekly-analytics/index.ts`

Apply the same changes as EOD:

#### 3a. Add Position Filter (Line 52)
```typescript
const EXCLUDED_POSITIONS = ['Team Lead', 'Technical Support', 'Logistics'];

const { data: profiles } = await supabase
  .from("agent_profiles")
  .select("id, email, full_name, position, quota_email, quota_chat, quota_phone")
  .not('position', 'in', `(${EXCLUDED_POSITIONS.map(p => `"${p}"`).join(',')})`);
```

#### 3b. Update EST Boundaries (Lines 60-61)
```typescript
const startOfWeekEST = `${weekStartStr}T05:00:00.000Z`;
const nextDayAfterEnd = new Date(weekEndStr);
nextDayAfterEnd.setDate(nextDayAfterEnd.getDate() + 1);
const endOfWeekEST = `${nextDayAfterEnd.toISOString().split("T")[0]}T04:59:59.999Z`;
```

#### 3c. Expand Email Recipients (Line 217)
```typescript
// Fetch ALL users for email notifications
const { data: allProfiles } = await supabase
  .from("agent_profiles")
  .select("email")
  .neq("employment_status", "Terminated");

const { data: admins } = await supabase
  .from("user_roles")
  .select("email")
  .in("role", ["admin", "hr", "super_admin"]);

const allEmails = new Set<string>();
allProfiles?.forEach(p => allEmails.add(p.email.toLowerCase()));
admins?.forEach(a => allEmails.add(a.email.toLowerCase()));
```

#### 3d. Change Slack Channel (Line 265)
```typescript
channel: "a_agent_reports"
```

---

### 4. Update Status Alert Notification (Incident Reports)

**File**: `supabase/functions/send-status-alert-notification/index.ts`

#### 4a. Change Slack Channel (Line 269)
```typescript
// Change from: channel: 'a_pb_mgt'
// To:
channel: 'a_agent_reports'
```

Email recipients remain: Admins, HR, Super Admins (no change needed).

---

### 5. Create EOW Analytics Panel UI

**New File**: `src/components/agent-reports/EOWAnalyticsPanel.tsx`

Create a new component for End of Week team analytics display:

- Week picker (select week range)
- Same 4-card layout as EOD (Attendance, Productivity, Time, Compliance)
- Uses weekly aggregated data from `generate-weekly-analytics`
- Visible only to Admin/HR/SuperAdmin
- Collapsible like EOD panel

**Key structure**:
```tsx
export function EOWAnalyticsPanel() {
  // State for week selection (default: previous week)
  // Fetch from generate-weekly-analytics edge function
  // Display 4 metric cards with weekly totals
  // Status badge (good/warning/critical)
}
```

---

### 6. Add EOW Analytics API Function

**File**: `src/lib/agentReportsApi.ts`

Add interface and fetch function:

```typescript
export interface EOWAnalytics {
  weekStart: string;
  weekEnd: string;
  attendance: {
    scheduledDays: number;
    activeDays: number;
    onTimeRate: number;
    fullShiftRate: number;
    attendanceRate: number;
  };
  productivity: {
    total: number;
    email: number;
    chat: number;
    call: number;
    quotaRate: number;
    avgGap: number | null;
  };
  time: {
    totalLogged: number;
    totalRequired: number;
    avgLoggedPerDay: number | null;
  };
  compliance: {
    totalIncidents: number;
    cleanAgents: number;
    cleanRate: number;
    breakdown: Record<string, number>;
  };
  status: 'good' | 'warning' | 'critical';
  details: string[];
}

export async function fetchEOWAnalytics(
  weekStart?: string,
  weekEnd?: string
): Promise<{ data: EOWAnalytics | null; error: string | null }>;
```

---

### 7. Integrate EOW Panel into Agent Reports Page

**File**: `src/pages/AgentReports.tsx`

Add the EOW panel after EOD panel:

```tsx
import { EOWAnalyticsPanel } from '@/components/agent-reports/EOWAnalyticsPanel';

// In render:
<EODAnalyticsPanel />
<EOWAnalyticsPanel />  {/* NEW */}
<IndividualAgentAnalytics />
```

---

## Files Summary

| File | Changes |
|------|---------|
| `src/components/agent-reports/IndividualAgentAnalytics.tsx` | Fix case-insensitive ticket matching with `.ilike()` |
| `supabase/functions/generate-eod-analytics/index.ts` | Position filter + EST boundaries + ALL user emails + Slack channel |
| `supabase/functions/generate-weekly-analytics/index.ts` | Position filter + EST boundaries + ALL user emails + Slack channel |
| `supabase/functions/send-status-alert-notification/index.ts` | Slack channel to `a_agent_reports` |
| `src/lib/agentReportsApi.ts` | Add `EOWAnalytics` interface and `fetchEOWAnalytics()` |
| `src/components/agent-reports/EOWAnalyticsPanel.tsx` | **NEW** - Weekly team analytics UI |
| `src/pages/AgentReports.tsx` | Import and render `EOWAnalyticsPanel` |

---

## Implementation Sequence

1. Fix case-insensitive ticket query in `IndividualAgentAnalytics.tsx`
2. Update `generate-eod-analytics` edge function (position filter + recipients + Slack)
3. Update `generate-weekly-analytics` edge function (position filter + EST + recipients + Slack)
4. Update `send-status-alert-notification` edge function (Slack channel)
5. Add `EOWAnalytics` interface and API to `agentReportsApi.ts`
6. Create `EOWAnalyticsPanel.tsx` component
7. Integrate EOW panel into Agent Reports page
8. Deploy all edge functions
9. Test notifications and verify data accuracy

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Feb 5 ticket visibility | Missing (case mismatch) | ✅ Visible |
| EOD/EOW team metrics | Includes all positions | Excludes Team Leads, Tech Support, Logistics |
| EOD email recipients | Admins/HR only | ALL active users |
| EOW email recipients | Admins/HR only | ALL active users |
| Slack channel | `a_pb_mgt` | `a_agent_reports` |
| EOW UI Panel | None | New weekly summary panel |
