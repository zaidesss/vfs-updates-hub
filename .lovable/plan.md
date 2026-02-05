
# Agent Reports: Action Button Redesign ✅ COMPLETE

## Overview
Replace the current Agent Reports action buttons (Mark Reviewed, Validate, Dismiss) with a new workflow-oriented button set that ties reports to actionable outcomes.

## Current vs New Button Logic

| Current | New | Purpose |
|---------|-----|---------|
| Mark Reviewed | **Escalate as Outage** | Auto-generates an Outage Request for attendance-related violations |
| Validate | **Validate (Action for Coaching)** | Confirms the report as valid and flags for coaching follow-up |
| Dismiss | **Dismiss (Invalid Report)** | Marks the report as an invalid/false positive |

## Escalation Rules

**Incident Type Mapping:**
- `LATE_LOGIN` → Creates outage with reason `"Late Login"`
- `TIME_NOT_MET` → Creates outage with reason `"Undertime"`
- `EARLY_OUT` → Creates outage with reason `"Undertime"`

**Request Details:**
- Status: `for_review` (same as system auto-generated requests)
- Uses incident date as the outage date
- Calculates duration from report details (schedule vs actual times)
- Sets `is_auto_generated: false` (admin-initiated, not system-triggered)
- Links to the agent's client/team lead/role from their profile

**Report Status After Escalation:**
- Status changes to `reviewed` (renamed to "Escalated" in UI labels)

## Implementation Summary

### Completed Changes:

1. **`src/lib/agentReportsApi.ts`**
   - Updated `STATUS_CONFIG` label: "Reviewed" → "Escalated"
   - Added `ESCALATABLE_INCIDENT_TYPES` constant
   - Added `isEscalatableIncident()` helper function
   - Added `getOutageReasonForIncident()` helper function

2. **`src/lib/leaveRequestApi.ts`**
   - Added `EscalatedOutageInput` interface
   - Added `checkExistingOutageRequest()` function (duplicate prevention)
   - Added `createEscalatedOutageRequest()` function

3. **`src/components/agent-reports/ReportDetailDialog.tsx`**
   - Replaced "Mark Reviewed" with "Escalate as Outage" button
   - Button only visible for escalatable incidents (LATE_LOGIN, EARLY_OUT, TIME_NOT_MET)
   - Updated "Validate" → "Validate (Coaching)"
   - Updated "Dismiss" → "Dismiss (Invalid)"
   - Added escalation flow with confirmation dialog
   - Calculates time ranges from incident details

4. **`src/components/agent-reports/EscalationConfirmDialog.tsx`** (NEW)
   - Confirmation dialog showing outage details before creation
   - Displays agent name, date, time range, and outage reason

5. **`src/components/agent-reports/ReportSummaryCards.tsx`**
   - Renamed "Reviewed" card to "Escalated"
   - Changed icon from Eye to ArrowUpRight

## Button Visibility Logic

**Escalate as Outage Button:**
- Visible only for: `LATE_LOGIN`, `EARLY_OUT`, `TIME_NOT_MET`
- Enabled when report status is `open` or `reviewed`
- Hidden for other incident types (Quota, Gap, Bio, Restarts, Overbreak, No Logout)

**Validate (Coaching) Button:**
- Always visible for open/reviewed reports
- Represents coaching action needed

**Dismiss (Invalid) Button:**
- Always visible for open/reviewed reports
- Represents false positive / invalid report
