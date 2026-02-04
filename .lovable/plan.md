

# Plan: Broaden Messaging Channels & Add Force Refresh Button

## Summary
Update the Zendesk metrics fetching to include all messaging-like channels (`native_messaging`, `web_messaging`, `mobile_sdk`) and add a visible "Force Refresh" button that bypasses the cache and re-fetches fresh data from Zendesk for all agents of the selected support type.

---

## Changes Overview

### 1. Update Channel Filter in Edge Function
**File:** `supabase/functions/fetch-zendesk-metrics/index.ts`

- **Current state:** Line 363 filters only for `native_messaging`
- **Change:** Broaden the `messagingChannels` array to include:
  - `native_messaging`
  - `web_messaging`  
  - `mobile_sdk`

This aligns with Explore's broader "Messaging" definition and should capture all messaging-related tickets.

### 2. Add Force Refresh Button to TeamScorecard
**File:** `src/pages/TeamScorecard.tsx`

Add a visible "Force Refresh" button in the header that:
- Calls `triggerMetricsRefresh()` which passes `scheduled: true` to bypass the cache
- Refreshes all agents of the currently selected support type
- Shows a spinner while refreshing
- Is visible only to Admins/Super Admins
- Is disabled when `supportType === 'all'` (requires selecting a specific support type)
- Placed next to the existing "Save Changes" / "Save Scorecard" buttons

### 3. Improve Loading UX
**File:** `src/pages/TeamScorecard.tsx`

- The existing `refreshMutation` already has `isPending` state
- Add visual feedback: spinner icon + "Refreshing..." text on the button
- Disable the button while refresh is in progress

---

## Technical Details

### Edge Function Changes
```typescript
// Line ~363 in fetch-zendesk-metrics/index.ts
// FROM:
const messagingChannels = ['native_messaging'];

// TO:
const messagingChannels = ['native_messaging', 'web_messaging', 'mobile_sdk'];
```

### Force Refresh Button Implementation
The button will be added to the header area (around line 429-472) alongside the existing buttons:

```text
Button layout:
[Save Changes (if edits)] [Save Scorecard] [Force Refresh]
```

Button states:
- **Default:** Shows "Refresh Metrics" with refresh icon
- **Loading:** Shows spinner + "Refreshing..." 
- **Disabled conditions:**
  - When `supportType === 'all'` (tooltip: "Select a support type first")
  - When another mutation is in progress
  - When `isBeforeMinimumDate` is true

### Existing Infrastructure
The codebase already has:
- `refreshMutation` defined (lines 316-337) using `triggerMetricsRefresh()`
- `triggerMetricsRefresh()` in `scorecardApi.ts` which passes `scheduled: true` to bypass cache
- The edge function already supports `scheduled: true` to force fresh fetch

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/fetch-zendesk-metrics/index.ts` | Broaden `messagingChannels` filter |
| `src/pages/TeamScorecard.tsx` | Add visible Force Refresh button with spinner |

---

## Expected Outcome

1. **Broader ticket matching:** Chat AHT/FRT calculations will include tickets from `native_messaging`, `web_messaging`, and `mobile_sdk` channels, which should better align with Explore's totals.

2. **Visible refresh capability:** Admins can click "Refresh Metrics" to force a fresh fetch from Zendesk API, bypassing the 1-hour cache.

3. **Clear loading feedback:** Spinner on button indicates refresh is in progress.

