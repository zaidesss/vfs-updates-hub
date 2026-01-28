

## Agent Dashboard System - Implementation Plan

### Overview

This plan creates a comprehensive Agent Dashboard system with individual agent pages, a status state machine, and full event logging for the VFS Agent Portal.

---

### 1. Database Schema Changes

#### 1.1 Add Fields to `agent_directory` Table

| New Field | Type | Purpose |
|-----------|------|---------|
| `quota` | numeric | Editable ticket quota per agent |
| `support_type` | text | Email/Chat/Call/Hybrid support type |
| `mon_schedule` | text | Monday shift (e.g., "8:00 AM-5:00 PM") |
| `tue_schedule` | text | Tuesday shift |
| `wed_schedule` | text | Wednesday shift |
| `thu_schedule` | text | Thursday shift |
| `fri_schedule` | text | Friday shift |
| `sat_schedule` | text | Saturday shift |
| `sun_schedule` | text | Sunday shift |

#### 1.2 Create `profile_status` Table (Current State)

```sql
CREATE TABLE profile_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES agent_directory(id) ON DELETE CASCADE,
  current_status text NOT NULL DEFAULT 'LOGGED_OUT',
  status_since timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id)
);
```

Valid statuses: `LOGGED_OUT`, `LOGGED_IN`, `ON_BREAK`, `COACHING`

#### 1.3 Create `profile_events` Table (Audit Log)

```sql
CREATE TABLE profile_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES agent_directory(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  prev_status text NOT NULL,
  new_status text NOT NULL,
  triggered_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Event types: `LOGIN`, `LOGOUT`, `BREAK_IN`, `BREAK_OUT`, `COACHING_START`, `COACHING_END`

#### 1.4 RLS Policies

| Table | Role | Permissions |
|-------|------|-------------|
| profile_status | Admins/HR/SuperAdmins | SELECT, UPDATE |
| profile_status | Users | SELECT (own profile) |
| profile_events | Admins/HR/SuperAdmins | SELECT, INSERT |
| profile_events | Users | SELECT (own profile), INSERT (own profile) |

---

### 2. Route & Navigation Changes

#### 2.1 New Route in `App.tsx`

```
/people/:profileId/dashboard → AgentDashboard page
```

#### 2.2 Navigation Updates in `Layout.tsx`

Add to People dropdown:
- "Agent Dashboard" link (visible to admins/HR) pointing to a dashboard selector or default profile

---

### 3. New Files to Create

| File Path | Purpose |
|-----------|---------|
| `src/pages/AgentDashboard.tsx` | Main dashboard page component |
| `src/lib/agentDashboardApi.ts` | API functions for status & events |
| `src/components/dashboard/ProfileHeader.tsx` | Profile summary section |
| `src/components/dashboard/ShiftScheduleTable.tsx` | Mon-Sun schedule display |
| `src/components/dashboard/StatusButtons.tsx` | Status control buttons |
| `src/components/dashboard/StatusIndicator.tsx` | Current status badge |

---

### 4. Status State Machine Logic

#### Valid State Transitions

```
LOGGED_OUT  → LOGGED_IN  (via Login)
LOGGED_IN   → LOGGED_OUT (via Logout)
LOGGED_IN   → ON_BREAK   (via Break In)
LOGGED_IN   → COACHING   (via Coaching Start)
ON_BREAK    → LOGGED_IN  (via Break Out)
COACHING    → LOGGED_IN  (via Coaching End)
```

#### Button Enable/Disable Rules

| Status | Log In | Log Out | Break In | Break Out | Coaching |
|--------|--------|---------|----------|-----------|----------|
| LOGGED_OUT | Enabled (primary) | Disabled | Disabled | Disabled | Disabled |
| LOGGED_IN | Shows "Logged In" (disabled) | Enabled (red) | Enabled | Disabled | Enabled |
| ON_BREAK | Disabled | Disabled | Disabled | Enabled | Disabled |
| COACHING | Disabled | Disabled | Disabled | Disabled | "End Coaching" (enabled) |

#### Double-Click Prevention

Before recording an event:
1. Fetch current status from `profile_status`
2. Verify `current_status` matches expected `prev_status`
3. Only if match: update status + insert event
4. If mismatch: show error toast "Status changed, please refresh"

---

### 5. Dashboard Page Layout

```
┌────────────────────────────────────────────────────────────────┐
│ VFS Agent Portal    [Updates▾] [Outages▾] [People▾] [Admin▾]  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Agent Dashboard                                               │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ PROFILE HEADER                                            │ │
│  │                                                           │ │
│  │ Agent Name: John Doe          Zendesk Instance: ZD1       │ │
│  │ Support Account: 1            Support Type: Email         │ │
│  │ Ticket View ID: 12345         Break Schedule: 12PM-1PM    │ │
│  │ Quota: 50 tickets/day                                     │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ SHIFT SCHEDULE                                            │ │
│  │                                                           │ │
│  │ Day   | Schedule       | Status                           │ │
│  │ ──────|────────────────|────────                          │ │
│  │ Mon   | 8:00AM-5:00PM  | Working                          │ │
│  │ Tue   | 8:00AM-5:00PM  | Working                          │ │
│  │ Wed   | Day Off        | Off                              │ │
│  │ Thu   | 8:00AM-5:00PM  | Working                          │ │
│  │ Fri   | 8:00AM-5:00PM  | Working                          │ │
│  │ Sat   | 10:00AM-3:00PM | Working                          │ │
│  │ Sun   | Day Off        | Off                              │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ CURRENT STATUS                                            │ │
│  │                                                           │ │
│  │ Status: ● LOGGED_IN                    Since: 8:02 AM     │ │
│  │                                                           │ │
│  │ [Logged In] [Log Out] [Break In] [Break Out] [Coaching]   │ │
│  │  (grey)      (red)     (blue)     (grey)      (blue)      │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ DAILY WORK TRACKER (placeholder)                          │ │
│  │                                                           │ │
│  │ Tickets Handled: 0/50      Time Logged: 0h 0m             │ │
│  │                                                           │ │
│  │ (Data will be wired later)                                │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

