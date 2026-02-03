

# Plan: Complete Compliance System Enhancement

## Summary

This plan implements a comprehensive update to the compliance monitoring system with:
1. **Dynamic Severity** for all violations based on magnitude
2. **QUOTA_NOT_MET** violation tracking for ticket quotas
3. **HIGH_GAP** violation for Email Support agents
4. **Upwork Time** as the primary source for TIME_NOT_MET
5. **Updated NO_LOGOUT** logic with 3-hour threshold

---

## Complete Severity Thresholds

### Time-Based Violations (LATE_LOGIN, EARLY_OUT, OVERBREAK, TIME_NOT_MET, BIO_OVERUSE, EXCESSIVE_RESTARTS)
| Violation Magnitude | Severity |
|---------------------|----------|
| 1-5 minutes | Low |
| 6-15 minutes | Medium |
| 16+ minutes | High |

### Ticket Quota (QUOTA_NOT_MET)
| Tickets Short | Severity |
|---------------|----------|
| 1-10 tickets | Low |
| 11-19 tickets | Medium |
| 20+ tickets | High |

### No Logout (NO_LOGOUT)
| Condition | Severity |
|-----------|----------|
| 3+ hours past scheduled shift end | High |

### Average Ticket Gap (HIGH_GAP) - Email Support Only
| Average Gap | Severity |
|-------------|----------|
| Under 5 minutes | No violation |
| 5-10 minutes | Medium |
| 10+ minutes | High |

---

## What's Being Added/Changed

### 1. QUOTA_NOT_MET (New Violation)
- **Who**: All agents with quotas defined in their profile
- **Trigger**: Daily ticket count less than expected quota
- **Data Sources**: 
  - Quota from `agent_profiles` based on support type
  - Actual tickets from `ticket_logs`
