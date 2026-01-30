

# Auto-Generate "Late Login" Outage Request from Dashboard

## Overview

When an agent's attendance status is detected as "Late" in the Agent Dashboard, the system will automatically create an Outage Request (renamed from "Leave Request") with:
- All fields auto-populated from the agent's Bios (agent_profiles)
- Calculated start/end times based on the late login (with 5-minute allowance)
- Status set to "For Review" (new status value)
- A visual badge indicating it was auto-generated

## Changes Summary

| Area | Changes |
|------|---------|
| **Database** | Add `for_review` status, add `is_auto_generated` and `remarks` fields |
| **Naming** | Rename "Leave Request" → "Outage Request" across the app |
| **Table Column** | Add "Date Submitted" column after Ref # |
| **Auto-Generation Logic** | Create outage request when late status is detected |
| **Duplicate Detection** | Skip creation if same agent + date + overlapping timeframe exists |
| **Edit Form** | Show "Remarks" field for auto-generated requests |

---

## Technical Implementation

### Part 1: Database Migration

Add new column and status value to `leave_requests` table:

```sql
-- Add is_auto_generated flag to track system-created requests
ALTER TABLE public.leave_requests 
ADD COLUMN IF NOT EXISTS is_auto_generated boolean DEFAULT false;

-- Note: 'for_review' will be added as a valid status (no constraint change needed since status is text)
-- Note: 'remarks' column already exists in the table
```

### Part 2: Rename "Leave Request" to "Outage Request"

**Files to update labels:**
- `src/pages/LeaveRequest.tsx` - Page title, card headers, button labels
- `src/components/Layout.tsx` - Navigation menu item
- `src/components/user-guide/sections/LeaveRequestSection.tsx` - Guide content
- Any toast messages, error messages, and descriptions

### Part 3: Add "Date Submitted" Column

In `src/pages/LeaveRequest.tsx`, add a new table column after "Ref #":

| Ref # | **Submitted** | Agent | Client | ... |
|-------|---------------|-------|--------|-----|
| LR-0001 | Jan 28, 2026 | ... | ... | ... |

Display `created_at` formatted as "MMM d, yyyy".

### Part 4: Auto-Generation Logic

**Location:** `src/lib/agentDashboardApi.ts` (new function)

**Trigger:** When `calculateAttendanceForWeek()` detects a "late" status for today

**Flow:**
1. Dashboard loads and calculates attendance
2. If today's status = "late" AND login time exists
3. Check for existing outage requests (same agent, same date, overlapping time)
4. If none found → Auto-create outage request with:
   - **agent_email**: from profile
   - **agent_name**: from agent_profiles.full_name or agent_directory.agent_name
   - **client_name**: from agent_profiles.clients (first client)
   - **team_lead_name**: from agent_profiles.team_lead
   - **role**: from agent_profiles.position
   - **start_date/end_date**: today's date
   - **start_time**: schedule start + 5 minutes (e.g., "09:05")
   - **end_time**: actual login time - 1 minute (e.g., "09:59" if logged in at 10:00)
   - **outage_reason**: "Late Login"
   - **status**: "for_review"
   - **is_auto_generated**: true

### Part 5: Time Calculation Logic

**Example:**
- Scheduled shift: 9:00 AM - 5:00 PM
- Actual login: 10:00 AM

**Auto-generated outage:**
- Start: 9:05 AM (5 min allowance after schedule start)
- End: 9:59 AM (1 min before login)
- Duration: 54 minutes (0.9 hours)

**Edge cases handled:**
- If login is exactly at schedule start + 10 min (threshold): No outage created
- If login is 9:12 AM: Start = 9:05 AM, End = 9:11 AM

### Part 6: Duplicate Detection

Before creating an auto-generated request, check:
```sql
SELECT id FROM leave_requests 
WHERE agent_email = {email}
  AND start_date = {today}
  AND outage_reason = 'Late Login'
  AND status NOT IN ('declined', 'canceled')
  LIMIT 1
```

If found → Skip creation, no duplicate.

### Part 7: Edit Form - Remarks Field

In `src/pages/LeaveRequest.tsx`, when editing an auto-generated request:

1. Check if `editingRequest?.is_auto_generated === true`
2. If true, show a "Remarks" textarea below the attachment field
3. Remarks is a free-text field, editable by both users and admins
4. Save remarks via the existing update API

### Part 8: Visual Badge for Auto-Generated

In the table row, add a badge near the Ref # or Status column:

```jsx
{req.is_auto_generated && (
  <Badge variant="secondary" className="text-xs">
    Auto
  </Badge>
)}
```

### Part 9: Status Colors & Icons

Add new status styling:

| Status | Color | Icon |
|--------|-------|------|
| for_review | Blue (info) | Eye icon |

---

## Files to Modify

| File | Changes |
|------|---------|
| **Database Migration** | Add `is_auto_generated` column |
| `src/lib/leaveRequestApi.ts` | Add `for_review` to status type, add `is_auto_generated` to interface, add duplicate check function, add auto-create function |
| `src/pages/LeaveRequest.tsx` | Rename labels, add Submitted column, add Remarks field for auto-generated, add Auto badge, add for_review status styling |
| `src/pages/AgentDashboard.tsx` | Trigger auto-generation logic after detecting late status |
| `src/lib/agentDashboardApi.ts` | Add helper function to create auto-generated outage request |
| `src/components/Layout.tsx` | Rename nav item to "Outage Request" |
| Various guide files | Update terminology |

---

## Potential Conflicts & Issues

| Issue | Mitigation |
|-------|------------|
| **Duplicate requests on page refresh** | Duplicate detection check before creation |
| **Race condition on multiple logins** | Check uses "Late Login" reason + date as unique key |
| **Agent has multiple clients** | Use first client from profile.clients array |
| **Missing Bios data** | Fall back to directory data, skip creation if critical fields missing |
| **Time zone differences** | All times standardized to EST as per existing logic |
| **Editing auto-generated request** | Allow full edit like manual requests, just show extra Remarks field |
| **for_review vs pending confusion** | Clear status label: "For Review" (blue) vs "Pending" (yellow) |
| **Historical late logins** | Only auto-generate for today's attendance, not past days |

---

## User Flow

```text
┌─────────────────────────────────────────────────────────────┐
│                     AGENT LOGS IN LATE                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│          Dashboard detects "Late" status (10+ min)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│    Check: Does Late Login outage exist for today?           │
└─────────────────────────────────────────────────────────────┘
                    │                    │
                Yes │                    │ No
                    ▼                    ▼
           ┌──────────────┐   ┌────────────────────────────────┐
           │  Skip (no    │   │  Auto-create Outage Request    │
           │  duplicate)  │   │  Status = "For Review"         │
           └──────────────┘   │  is_auto_generated = true      │
                              └────────────────────────────────┘
                                             │
                                             ▼
                              ┌────────────────────────────────┐
                              │  Visible in Admin & Agent's    │
                              │  Outage Request page with      │
                              │  "Auto" badge                  │
                              └────────────────────────────────┘
                                             │
                                             ▼
                              ┌────────────────────────────────┐
                              │  Admin reviews & approves      │
                              │  Agent can edit & add Remarks  │
                              └────────────────────────────────┘
```

---

## Implementation Order

1. **Database migration** - Add `is_auto_generated` column
2. **Update leaveRequestApi.ts** - Add types, duplicate check, auto-create function
3. **Update LeaveRequest.tsx** - Rename labels, add columns, add Remarks, add badges
4. **Update AgentDashboard.tsx** - Trigger auto-generation on late detection
5. **Update Layout.tsx** - Rename navigation
6. **Update guide files** - Update terminology

