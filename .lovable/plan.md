

# Team Status Board: Optimized Implementation Plan

## Conflict Analysis & Resolution

After thorough review, I've identified the following issues and optimizations:

---

## Issue 1: Missing Status Mappings (Confirmed Conflict)

**Files Affected:**
- `src/lib/teamStatusApi.ts` (Line 3)
- `src/components/team-status/StatusCard.tsx` (Lines 12-17)

**Current State:**
```typescript
// teamStatusApi.ts
export type ProfileStatus = 'LOGGED_IN' | 'ON_BREAK' | 'COACHING' | 'LOGGED_OUT';

// StatusCard.tsx - missing ON_OT, RESTARTING, ON_BIO
const STATUS_DISPLAY = { LOGGED_IN, ON_BREAK, COACHING, LOGGED_OUT };
```

**Conflict:**
- `LiveActivityFeed.tsx` already has complete mappings (Lines 22-30 and 33-44)
- Database `profile_status.current_status` is a TEXT field (can hold any value)
- When an agent is `ON_OT`, the StatusCard falls back to `STATUS_DISPLAY.LOGGED_OUT` showing "Offline"

**Resolution:**
Synchronize status mappings across both files to match `LiveActivityFeed.tsx`.

---

## Issue 2: Data Source Conflict

**Current Flow:**
```
TeamStatusBoard → teamStatusApi.fetchLoggedInTeamMembers()
                     ↓
                  profile_status (current_status != 'LOGGED_OUT')
                     ↓
                  agent_profiles_team_status view (id, email, full_name, position)
                     ↓
                  agent_directory (weekday_schedule, break_schedule)
```

**Problem:**
The current view `agent_profiles_team_status` only exposes 4 fields. The proposed schedule-based approach needs:
- Per-day schedules (`mon_schedule`, `tue_schedule`, etc.)
- OT schedules (`mon_ot_schedule`, etc.)
- Day off array
- Employment status

**Resolution Options:**

| Option | Pros | Cons |
|--------|------|------|
| A. Expand the view | Single source, RLS-bypassing | Requires migration, exposes more fields |
| B. Query agent_profiles directly | No migration needed | May hit RLS issues for non-admin users |
| C. Create new RPC function | Clean API, consolidated logic | More complex to maintain |

**Recommended: Option C (RPC Function)**
Create a new `get_scheduled_team_members()` RPC that:
- Runs as SECURITY DEFINER (bypasses RLS)
- Returns only necessary fields for the board
- Includes schedule parsing logic server-side
- Calculates visibility in SQL (faster)

---

## Issue 3: Existing Utility Functions

**Available in `agentDashboardApi.ts`:**
- `parseTimeToMinutes()` - Line 1282
- `parseScheduleRange()` - Line 1302 (already exported)
- `getTimeInESTMinutes()` - Line 1332 (private)

**Optimization:**
Move `getTimeInESTMinutes()` and add new helpers to `timezoneUtils.ts` for shared use:
- `getCurrentESTDayKey()` → returns 'mon', 'tue', etc.
- `getCurrentESTTimeMinutes()` → returns current EST time as minutes
- `getTodayEST()` → returns 'YYYY-MM-DD' in EST

This avoids code duplication.

---

## Issue 4: Performance Optimization

**Current Queries (3 round trips):**
1. `profile_status` → get logged in profiles
2. `agent_profiles_team_status` → get profile details
3. `agent_directory` → get schedules

**Proposed (2 round trips, or 1 with RPC):**

**Option A: Parallel Queries (Frontend)**
```typescript
const [profiles, statuses, leaves] = await Promise.all([
  supabase.from('agent_profiles').select(...),
  supabase.from('profile_status').select(...),
  supabase.from('leave_requests').select(...).eq('status', 'approved'),
]);
```

**Option B: Single RPC (Optimal)**
```sql
CREATE FUNCTION get_scheduled_team_members(p_current_day text, p_current_time_minutes int)
RETURNS TABLE(...)
-- Joins all tables, calculates visibility, returns filtered results
```

---

## Optimized Implementation Plan

### Phase 1: Status Mapping Fix (No Conflicts)

**File: `src/lib/teamStatusApi.ts`**
```typescript
// Line 3 - Expand type
export type ProfileStatus = 
  | 'LOGGED_IN' 
  | 'ON_BREAK' 
  | 'COACHING' 
  | 'LOGGED_OUT'
  | 'ON_OT'
  | 'RESTARTING'
  | 'ON_BIO';
```

**File: `src/components/team-status/StatusCard.tsx`**
```typescript
// Lines 12-17 - Add missing statuses
const STATUS_DISPLAY: Record<ProfileStatus, { label: string; className: string }> = {
  LOGGED_IN: { label: 'Active', className: '...' },
  ON_BREAK: { label: 'Break', className: '...' },
  COACHING: { label: 'Coaching', className: '...' },
  LOGGED_OUT: { label: 'Offline', className: '...' },
  ON_OT: { label: 'On OT', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  RESTARTING: { label: 'Restarting', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  ON_BIO: { label: 'Bio Break', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
};
```

---

