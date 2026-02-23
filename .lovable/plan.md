

## Fix: Consistent Attendance Display Across All Viewers

### Root Cause (Confirmed)

Two bugs are causing different viewers to see different attendance:

**Bug 1 -- Unstable date construction (the Sunday mismatch)**
The dashboard initializes `selectedDate` using:
```
new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
```
This converts a date to a locale string, then re-parses it with `new Date(string)`. Parsing rules differ across browsers/locales, which can shift the resulting date by ~1 day near midnight or DST boundaries. This causes `weekStart`/`weekEnd` to shift by a day for some viewers, making Sunday either appear in the wrong week or get misclassified.

**Bug 2 -- Inconsistent `dayKey` format between live and snapshot paths**
- Live attendance sets `dayKey` to 3-letter abbreviations (`'mon'`, `'tue'`, `'sun'`)
- Snapshot attendance sets `dayKey` to date strings (`'2026-02-16'`)
- UI comparisons use `a.dayKey === format(selectedDay, 'yyyy-MM-dd')` -- this **only matches snapshots**, never live data
- This means OT quota lookups and day-specific data retrieval silently fail for live data

### Implementation Plan (Step by Step)

#### Step 1: Fix `dayKey` in `calculateAttendanceForWeek` (live path)

**File**: `src/lib/agentDashboardApi.ts`

Change all `dayKey: day.key` assignments (lines ~1601, 1619, 1747, 1771, 1774) from the 3-letter abbreviation to the `yyyy-MM-dd` date string (`dateStr`), matching the snapshot format.

Before: `dayKey: day.key`
After: `dayKey: dateStr`

This makes live and snapshot `dayKey` values use the same format, fixing all UI lookups.

#### Step 2: Remove unstable `toLocaleString` date construction

**File**: `src/pages/AgentDashboard.tsx`

Replace the 4 occurrences of the unstable pattern with the existing `getTodayEST()` + `parseDateStringLocal()` utilities from `timezoneUtils.ts`:

- **Line 106-110** (selectedDate init): Use `parseDateStringLocal(getTodayEST())`
- **Line 115-119** (selectedDay init): Use `parseDateStringLocal(getTodayEST())`
- **Line 267-270** (isCurrentWeek check): Use `parseDateStringLocal(getTodayEST())`
- **Line 454-465** (handleWeekChange): Use `parseDateStringLocal(getTodayEST())`

These utilities already exist and use `Intl.DateTimeFormat` which is stable across browsers.

#### Step 3: Fix `todayAttendance` lookup to use `dayKey`

**File**: `src/pages/AgentDashboard.tsx`

Line 224-225 currently does:
```ts
const todayAttendance = weekAttendance.find(
  (d) => format(d.date, 'yyyy-MM-dd') === todayStr
);
```

After Step 1, `dayKey` will be `yyyy-MM-dd`, so change to:
```ts
const todayAttendance = weekAttendance.find(
  (d) => d.dayKey === todayStr
);
```

Same fix for line 293-294:
```ts
const dayAttendance = weekAttendance.find((d) => d.dayKey === dayStr);
```

#### Step 4: Add admin-only debug card

**File**: `src/pages/AgentDashboard.tsx`

Add a collapsible debug card visible only to admins that shows:
- Viewer's local timezone
- `selectedDate` as toString() and as yyyy-MM-dd
- `weekStart` / `weekEnd` as yyyy-MM-dd
- `dataSource` (snapshot or live)
- `selectedDay` as yyyy-MM-dd
- First 7 attendance rows: dayKey, status, loginTime, hoursWorkedMinutes

This is temporary -- will be removed once the fix is verified.

### What This Does NOT Change

- No backend/database changes required
- No changes to snapshot logic or week boundary calculation
- No new dependencies needed (existing `timezoneUtils.ts` utilities are sufficient)
- `PortalClockContext` remains unchanged
- Week anchoring (`ANCHOR_DATE`) remains unchanged

### Verification

After deploying, have the same three viewers (agent, team lead, admin) open the same agent's dashboard for the same week. The debug card will show whether all three see identical `weekStart`, `weekEnd`, `dataSource`, and attendance dayKeys.

