

# Upwork Time Integration Plan (Updated)

## Overview

This plan integrates Upwork timesheet data into your portal by:
1. Adding `upwork_contract_id` column to Master Directory
2. Fetching Upwork time when an agent logs out
3. Storing time data and displaying both Upwork and Portal time in Daily Work Tracker
4. Auto-archiving and deleting data older than 2 weeks

---

## Data Flow

```text
Agent clicks LOG OUT in portal
         ↓
profile_events records LOGOUT event
         ↓
Trigger: Call fetch-upwork-time edge function
         ↓
Edge function:
  1. Look up upwork_contract_id from agent_directory
  2. Call Upwork API work diary endpoint
  3. Store hours in upwork_time_logs table
         ↓
Dashboard shows:
  - Time Logged (Upwork): From upwork_time_logs
  - Time Logged (Portal): LOGIN to LOGOUT duration
```

---

## Database Changes

### 1. Add Column to agent_directory

| Column | Type | Description |
|--------|------|-------------|
| upwork_contract_id | text | Upwork contract ID for API lookup |

### 2. New Table: upwork_time_logs

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| profile_id | uuid | FK to agent_profiles |
| contract_id | text | Upwork contract ID |
| date | date | Date of the time entry |
| hours_logged | decimal | Total hours from Upwork |
| memo | text | Optional work description |
| fetched_at | timestamptz | When this was fetched |
| created_at | timestamptz | Record creation time |

---

## API Credentials Setup

### Secrets Required

| Secret Name | Description |
|-------------|-------------|
| UPWORK_CLIENT_ID | OAuth2 Client ID |
| UPWORK_CLIENT_SECRET | OAuth2 Client Secret |
| UPWORK_ACCESS_TOKEN | OAuth2 Access Token |
| UPWORK_REFRESH_TOKEN | OAuth2 Refresh Token |

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| agent_directory | Add column | upwork_contract_id field |
| upwork_time_logs table | Create | Store fetched Upwork time |
| src/lib/masterDirectoryApi.ts | Modify | Add upwork_contract_id to interface |
| src/pages/MasterDirectory.tsx | Modify | Add Upwork Contract ID column after Day Off |
| supabase/functions/fetch-upwork-time/index.ts | Create | Fetch time from Upwork API |
| supabase/functions/cleanup-upwork-logs/index.ts | Create | Archive and delete old records |
| src/lib/agentDashboardApi.ts | Modify | Add functions to get Upwork and Portal time |
| src/components/dashboard/DailyWorkTracker.tsx | Modify | Display both time sources |
| src/pages/AgentDashboard.tsx | Modify | Fetch and pass time data |

---

## Implementation Details

### 1. Master Directory Column

Add input field after "Day Off" column for Upwork Contract ID. Team leads can enter the contract ID for each agent.

### 2. Portal Time Calculation (Simplified)

Calculate from profile_events for the current day:
- Find first LOGIN event of the day
- Find last LOGOUT event (or use current time if still logged in)
- **Total Duration = LOGOUT timestamp - LOGIN timestamp**
- No subtraction of breaks, coaching, or restarts

Example:
| Event | Time |
|-------|------|
| LOGIN | 9:00 AM |
| BREAK_IN | 12:00 PM |
| BREAK_OUT | 12:30 PM |
| LOGOUT | 5:00 PM |

**Portal Time = 8 hours** (5:00 PM - 9:00 AM)

### 3. Edge Function: fetch-upwork-time

Triggered when: Agent logs out (LOGOUT event)

Steps:
1. Look up upwork_contract_id from agent_directory by email
2. If no contract_id, skip (not all agents may have Upwork)
3. Call Upwork API work diary endpoint with contract and date
4. Extract total hours from response
5. Upsert to upwork_time_logs table

### 4. Daily Work Tracker Display

```text
┌─────────────────────────────────────────────────────────┐
│ Daily Work Tracker                              [🔄]    │
├─────────────────────────────────────────────────────────┤
│  🎫 Tickets Handled          ⏱️ Avg Gap                 │
│     18/50                       5m 30s                  │
│  ████████████░░░░░░  36%                                │
├─────────────────────────────────────────────────────────┤
│  ⏰ Time Logged (Portal)     ⏰ Time Logged (Upwork)    │
│     8h 00m                      7h 50m                  │
└─────────────────────────────────────────────────────────┘
```

### 5. Cleanup Function

Same pattern as cleanup-ticket-logs:
1. Find records older than 14 days
2. Archive to storage bucket (upwork-archives)
3. Delete archived records

---

## Potential Conflicts and Considerations

| Issue | Mitigation |
|-------|------------|
| OAuth Token Expiry | Store refresh token, auto-refresh access token before API calls |
| No Contract ID | Skip Upwork fetch for agents without contract ID (graceful fallback) |
| Multiple Logouts/Day | Upsert logic - update existing record for same date |
| API Rate Limits | One fetch per logout is low volume, unlikely to hit limits |
| Timezone Mismatch | Upwork uses UTC, portal uses EST - normalize to user's date |
| Network Failures | Retry logic with exponential backoff; log failures for debugging |
| User Not on Upwork Yet | Contract ID is optional; UI shows "N/A" if no Upwork data |

---

## Step-by-Step Implementation

| Step | Task |
|------|------|
| 1 | Add Upwork secrets (CLIENT_ID, CLIENT_SECRET, ACCESS_TOKEN, REFRESH_TOKEN) |
| 2 | Create database migration: add upwork_contract_id column + upwork_time_logs table |
| 3 | Update masterDirectoryApi.ts to include upwork_contract_id |
| 4 | Update MasterDirectory.tsx to show Upwork Contract ID column |
| 5 | Create fetch-upwork-time edge function |
| 6 | Modify updateProfileStatus to trigger fetch on LOGOUT |
| 7 | Add getPortalTime and getUpworkTime functions in agentDashboardApi.ts |
| 8 | Update DailyWorkTracker to show both time sources |
| 9 | Create cleanup-upwork-logs edge function |
| 10 | Create upwork-archives storage bucket |
| 11 | Test end-to-end |

