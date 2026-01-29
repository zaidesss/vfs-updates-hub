

# Comprehensive Agent Dashboard Enhancement Plan

## Overview

This plan implements **8 major features** with your specific requirements. I'll break them down step-by-step to avoid overwhelming changes.

---

## Feature Summary

| # | Feature | What It Does |
|---|---------|--------------|
| 1 | Early Out Detection | Mark agents who log out before shift ends |
| 2 | No Logout Warning | Flag days without logout events |
| 3 | Hours Worked Per Day | Show actual hours for each day |
| 4 | Break Tracking with Allowance | Compare break usage vs. allowed (with 10-min flex window) |
| 5 | Device Restart Button | Toggle button with real-time notifications |
| 6 | Daily Event Summary | Show events for the current day on dashboard |
| 7 | Weekly Summary Card | Aggregate statistics for the week |
| 8 | Mobile-Friendly Improvements | Responsive design across dashboard |

---

## 1. Early Out Detection

**What it does**: If an agent logs out before their scheduled shift end time, mark as "Early Out" in red.

### Logic
- Parse end time from schedule (e.g., `"5:00 PM"` from `"9:00 AM-5:00 PM"`)
- Compare logout time against scheduled end time (in EST)
- If logout < scheduled end, mark as `early_out`

### Display
```text
| Day    | Status                              |
|--------|-------------------------------------|
| Monday | [Present (9:02 AM)] [Early Out (4:30 PM)] |
```

---

## 2. No Logout Warning

**What it does**: For past days with login but no logout, show a warning.

### Logic
- Past working day + has LOGIN event + no LOGOUT event = show warning
- Display an amber "No Logout" badge with a warning icon

### Display
```text
| Day    | Status                              |
|--------|-------------------------------------|
| Monday | [Present (9:02 AM)] [⚠️ No Logout]  |
```

---

## 3. Hours Worked Per Day

**What it does**: Calculate login-to-logout duration and display in the table.

### Logic
- If both login and logout exist: calculate duration
- Format as "Xh Ym" (e.g., "7h 45m")
- Add new column to Shift Schedule table

### Display
```text
| Day    | Schedule        | Status           | Hours  |
|--------|-----------------|------------------|--------|
| Monday | 9:00 AM-5:00 PM | Present (9:02 AM)| 7h 45m |
```

---

## 4. Break Tracking with 10-Minute Allowance

**What it does**: Track break usage and compare against allowed break time with your specific rules.

### Your Rules (Clarified)
- Break schedule: `12:00 PM-12:30 PM` (30 min allowed)
- Agent can start break up to 10 min late: `12:00 PM - 12:10 PM`
- Agent can end break up to 10 min late: `12:30 PM - 12:40 PM`
- **Overbreak threshold**: Break duration > allowed duration + 5 min grace
  - 30 min break → 35 min max before "Overbreak" is flagged

### Logic
1. Sum all BREAK_IN → BREAK_OUT durations for the day
2. Parse allowed break duration from `break_schedule`
3. Calculate grace period (allowed + 5 min for 30 min break)
4. If actual > grace, flag as "Overbreak"

### Display
```text
| Day    | Break              |
|--------|-------------------|
| Monday | 32m / 30m ✓       |
| Tuesday| 38m / 30m ⚠️ +8m  |
```

---

## 5. Device Restart Toggle Button with Notifications

**What it does**: Add a button beside Coaching. When clicked, notify all active users, especially team leads and tech support.

### Database Changes Required
New event types and status:
- `DEVICE_RESTART_START` / `DEVICE_RESTART_END` event types
- `RESTARTING` status

### State Machine Update
```text
LOGGED_IN → DEVICE_RESTART_START → RESTARTING
RESTARTING → DEVICE_RESTART_END → LOGGED_IN
```

### Real-Time Notifications
When an agent triggers Device Restart:
1. Insert notification records for all active/logged-in users
2. Priority recipients: team leads, tech support, admins
3. Show toast popup notification via Supabase Realtime
4. Update notification bell with new notification
5. Notify again when device restart ends

### Notification Content
```text
Title: "Device Issue: [Agent Name]"
Message: "[Agent Name] has started a device restart at 3:45 PM EST"

Title: "Device Resolved: [Agent Name]"  
Message: "[Agent Name] has resolved their device issue at 3:52 PM EST"
```

### Button Design
- Icon: `RotateCcw` (restart icon)
- Color: Orange outline when inactive, orange fill when active
- Labels: "Device Restart" / "End Restart"

---

## 6. Daily Event Summary

**What it does**: Show a chronological list of all events for the current day on the dashboard.

### Content
- All profile events for today (LOGIN, LOGOUT, BREAK_IN, BREAK_OUT, COACHING_START, COACHING_END, DEVICE_RESTART_*)
- Displayed in a compact timeline format

### Display
```text
Today's Activity
────────────────
9:02 AM  │ Logged In
12:05 PM │ Break Started
12:32 PM │ Break Ended
3:45 PM  │ Device Restart Started
3:52 PM  │ Device Restart Ended
```

---

## 7. Weekly Summary Card

**What it does**: Aggregate week statistics in a summary card.

