

## Plan: Fix Missing NCNS Data and Investigate Batch Gap

### Root Cause
The batch job `generate-agent-reports` ran on 02-25 for 02-24 but produced zero NCNS reports for any agent that day. Edge function logs have rotated, so the exact error is unknown. The schedule data for Jazmin on 02-24 resolves correctly (9:00 AM-5:00 PM, not a day off), and there are no leave requests covering that date.

### Step 1: Insert Missing NCNS Report for 02-24
Use the database insert tool to add the missing NCNS and QUOTA_NOT_MET reports for Jazmin on Tuesday 02-24.

```sql
INSERT INTO agent_reports (agent_email, agent_name, profile_id, incident_date, incident_type, severity, details, status)
VALUES
  ('ochoajazmincjay@gmail.com', 'Jazmin Cjay Ochoa', 'a48fb450-d947-4908-9e4f-f4ba36870aa6', '2026-02-24', 'NCNS', 'critical',
   '{"scheduledShift":"9:00 AM-5:00 PM","message":"Agent was scheduled but did not log in and has no outage request"}'::jsonb, 'open'),
  ('ochoajazmincjay@gmail.com', 'Jazmin Cjay Ochoa', 'a48fb450-d947-4908-9e4f-f4ba36870aa6', '2026-02-24', 'QUOTA_NOT_MET', 'high',
   '{"expectedQuota":35,"actualTotal":0,"shortfall":35,"position":["Chat","Email"]}'::jsonb, 'open');
```

### Step 2: Check for Other Agents Missing NCNS on 02-24
Query all agents who were scheduled on 02-24, had no login events, and no NCNS report, to see if this was a batch-wide issue. If others are also missing, we'll backfill those too.

### Step 3: Investigate Batch Job Resilience
Review the `generate-agent-reports` edge function for error handling around the NCNS section (lines 800-853). The per-agent error handling may not be catching RPC failures for `get_effective_schedule`, causing the entire agent loop iteration to silently fail. If confirmed, add a try-catch around each agent's processing to prevent one failure from blocking others.

### Technical Details
- The batch runs via pg_cron (job 3) at `0 5 * * *` (5:00 AM UTC daily)
- It processes "yesterday" by default
- The NCNS check (line 800) requires: `loginEvents.length === 0 && parsedSchedule` AND no outage request
- Today (02-26) will be processed by tomorrow's batch run automatically

