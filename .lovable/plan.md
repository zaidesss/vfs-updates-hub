

## Fix: Email Notifications Sent Without Incident Reports (RLS Violation)

### Root Cause (Confirmed by Database Logs)

The Postgres logs contain this error at the exact timestamp of Richelle's email:

```text
ERROR: "new row violates row-level security policy for table 'agent_reports'"
```

**What happened step-by-step:**

1. Richelle logged in at 6:58 PM EST on 2026-02-23
2. The `checkAndAlertLateLogin` function detected she was 598 minutes late (her shift starts ~9 AM)
3. It tried to INSERT a LATE_LOGIN report into `agent_reports`
4. The INSERT was **blocked by RLS** because the INSERT policy only allows admin/HR/super_admin roles -- Richelle is a regular agent, so her JWT was rejected
5. The code **did not check** the insert result for errors
6. It proceeded to call `sendStatusAlertNotification`, which sent the email, Slack, and in-app notifications
7. Result: email sent, no report created -- exactly what you saw

### Why This Affects All Agents (Not Just Richelle)

Every compliance check (LATE_LOGIN, EARLY_OUT, OVERBREAK) runs under the **agent's own browser session** (their JWT). Since agents don't have admin/HR roles, the INSERT always fails silently for them. Only reports created by admin-opened dashboards or the batch job (which uses the service role key) actually succeed.

### Fix Plan (4 Parts)

---

**Part 1: Gate notifications on successful insert**

Update the following 3 functions in `src/lib/agentDashboardApi.ts`:

- `checkAndAlertLateLogin` (line 983)
- `checkAndAlertEarlyOut` (line 1051)
- `checkAndAlertOverbreak` (line 1157)

For each, capture the insert result and **only send notifications if the insert succeeded**:

```typescript
const { error: insertError } = await supabase.from('agent_reports').insert({...});
if (insertError) {
  console.error('Failed to insert report:', insertError.message);
  return; // Do NOT send notifications
}
// Only now send the notification
await sendStatusAlertNotification(...);
```

---

**Part 2: Fix RLS policy for agent_reports inserts**

The current INSERT policy only allows admin/HR/super_admin. Since compliance checks run client-side under the agent's JWT, agents need INSERT permission for their **own** reports.

Add a new RLS policy:

```sql
CREATE POLICY "Agents can insert own reports"
ON public.agent_reports
FOR INSERT
TO authenticated
WITH CHECK (
  agent_email = LOWER(auth.jwt() ->> 'email')
);
```

This allows any authenticated user to insert a report **only** for themselves (matching `agent_email` to their JWT email). This is safe because:
- Agents can only create reports against their own email
- The report data (severity, details) is calculated server-side by the compliance functions
- Admins/HR already have broader INSERT via the existing policy

---

**Part 3: Audit EXCESSIVE_RESTART handler**

The `handleRestartExceeded` callback in `AgentDashboard.tsx` (line 563) sends a notification **without creating a report at all**. This should be updated to:
1. First create an `EXCESSIVE_RESTARTS` report in `agent_reports`
2. Only send the notification if the insert succeeds
3. Follow the same pattern as `BIO_OVERUSE` (which already creates a report before notifying)

---

**Part 4: Add insert error logging**

For all 5 compliance insert points (LATE_LOGIN, EARLY_OUT, OVERBREAK, BIO_OVERUSE, EXCESSIVE_RESTART), add explicit error logging so failed inserts are visible:

```typescript
const { error } = await supabase.from('agent_reports').insert({...});
if (error) {
  console.error(`[COMPLIANCE] Failed to insert ${incidentType} report for ${agentEmail}:`, error.message);
  return;
}
```

---

### Files Changed

| File | Changes |
|------|---------|
| `src/lib/agentDashboardApi.ts` | Gate notifications on insert success for LATE_LOGIN, EARLY_OUT, OVERBREAK; add error logging |
| `src/pages/AgentDashboard.tsx` | Update EXCESSIVE_RESTART to create report before notifying; add error logging to BIO_OVERUSE |
| Database migration | Add RLS policy allowing agents to insert their own reports |

### Implementation Order

We will do this step by step:
1. First: Add the RLS policy (database migration)
2. Second: Fix `checkAndAlertLateLogin` with insert error gating
3. Third: Fix `checkAndAlertEarlyOut` and `checkAndAlertOverbreak`
4. Fourth: Fix `handleRestartExceeded` in AgentDashboard.tsx
5. Fifth: Verify all insert points have error logging

