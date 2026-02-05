
# Plan: Total Hours Display and Upwork Limit Adjustment Request

## Summary
Add a new read-only "Total Hours" field in Agent Profiles (using Master Directory calculation logic) with a button to request Upwork Limit Adjustments. The button opens a floating popup for Admins to submit requests that notify HR and Super Admins via email and in-app notifications.

---

## Technical Approach

### 1. Total Hours Calculation
Reuse the existing `calculateTotalHours` function from `src/lib/masterDirectoryApi.ts` which computes:
- Weekday + Weekend hours from daily schedules
- Minus unpaid breaks (per working day)
- Plus OT hours from individual day OT schedules
- Plus fixed 0.5h Revalida + 0.5h Weekly Meeting

### 2. New UI Component: `UpworkLimitRequestDialog.tsx`
A dialog/modal that:
- Shows "New Upwork Limit" input field (number)
- Displays the Team Lead name (from profile data)
- Has an optional "Reason" text area
- "Send" button triggers the edge function
- Dismissible with Cancel

### 3. Edge Function: `send-upwork-limit-request`
- Sends email to `hr@virtualfreelancesolutions.com` and `cherry@virtualfreelancesolutions.com`
- Also sends to all Super Admins from `user_roles` table
- Creates in-app notifications in `notifications` table for all recipients
- Uses existing Resend integration pattern

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/profile/UpworkLimitRequestDialog.tsx` | Floating popup for submitting limit adjustment requests |
| `supabase/functions/send-upwork-limit-request/index.ts` | Edge function to send email and create notifications |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/profile/WorkConfigurationSection.tsx` | Add Total Hours display and Request button above Team Lead field |
| `src/lib/agentProfileApi.ts` | Export/use calculation from masterDirectoryApi or add helper |

---

## UI Placement

In `WorkConfigurationSection.tsx`, add a new row **above Team Lead and Client fields**:

```text
┌─────────────────────────────────────────────────────────────┐
│ Total Hours (Weekly)                                         │
│ ┌────────────────────┐  ┌──────────────────────────────────┐│
│ │ 45.5 hours         │  │ 📤 Request Upwork Limit Adjust   ││
│ │ (read-only)        │  │                                  ││
│ └────────────────────┘  └──────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
┌───────────────────────────────────┐ ┌──────────────────────┐
│ Team Lead                         │ │ Client(s)            │
│ [ Select team lead... ]           │ │ [ Enter clients ]    │
└───────────────────────────────────┘ └──────────────────────┘
```

---

## Dialog/Popup Design

```text
┌────────────────────────────────────────┐
│  Request Upwork Limit Adjustment       │
├────────────────────────────────────────┤
│  Agent: John Doe                       │
│  Current Total Hours: 45.5 hours       │
│                                        │
│  New Upwork Limit                      │
│  ┌──────────────────────────────────┐  │
│  │ [  Enter new limit (hours)    ]  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Team Lead                             │
│  ┌──────────────────────────────────┐  │
│  │  Cherry Doe (read-only)          │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Reason (optional)                     │
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│        [Cancel]  [Send Request]        │
└────────────────────────────────────────┘
```

---

## Edge Function: `send-upwork-limit-request`

```typescript
interface UpworkLimitRequest {
  agentName: string;
  agentEmail: string;
  currentTotalHours: number;
  requestedLimit: number;
  teamLead: string;
  reason?: string;
  requestedBy: string;  // Admin who clicked the button
}
```

**Recipients**:
1. Fixed: `hr@virtualfreelancesolutions.com`, `cherry@virtualfreelancesolutions.com`
2. Dynamic: All Super Admins from `user_roles` table

**Email Content**:
```text
Subject: Upwork Limit Adjustment Request - [Agent Name]

Agent: John Doe (john@example.com)
Current Total Hours: 45.5 hours
Requested New Limit: 50 hours
Team Lead: Cherry Doe
Requested By: Admin Name

Reason: [Optional reason text if provided]
```

**In-App Notifications**:
Insert records into `notifications` table:
```typescript
{
  user_email: recipientEmail,
  title: 'Upwork Limit Adjustment Request',
  message: `${agentName} - New limit: ${requestedLimit} hours (from ${currentTotalHours}h)`,
  type: 'system',
  reference_type: 'upwork_adjustment',
  reference_id: agentEmail,
}
```

---

## Access Control

- **Visibility**: Total Hours field visible to all users viewing the profile
- **Button**: Only visible to Admins (`isAdmin || isSuperAdmin`)
- Both computed from the existing `useAuth()` context

---

## Calculation Logic Reference

From `masterDirectoryApi.ts`:
```typescript
function calculateTotalHours(entry: Partial<DirectoryEntry>): {
  weekday_total_hours: number;
  weekend_total_hours: number;
  ot_total_hours: number;
  unpaid_break_hours: number;
  overall_total_hours: number;
}
```

This takes daily schedules (`mon_schedule` through `sun_schedule`), OT schedules, `break_schedule`, and `day_off` array to compute the final total.

---

## Implementation Steps

1. **Add calculation helper** - Export/adapt `calculateTotalHours` for profile data shape
2. **Create dialog component** - `UpworkLimitRequestDialog.tsx` with form fields
3. **Add Total Hours row** - In `WorkConfigurationSection.tsx` with computed value + button
4. **Create edge function** - `send-upwork-limit-request` for email + notifications
5. **Wire up button** - Open dialog, pass profile data, call edge function on submit
