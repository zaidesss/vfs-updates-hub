

# Fix Gap Tracking Based on Login Status

## Problem

Gap tracking shows "disabled" because the current logic checks `agent_profiles.employment_status` (which is for HR status like Active/Inactive/Resigned). The correct logic should check `profile_status.current_status` to see if the agent is currently logged in.

## Correct Definition of "Active"

| Status | Gap Tracking |
|--------|--------------|
| LOGGED_IN | Enabled |
| ON_BREAK | Disabled |
| COACHING | Disabled |
| RESTARTING | Disabled |
| LOGGED_OUT | Disabled |

## Data Flow

```text
ticket_logs.agent_name
       ↓
agent_directory.agent_tag (match)
       ↓
agent_directory.email
       ↓
agent_profiles.email → agent_profiles.id
       ↓
profile_status.profile_id → profile_status.current_status
       ↓
isActive = (current_status === 'LOGGED_IN')
```

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/ticketLogsApi.ts` | Update `fetchDashboardData` to check `profile_status.current_status` instead of `employment_status` |
| `supabase/functions/calculate-daily-gaps/index.ts` | Update gap calculation to check login status |

## Implementation Details

### 1. Update `fetchDashboardData` in ticketLogsApi.ts

**Current logic (wrong):**
```typescript
// Fetch active agent profiles
const { data: profiles } = await supabase
  .from('agent_profiles')
  .select('email, employment_status');

const activeEmails = new Set(
  (profiles || [])
    .filter(p => p.employment_status === 'Active')
    .map(p => p.email?.toLowerCase())
);
```

**New logic:**
```typescript
// Fetch agent_directory to map agent_tag → email
const { data: agentDir } = await supabase
  .from('agent_directory')
  .select('agent_tag, email');

const tagToEmail: Record<string, string> = {};
for (const agent of agentDir || []) {
  if (agent.agent_tag && agent.email) {
    tagToEmail[agent.agent_tag.toLowerCase()] = agent.email.toLowerCase();
  }
}

// Fetch agent_profiles to get profile IDs
const { data: profiles } = await supabase
  .from('agent_profiles')
  .select('id, email');

const emailToProfileId: Record<string, string> = {};
for (const p of profiles || []) {
  if (p.email) {
    emailToProfileId[p.email.toLowerCase()] = p.id;
  }
}

// Fetch profile_status to get current login status
const { data: statusData } = await supabase
  .from('profile_status')
  .select('profile_id, current_status');

const profileIdToStatus: Record<string, string> = {};
for (const s of statusData || []) {
  profileIdToStatus[s.profile_id] = s.current_status;
}

// When building result:
const agentEmail = tagToEmail[agentName.toLowerCase()];
const profileId = agentEmail ? emailToProfileId[agentEmail] : null;
const currentStatus = profileId ? profileIdToStatus[profileId] : null;
const isActive = currentStatus === 'LOGGED_IN';
```

### 2. Update `calculate-daily-gaps` Edge Function

Same lookup chain to determine if gap calculation should run for an agent:
- Get `agent_tag` → `email` from `agent_directory`
- Get `email` → `profile_id` from `agent_profiles`
- Get `profile_id` → `current_status` from `profile_status`
- Only calculate gaps if `current_status === 'LOGGED_IN'`

## Steps

| Step | Action |
|------|--------|
| 1 | Update `fetchDashboardData` to fetch `agent_directory`, `agent_profiles`, and `profile_status` |
| 2 | Create lookup chain: agent_tag → email → profile_id → current_status |
| 3 | Set `isActive = (current_status === 'LOGGED_IN')` |
| 4 | Update `calculate-daily-gaps` edge function with same logic |
| 5 | Deploy edge function |
| 6 | Test that gap tracking shows correctly based on login status |

## Expected Result

- Agent is LOGGED_IN → Gap data shows (e.g., "5m 30s")
- Agent is ON_BREAK/COACHING/RESTARTING/LOGGED_OUT → Shows "Gap tracking disabled"

