
# Fix Login Error and Implement Dynamic Attendance Status

## Summary

This plan addresses two issues:
1. **Foreign Key Error**: The `profile_status` table references the wrong table (`agent_directory` instead of `agent_profiles`)
2. **Attendance Status**: The Shift Schedule should show dynamic attendance status (Present/Absent/Late) based on login events and approved leaves

---

## Part 1: Fix Foreign Key Error

### Problem
The `profile_status` and `profile_events` tables have foreign keys pointing to `agent_directory.id`, but the Agent Dashboard uses `agent_profiles.id` as the profile identifier. These are different IDs for the same person.

### Solution
Alter the foreign key constraints to reference `agent_profiles.id` instead of `agent_directory.id`.

### Database Migration

```sql
-- Drop existing foreign key constraints
ALTER TABLE profile_status 
DROP CONSTRAINT IF EXISTS profile_status_profile_id_fkey;

ALTER TABLE profile_events 
DROP CONSTRAINT IF EXISTS profile_events_profile_id_fkey;

-- Recreate foreign keys pointing to agent_profiles
ALTER TABLE profile_status
ADD CONSTRAINT profile_status_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES agent_profiles(id) ON DELETE CASCADE;

ALTER TABLE profile_events
ADD CONSTRAINT profile_events_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES agent_profiles(id) ON DELETE CASCADE;
```

---

## Part 2: Implement Dynamic Attendance Status

### Status Logic

For each day in the current week (Mon-Sun):

| Condition | Status | Color |
|-----------|--------|-------|
| Day Off | Off | Grey |
| Approved leave on that date | Leave type (e.g., "Medical Leave") | Blue |
| Login event exists & on time | Present | Green |
| Login event exists & > 10 min late | Late | Yellow |
| Past day, no login, no leave | Absent | Red |
| Today/future, no login yet | Pending | Grey |

### Data Sources

1. **profile_events** - Check for LOGIN events on each date
2. **leave_requests** - Check for approved leaves covering each date (where `status = 'approved'` and date falls between `start_date` and `end_date`)
3. **agent_directory** - Get the schedule start time for that day to determine "Late"

### Components to Modify

1. **ShiftScheduleTable.tsx** - Pass profile events and leaves data, calculate status per row
2. **AgentDashboard.tsx** - Fetch profile events and approved leaves for the current week
3. **agentDashboardApi.ts** - Add function to fetch approved leaves for an agent

### New Types

```typescript
export type AttendanceStatus = 
  | 'present'     // Green - logged in on time
  | 'late'        // Yellow - logged in > 10 min after schedule
  | 'absent'      // Red - working day, no login, no leave
  | 'pending'     // Grey - today/future, no login yet
  | 'day_off'     // Grey - scheduled day off
  | 'on_leave';   // Blue - approved leave (with leave type)

export interface DayAttendance {
  date: Date;
  status: AttendanceStatus;
  leaveType?: string;  // e.g., "Medical Leave", "Vacation"
  loginTime?: string;  // Actual login time if present/late
  scheduleStart?: string; // Expected schedule start time
}
```

### Implementation Flow

```text
                    +-------------------+
                    |  Is it Day Off?   |
                    +--------+----------+
                             |
              Yes ─┐         | No
                   v         v
              +--------+  +----------------------+
              |  OFF   |  | Check approved leaves|
              +--------+  +----------+-----------+
                                     |
                    Has approved leave?
                           |
             Yes ─┐        | No
                  v        v
          +-----------+  +--------------------+
          | LEAVE     |  | Check login events |
          | (type)    |  +--------+-----------+
          +-----------+           |
                       Has login event on that day?
                              |
              Yes ─┐          | No
                   v          v
          +----------------+  +-------------------+
          | Check if Late  |  | Is date in past?  |
          | (>10 min)      |  +--------+----------+
          +-------+--------+           |
                  |           Yes ─┐   | No
          +-------+-------+        v   v
          |               |    +------+ +--------+
          v               v    |ABSENT| |PENDING |
       +-------+      +------+ +------+ +--------+
       |PRESENT|      | LATE |
       +-------+      +------+
```

### API Addition

New function in `agentDashboardApi.ts`:

```typescript
export async function getApprovedLeavesForWeek(
  agentEmail: string,
  weekStart: Date,
  weekEnd: Date
): Promise<{ data: ApprovedLeave[] | null; error: string | null }>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/agentDashboardApi.ts` | Add `getApprovedLeavesForWeek()` function, add `AttendanceStatus` type |
| `src/components/dashboard/ShiftScheduleTable.tsx` | Accept events/leaves props, calculate attendance status per day |
| `src/pages/AgentDashboard.tsx` | Fetch profile events and approved leaves, pass to ShiftScheduleTable |

---

## Implementation Steps

1. **Database Migration** - Fix foreign key constraints (Part 1)
2. **API Updates** - Add approved leaves fetch function
3. **ShiftScheduleTable Refactor** - Implement attendance status logic with new badge styles
4. **AgentDashboard Integration** - Fetch required data and pass to table

---

## Visual Changes

### Before
- Working (green badge) / Off (grey badge)

### After
- **Present** - Green badge
- **Late** - Yellow/amber badge  
- **Absent** - Red badge
- **Pending** - Grey badge (faded)
- **Off** - Grey badge
- **Medical Leave**, **Vacation**, etc. - Blue badge with leave type text
