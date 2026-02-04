
# Plan: Team Performance Scorecard

## Summary
Create a new Scorecard page under Team Performance that displays weekly performance metrics for agents, with support-type-specific calculations, configurable weights, and a comprehensive scoring system.

**Key Clarification**: All agent data (name, position, quota, schedule, day_off) will be sourced from `agent_profiles` table as the single source of truth.

---

## Support Type Scope

| Position | Scorecard Type |
|----------|---------------|
| Hybrid Support | Full Scorecard (all metrics) |
| Phone Support | Full Scorecard (phone-specific metrics) |
| Chat Support | Full Scorecard (chat-specific metrics) |
| Email Support | Full Scorecard (email-specific metrics) |
| Logistics | Reliability Only |
| Team Lead | Excluded |
| Technical Support | Excluded |

---

## Data Sources

| Data | Source Table | Fields Used |
|------|--------------|-------------|
| Agent List & Details | `agent_profiles` | full_name, email, position, quota_email, quota_chat, quota_phone, day_off, mon_schedule-sun_schedule, employment_status |
| Ticket Counts | `ticket_logs` | agent_email, ticket_type, timestamp |
| QA Scores | `qa_evaluations` | agent_email, percentage, evaluation_date |
| Attendance Events | `profile_events` | profile_id, event_type, created_at |
| Approved Leave | `leave_requests` | user_email, start_date, end_date, status='approved' |
| Zendesk Metrics | `zendesk_agent_metrics` (new) | agent_email, call_aht_seconds, chat_aht_seconds, chat_frt_seconds |
| Weights/Goals | `scorecard_config` (new) | support_type, metric_key, weight, goal |

---

## Agent Filtering Logic

```typescript
// From agent_profiles table
const eligibleAgents = agentProfiles.filter(profile => {
  // Exclude terminated agents
  if (profile.employment_status === 'Terminated') return false;
  
  // Exclude Team Lead and Technical Support
  if (['Team Lead', 'Technical Support'].includes(profile.position)) return false;
  
  // Match support type filter
  if (supportTypeFilter === 'Logistics') {
    return profile.position === 'Logistics';
  }
  
  return profile.position === supportTypeFilter;
});
```

---

## Database Changes

### Table 1: `scorecard_config` (Metric Weights and Goals)

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| support_type | text | 'Hybrid Support', 'Phone Support', 'Chat Support', 'Email Support', 'Logistics' |
| metric_key | text | 'productivity', 'call_aht', 'chat_aht', 'chat_frt', 'qa', 'revalida', 'reliability', 'ot_productivity' |
| weight | numeric | Weight percentage (e.g., 15 for 15%) |
| goal | numeric | Target value (e.g., 300 seconds for AHT, 96 for QA) |
| is_enabled | boolean | Whether metric is used for this support type |
| display_order | integer | Column display order |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### Table 2: `zendesk_agent_metrics` (Cached Zendesk Performance Data)

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| agent_email | text | Agent's email (matches agent_profiles.email) |
| week_start | date | Monday of the week |
| week_end | date | Sunday of the week |
| call_aht_seconds | numeric | Average handle time for calls |
| chat_aht_seconds | numeric | Average handle time for chats |
| chat_frt_seconds | numeric | First response time for chats |
| total_calls | integer | Number of calls |
| total_chats | integer | Number of chats |
| fetched_at | timestamptz | When data was fetched |
| created_at | timestamptz | |

---

## Calculation Logic

### Scheduled Days (from agent_profiles)
```typescript
// Get scheduled working days from agent_profiles.day_off array
function getScheduledDays(profile: AgentProfile, weekStart: Date, weekEnd: Date): number {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let scheduledDays = 0;
  
  for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
    const dayName = dayNames[d.getDay()];
    if (!profile.day_off?.includes(dayName)) {
      scheduledDays++;
    }
  }
  return scheduledDays;
}
```

### Reliability (Attendance-Based with Approved Leave Adjustment)
```typescript
// 1. Get scheduled days from agent_profiles.day_off
// 2. Subtract approved leave days (from leave_requests where status='approved')
// 3. Count days with LOGIN event (from profile_events)
// Reliability = (Days Present / Adjusted Scheduled Days) * 100

const scheduledDays = getScheduledDays(profile, weekStart, weekEnd);
const approvedLeaveDays = countApprovedLeaveDays(leaveRequests, weekStart, weekEnd);
const adjustedScheduledDays = scheduledDays - approvedLeaveDays;
const daysPresent = countDaysWithLogin(profileEvents, weekStart, weekEnd);

const reliabilityPercent = adjustedScheduledDays > 0 
  ? Math.min(100, (daysPresent / adjustedScheduledDays) * 100)
  : 100;
```

