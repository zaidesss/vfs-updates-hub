

## Fix: Shift Schedule Not Updating to "Present" After Login

### Problem
When an agent logs in (either by clicking "Log In" on the dashboard or by opening the dashboard after logging in), the Shift Schedule table still shows "Pending" for today and all future days. The "Current Status" card correctly shows "Logged In," but the attendance table does not reflect it.

### Root Cause

There are **two issues**:

1. **Race condition after status change**: When the user clicks "Log In," `handleStatusChange` calls `updateProfileStatus` (which inserts the LOGIN event into `profile_events`), then immediately calls `loadDashboardData()`. However, the re-fetch of `profile_events` may execute before the database has fully committed the INSERT, so the attendance calculation doesn't find the LOGIN event and marks today as "Pending."

2. **No real-time refresh**: If the user opens the dashboard after already being logged in from another session/page, the attendance loads once on mount. There's no mechanism to auto-refresh if the data was stale or if events arrive after the initial load.

### Proposed Fix (Step-by-Step)

#### Step 1: Add a small delay before re-fetching after status change

**File**: `src/pages/AgentDashboard.tsx`

In `handleStatusChange`, after a successful status update, add a brief delay (500ms) before calling `loadDashboardData()` to give the database time to commit the event. This is the simplest fix for the race condition.

Current (line ~496):
```ts
await loadDashboardData();
```

New:
```ts
await new Promise(resolve => setTimeout(resolve, 500));
await loadDashboardData();
```

#### Step 2: Enable realtime on `profile_events` and subscribe in the dashboard

**Database migration**: Add `profile_events` to the realtime publication so we can listen for new events.

**File**: `src/pages/AgentDashboard.tsx`

Add a `useEffect` that subscribes to `profile_events` changes for the current `profileId`. When a new LOGIN or LOGOUT event is inserted, trigger `loadDashboardData()` to refresh the attendance table automatically.

This ensures:
- If the user logs in from another tab/page, the dashboard updates
- If a team lead views an agent's dashboard, it updates when the agent logs in
- The Shift Schedule always reflects the latest status

### What This Does NOT Change
- No changes to the attendance calculation logic
- No changes to the date/timezone handling (the recent dayKey fix remains)
- No changes to snapshot vs live logic

### Technical Details

The realtime subscription will:
- Listen for INSERT events on `profile_events` where `profile_id` matches
- Filter for relevant event types (LOGIN, LOGOUT, OT_LOGIN, OT_LOGOUT)
- Debounce re-fetches to avoid multiple rapid reloads
- Clean up the subscription on unmount or when `profileId` changes

