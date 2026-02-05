
# Plan: Fix Call AHT Label & Correct Chat AHT Calculation

## Summary
This plan addresses three issues:
1. Re-label "Avg Talk Time" back to "Call AHT" in the scorecard table header
2. Fix Chat AHT calculation to use `agent_work_time` (handle time only) instead of `full_resolution_time` (which includes queue/wait)
3. Verify FRT continues using seconds correctly (no changes needed)

---

## Issue 1: Re-label Column Header

**File:** `src/pages/TeamScorecard.tsx`

The table header currently shows "Avg Talk Time" but should show "Call AHT".

**Change (line 717):**
```text
FROM: Avg Talk Time
TO:   Call AHT
```

The tooltip will still explain "per call leg — Explore aligned" for context.

---

## Issue 2: Chat AHT Calculation Fix

**File:** `supabase/functions/fetch-zendesk-metrics/index.ts`

### Current Problem (lines 269-292)
The code currently:
1. FIRST tries `full_resolution_time_in_minutes` (which includes queue time, wait time, AND handle time)
2. Only falls back to `agent_work_time` from metric events if #1 is null

This is backwards. The `full_resolution_time` metric captures the ENTIRE ticket lifecycle, not just the agent's actual handling time.

### Correct Approach
Flip the priority:
1. **PRIMARY**: Use `agent_work_time` from Ticket Metric Events API (actual handle time only)
2. **FALLBACK**: If `agent_work_time` not available, leave as null (do NOT use `full_resolution_time`)

### Code Change (lines 256-292)

```text
BEFORE:
  let ahtSeconds: number | null = null;
  
  // Use full_resolution_time first (WRONG - includes queue/wait)
  const fullResolutionMinutes = tm?.full_resolution_time_in_minutes?.calendar;
  if (fullResolutionMinutes !== null) {
    ahtSeconds = Math.round(fullResolutionMinutes * 60);
  }
  
  // Fallback to agent_work_time only if null
  if (ahtSeconds === null && eventsResponse.ok) {
    ...agent_work_time logic...
  }

AFTER:
  let ahtSeconds: number | null = null;
  
  // SKIP full_resolution_time - it includes queue and wait time
  // Log it for debugging but don't use it for AHT
  console.log(`Ticket ${ticketId} full_resolution=${tm?.full_resolution_time_in_minutes?.calendar}min (NOT used for AHT)`);
  
  // PRIMARY: Use agent_work_time from metric events (handle time only)
  if (eventsResponse.ok) {
    const eventsData = await eventsResponse.json();
    const events = eventsData.ticket_metric_events || [];
    
    const workTimeEvents = events.filter(
      (e) => e.metric === 'agent_work_time' && e.type === 'update_status'
    );
    
    if (workTimeEvents.length > 0) {
      const lastEvent = workTimeEvents[workTimeEvents.length - 1];
      ahtSeconds = lastEvent.status?.calendar || null;
      console.log(`Ticket ${ticketId} agent_work_time: ${ahtSeconds}s (handle time only)`);
    }
  }
  
  // If agent_work_time not available, leave as null
  // Do NOT fall back to full_resolution_time
```

---

## Issue 3: FRT Already Correct

**File:** `supabase/functions/fetch-zendesk-metrics/index.ts`

The FRT calculation at line 267 already uses `reply_time_in_seconds.calendar` which is the correct metric for "Assignment to First Reply" in seconds.

No changes needed.

---

## Impact Assessment

| Component | Risk | Notes |
|-----------|------|-------|
| Call AHT label | None | Simple text change |
| Chat AHT calculation | Low | Values may initially show as null for tickets without `agent_work_time` events; this is expected |
| FRT | None | No changes |
| Existing saved data | None | Previously saved scorecards retain their values |
| Database | None | No schema changes |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/TeamScorecard.tsx` | Line 717: "Avg Talk Time" → "Call AHT" |
| `supabase/functions/fetch-zendesk-metrics/index.ts` | Lines 269-292: Prioritize `agent_work_time`, skip `full_resolution_time` |

---

## Testing After Implementation

1. Deploy the updated edge function
2. Select a specific support type (e.g., Hybrid Support)
3. Click "Refresh Metrics" to fetch fresh data
4. Check logs to verify `agent_work_time` is being captured
5. Verify Chat AHT values are now reasonable (typically 60-600 seconds)
6. Confirm the column header shows "Call AHT" instead of "Avg Talk Time"

---

## Expected Outcome

1. **Call AHT column** will be correctly labeled "Call AHT"
2. **Chat AHT values** will reflect actual agent handle time (excluding queue/wait)
3. **Values will be smaller** and more realistic (minutes, not hours)
4. **FRT** continues to work correctly in seconds
