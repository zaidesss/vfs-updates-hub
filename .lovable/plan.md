

## Add NCNS (No Call No Show) Incident Type to Agent Reports

### Overview
Add a new "NCNS" (No Call No Show) incident type that automatically flags agents who are scheduled to work but fail to log in within 2 hours of their shift start AND have no approved/pending outage request for that day. This also introduces a new "Critical" severity level for urgent attention.

### What Changes

**1. New "Critical" Severity Level**
- Adds a `critical` severity with distinct dark-red styling (e.g., `bg-red-200 text-red-900`) to visually stand out above "High"
- Appears across all incident types where applicable, but NCNS defaults to it

**2. NCNS Incident Detection (Batch Job)**
- In the daily `generate-agent-reports` edge function, after processing all agents:
  - For each agent with a scheduled shift (not day off, not blank schedule):
    - Check if they have ANY login event for the day
    - If NO login found, check if there's an approved/pending outage request covering that date
    - If no login AND no outage request: generate an NCNS report with `critical` severity
- The 2-hour window is enforced by the batch job timing (runs at 5 AM UTC / midnight EST, well past any shift's 2-hour mark)

**3. Real-time Slack + Email Alerts**
- Add `NCNS` to the `send-status-alert-notification` edge function
- Sends a Slack message to `#a_agent_reports` and email to all admins/HR
- Message format: "Agent was absent (No Call No Show) on [date] -- critical severity"

**4. UI Updates**
- `agentReportsApi.ts`: Add `NCNS` to `IncidentType`, `INCIDENT_TYPE_CONFIG` (label: "Absent (NCNS)", color: dark red, icon: user-x), and `critical` to `SEVERITY_CONFIG` and `ReportSeverity`
- `ReportDetailDialog.tsx`: Add icon mapping for the new type
- NCNS is NOT added to `ESCALATABLE_INCIDENT_TYPES` (standalone only per your preference)

### Technical Steps (executed one at a time)

**Step 1 -- Database: Allow NCNS and Critical**
- The `agent_reports` table stores `incident_type` and `severity` as text columns, so no schema migration is needed -- new values work immediately.

**Step 2 -- Frontend: Add NCNS type + Critical severity**
- Update `agentReportsApi.ts` with new type and severity config
- Update `ReportDetailDialog.tsx` icon map

**Step 3 -- Backend: Add NCNS detection to `generate-agent-reports`**
- After existing checks, add NCNS logic:
  - If agent has no login events AND no leave request covering the date, create NCNS report

**Step 4 -- Backend: Add NCNS to `send-status-alert-notification`**
- Add NCNS alert config and Slack/email message formatting

**Step 5 -- Deploy and verify**

