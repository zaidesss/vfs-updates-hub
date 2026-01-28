
# Fix "Since" Time Display in Agent Dashboard

## Problem Summary

The "Since: xx:xx PM" time shown in the Current Status section is **incorrect** in two ways:

1. **Wrong time source**: Shows page load time instead of actual last status change time
2. **Missing date**: Only shows time (e.g., "05:08 PM"), but should show date + time for previous days (e.g., "1/27/2026 5:00 PM")

## Root Cause Analysis

### Issue 1: Initial State Uses Current Time
**File**: `src/pages/AgentDashboard.tsx` (Line 40)
```typescript
const [statusSince, setStatusSince] = useState<string>(new Date().toISOString());
```
This initializes with page load time, which briefly shows before the API data arrives.

### Issue 2: API Fallback Uses Current Time
**File**: `src/lib/agentDashboardApi.ts` (Lines 192-200)
```typescript
// If no status exists, return default LOGGED_OUT
if (!data) {
  return { 
    data: {
      id: '',
      profile_id: profileId,
      current_status: 'LOGGED_OUT' as ProfileStatus,
      status_since: new Date().toISOString(), // ← Wrong!
    }, 
    error: null 
  };
}
```
When no `profile_status` record exists, it returns the current time instead of `null`.

### Issue 3: Time Format Lacks Date
**File**: `src/components/dashboard/StatusIndicator.tsx` (Lines 34-37)
```typescript
function formatTimeSince(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
```
This only formats time, missing the date when status was changed on a previous day.

---

## Solution

### Step 1: Update API to Return Null for Unknown Status Time

When no status record exists, return `status_since: null` instead of the current time.

**File**: `src/lib/agentDashboardApi.ts`

Update the fallback return:
```typescript
if (!data) {
  return { 
    data: {
      id: '',
      profile_id: profileId,
      current_status: 'LOGGED_OUT' as ProfileStatus,
      status_since: null, // Changed from new Date().toISOString()
    }, 
    error: null 
  };
}
```

Update the type to allow null:
```typescript
export interface ProfileStatusRecord {
  id: string;
  profile_id: string;
  current_status: ProfileStatus;
  status_since: string | null;  // Allow null
}
```

### Step 2: Update AgentDashboard to Handle Null

**File**: `src/pages/AgentDashboard.tsx`

Change initial state to null:
```typescript
const [statusSince, setStatusSince] = useState<string | null>(null);
```

Update the data loading:
```typescript
if (statusResult.data) {
  setStatus(statusResult.data.current_status);
  setStatusSince(statusResult.data.status_since); // May be null now
}
```

### Step 3: Smart Date/Time Formatting

**File**: `src/components/dashboard/StatusIndicator.tsx`

Replace the `formatTimeSince` function with a smarter version that:
- Shows only time if status changed today (e.g., "3:15 PM")
- Shows date + time if status changed on a different day (e.g., "1/27/2026 5:00 PM")
- Uses EST timezone consistently per project standards

```typescript
function formatTimeSince(isoString: string): string {
  const date = new Date(isoString);
  const today = new Date();
  
  // Check if same day in EST
  const dateEST = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(date);
  
  const todayEST = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(today);
  
  const timeFormatted = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
  
  if (dateEST === todayEST) {
    // Same day: show only time
    return timeFormatted;
  } else {
    // Different day: show date + time
    return `${dateEST} ${timeFormatted}`;
  }
}
```

Handle null case in the render:
```typescript
{since ? (
  <span className="text-sm text-muted-foreground">
    Since: {formatTimeSince(since)}
  </span>
) : null}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/agentDashboardApi.ts` | Update `ProfileStatusRecord` type to allow `null` for `status_since`; update fallback to return `null` |
| `src/pages/AgentDashboard.tsx` | Change `statusSince` state to allow `null`; handle null in template |
| `src/components/dashboard/StatusIndicator.tsx` | Smart date/time formatting with EST timezone; handle null `since` prop |

---

## Expected Behavior After Fix

| Scenario | Current (Wrong) | After Fix (Correct) |
|----------|-----------------|---------------------|
| Logged in at 9:00 AM today | Since: 10:42 AM (page load) | Since: 9:00 AM |
| Took break at 12:30 PM | Since: 10:42 AM (page load) | Since: 12:30 PM |
| Logged out 5:00 PM yesterday | Since: 10:42 AM (page load) | Since: 1/27/2026 5:00 PM |
| Never had any status | Since: 10:42 AM (page load) | (No "Since" shown) |

---

## Additional Considerations

1. **Team Status Board**: The `StatusCard` component on the Team Status Board may also need updating to show proper time formatting. Should we apply the same fix there?

2. **Profile Events as Fallback**: If `profile_status` is empty but `profile_events` exists, we could query the most recent event to get the actual last status change time. Would you like this enhancement?

3. **Realtime Updates**: When status changes via the buttons, the "Since" time updates correctly (using `new Date()` after a successful change). This is correct behavior.
