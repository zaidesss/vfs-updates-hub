

# Plan: Fix Chat AHT/FRT Calculations & UI Display

## Summary
This plan addresses three critical issues:
1. **Chat AHT showing "Pending"** - Native messaging tickets don't provide `agent_work_time` events. Need to use an alternative metric.
2. **Chat FRT showing wrong values (77:59)** - Currently measuring Creation→Reply instead of Assignment→First Reply
3. **UI cleanup** - Use database goals and display raw seconds with warning icons for missing data

---

## Issue 1: Chat AHT (Handle Time) - Root Cause Analysis

### What's Happening
The current code correctly tries to fetch `agent_work_time` from the Ticket Metric Events API. However, **native messaging tickets do NOT emit `agent_work_time` events** - this is a Zendesk limitation documented for the "Messaging" channel.

The logs confirm this: no `agent_work_time` entries are being found, so `ahtSeconds` remains `null`, causing "Pending" in the UI.

### Solution Options
Since `agent_work_time` is unavailable for native messaging, we have limited alternatives:

**Option A (Recommended): Use "Requester Wait Time" as proxy**
- Zendesk's Explore uses `requester_wait_time` (sum of time customer waited for agent replies)
- This approximates handle time better than `full_resolution_time`
- Available in the standard Ticket Metrics API: `tm.requester_wait_time_in_minutes.calendar`

**Option B: Use Manual Events Calculation**
- Calculate from public comment timestamps in the ticket audit log
- More accurate but requires additional API calls and complex logic

**Proposed Approach**: Use `requester_wait_time_in_minutes` converted to seconds as Chat AHT for native messaging. This better represents actual agent engagement time than `full_resolution_time`.

### Code Changes
**File:** `supabase/functions/fetch-zendesk-metrics/index.ts`

```text
// Line ~260-290 - Update AHT logic

// AFTER fetching metrics:
// Try agent_work_time from events first (works for legacy chat)
// If not available, fall back to requester_wait_time (proxy for messaging)

if (eventsResponse.ok) {
  // Try agent_work_time from metric events
  const events = eventsData.ticket_metric_events || [];
  const workTimeEvents = events.filter(e => 
    e.metric === 'agent_work_time' && e.type === 'update_status'
  );
  
  if (workTimeEvents.length > 0) {
    ahtSeconds = workTimeEvents[workTimeEvents.length - 1].status?.calendar || null;
    console.log(`Ticket ${ticketId} agent_work_time: ${ahtSeconds}s`);
  }
}

// Fallback to requester_wait_time if agent_work_time unavailable
if (ahtSeconds === null && metricsResponse.ok) {
  const requesterWaitMinutes = tm?.requester_wait_time_in_minutes?.calendar;
  if (requesterWaitMinutes !== null && requesterWaitMinutes !== undefined) {
    ahtSeconds = Math.round(requesterWaitMinutes * 60);
    console.log(`Ticket ${ticketId} using requester_wait_time: ${ahtSeconds}s`);
  }
}
```

---

## Issue 2: Chat FRT (Assignment to First Reply) - Root Cause Analysis

### What's Happening
Current code uses `reply_time_in_seconds.calendar` which measures **ticket creation → first agent reply**.

Explore's "Assignment to first reply" measures **last assignment → first agent reply**.

For Jennifer's ticket 1391833:
- `reply_time` = 13,885s (3.8 hours from creation)
- But if the ticket was assigned later, the actual Assignment→Reply time could be much shorter

### Solution
Use the Ticket Metric Events API to calculate FRT properly:
1. Find the `reply_time` metric with `type: 'activate'` event (marks when timer started for current assignee)
2. Find the `reply_time` metric with `type: 'fulfill'` event (marks first reply)
3. Calculate: `fulfill_time - activate_time`

If events are missing, show a warning icon instead of a potentially misleading value.

### Code Changes
**File:** `supabase/functions/fetch-zendesk-metrics/index.ts`

