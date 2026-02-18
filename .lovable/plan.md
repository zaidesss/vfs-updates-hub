

## Fix: Missing Severity Helper Functions in generate-agent-reports

### Problem
The `generate-agent-reports` edge function crashes with `calculateQuotaSeverity is not defined` because three severity helper functions were lost during a previous edit:
- `calculateTimeSeverity(minutes)` -- used by LATE_LOGIN, EARLY_OUT, BIO_OVERUSE, OVERBREAK, EXCESSIVE_RESTARTS, TIME_NOT_MET
- `calculateQuotaSeverity(shortfall)` -- used by QUOTA_NOT_MET
- `calculateGapSeverity(gapMinutes)` -- used by HIGH_GAP

### Fix

**Step 1 -- Add the missing helper functions** to `supabase/functions/generate-agent-reports/index.ts` (after the existing helper functions, before `Deno.serve`):

```text
calculateTimeSeverity(minutes):
  <= 5  -> "low"
  <= 15 -> "medium"
  else  -> "high"

calculateQuotaSeverity(shortfall):
  <= 10 -> "low"
  <= 30 -> "medium"
  else  -> "high"

calculateGapSeverity(gapMinutes):
  < 5   -> null (no report)
  <= 10 -> "low"
  <= 20 -> "medium"
  else  -> "high"
```

**Step 2 -- Re-deploy and test** with Pauline for 2026-02-17 (yesterday). The request body uses `date` (not `targetDate`).

### Expected Result
- Pauline (Tuesday schedule 12:00 PM - 7:30 PM, no login, no outage request) gets an NCNS report with `critical` severity
- Other agents with violations also get their reports generated
- Slack + email alert fires for NCNS

