

# Complete Violations & Real-time Slack Alerts Implementation
**(QUOTA_NOT_MET and HIGH_GAP DISABLED per your request)**

## Overview
Expand the `send-status-alert-notification` edge function to handle ALL violation types **except** QUOTA_NOT_MET and HIGH_GAP, and add real-time Slack detection for violations that currently only exist in the daily report.

---

## Violations Status - Updated

| Violation | Real-time Slack? | Daily Report? | Action |
|-----------|------------------|---------------|--------|
| BIO_OVERUSE | ✅ Working | ✅ | Keep as-is |
| EXCESSIVE_RESTARTS | ✅ Working | ✅ | Keep as-is |
| NO_LOGOUT | ❌ | ✅ | Add real-time Slack |
| LATE_LOGIN | ❌ | ✅ | Add real-time Slack on LOGIN |
| EARLY_OUT | ❌ | ❌ | Add real-time + daily detection |
| OVERBREAK | ❌ | ❌ | Add real-time + daily detection |
| TIME_NOT_MET | ❌ | ❌ | Add daily detection only |
| ~~QUOTA_NOT_MET~~ | ❌ | ❌ | **DISABLED** - pending quota finalization |
| ~~HIGH_GAP~~ | ❌ | ❌ | **DISABLED** - pending quota finalization |

---

## Implementation Steps

### Step 1: Expand `send-status-alert-notification` Edge Function

**File:** `supabase/functions/send-status-alert-notification/index.ts`

Add support for new alert types with Slack message templates:

| Alert Type | Emoji | Slack Message Format |
|------------|-------|---------------------|
| BIO_OVERUSE | 🚿 | Already configured |
| EXCESSIVE_RESTART | 🔄 | Already configured |
| LATE_LOGIN | 🕐 | `*Late Login* • {name} logged in {X} mins late ({severity}). [Review]` |
| EARLY_OUT | 🚪 | `*Early Out* • {name} logged out {X} mins early ({severity}). [Review]` |
| NO_LOGOUT | 🔴 | `*No Logout* • {name} did not log out from previous session ({severity}). [Review]` |
| OVERBREAK | ☕ | `*Overbreak* • {name} exceeded break by {X} mins ({severity}). [Review]` |
| TIME_NOT_MET | ⏱️ | `*Hours Not Met* • {name} logged {X}h/{Y}h required ({severity}). [Review]` |

---

### Step 2: Add Real-time LATE_LOGIN Detection

**File:** `src/lib/agentDashboardApi.ts`

In `updateProfileStatus`, after a successful LOGIN:
1. Get the agent's schedule for today from `agent_directory`
2. Compare current login time vs scheduled start time (in EST)
3. If more than 10 minutes late → call `send-status-alert-notification` with `LATE_LOGIN`

---

### Step 3: Add Real-time EARLY_OUT Detection

**File:** `src/lib/agentDashboardApi.ts`

In `updateProfileStatus`, after a successful LOGOUT:
1. Get the agent's schedule for today
2. Compare logout time vs scheduled end time (in EST)
3. If logout is before shift end → call `send-status-alert-notification` with `EARLY_OUT`
4. Create an `agent_reports` record

---

### Step 4: Add Real-time NO_LOGOUT Slack Alert

**File:** `src/lib/agentDashboardApi.ts`

The stale login detection (lines 288-337) already creates an `agent_reports` record. Add a Slack notification by calling `send-status-alert-notification` with `NO_LOGOUT` immediately after creating the report.

---

### Step 5: Add Real-time OVERBREAK Detection

**File:** `src/lib/agentDashboardApi.ts`

In `updateProfileStatus`, after a successful BREAK_OUT:
1. Calculate total break duration for the day from `profile_events`
2. Get allowed break from `agent_directory.break_schedule`
3. If exceeded by more than 5-minute grace → call `send-status-alert-notification` with `OVERBREAK`
4. Create an `agent_reports` record

**Database Migration Required:**
```sql
-- Add OVERBREAK to valid incident types
ALTER TABLE agent_reports 
DROP CONSTRAINT IF EXISTS valid_incident_type;

ALTER TABLE agent_reports
ADD CONSTRAINT valid_incident_type CHECK (incident_type IN (
  'QUOTA_NOT_MET', 'NO_LOGOUT', 'HIGH_GAP', 'EXCESSIVE_RESTARTS',
  'TIME_NOT_MET', 'LATE_LOGIN', 'EARLY_OUT', 'BIO_OVERUSE', 'OVERBREAK'
));
```

---

### Step 6: Update Daily Report for Missing Violations

**File:** `supabase/functions/generate-agent-reports/index.ts`

Add end-of-day detection for:
- **EARLY_OUT**: Compare last logout time against scheduled end time
- **OVERBREAK**: Calculate total break time vs allowed (from break_schedule)
- **TIME_NOT_MET**: Compare total logged hours against required shift hours

**NOT implementing** (disabled per request):
- ~~QUOTA_NOT_MET~~
- ~~HIGH_GAP~~

---

## Technical Notes

### Break Allowance Parsing
The `break_schedule` field in `agent_directory` contains values like "15 mins" or "30 mins". Parse this to compare against actual break duration.

### Severity Mapping
| Violation | Severity |
|-----------|----------|
| LATE_LOGIN | low |
| EARLY_OUT | medium |
| NO_LOGOUT | medium |
| OVERBREAK | low |
| TIME_NOT_MET | medium |

### Time Calculations
All time comparisons use EST/EDT timezone via `Intl.DateTimeFormat` with `timeZone: 'America/New_York'`.

---

## Summary of Changes

| File | Changes |
|------|---------|
| `send-status-alert-notification/index.ts` | Add 5 new violation types (LATE_LOGIN, EARLY_OUT, NO_LOGOUT, OVERBREAK, TIME_NOT_MET) |
| `src/lib/agentDashboardApi.ts` | Add real-time detection for LATE_LOGIN, EARLY_OUT, NO_LOGOUT Slack, OVERBREAK |
| `generate-agent-reports/index.ts` | Add EARLY_OUT, OVERBREAK, TIME_NOT_MET detection in daily run |
| Database migration | Add OVERBREAK to valid incident types |

---

## Testing Plan

After implementation, I'll test each violation type:

### Real-time Violations (can test immediately via dashboard):
1. **BIO_OVERUSE** - Already working ✅
2. **EXCESSIVE_RESTARTS** - Already working ✅
3. **LATE_LOGIN** - Login after scheduled start time
4. **EARLY_OUT** - Logout before scheduled end time
5. **NO_LOGOUT** - Login when previous session didn't logout
6. **OVERBREAK** - Take break exceeding allowance + 5 min grace

### Daily-only Violations (test by calling edge function):
7. **TIME_NOT_MET** - Manually invoke `generate-agent-reports` with a test date

All alerts will be sent to `a_pb_mgt` Slack channel with the hyperlinked "Review in Agent Reports" text.

