

# Portal Clock: Centralized EST Time Source

## Overview

Create a single, authoritative "Portal Time" clock that runs in EST and serves as the basis for all time/date operations across the portal. The clock will be visible in the header/navbar so every user sees the same time regardless of their browser timezone.

## Performance Impact

A 1-second interval timer is **negligible** -- it's a single `setInterval` updating one `Date` object in React state. Modern browsers handle this with virtually zero CPU cost. Many production apps (trading platforms, dashboards) run multiple such timers without issue. The key is keeping it in a single context so there's only **one timer for the entire app**, not one per component.

## What This Involves

### Step 1: Create the PortalClock context and hook

**New file: `src/context/PortalClockContext.tsx`**

- A React context that holds a live `Date` object representing "now in EST"
- Updates every second via `setInterval`
- Exposes a `usePortalClock()` hook returning:
  - `now` -- live EST Date (updates every second)
  - `todayEST` -- today's date string in `YYYY-MM-DD` format
  - `currentDayKey` -- `'mon'`, `'tue'`, etc.
  - `currentTimeMinutes` -- minutes from midnight (for schedule checks)
- This single timer replaces all scattered `new Date()` + timezone conversion calls

### Step 2: Display the clock in the Layout header

**Edit: `src/components/Layout.tsx`**

- Add a small live clock display in the navbar (e.g., next to the notification bell)
- Shows something like: `EST 3:15:42 PM` or `Portal Time: 3:15 PM`
- Compact on mobile, slightly more detailed on desktop

### Step 3: Refactor existing consumers (incremental)

**Edit: `src/lib/timezoneUtils.ts`**

- Update `getTodayEST()`, `getCurrentESTDayKey()`, `getCurrentESTTimeMinutes()` to optionally accept a date parameter so they can use the portal clock's `now` instead of creating new Date objects internally
- Existing callers continue to work unchanged (backward compatible)

**Edit: `src/components/dashboard/DashboardWeekSelector.tsx` and `WorkTrackerDaySelector.tsx`**

- Replace the local `getTodayInEST()` functions with the shared `usePortalClock()` hook
- This also fixes the timezone mismatch bug from the earlier plan (the `ANCHOR_DATE` normalization)

## Technical Details

```text
+---------------------------+
|    PortalClockProvider     |
|  (single setInterval/1s)  |
|                            |
|  state: { now: Date }     |
|  computed: todayEST,       |
|    dayKey, timeMinutes     |
+---------------------------+
         |
    usePortalClock()
         |
    +----+----+----+
    |    |    |    |
  Layout  Week  Day  timezoneUtils
  (clock  Sel.  Sel.  (functions)
  display)
```

### Clock Display Design

- Position: Right side of navbar, near notification bell
- Format: `EST HH:MM:SS AM/PM` (seconds update live)
- Styling: Small, muted text -- informational, not distracting
- Mobile: Abbreviated to `HH:MM AM/PM` (no seconds)

## Implementation Order

We'll do this step by step:

1. **Step 1**: Create the PortalClockContext + hook + wrap in App.tsx
2. **Step 2**: Add the visible clock to the Layout header
3. **Step 3**: Refactor DashboardWeekSelector and WorkTrackerDaySelector to use the hook (also fixes the anchor date bug)
4. **Step 4**: Update timezoneUtils functions to accept optional date params

Each step is independently testable.

