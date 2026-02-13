

## Fix: Missing Details in Agent Reports

### Problem

Some Agent Reports show dashes (-) instead of actual values (e.g., "Schedule Start: -", "Bio Time Used: - mins"). This is because the `send-status-alert-notification` edge function creates its own report record with whatever minimal details it receives, instead of leaving report creation to the dedicated functions that have full context.

Three sources of incomplete reports:

| Source | Incident Type | Details Sent | Missing Fields |
|--------|--------------|-------------|----------------|
| AgentDashboard.tsx (bio timer) | BIO_OVERUSE | `{ allowance }` | totalBioSeconds, overageSeconds |
| checkAndAlertLateLogin | LATE_LOGIN | `{ lateByMinutes, severity }` | scheduledStart, actualLogin |
| checkAndAlertEarlyOut | EARLY_OUT | `{ earlyByMinutes, severity }` | scheduledEnd, actualLogout |

### Fix (2 Steps)

**Step 1: Remove report creation from the edge function**

File: `supabase/functions/send-status-alert-notification/index.ts`

Remove the `agent_reports` insert block (lines 137-151). This edge function should only handle notifications (Slack, email, in-app) -- not create reports. Report creation belongs to the client-side functions and the batch job, which have full schedule context.

**Step 2: Add client-side report creation for BIO_OVERUSE**

File: `src/pages/AgentDashboard.tsx`

The `handleBioExceeded` callback (line 528) currently only calls the edge function. It needs to also create the report directly with full details (totalBioSeconds, bioAllowance, overageSeconds) before calling the notification function, matching the pattern used by `checkAndAlertLateLogin`, `checkAndAlertEarlyOut`, and `checkAndAlertOverbreak`.

### Additional Consideration: Unique Constraint

There is currently NO unique constraint on `agent_reports` for `(agent_email, incident_date, incident_type)`. While the client-side functions check for duplicates before inserting, the batch job does too. Adding a unique constraint would be a safety net. However, this is a separate concern and can be addressed later if desired.

### Backfill Existing Reports

After the fix, we can run a query to update existing reports that have incomplete details by cross-referencing with profile_events data, or simply let the next batch job run fill correct data going forward.

