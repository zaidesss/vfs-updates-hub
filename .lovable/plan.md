

## Analysis: Agent Reports Conflicts and False Report Risks

I've audited all three systems that generate/manage agent reports:
1. **`generate-agent-reports`** (daily batch, runs for yesterday)
2. **`auto-logout-stale-sessions`** (cron, every 15 min)
3. **`checkAndCleanupStaleSession`** (client-side, on dashboard mount)

### Issues Found

**1. No terminated agent filter (FALSE REPORTS)**
`generate-agent-reports` fetches ALL `agent_profiles` without filtering `employment_status != 'Terminated'`. Terminated agents with scheduled shifts would generate false NCNS, QUOTA_NOT_MET, and other reports.

**2. QUOTA_NOT_MET uses base profile quotas instead of effective quotas**
Line 690 calls `calculateExpectedQuota(profile)` using base profile fields. It ignores the effective quotas already resolved from `get_effective_schedule` (which accounts for coverage overrides and schedule assignments). This produces false quota reports when overrides modify quotas.

**3. Three NO_LOGOUT producers — no conflict but redundant Slack alerts**
The cron, client cleanup, and daily batch all check for duplicates before inserting. No duplicate reports. However, the client-side cleanup and the cron both send separate Slack/alert notifications even though the report deduplication prevents doubles. A stale session could trigger an alert from the client and then the cron tries again (finds duplicate, but the cron doesn't send alerts, so this is fine). No action needed here.

**4. LATE_LOGIN OT grace period not implemented**
Memory references a 30-minute grace for back-to-back shifts, but the code has no such logic. If an agent's previous OT session bleeds into their next regular shift start, they'd be falsely flagged for LATE_LOGIN.

**5. EARLY_OUT and TIME_NOT_MET correctly exclude SYSTEM_AUTO_LOGOUT**
Already handled at line 302. No issue here.

### Plan (Step-by-Step)

**Step 1: Filter terminated agents**
Add `employment_status` to the profile query and skip terminated agents in the main loop.

**Step 2: Use effective quotas for QUOTA_NOT_MET**
Replace `calculateExpectedQuota(profile)` with the effective quotas from the already-resolved `effectiveRow` (`effective_quota_email`, `effective_quota_chat`, `effective_quota_phone`).

**Step 3: Add LATE_LOGIN OT grace period (30 min)**
Before flagging LATE_LOGIN, check if the agent has an OT_LOGOUT event within 30 minutes before their regular shift start. If so, extend the grace period by 30 minutes.

**Step 4: Skip Team Lead / Technical positions from quota checks**
Ensure non-ticket-handling roles are excluded from QUOTA_NOT_MET and HIGH_GAP checks (currently `calculateExpectedQuota` returns 0 for them, but adding an explicit skip is safer).