```text
// Line ~266-270 - Update FRT logic

// FRT: Calculate Assignment to First Reply from metric events
if (eventsResponse.ok) {
  const events = eventsData.ticket_metric_events || [];
  
  // Find reply_time events
  const replyActivate = events.find(e => 
    e.metric === 'reply_time' && e.type === 'activate'
  );
  const replyFulfill = events.find(e => 
    e.metric === 'reply_time' && e.type === 'fulfill'
  );
  
  if (replyActivate && replyFulfill) {
    // Calculate Assignment to First Reply
    const activateTime = new Date(replyActivate.time).getTime();
    const fulfillTime = new Date(replyFulfill.time).getTime();
    frtSeconds = Math.round((fulfillTime - activateTime) / 1000);
    console.log(`Ticket ${ticketId} FRT (assignment→reply): ${frtSeconds}s`);
  } else if (replyFulfill && replyFulfill.status?.calendar) {
    // Use cumulative calendar time from fulfill event as fallback
    frtSeconds = replyFulfill.status.calendar;
    console.log(`Ticket ${ticketId} FRT from fulfill event: ${frtSeconds}s`);
  }
}

// If still null, mark as unavailable (don't use reply_time_in_seconds as it's creation→reply)
if (frtSeconds === null) {
  console.log(`Ticket ${ticketId} FRT unavailable - no assignment events`);
}
```

---

## Issue 3: UI Updates

### Changes Needed

**A. Remove hardcoded goals, use database config**
**File:** `src/pages/TeamScorecard.tsx`

- Remove or deprecate `METRIC_GOALS` constant (lines 35-40)
- Already fetching `scorecard_config` via query - use those goals instead
- Create a lookup function to get goal by support type and metric key

**B. Change display format to raw seconds**
**File:** `src/pages/TeamScorecard.tsx` and `src/lib/scorecardApi.ts`

- Change `formatValue={formatSeconds}` to `formatValue={(v) => v !== null ? `${v}s` : '-'}`
- Update input parsing in `EditableMetricCell` to accept raw seconds

**C. Add warning icon for missing/uncertain data**
**File:** `src/components/scorecard/EditableMetricCell.tsx`

When value is `null`:
- Show "⚠" warning icon instead of just "Pending"
- Tooltip: "Data unavailable - click to enter manually"
- Still allow admin editing

---

## Database Changes

None required - the `scorecard_config` table already has correct goals from your spreadsheet:
- Hybrid Support: call_aht=420, chat_aht=600, chat_frt=30
- Chat Support: chat_aht=600, chat_frt=30

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/fetch-zendesk-metrics/index.ts` | Fix AHT to use requester_wait_time fallback; Fix FRT to use assignment events |
| `src/pages/TeamScorecard.tsx` | Remove hardcoded METRIC_GOALS, use DB goals, change display to seconds |
| `src/components/scorecard/EditableMetricCell.tsx` | Show warning icon for null values, update input to accept seconds |
| `src/lib/scorecardApi.ts` | Add helper function for raw seconds formatting |

---

## Implementation Order

1. **Step 1**: Update edge function with new AHT/FRT logic
2. **Step 2**: Deploy edge function
3. **Step 3**: Update UI components (display format, goals, warning icon)
4. **Step 4**: Clear cached metrics in `zendesk_agent_metrics` for Week 1
5. **Step 5**: Test using "Refresh Metrics" button

---

## Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| Chat AHT | Pending (null) | Shows seconds (using requester_wait_time) |
| Chat FRT | 4679s (creation→reply) | Correct assignment→reply seconds |
| Display | mm:ss format | Raw seconds (e.g., "420s") |
| Goals | Hardcoded (300, 180, 60) | From DB (420, 600, 30) |
| Missing data | "Pending" text | ⚠ icon with tooltip, editable |

---

## Matching Zendesk Explore

With these changes:
- **FRT**: Will match Explore's "Assignment to first reply (sec)" using last assignment timestamp
- **AHT**: Will use `requester_wait_time` as proxy, which should be closer to Explore's messaging "Handle Time" than `full_resolution_time`

If values still don't match exactly, the discrepancy explanation:
- Explore may use business hours vs calendar time
- Explore may aggregate differently (median vs mean)
- Native messaging has limited metric availability

The warning icon ensures team leads know when values are approximated or unavailable, giving them the option to manually correct.

