

# Update Time Format and Add Logout Time Display

## Summary

Update the Shift Schedule to:
1. Display times in **12-hour EST format** (e.g., "3:15 PM" instead of "15:15")
2. Show **logout time** alongside login time when the agent has logged out for that day
3. Format: `Present (8:00 AM)` and `Logged Out (5:15 PM)` as separate badges

---

## Current Behavior

- Login times display in 24-hour format: `Present (15:15)`
- Times use browser's local timezone
- Only login time is shown, no logout information

---

## Changes Required

### 1. Update `DayAttendance` Interface

Add a new field for logout time:

```typescript
export interface DayAttendance {
  date: Date;
  dayKey: string;
  status: AttendanceStatus;
  leaveType?: string;
  loginTime?: string;    // Now in 12-hour EST format
  logoutTime?: string;   // NEW: Logout time in 12-hour EST format
  scheduleStart?: string;
}
```

### 2. Fetch Logout Events

Modify `getWeekLoginEvents` to fetch both LOGIN and LOGOUT events, or create a new function:

```typescript
export async function getWeekStatusEvents(
  profileId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<{ data: ProfileEvent[] | null; error: string | null }>
```

This will fetch events where `event_type IN ('LOGIN', 'LOGOUT')`.

### 3. Add EST Time Formatting Helper

Create a helper function using `Intl.DateTimeFormat` for 12-hour EST format:

```typescript
function formatTimeInEST(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}
// Output: "3:15 PM", "8:00 AM", "12:30 PM"
```

### 4. Update `calculateAttendanceForWeek`

- Find both LOGIN and LOGOUT events for each day
- Format times using the EST helper
- Include logout time in the attendance data

### 5. Update `ShiftScheduleTable` Display

Modify `getStatusBadge` to show both login and logout times:

```text
Current:    [Present (15:15)]

New:        [Present (8:00 AM)]  [Logged Out (5:15 PM)]
```

---

## Visual Layout

### When Logged In (no logout yet)
```
| Wednesday | 8:00 AM - 5:00 PM | [Present (8:00 AM)] |
```

### When Logged Out
```
| Wednesday | 8:00 AM - 5:00 PM | [Present (8:00 AM)] [Logged Out (5:15 PM)] |
```

### Late + Logged Out
```
| Wednesday | 8:00 AM - 5:00 PM | [Late (8:25 AM)] [Logged Out (5:15 PM)] |
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/agentDashboardApi.ts` | Add `logoutTime` to interface, add `formatTimeInEST` helper, update `getWeekLoginEvents` to fetch LOGOUTs, update `calculateAttendanceForWeek` |
| `src/components/dashboard/ShiftScheduleTable.tsx` | Update `getStatusBadge` to display both login and logout badges |
| `src/pages/AgentDashboard.tsx` | Minor: may rename the events fetch call if function name changes |

---

## Implementation Steps

| Step | Action |
|------|--------|
| 1 | Add `formatTimeInEST` helper function to `agentDashboardApi.ts` |
| 2 | Add `logoutTime` field to `DayAttendance` interface |
| 3 | Rename/update `getWeekLoginEvents` to fetch both LOGIN and LOGOUT events |
| 4 | Update `calculateAttendanceForWeek` to find logout events and format times in 12-hour EST |
| 5 | Update `getStatusBadge` in `ShiftScheduleTable.tsx` to render two badges when logout exists |
| 6 | Test the display with the non-admin account |

---

## Technical Details

### EST Timezone Handling

Using `Intl.DateTimeFormat` with `timeZone: 'America/New_York'` ensures correct EST/EDT handling regardless of the user's browser timezone.

### Badge Layout

The Status column will now potentially display two badges side by side:
- First badge: Present/Late with login time
- Second badge (grey): Logged Out with logout time

If no logout has occurred yet, only the first badge is shown.

