

## Bio Break Allowance Update

### What Changes
Update bio break allowances from the old values to new thresholds, with 5 hours as the dividing line:

| Shift Duration | Old Allowance | New Allowance |
|---|---|---|
| Less than 5 hours | 2 minutes | 2 minutes 30 seconds |
| 5+ hours | 4 minutes | 5 minutes |

### Steps (one at a time)

**Step 1 -- Client-side calculation (`src/pages/AgentDashboard.tsx`)**
- Change threshold from 480 mins (8 hrs) to 300 mins (5 hrs)
- Change values: 5 min (300s) for 5+ hrs, 2.5 min (150s) for shorter
- Update default fallback from 120s to 150s

**Step 2 -- Server-side calculation (`src/lib/agentDashboardApi.ts`)**
- Same threshold and value changes in `calculateBioAllowanceForProfile()`
- Update default/fallback from 120s to 150s

**Step 3 -- Batch report generator (edge function `generate-agent-reports`)**
- Update default from 120 to 150, threshold from 480 to 300, and long-shift value from 240 to 300
- Redeploy the edge function

**Step 4 -- User Guide: Dashboard Section**
- Update bio break row in status buttons table
- Update bio allowance callout text

**Step 5 -- Admin Guide: Dashboard Admin Section**
- Update the violations table row for Bio Break

**Step 6 -- User Guide: Agent Reports Section**
- Update the Bio Overuse row description

### Technical Details

All three code locations use the same pattern:
```
durationMinutes >= THRESHOLD ? LONG_SHIFT_VALUE : SHORT_SHIFT_VALUE
```
Changes: `480 -> 300`, `4*60 -> 5*60`, `2*60 -> 150`, comments updated accordingly.

