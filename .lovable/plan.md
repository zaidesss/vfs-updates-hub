

## Fix: Spurious Notifications from OT Logout and Bio Overuse

### Problem 1 -- OT Logout triggers false Early Out alert
When an agent clicks **OT Logout**, the system transitions from `ON_OT` to `LOGGED_IN`. However, the same code path that handles regular `LOGOUT` also runs for `OT_LOGOUT`, calling `checkAndAlertEarlyOut`. This compares the OT logout time against the agent's **regular** shift end time, incorrectly generating an Early Out report and sending Slack/email notifications (as shown in the Biah Mae screenshot -- 570 minutes early).

**Fix**: In `src/lib/agentDashboardApi.ts` line 751, change the condition from `eventType === 'LOGOUT' || eventType === 'OT_LOGOUT'` to just `eventType === 'LOGOUT'`. OT Logout should not check early out against the regular schedule.

### Problem 2 -- Bio Overuse sends duplicate notifications
In `src/pages/AgentDashboard.tsx`, the `handleBioExceeded` callback sends the Slack/email notification **outside** the `if (!existingReport)` block (line 597-605). This means if the bio exceeded callback fires again (e.g., on re-render), it sends another Slack + email alert even though no new report was created.

**Fix**: Move the `send-status-alert-notification` call inside the `if (!existingReport)` block, so notifications only fire when a new report is actually created.

### Files to Change

1. **`src/lib/agentDashboardApi.ts`** (line 751)
   - Remove `OT_LOGOUT` from the early-out check condition
   - Only `LOGOUT` should trigger early out detection

2. **`src/pages/AgentDashboard.tsx`** (lines 597-605)
   - Move the notification call inside the `if (!existingReport)` block

### Steps
- Step 1: Fix the OT_LOGOUT early-out false positive
- Step 2: Fix the BIO_OVERUSE duplicate notification
- Step 3: Re-deploy and verify

