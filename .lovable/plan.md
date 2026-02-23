

## Fix: Shift Schedule Always Showing "Pending"

### Root Cause

The `ShiftScheduleTable` component matches attendance rows using `day.key` (short names like `'mon'`, `'tue'`), but the `dayKey` property in each `DayAttendance` object is actually a full date string like `'2026-02-23'`. This means `attendance.find((a) => a.dayKey === day.key)` **never finds a match**, so every row displays "Pending" -- even when the data is correct.

The Weekly Summary and Today's Activity cards are unaffected because they use `allEvents` directly (filtered by date), not the attendance row-matching logic.

### Fix Plan (4 parts, all selected)

---

### 1. Row Key Fix (ShiftScheduleTable.tsx)

Change the attendance lookup to match by the actual date string instead of the short day key.

**File**: `src/components/dashboard/ShiftScheduleTable.tsx`

Currently (line 252):
```typescript
const dayAttendance = attendance.find((a) => a.dayKey === day.key);
```

**Fix**: Compute the actual date for each row from `weekStart + offset`, format it as `yyyy-MM-dd`, and match against `dayKey`:

```typescript
const dayDate = new Date(weekStart);
dayDate.setDate(weekStart.getDate() + index);
const y = dayDate.getFullYear();
const m = String(dayDate.getMonth() + 1).padStart(2, '0');
const d = String(dayDate.getDate()).padStart(2, '0');
const dateStr = `${y}-${m}-${d}`;
const dayAttendance = attendance.find((a) => a.dayKey === dateStr);
```

This is the primary fix that resolves the "always Pending" bug.

---

### 2. Fallback Mapping Safety

Add a secondary fallback: if no match is found by date string, also try matching by the short day name (converted from the `DayAttendance.date` object). This protects against future regressions where `dayKey` format might change.

This will be implemented in the same lookup logic as part 1 -- a simple `||` fallback.

---

### 3. Admin Debug Aid

Update the existing Debug card (visible to admins only) to also show per-row `dayKey` values from the attendance array, so mismatches are immediately visible during troubleshooting.

**File**: `src/pages/AgentDashboard.tsx` (Debug card section)

Add a small section listing the `dayKey` values from the `attendance` state alongside the expected date strings for the current week.

---

### 4. Refresh Fallback (30-second polling)

Add a 30-second interval that re-fetches dashboard data as a safety net in case the realtime subscription misses events.

**File**: `src/pages/AgentDashboard.tsx`

Add a `useEffect` with `setInterval` that calls `loadDashboardData()` every 30 seconds, but only for the current week. Clean up on unmount or week change.

---

### Technical Summary

| Part | File | Change |
|------|------|--------|
| Row key fix | `ShiftScheduleTable.tsx` | Match attendance by date string, not day name |
| Fallback | `ShiftScheduleTable.tsx` | Secondary match by day-of-week from Date object |
| Debug aid | `AgentDashboard.tsx` | Show dayKey mapping in admin debug card |
| Refresh | `AgentDashboard.tsx` | 30s polling interval as realtime backup |

