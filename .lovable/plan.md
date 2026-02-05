

# Plan: Add End of Day (EOD) Team Analytics

## Summary
Enhance the Daily Agent Report system to include a comprehensive **End of Day Team Analytics** summary that provides leadership with a high-level overview of the entire team's performance, not just individual violations.

---

## Current State
- `generate-agent-reports` runs daily at 5:00 AM UTC (12:00 AM EST)
- Currently only reports **violations/incidents** (negative events)
- Sends email/in-app notification with incident count by type
- No positive performance metrics or team-wide summary

---

## Proposed EOD Analytics

The EOD summary will include both **positive indicators** and **compliance metrics** to give a balanced view:

### Metrics to Include

| Category | Metric | Data Source | Calculation |
|----------|--------|-------------|-------------|
| **Attendance** | On-Time Login Rate | `profile_events` | % of scheduled agents who logged in within 10 min |
| **Attendance** | Full Shift Completion Rate | `profile_events` | % who logged out at or after scheduled end |
| **Attendance** | Total Agents Active | `profile_events` | Count of agents with LOGIN events |
| **Productivity** | Total Tickets Handled | `ticket_logs` | Sum of all tickets (email + chat + call) |
| **Productivity** | Quota Achievement Rate | `ticket_logs` + profiles | % of agents who met quota |
| **Productivity** | Avg Ticket Gap (Email) | `ticket_gap_daily` | Team average gap time |
| **Time Tracking** | Avg Hours Logged | `upwork_daily_logs` / events | Team average work hours |
| **Compliance** | Zero Violations Rate | `agent_reports` | % of agents with no incidents |
| **Compliance** | Incident Breakdown | `agent_reports` | Count by type (for context) |

### Visual Summary Format
```
📊 EOD Team Analytics - Feb 5, 2026

👥 ATTENDANCE (32 active agents)
   • On-Time Login: 94% (30/32)
   • Full Shift Completion: 88% (28/32)

📈 PRODUCTIVITY
   • Tickets Handled: 847 total
   • Quota Met: 75% (18/24 support agents)
   • Avg Ticket Gap: 3.2 min ✓

⏱️ TIME TRACKING
   • Avg Hours: 8.2h / 8.0h required

✅ COMPLIANCE
   • Clean Record: 81% (26/32 agents)
   • Incidents: 6 total (3 Late Login, 2 Early Out, 1 Overbreak)

Overall: Team performed within acceptable thresholds today.
```

---

## Technical Implementation

### New Edge Function: `generate-eod-analytics`

This will be a **separate function** called immediately after `generate-agent-reports` completes, or as part of the same cron job.

| File | Action |
|------|--------|
| `supabase/functions/generate-eod-analytics/index.ts` | **Create** - New edge function |
| `supabase/functions/generate-agent-reports/index.ts` | **Modify** - Trigger EOD analytics after report generation |

### Data Flow

```
Midnight EST (5:00 AM UTC)
        │
        ▼
┌─────────────────────────┐
│ generate-agent-reports  │ ◄─── Detects violations
└───────────┬─────────────┘
            │ (success)
            ▼
┌─────────────────────────┐
│ generate-eod-analytics  │ ◄─── Calculates positive metrics
└───────────┬─────────────┘
            │
            ▼
    ┌───────────────┐
    │ Notifications │
    ├───────────────┤
    │ • Email       │
    │ • In-App      │
    │ • Slack       │
    └───────────────┘
```

### Function Logic

```typescript
// generate-eod-analytics/index.ts

// 1. Fetch all scheduled agents for the day
const scheduledAgents = await getScheduledAgents(targetDate);

// 2. Calculate attendance metrics
const loginEvents = await getLoginEvents(targetDate);
const onTimeRate = calculateOnTimeLoginRate(scheduledAgents, loginEvents);
const completionRate = calculateShiftCompletionRate(scheduledAgents, loginEvents);

// 3. Calculate productivity metrics
const ticketLogs = await getTicketLogs(targetDate);
const totalTickets = ticketLogs.length;
const quotaAchievementRate = calculateQuotaRate(scheduledAgents, ticketLogs);
const avgTicketGap = await getAvgTicketGap(targetDate);

// 4. Calculate time tracking
const avgHoursLogged = await calculateAvgHours(targetDate);

// 5. Get compliance from agent_reports
const incidents = await getIncidents(targetDate);
const zeroViolationsRate = calculateCleanRate(scheduledAgents, incidents);

// 6. Determine overall status
const overallStatus = determineOverallStatus({
  onTimeRate,
  completionRate,
  quotaAchievementRate,
  zeroViolationsRate,
});

// 7. Send notifications
await sendEodNotifications(analytics);
```

### Thresholds for "Good Day" Status

| Metric | Acceptable | Needs Attention |
|--------|------------|-----------------|
| On-Time Login | ≥ 90% | < 90% |
| Shift Completion | ≥ 85% | < 85% |
| Quota Achievement | ≥ 70% | < 70% |
| Zero Violations | ≥ 75% | < 75% |
| Avg Ticket Gap | ≤ 5 min | > 5 min |

---

## Notification Delivery

### Email Format
- HTML-styled summary with color-coded indicators
- Green checkmarks for metrics meeting thresholds
- Yellow/red warnings for metrics needing attention

### Slack Format
- Condensed single message with key stats
- Posted to existing admin channel

### In-App Notification
- Summary card visible in notification bell
- Link to full Agent Reports page

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/generate-eod-analytics/index.ts` | **Create** | New analytics calculation function |
| `supabase/functions/generate-agent-reports/index.ts` | **Modify** | Call EOD analytics after completion |

---

## Implementation Steps

1. Create `generate-eod-analytics` edge function with metrics calculation
2. Add notification formatting (Email HTML, Slack, In-App)
3. Integrate with `generate-agent-reports` to trigger after completion
4. Deploy and test

---

## Benefits
- **Balanced View**: Shows positive metrics, not just violations
- **Quick Glance**: Leadership sees team health at a glance
- **Thresholds**: Clear indicators of acceptable vs. concerning performance
- **Single Email**: Combined with existing daily report for efficiency