### Metrics
| Metric | Description |
|--------|-------------|
| Days Worked | Count of days with login |
| Total Hours | Sum of hours worked |
| Late Days | Count of late arrivals |
| Early Outs | Count of early departures |
| No Logout Days | Count of missing logouts |
| Break Variance | Total break used vs. allowed |
| Device Restarts | Count of device restart events |

---

## 8. Mobile-Friendly Improvements

**What it does**: Ensure all dashboard components work well on phones and tablets.

### Changes by Component

| Component | Mobile Enhancement |
|-----------|-------------------|
| `ProfileHeader` | Stack fields vertically on mobile |
| `ShiftScheduleTable` | Horizontal scroll; abbreviated day names |
| `StatusButtons` | Full-width buttons; 2-column grid on small screens |
| `StatusIndicator` | Stack status/since vertically |
| `DailyEventSummary` | Compact timeline layout |
| `WeeklySummaryCard` | Responsive grid for stats |

**Will this break anything?** No. These are purely CSS/layout changes using responsive Tailwind classes.

---

## Technical Details

### Database Migration Required

```sql
-- Add new event types for profile_events
ALTER TABLE profile_events 
  DROP CONSTRAINT IF EXISTS profile_events_event_type_check;

ALTER TABLE profile_events 
  ADD CONSTRAINT profile_events_event_type_check 
  CHECK (event_type IN (
    'LOGIN', 'LOGOUT', 'BREAK_IN', 'BREAK_OUT', 
    'COACHING_START', 'COACHING_END',
    'DEVICE_RESTART_START', 'DEVICE_RESTART_END'
  ));

-- Add new status for profile_status
ALTER TABLE profile_status 
  DROP CONSTRAINT IF EXISTS profile_status_current_status_check;

ALTER TABLE profile_status 
  ADD CONSTRAINT profile_status_current_status_check 
  CHECK (current_status IN (
    'LOGGED_OUT', 'LOGGED_IN', 'ON_BREAK', 'COACHING', 'RESTARTING'
  ));

-- Enable realtime for notifications table if not already
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/xxx_add_device_restart.sql` | Create | Add new event types and status |
| `src/lib/agentDashboardApi.ts` | Modify | Types, state machine, calculations for early out, hours, breaks |
| `src/components/dashboard/StatusButtons.tsx` | Modify | Add Device Restart button |
| `src/components/dashboard/ShiftScheduleTable.tsx` | Modify | New columns, badges, mobile styles |
| `src/components/dashboard/StatusIndicator.tsx` | Modify | Handle RESTARTING status, mobile layout |
| `src/components/dashboard/ProfileHeader.tsx` | Modify | Mobile layout |
| `src/components/dashboard/DailyEventSummary.tsx` | Create | Timeline of today's events |
| `src/components/dashboard/WeeklySummaryCard.tsx` | Create | Aggregate weekly stats |
| `src/pages/AgentDashboard.tsx` | Modify | Add new components, fetch break events |

### Notification Logic for Device Restart

When DEVICE_RESTART_START or DEVICE_RESTART_END is triggered:

1. Get agent's name and team lead from profile
2. Query all logged-in users from `profile_status` (LOGGED_IN, ON_BREAK, COACHING)
3. Query admins and tech support from `user_roles`
4. Insert notifications for each recipient
5. Supabase Realtime pushes notifications to their browsers
6. Their NotificationBell component updates automatically

---

## Implementation Order

I recommend implementing step-by-step:

| Step | Features | Why Together |
|------|----------|--------------|
| 1 | Early Out + No Logout + Hours Worked | All relate to logout tracking |
| 2 | Break Tracking with Allowance | Requires querying break events |
| 3 | Daily Event Summary | Uses same event data as break tracking |
| 4 | Weekly Summary Card | Aggregates all the above |
| 5 | Device Restart Button + Notifications | New state machine + DB migration |
| 6 | Mobile-Friendly Pass | Final polish across all components |

---

## Expected Results After Implementation

### Shift Schedule Table (Enhanced)
```text
| Day      | Schedule        | Status                           | Hours  | Break        |
|----------|-----------------|----------------------------------|--------|--------------|
| Monday   | 9:00 AM-5:00 PM | [Present (9:02 AM)]              | 8h 05m | 32m / 30m ✓  |
| Tuesday  | 9:00 AM-5:00 PM | [Late (9:15 AM)] [Early Out 4:30]| 7h 15m | 28m / 30m ✓  |
| Wednesday| 9:00 AM-5:00 PM | [Present (9:00 AM)] [⚠️ No Logout]| -      | 45m / 30m ⚠️ |
```

### Status Buttons (With Device Restart)
```text
[Log In] [Log Out] [Break In] [Break Out] [Coaching] [Device Restart]
```

### Weekly Summary Card
```text
┌──────────────────────────────────────────────────────────────┐
│ Weekly Summary (Jan 27 - Feb 2, 2026)                        │
├──────────────────────────────────────────────────────────────┤
│  Days Worked: 4/5    │  Total Hours: 32h 15m                 │
│  Late Days: 1        │  Early Outs: 1                        │
│  No Logout: 1        │  Break Variance: +18m over            │
│  Device Restarts: 2                                          │
└──────────────────────────────────────────────────────────────┘
```