### Productivity (using quota from agent_profiles)
```typescript
// For Email Support: quota_email per day
// For Hybrid Support: sum of quota_email + quota_chat + quota_phone per day
// For Chat Support: quota_chat per day
// For Phone Support: quota_phone per day

function getWeeklyQuota(profile: AgentProfile, supportType: string, workingDays: number): number {
  switch (supportType) {
    case 'Email Support':
      return (profile.quota_email || 0) * workingDays;
    case 'Chat Support':
      return (profile.quota_chat || 0) * workingDays;
    case 'Phone Support':
      return (profile.quota_phone || 0) * workingDays;
    case 'Hybrid Support':
      return ((profile.quota_email || 0) + (profile.quota_chat || 0) + (profile.quota_phone || 0)) * workingDays;
    default:
      return 0;
  }
}

const productivityPercent = weeklyQuota > 0 
  ? (actualTicketCount / weeklyQuota) * 100 
  : 0;
```

### QA Score (from qa_evaluations)
```typescript
// Filter qa_evaluations by agent_email and evaluation_date within week
const weeklyQA = qaEvaluations.filter(e => 
  e.agent_email === profile.email &&
  e.evaluation_date >= weekStart &&
  e.evaluation_date <= weekEnd
);

const qaScore = weeklyQA.length > 0
  ? weeklyQA.reduce((sum, e) => sum + e.percentage, 0) / weeklyQA.length
  : null;
```

### AHT/FRT Score (Lower is Better)
```typescript
// Score = Goal / Actual (capped at 100%)
const ahtScore = actualSeconds > 0 
  ? Math.min(100, (goalSeconds / actualSeconds) * 100)
  : null;
```

### Final Scorecard
```typescript
let finalScore = 0;
let totalWeight = 0;

for (const config of enabledMetrics) {
  const metricValue = metrics[config.metric_key];
  if (metricValue !== null && metricValue !== undefined) {
    const metricScore = calculateMetricScore(metricValue, config.goal, config.metric_key);
    finalScore += metricScore * (config.weight / 100);
    totalWeight += config.weight;
  }
}

// Normalize if some metrics are missing (excluding pending ones)
if (totalWeight < 100 && totalWeight > 0) {
  finalScore = (finalScore / totalWeight) * 100;
}
```

---

## UI Columns by Support Type

| Column | Hybrid | Phone | Chat | Email | Logistics |
|--------|--------|-------|------|-------|-----------|
| Agent Name | Yes | Yes | Yes | Yes | Yes |
| Productivity Count | Yes | No | No | Yes | No |
| Call AHT | Yes | Yes | No | No | No |
| Chat AHT | Yes | No | Yes | No | No |
| Chat FRT | Yes | No | Yes | No | No |
| QA | Yes | Yes | Yes | Yes | No |
| Revalida | Yes (Pending) | Yes (Pending) | Yes (Pending) | Yes (Pending) | No |
| Reliability | Yes | Yes | Yes | Yes | Yes |
| OT Productivity | Placeholder | Placeholder | Placeholder | Placeholder | No |
| Final Score | Yes | Yes | Yes | Yes | Yes (= Reliability) |

---

## Visual Indicators
- **Green**: Metric >= 100% of goal
- **Yellow**: Metric 80-99% of goal
- **Red**: Metric < 80% of goal
- **Grey/Pending**: Metric not yet available (Revalida, Zendesk not fetched)

---

## Implementation Steps

### Step 1: Database Migration
- Create `scorecard_config` table with RLS
- Create `zendesk_agent_metrics` table with RLS
- Insert default weight/goal configuration for all 5 support types

### Step 2: Create Edge Function
- Build `fetch-zendesk-metrics` function
- Implement Zendesk Talk Stats and Chat API integration
- Cache results in `zendesk_agent_metrics`

### Step 3: Create Scorecard API
- Build `src/lib/scorecardApi.ts`
- Query `agent_profiles` for agent list filtered by position
- Exclude Terminated, Team Lead, Technical Support
- Join with ticket_logs, qa_evaluations, profile_events, leave_requests
- Implement all calculation functions

### Step 4: Build Scorecard Page
- Create `src/pages/TeamScorecard.tsx`
- Week navigation (Monday-Sunday)
- Support type filter dropdown
- Dynamic table columns per support type
- Color-coded performance indicators

### Step 5: Update Navigation
- Add "Scorecard" to Layout.tsx Team Performance menu
- Add route `/team-performance/scorecard` to App.tsx

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| Database Migration | Create | scorecard_config + zendesk_agent_metrics tables |
| `supabase/functions/fetch-zendesk-metrics/index.ts` | Create | Zendesk performance metrics fetching |
| `src/lib/scorecardApi.ts` | Create | Scorecard data aggregation using agent_profiles as base |
| `src/pages/TeamScorecard.tsx` | Create | Main scorecard page component |
| `src/components/Layout.tsx` | Modify | Add Scorecard to Team Performance menu |
| `src/App.tsx` | Modify | Add /team-performance/scorecard route |

---

## Access Control
- Everyone (all logged-in users) can view the Scorecard page
- All eligible agents' data visible to all authenticated users
- Scorecard configuration (weights/goals) editable by admins only (future)
