

# Plan: OT Schedule Toggle + Status Buttons UI Consolidation

## Summary

This plan implements two UI enhancements:
1. **OT Schedule Toggle**: Add a toggle in Agent Profiles to enable OT, showing OT schedule fields only when enabled
2. **OT Login/Logout Buttons**: Add dedicated OT buttons on Dashboard that **lock all other buttons when OT is active**
3. **Status Buttons Consolidation**: Combine Login/Logout into one toggle button and Break In/Out into one toggle button

---

## Part 1: OT Schedule Toggle in Agent Profiles

### Current State
- OT schedule fields (Weekday OT Schedule, Weekend OT Schedule) are always visible
- No way to enable/disable OT for an agent

### Changes to `WorkConfigurationSection.tsx`
- Add "OT Schedule Enabled" toggle switch before the OT schedule fields
- When OFF: Hide both Weekday OT Schedule and Weekend OT Schedule fields
- When ON: Show both fields for input

### Database Changes
- Add `ot_enabled` boolean column to `agent_profiles` table (default: false)

### UI Mockup
```text
┌─────────────────────────────────────────────────────────┐
│ Break & OT Schedules                                    │
├─────────────────────────────────────────────────────────┤
│ Break Schedule:  [12:00 PM-1:00 PM    ]                 │
│                                                         │
│ OT Schedule Enabled: [OFF/ON Toggle]                    │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ (Only visible when toggle is ON)                    │ │
│ │ Weekday OT Schedule: [5:00 PM-7:00 PM     ]         │ │
│ │ Weekend OT Schedule: [8:00 AM-12:00 PM    ]         │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Part 2: OT Login/Logout on Dashboard

### New Status & Events
- **New Status**: `ON_OT`
- **New Events**: `OT_LOGIN`, `OT_LOGOUT`

### Critical Behavior: **OT Locks All Other Buttons**
When `ON_OT` status is active:
- **ONLY** the OT Logout button is clickable
- All other buttons (Login/Logout, Break, Coaching, Restart, Bio) are **disabled**
- This ensures agents complete their OT session before doing anything else

### State Machine Updates
```text
Current: LOGGED_IN
  ↓ OT_LOGIN
New: ON_OT (all other buttons disabled)
  ↓ OT_LOGOUT  
Back to: LOGGED_IN
```

### OT Button Visibility
- Only shown when `ot_enabled = true` for the agent
- Button is purple-themed to distinguish from other status buttons

### Button States
| Current Status | OT Button Label | OT Button Enabled | Other Buttons |
|----------------|-----------------|-------------------|---------------|
| LOGGED_OUT | OT Login | No | Normal rules |
| LOGGED_IN | OT Login | Yes | Normal rules |
| ON_OT | OT Logout | Yes | **All Disabled** |
| Other states | OT Login | No | Normal rules |

---

## Part 3: Status Buttons Consolidation

### Current State
Four separate buttons: Log In, Log Out, Break In, Break Out

### New Design
Two consolidated toggle buttons that work like Device Restart:

**Login/Logout Toggle:**
- When LOGGED_OUT: Shows "Log In" (primary style, enabled)
- When LOGGED_IN: Shows "Log Out" (destructive style, enabled)
- When in other states: Shows "Log Out" (secondary style, disabled)
- When ON_OT: Shows "Log Out" (secondary style, **disabled**)

**Break Toggle:**
- When LOGGED_IN: Shows "Break In" (amber outline, enabled)
- When ON_BREAK: Shows "Break Out" (green outline, enabled)
- When LOGGED_OUT or other states: Hidden or disabled
- When ON_OT: Shows "Break In" (secondary style, **disabled**)

### Button Layout After Changes
```text
┌────────────────────────────────────────────────────────────────────┐
│  [Log In/Out] [Break] [Coaching] [Restart] [Bio] [OT*]             │
│                                                                    │
│  * OT button only visible when ot_enabled = true                   │
│  * When ON_OT, only OT Logout is clickable                         │
└────────────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### Database Migration
```sql
ALTER TABLE agent_profiles 
ADD COLUMN ot_enabled boolean DEFAULT false;
```

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/agentProfileApi.ts` | Add `ot_enabled` to `AgentProfile` and `AgentProfileInput` interfaces |
| `src/lib/agentDashboardApi.ts` | Add `ON_OT` to `ProfileStatus`, add `OT_LOGIN`/`OT_LOGOUT` to `EventType`, update state machine |
| `src/components/profile/WorkConfigurationSection.tsx` | Add OT toggle, conditionally show OT schedule fields |
| `src/components/dashboard/StatusButtons.tsx` | Consolidate Login/Logout & Break buttons, add OT button, implement OT locking logic |
| `src/pages/AgentProfile.tsx` | Add `ot_enabled` to profile state handling |
| `src/pages/AgentDashboard.tsx` | Pass `ot_enabled` to StatusButtons component |

### State Machine Changes (`agentDashboardApi.ts`)

Add new status and transitions:
```text
ProfileStatus: 'LOGGED_OUT' | 'LOGGED_IN' | 'ON_BREAK' | 'COACHING' | 'RESTARTING' | 'ON_BIO' | 'ON_OT'

