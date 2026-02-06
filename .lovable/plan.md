
# Device Restart Escalation & Edit Restrictions

## Overview

This plan adds the ability to escalate "Device Restart" (EXCESSIVE_RESTARTS) incidents to Outage Requests as "Equipment Issue" and implements field-level restrictions on the Outage Request edit form.

---

## Current Behavior

| Feature | Current State |
|---------|---------------|
| EXCESSIVE_RESTARTS escalation | Not allowed - only LATE_LOGIN, EARLY_OUT, TIME_NOT_MET can escalate |
| Equipment Issue outage reason | Already exists in OUTAGE_REASONS list |
| Edit form for users | All fields are editable when user edits their own request |
| Edit form for admins | All fields are editable (via isAdminEditing flag) |

---

## Changes Required

### Part 1: Enable Device Restart Escalation

**File: `src/lib/agentReportsApi.ts`**

1. Add `EXCESSIVE_RESTARTS` to the `ESCALATABLE_INCIDENT_TYPES` array (line 80)
2. Add a case in `getOutageReasonForIncident` to return `'Equipment Issue'` for `EXCESSIVE_RESTARTS` (line 92-101)

**File: `src/lib/leaveRequestApi.ts`**

3. Update `EscalatedOutageInput` interface to include `'Equipment Issue'` as a valid outage reason (line 744)

**File: `src/components/agent-reports/ReportDetailDialog.tsx`**

4. Add a case in `getEscalationTimeRange` for `EXCESSIVE_RESTARTS` (line 98-147)
   - Since restart duration is tracked cumulatively, use a fallback time range based on the incident date
5. Update the type cast when creating escalation input (line 180+)

---

### Part 2: Restrict User Editing on Outage Requests

**File: `src/pages/LeaveRequest.tsx`**

Users editing their own requests should ONLY be able to add remarks. Admins can edit all fields.

**Changes to form fields (lines 734-947):**

| Field | Current | After Change |
|-------|---------|--------------|
| Agent Name | Editable | `disabled={!!editingRequest && !isAdmin}` |
| Client Name | Editable | `disabled={!!editingRequest && !isAdmin}` |
| Team Lead | Editable | `disabled={!!editingRequest && !isAdmin}` |
| Role | Editable | `disabled={!!editingRequest && !isAdmin}` |
| Start Date | Editable | `disabled={!!editingRequest && !isAdmin}` |
| End Date | Editable | `disabled={!!editingRequest && !isAdmin}` |
| Start Time | Editable | `disabled={!!editingRequest && !isAdmin}` |
| End Time | Editable | `disabled={!!editingRequest && !isAdmin}` |
| Outage Reason | Editable | `disabled={!!editingRequest && !isAdmin}` |
| Attachment | Editable | `disabled={!!editingRequest && !isAdmin}` |
| Remarks | Only for auto-generated | **Always visible when editing** |

**Changes to Remarks section (line 950):**
- Remove the condition that limits remarks to auto-generated requests only
- Show remarks field for ALL edit scenarios
- Add helper text explaining that users can only modify remarks

---

## Summary of Files to Modify

| File | Changes |
|------|---------|
| `src/lib/agentReportsApi.ts` | Add EXCESSIVE_RESTARTS to escalatable types + mapping |
| `src/lib/leaveRequestApi.ts` | Update EscalatedOutageInput interface |
| `src/components/agent-reports/ReportDetailDialog.tsx` | Add time range case + fix type cast |
| `src/pages/LeaveRequest.tsx` | Disable fields for user edits; show remarks always |

---

## User Experience After Changes

### Agent Reports Page (Escalation)
- "Excessive Restarts" incidents will now show the "Escalate as Outage" option
- Clicking escalate creates an outage request with reason "Equipment Issue"
- Duplicate prevention still applies (won't create if Equipment Issue already exists for that date)

### Outage Requests Page (Editing)

**Regular User editing their own request:**
- All fields are grayed out/disabled (read-only)
- Only the Remarks field is editable
- Helper text: "Note: Core details are read-only. You can only update remarks."

**Admin editing any request:**
- All fields remain editable (no changes to admin behavior)
- Remarks field also available

---

## Technical Details

### Escalation Time Range for Device Restarts

Since EXCESSIVE_RESTARTS incidents store cumulative restart duration rather than specific timestamps, the escalation will use:
- A default time range (e.g., shift start + 1 hour) as a placeholder
- The remarks field can be used to add specific timing details if needed

### Edit Form Disabled Logic

```tsx
// Pattern applied to all form fields:
disabled={!!editingRequest && !isAdmin}

// For fields that were already conditionally disabled (like agent_name for directory users):
disabled={isDirectoryUser || (!!editingRequest && !isAdmin)}
```