### Phase 2: Timezone Utilities

**File: `src/lib/timezoneUtils.ts`**

Add new functions:
```typescript
/**
 * Get current EST day key ('mon', 'tue', etc.)
 */
export function getCurrentESTDayKey(): string {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const estDay = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
  }).format(new Date());
  return estDay.toLowerCase().slice(0, 3);
}

/**
 * Get current EST time as minutes from midnight
 */
export function getCurrentESTTimeMinutes(): number {
  const estParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  
  const hour = parseInt(estParts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(estParts.find(p => p.type === 'minute')?.value || '0', 10);
  return hour * 60 + minute;
}

/**
 * Get today's date in EST as 'YYYY-MM-DD'
 */
export function getTodayEST(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
```

---

### Phase 3: Enhanced Team Status API

**File: `src/lib/teamStatusApi.ts`**

**New Interface:**
```typescript
export interface TeamMemberStatus {
  profileId: string;
  email: string;
  fullName: string;
  position: string | null;
  currentStatus: ProfileStatus;
  statusSince: string;
  shiftSchedule: string | null;     // Today's schedule
  breakSchedule: string | null;
  // NEW FIELDS
  isScheduledNow: boolean;          // true if within shift window
  outageReason: string | null;      // approved outage reason if on leave
  hasApprovedOutage: boolean;       // true if on approved leave
  otSchedule: string | null;        // Today's OT schedule if any
}
```

**New Function: `fetchScheduledTeamMembers()`**
1. Get current EST day and time
2. Fetch all active profiles with per-day schedules
3. Fetch all profile_status records (including LOGGED_OUT)
4. Fetch approved leaves covering today
5. Filter profiles where current time falls within schedule window (regular + OT)
6. Return categorized results with online/scheduled counts

---

### Phase 4: StatusCard Outage Display

**File: `src/components/team-status/StatusCard.tsx`**

Add logic to display outage reasons:
```tsx
// New outage badge styling
const OUTAGE_BADGE = {
  className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
};

export function StatusCard({ member, showDashboardLink }: StatusCardProps) {
  // If agent has approved outage, show outage badge instead of status
  const showOutageBadge = member.hasApprovedOutage && member.outageReason;
  
  const statusInfo = showOutageBadge 
    ? { label: member.outageReason, className: OUTAGE_BADGE.className }
    : STATUS_DISPLAY[member.currentStatus] || STATUS_DISPLAY.LOGGED_OUT;
  
  return (
    // ... existing layout with outage badge logic
  );
}
```

---

### Phase 5: TeamStatusBoard Page Updates

**File: `src/pages/TeamStatusBoard.tsx`**

1. Replace `fetchLoggedInTeamMembers` → `fetchScheduledTeamMembers`
2. Update counts: `totalScheduled` and `totalOnline`
3. Update header: "X scheduled now (Y online)"
4. Update empty state: "No team members are scheduled to work right now."

---

## Files Summary

| File | Changes |
|------|---------|
| `src/lib/timezoneUtils.ts` | Add `getCurrentESTDayKey()`, `getCurrentESTTimeMinutes()`, `getTodayEST()` |
| `src/lib/teamStatusApi.ts` | Expand ProfileStatus type, add outage fields to interface, rewrite fetch function |
| `src/components/team-status/StatusCard.tsx` | Add ON_OT/RESTARTING/ON_BIO display, show outage reasons |
| `src/pages/TeamStatusBoard.tsx` | Update counts, empty states, and terminology |

---

## Key Optimizations

1. **Reuse existing utilities** - Use `parseScheduleRange()` from agentDashboardApi.ts
2. **Parallel queries** - Fetch profiles, statuses, and leaves concurrently
3. **EST-aware calculations** - All schedule comparisons use EST timezone
4. **Midnight-crossing support** - Handle schedules like "8:00 PM - 3:30 AM"
5. **No database migration** - Use existing `agent_profiles` columns directly
6. **Consistent status mapping** - Sync with LiveActivityFeed's complete list

---

## Implementation Sequence

1. Add timezone utilities to `timezoneUtils.ts`
2. Update `ProfileStatus` type in `teamStatusApi.ts`
3. Update `STATUS_DISPLAY` mapping in `StatusCard.tsx`
4. Rewrite `fetchScheduledTeamMembers()` in `teamStatusApi.ts`
5. Add outage display logic to `StatusCard.tsx`
6. Update `TeamStatusBoard.tsx` page
7. Test with various schedule scenarios

---

## Test Scenarios

| Scenario | Expected Result |
|----------|-----------------|
| Agent in ON_OT status | Shows "On OT" (emerald badge) |
| Agent scheduled 9-5, not logged in at 10 AM | Visible with "Offline" badge |
| Agent on approved Medical Leave | Visible with "Medical Leave" (blue badge) |
| Agent with OT until 8 PM, currently 7 PM | Visible (OT extends window) |
| Agent's day off (e.g., Fri in day_off array) | Not visible |
| Agent after shift ends (6 PM, shift was 9-5) | Not visible |
| Agent with midnight-crossing shift (8 PM - 3:30 AM) | Visible during those hours |

