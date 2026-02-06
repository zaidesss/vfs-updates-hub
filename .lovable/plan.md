

# Fix: Upwork Time Not Refreshing After Logout

## Problem Identified

When an agent logs out, the dashboard immediately refreshes but shows stale Upwork hours because the sync operation runs in the background ("fire and forget").

| Timeline | What Happens |
|----------|--------------|
| T+0ms | User clicks LOGOUT |
| T+50ms | `updateProfileStatus` completes, returns success |
| T+60ms | Dashboard calls `loadDashboardData()` |
| T+70ms | `fetchUpworkTimeFromCache` returns **old cached data** |
| T+2000ms | Edge function finishes syncing **new data** to cache |
| **Result** | User sees stale Upwork hours until manual page refresh |

---

## Root Cause

**File: `src/lib/agentDashboardApi.ts` (Line 585)**

```typescript
// Fetch and cache Upwork hours on logout (fire and forget)
fetchAndCacheUpworkTime(profileId, agentProfile.email)
  .catch((err) => console.error('Failed to fetch Upwork time on logout:', err));
```

The `.catch()` pattern means this is NOT awaited - the function returns immediately while the sync runs in the background.

---

## Solution

**Await the Upwork sync during logout** so the dashboard refresh sees the updated data.

### Option A: Await in API (Recommended)
Make the logout wait for Upwork sync to complete before returning success. This adds ~1-2 seconds to logout but guarantees fresh data.

### Option B: Delayed Refetch in UI
Keep fire-and-forget but add a delayed refetch (e.g., 3 seconds after logout). Less reliable as sync time varies.

**I recommend Option A** because it's more reliable and matches the memory context stating "logout-triggered sync model to minimize API overhead."

---

## Technical Changes

### File: `src/lib/agentDashboardApi.ts`

**Change the fire-and-forget to an awaited call:**

```typescript
// Before (Lines 580-586):
} else if (eventType === 'LOGOUT' || eventType === 'OT_LOGOUT') {
  checkAndAlertEarlyOut(...)
    .catch((err) => console.error('...'));
  
  // Fetch and cache Upwork hours on logout (fire and forget)
  fetchAndCacheUpworkTime(profileId, agentProfile.email)
    .catch((err) => console.error('...'));
}

// After:
} else if (eventType === 'LOGOUT' || eventType === 'OT_LOGOUT') {
  checkAndAlertEarlyOut(...)
    .catch((err) => console.error('...'));
  
  // Await Upwork sync so dashboard refresh sees updated data
  try {
    await fetchAndCacheUpworkTime(profileId, agentProfile.email);
  } catch (err) {
    console.error('Failed to fetch Upwork time on logout:', err);
  }
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/agentDashboardApi.ts` | Await `fetchAndCacheUpworkTime` during LOGOUT/OT_LOGOUT |

---

## Expected Results After Fix

| Scenario | Before | After |
|----------|--------|-------|
| Logout button response | ~50ms (instant) | ~1-2s (waits for sync) |
| Upwork hours after logout | Stale data shown | Fresh data shown |
| User experience | Must refresh page | Data updates automatically |

---

## Trade-offs

| Aspect | Impact |
|--------|--------|
| Logout speed | Slightly slower (~1-2s) due to waiting for edge function |
| Data accuracy | Guaranteed fresh data |
| User expectation | "Status Updated" toast appears after sync completes |

---

## Alternative Consideration

If the 1-2 second delay is unacceptable, we could implement a "Syncing..." loading state that shows after logout while fetching continues, then auto-refreshes when complete. However, the await approach is simpler and more reliable.