### 6. MasterDirectory Updates

#### 6.1 Add New Columns to Table View

| Column | Type | Editable |
|--------|------|----------|
| Quota | Numeric input | Yes |
| Support Type | Dropdown (Email/Chat/Call/Hybrid) | Yes |
| Mon Schedule | Time range input | Yes |
| Tue Schedule | Time range input | Yes |
| Wed Schedule | Time range input | Yes |
| Thu Schedule | Time range input | Yes |
| Fri Schedule | Time range input | Yes |
| Sat Schedule | Time range input | Yes |
| Sun Schedule | Time range input | Yes |

#### 6.2 Add Dashboard Link

Each row in MasterDirectory will have a link icon that navigates to `/people/{profile_id}/dashboard`

---

### 7. Implementation Sequence

| Step | Task | Files |
|------|------|-------|
| 1 | Database migration: add columns to agent_directory | SQL migration |
| 2 | Database migration: create profile_status table | SQL migration |
| 3 | Database migration: create profile_events table | SQL migration |
| 4 | Update DirectoryEntry interface | masterDirectoryApi.ts |
| 5 | Create dashboard API functions | agentDashboardApi.ts |
| 6 | Create dashboard components | dashboard/*.tsx |
| 7 | Create AgentDashboard page | AgentDashboard.tsx |
| 8 | Add route to App.tsx | App.tsx |
| 9 | Update MasterDirectory with new columns | MasterDirectory.tsx |
| 10 | Update Layout navigation | Layout.tsx |

---

### 8. API Functions (agentDashboardApi.ts)

```typescript
// Fetch profile with directory data
fetchDashboardProfile(profileId: string)

// Get current status
getProfileStatus(profileId: string)

// Update status with event logging
updateProfileStatus(
  profileId: string,
  newStatus: string,
  eventType: string,
  triggeredBy: string
)

// Fetch event history
getProfileEvents(profileId: string, limit?: number)
```

---

### 9. Possible Additional Features/Issues to Consider

Before proceeding, here are related features you might want to include:

1. **Dashboard Access Control**: Should regular agents only see their own dashboard, or can they view others?

2. **Real-time Status Updates**: Should the status badge update in real-time (using Supabase Realtime) when another admin changes an agent's status?

3. **Event History Panel**: Would you like an expandable section showing recent status changes (last 10 events)?

4. **Dashboard Link from Manage Profiles**: Should there also be dashboard links from the "All Bios" (ManageProfiles) page?

5. **Agent Selector Dropdown**: For admins viewing dashboards, should there be a dropdown to quickly switch between agents?

6. **Quota Achievement Indicator**: Should the quota field show progress (e.g., "32/50 tickets" with progress bar)?

7. **Shift Status Indicator**: Should the dashboard show if the agent is currently within their scheduled shift time?

8. **Mobile Responsiveness**: Any specific mobile layout requirements for the dashboard?

---

### 10. Questions for Clarification

Would you like me to:
- Include any of the additional features listed above?
- Proceed with the base implementation as described?