- **Notifications**: Slack (#a_pb_mgt), Email, In-app

### 2. HIGH_GAP (Enable for Email Support)
- **Who**: Email Support agents only
- **Trigger**: Average daily gap between tickets exceeds 5 minutes
- **Data Source**: `ticket_gap_daily.avg_gap_seconds`
- **Severity**: Medium (5-10 min), High (10+ min)

### 3. NO_LOGOUT (Updated Logic)
- **Trigger**: Agent still "logged in" 3+ hours after scheduled shift end
- **Severity**: Always High (significant oversight)
- **Data Sources**: `profile_status`, `agent_directory.weekday_schedule`

### 4. TIME_NOT_MET (Upwork Priority)
- **Primary Source**: `upwork_daily_logs.total_hours` for agents with `upwork_contract_id`
- **Fallback**: Portal time (LOGIN → LOGOUT duration)
- **Threshold**: Less than 90% of required hours

### 5. Dynamic Severity (All Violations)
- Replace static severity assignments with calculated values
- Based on violation magnitude vs. thresholds defined above

---

## Technical Implementation

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-agent-reports/index.ts` | Add all new checks, dynamic severity, Upwork query |
| `supabase/functions/send-status-alert-notification/index.ts` | Add QUOTA_NOT_MET and HIGH_GAP alert types |
| `src/lib/agentDashboardApi.ts` | Add dynamic severity helpers for real-time alerts |

### New Alert Types for Notification Function

```text
ALERT_CONFIGS additions:
- QUOTA_NOT_MET: { emoji: '📊', label: 'Quota Not Met' }
- HIGH_GAP: { emoji: '⏳', label: 'High Ticket Gap' }
```

### Helper Functions

```text
// Time-based violations (minutes)
calculateTimeSeverity(minutes: number): 'low' | 'medium' | 'high'
  → 1-5 = low, 6-15 = medium, 16+ = high

// Ticket quota shortfall
calculateQuotaSeverity(ticketsShort: number): 'low' | 'medium' | 'high'
  → 1-10 = low, 11-19 = medium, 20+ = high

// Average gap (minutes) - Email Support only
calculateGapSeverity(avgGapMinutes: number): 'medium' | 'high' | null
  → <5 = null (no violation), 5-10 = medium, 10+ = high
```

### Detection Logic Details

**QUOTA_NOT_MET:**
```text
1. Get agent's position (Email/Chat/Hybrid/Phone Support)
2. Calculate expected quota:
   - Email Support: quota_email
   - Chat Support: quota_email + quota_chat
   - Phone Support: quota_email + quota_phone
   - Hybrid Support: quota_email + quota_chat + quota_phone
3. Query ticket_logs for target date
4. If actual < expected: Create report with severity
```

**HIGH_GAP (Email Support Only):**
```text
1. Check if agent position = 'Email Support'
2. Query ticket_gap_daily for target date
3. Convert avg_gap_seconds to minutes
4. If avg_gap >= 5 minutes: Create report
   - 5-10 min = medium
   - 10+ min = high
```

**NO_LOGOUT:**
```text
1. Get agent's scheduled shift end time
2. Calculate hours elapsed since shift end
3. If elapsed >= 3 hours AND status != 'LOGGED_OUT':
   Create report with High severity
```

**TIME_NOT_MET (Upwork Priority):**
```text
1. Check if agent has upwork_contract_id
2. If yes: Query upwork_daily_logs for total_hours
3. If no Upwork data: Fall back to Portal time
4. Compare against required hours (from schedule)
5. If logged < 90% required: Create report with dynamic severity
```

---

## Data Flow Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│              generate-agent-reports (5 AM UTC)              │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Profile Check │    │ Ticket Check  │    │ Time Check    │
└───────┬───────┘    └───────┬───────┘    └───────┬───────┘
        │                    │                    │
        ▼                    ▼                    ▼
   NO_LOGOUT            QUOTA_NOT_MET        TIME_NOT_MET
   (3hr+ past           HIGH_GAP             (Upwork first)
    shift end)          (Email only)
        │                    │                    │
        └────────────────────┼────────────────────┘
                             ▼
                   ┌───────────────────┐
                   │ Calculate Severity│
                   │ (Dynamic based on │
                   │  magnitude)       │
                   └─────────┬─────────┘
                             ▼
              ┌──────────────┴──────────────┐
              ▼                             ▼
    ┌─────────────────┐           ┌─────────────────┐
    │ agent_reports   │           │ Notifications   │
    │ (database)      │           │ (Slack/Email)   │
    └─────────────────┘           └─────────────────┘
```

---

## Implementation Steps

1. **Step 1**: Add severity helper functions to `generate-agent-reports`
2. **Step 2**: Update existing violation checks to use dynamic severity
3. **Step 3**: Add QUOTA_NOT_MET detection logic
4. **Step 4**: Add HIGH_GAP detection for Email Support
5. **Step 5**: Update NO_LOGOUT to check 3-hour threshold
6. **Step 6**: Update TIME_NOT_MET to query Upwork first
7. **Step 7**: Add new alert types to `send-status-alert-notification`
8. **Step 8**: Update real-time checks in `agentDashboardApi.ts`
9. **Step 9**: Deploy edge functions and test

---

## Summary of All Violations After Implementation

| Violation | Trigger | Severity Logic | Slack Channel |
|-----------|---------|----------------|---------------|
| LATE_LOGIN | >10 min late | 1-5m low, 6-15m med, 16+ high | #a_pb_mgt |
| EARLY_OUT | Logout before shift end | 1-5m low, 6-15m med, 16+ high | #a_pb_mgt |
| OVERBREAK | Break exceeds allowance | 1-5m low, 6-15m med, 16+ high | #a_pb_mgt |
| TIME_NOT_MET | <90% required (Upwork) | 1-5m low, 6-15m med, 16+ high | #a_pb_mgt |
| BIO_OVERUSE | Bio exceeds allowance | 1-5m low, 6-15m med, 16+ high | #a_pb_mgt |
| EXCESSIVE_RESTARTS | >5 min restart time | 1-5m low, 6-15m med, 16+ high | #a_pb_mgt |
| NO_LOGOUT | 3+ hours past shift end | Always High | #a_pb_mgt |
| QUOTA_NOT_MET | Tickets < quota | 1-10 low, 11-19 med, 20+ high | #a_pb_mgt |
| HIGH_GAP | Avg gap >5 min (Email) | 5-10m med, 10+ high | #a_pb_mgt |

