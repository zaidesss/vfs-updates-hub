# Agent Reports + Enhanced Status Controls - Remaining Tasks

## ✅ Completed (This Step)
1. **Edge Function**: Created `send-status-alert-notification` for real-time alerts (Email via Resend + Slack + in-app notifications)
2. **AgentDashboard Integration**: Added bio state management, exceeded event handlers, and passed props to StatusButtons
3. **API Bio Handling**: Updated `updateProfileStatus` to track bio time consumption on BIO_END and initialize allowance on LOGIN

---

## Remaining Tasks

### 1. Auto-Logout Logic on LOGIN Attempt
When an agent attempts to LOGIN, check if they have a "stale" login from a previous day (e.g., they forgot to log out yesterday). If so:
- Auto-insert a LOGOUT event for the previous session (with NO_LOGOUT incident type)
- Create an `agent_report` record for the NO_LOGOUT violation
- Proceed with the new LOGIN

**Implementation Location**: `updateProfileStatus` in `src/lib/agentDashboardApi.ts`

### 2. Create `generate-agent-reports` Edge Function
Scheduled edge function for daily automated report generation:
- Run daily at midnight EST
- Analyze previous day's profile_events for violations
- Generate agent_reports for: NO_LOGOUT, EXCESSIVE_RESTART, BIO_OVERUSE, LATE_LOGIN
- Send summary digest to admins

### 3. End-to-End Testing
- Test bio timer countdown and exceeded alert
- Test device restart timer and 5-minute alert
- Verify agent_reports are created correctly
- Confirm notifications reach admins via email/Slack

---

## Technical Notes

### Timer Accuracy
Timers run client-side with 1-second intervals. Server-side verification uses `status_since` timestamp.

### Notification De-duplication
Refs (`restartExceededNotifiedRef`, `bioExceededNotifiedRef`) prevent duplicate alerts per session.

### Bio Allowance Rules
- 8+ hour shift: 4 minutes (240 seconds)
- Less than 8 hours: 2 minutes (120 seconds)
- Resets on each LOGIN event
