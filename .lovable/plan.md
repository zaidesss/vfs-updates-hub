

# Implementation Plan: Bio Events, Slack Notifications, and Daily Report Cleanup

## Overview
This plan adds Bio events to Today's Activity, implements channel-specific Slack notifications for all profile events, and updates the Agent Reports alert format while disabling the Daily Agent Report Slack notification.

---

## Changes Summary

| Area | Changes |
|------|---------|
| Today's Activity | Add BIO_START and BIO_END events to the display |
| New Edge Function | Create `send-profile-status-notification` for posting status changes to Slack channels |
| Frontend API | Update `updateProfileStatus` to call the new edge function for all events |
| Agent Reports Alerts | Update format, target `a_pb_mgt` channel, make message subtle |
| Daily Reports | Disable Slack notification (keep email and in-app) |

---

## Step 1: Add Bio Events to Today's Activity

**File:** `src/components/dashboard/DailyEventSummary.tsx`

Add two new entries to `EVENT_CONFIG`:
- `BIO_START` → "Bio Break" with a suitable icon (e.g., `Droplet` or reuse `Coffee`)
- `BIO_END` → "Bio Ended" with the same icon

---

## Step 2: Create New Edge Function for Profile Status Notifications

**New File:** `supabase/functions/send-profile-status-notification/index.ts`

This function will:
1. Accept `agentName`, `agentEmail`, `eventType`, and `timestamp`
2. Determine the target Slack channel:
   - **LOGIN / LOGOUT** → `a_cyrus_li-lo`
   - **All other events** (BREAK_IN, BREAK_OUT, COACHING_START, COACHING_END, DEVICE_RESTART_START, DEVICE_RESTART_END, BIO_START, BIO_END) → `a_cyrus_cs-all`
3. Use Slack API with bot token to post a **subtle, single-line message** like:
   - `John Doe logged in at 9:15 AM EST`
   - `Jane Smith started a break at 2:30 PM EST`
4. No blocks, headers, or context sections - just clean text

**Slack API Format (subtle):**
```json
{
  "channel": "a_cyrus_li-lo",
  "text": "John Doe logged in at 9:15 AM EST"
}
```

**Required Secret:** `SLACK_BOT_TOKEN`

---

## Step 3: Update Frontend to Call New Edge Function

**File:** `src/lib/agentDashboardApi.ts`

Modify `updateProfileStatus` to:
1. After successfully recording the event, call `send-profile-status-notification` for **all** event types
2. Fire-and-forget (don't block on response)

---

## Step 4: Update Agent Reports Alert Format

**File:** `supabase/functions/send-status-alert-notification/index.ts`

1. Target channel `a_pb_mgt` for incident alerts
2. Update message format to be subtle and creative:
   - **BIO_OVERUSE:** `Bio Break Overuse • John Doe has exceeded their bio break allowance (low severity). <https://vfs-updates-hub.lovable.app/team-performance/agent-reports|Review in Agent Reports>`
   - **EXCESSIVE_RESTART:** `Excessive Restart • Jane Smith has exceeded the 5-min restart limit (medium severity). <https://vfs-updates-hub.lovable.app/team-performance/agent-reports|Review in Agent Reports>`

---

## Step 5: Disable Daily Agent Report Slack Notification

**File:** `supabase/functions/generate-agent-reports/index.ts`

Comment out or remove the Slack notification block (lines 424-456) while keeping:
- Email notifications (Resend)
- In-app notifications

---

## Technical Details

### New Environment Variable Needed
You'll need to provide a `SLACK_BOT_TOKEN` with the following scopes:
- `chat:write` - Post messages to channels
- `channels:read` - Look up channel IDs by name (optional if using channel names)

The bot must be added to the channels: `a_cyrus_li-lo`, `a_cyrus_cs-all`, and `a_pb_mgt`.

### Event Type to Message Mapping
| Event Type | Label | Channel |
|------------|-------|---------|
| LOGIN | logged in | a_cyrus_li-lo |
| LOGOUT | logged out | a_cyrus_li-lo |
| BREAK_IN | started a break | a_cyrus_cs-all |
| BREAK_OUT | ended their break | a_cyrus_cs-all |
| COACHING_START | started coaching | a_cyrus_cs-all |
| COACHING_END | ended coaching | a_cyrus_cs-all |
| DEVICE_RESTART_START | is restarting device | a_cyrus_cs-all |
| DEVICE_RESTART_END | device restored | a_cyrus_cs-all |
| BIO_START | started bio break | a_cyrus_cs-all |
| BIO_END | ended bio break | a_cyrus_cs-all |

### Files to Create/Modify
1. **Create:** `supabase/functions/send-profile-status-notification/index.ts`
2. **Modify:** `src/components/dashboard/DailyEventSummary.tsx`
3. **Modify:** `src/lib/agentDashboardApi.ts`
4. **Modify:** `supabase/functions/send-status-alert-notification/index.ts`
5. **Modify:** `supabase/functions/generate-agent-reports/index.ts`
6. **Modify:** `supabase/config.toml` (register new function)