EventType: ... | 'OT_LOGIN' | 'OT_LOGOUT'

VALID_TRANSITIONS additions:
  LOGGED_IN: {
    ...existing,
    OT_LOGIN: 'ON_OT',
  },
  ON_OT: {
    LOGIN: null,
    LOGOUT: null,      // Cannot logout while on OT
    BREAK_IN: null,    // Cannot break while on OT
    BREAK_OUT: null,
    COACHING_START: null,  // Cannot coach while on OT
    COACHING_END: null,
    DEVICE_RESTART_START: null,  // Cannot restart while on OT
    DEVICE_RESTART_END: null,
    BIO_START: null,    // Cannot bio while on OT
    BIO_END: null,
    OT_LOGIN: null,
    OT_LOGOUT: 'LOGGED_IN',
  },
```

### StatusButtons Component Changes

Key logic for OT locking:
```text
const isOnOT = currentStatus === 'ON_OT';

// For Login/Logout toggle:
const loginLogoutEnabled = !isOnOT && (currentStatus === 'LOGGED_OUT' || currentStatus === 'LOGGED_IN');

// For Break toggle:
const breakEnabled = !isOnOT && (currentStatus === 'LOGGED_IN' || currentStatus === 'ON_BREAK');

// For Coaching:
const coachingEnabled = !isOnOT && (currentStatus === 'LOGGED_IN' || currentStatus === 'COACHING');

// For Restart:
const restartEnabled = !isOnOT && (currentStatus === 'LOGGED_IN' || currentStatus === 'RESTARTING');

// For Bio:
const bioEnabled = !isOnOT && ((currentStatus === 'LOGGED_IN' && bioRemaining > 0) || currentStatus === 'ON_BIO');

// For OT (only when ot_enabled):
const otEnabled = currentStatus === 'LOGGED_IN' || currentStatus === 'ON_OT';
```

---

## Implementation Steps

1. **Step 1**: Database migration to add `ot_enabled` column
2. **Step 2**: Update `agentProfileApi.ts` interfaces with `ot_enabled`
3. **Step 3**: Update `agentDashboardApi.ts` with `ON_OT` status and `OT_LOGIN`/`OT_LOGOUT` events
4. **Step 4**: Update `WorkConfigurationSection.tsx` with OT toggle and conditional fields
5. **Step 5**: Consolidate Login/Logout buttons in `StatusButtons.tsx`
6. **Step 6**: Consolidate Break In/Out buttons in `StatusButtons.tsx`
7. **Step 7**: Add OT Login/Logout button with locking logic
8. **Step 8**: Update `AgentDashboard.tsx` to pass `ot_enabled` prop
9. **Step 9**: Test all button states and transitions

---

## Considerations

- **Activity Feed**: OT_LOGIN and OT_LOGOUT events will appear in Today's Activity with a distinct icon (e.g., Clock icon in purple)
- **Team Status Board**: ON_OT status should display as "On OT" with a purple indicator
- **Slack Notifications**: OT events will be sent via existing profile status notification system
- **Backward Compatibility**: Existing agents default to `ot_enabled = false`, so no OT button appears until explicitly enabled

