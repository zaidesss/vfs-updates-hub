
# Zendesk Explore–Aligned Avg Talk Time Implementation

## Overview

Update the `fetch-zendesk-metrics` edge function to calculate **Average Talk Time** that matches Zendesk Explore within ±1 second. The key change is using the `completion_status` field to exclude missed/declined calls instead of filtering by `talk_time > 0`.

---

## Current vs. Required Logic

### Current Implementation (Incorrect for Explore alignment)
```javascript
// Filters legs where talk_time > 0
const agentLegs = allLegs.filter(leg => 
  String(leg.agent_id) === zendeskUserId && 
  leg.type === 'agent' &&
  (leg.talk_time || 0) > 0  // <-- This excludes short/zero-duration answered calls
);

// Formula: SUM(talk_time) / COUNT(legs where talk_time > 0)
```

**Problem:** This excludes legitimate legs where an agent answered but had very brief or zero talk time (e.g., immediate hang-up, system errors, very short calls).

### Required Implementation (Explore Aligned)
```javascript
// Include ALL legs EXCEPT missed/declined
const agentLegs = allLegs.filter(leg => 
  String(leg.agent_id) === zendeskUserId && 
  leg.type === 'agent' &&
  leg.completion_status !== 'agent_missed' &&
  leg.completion_status !== 'agent_declined' &&
  leg.completion_status !== 'agent_transfer_declined'
);

// Formula: AVG(talk_time_seconds)
// = SUM(talk_time) / COUNT(all included legs)
```

---

## Technical Changes

### 1. Update LegRecord Interface

Add `completion_status` field to capture the leg outcome from Zendesk API.

**File:** `supabase/functions/fetch-zendesk-metrics/index.ts`

```typescript
interface LegRecord {
  id: string | number;
  call_id: string | number;
  agent_id: string | number;
  talk_time: number;
  wrap_up_time: number;
  type: string;
  completion_status?: string;  // NEW: "completed", "agent_missed", "agent_declined", etc.
  updated_at?: string;
  created_at?: string;
}
```

### 2. Update Call Metrics Calculation

Modify `fetchCallMetrics` function to:
1. Filter by `completion_status` instead of `talk_time > 0`
2. Include zero-duration legs that were answered
3. Return the correct per-leg average

```typescript
// Before (current):
const agentLegs = allLegs.filter(leg => 
  String(leg.agent_id) === zendeskUserId && 
  leg.type === 'agent' &&
  (leg.talk_time || 0) > 0
);

// After (Explore aligned):
const EXCLUDED_STATUSES = ['agent_missed', 'agent_declined', 'agent_transfer_declined'];

const agentLegs = allLegs.filter(leg => 
  String(leg.agent_id) === zendeskUserId && 
  leg.type === 'agent' &&
  !EXCLUDED_STATUSES.includes(leg.completion_status || '')
);
```

### 3. Update Return Metrics

Rename internal variable for clarity and ensure proper per-leg averaging:

```typescript
// Calculate Avg Talk Time (per leg)
const totalLegs = weekLegs.length;
let totalTalkTime = 0;
for (const leg of weekLegs) {
  totalTalkTime += leg.talk_time || 0;
}

// AVG(leg.talk_time_seconds) - no rounding until final
const avgTalkTimeSeconds = totalLegs > 0 ? Math.round(totalTalkTime / totalLegs) : null;
```

---

## Database Schema

No changes required. The existing `zendesk_agent_metrics.call_aht_seconds` column will store the corrected value.

---

## UI Label Update

### Current Label
- "Call AHT"

### New Labels (as per user requirement)

**Option A - Single Metric (Recommended)**
Update the label to clearly indicate the calculation method:

**File:** `src/pages/TeamScorecard.tsx`
```typescript
// Change header text from:
<TableHead>Call AHT</TableHead>

// To:
<TableHead>Avg Talk Time</TableHead>
// Tooltip: "per call leg — Explore aligned"
```

**Option B - Dual Metrics (Optional Enhancement)**
If exposing both metrics for clarity:
- "Avg Talk Time" (per leg — Explore aligned)
- "Avg Talk Time per Call" (capacity view — current formula)

---

## Summary of File Changes

### Edge Function
**File:** `supabase/functions/fetch-zendesk-metrics/index.ts`

| Line Range | Change |
|:---|:---|
| 38-47 | Add `completion_status?: string` to `LegRecord` interface |
| 166-173 | Replace `talk_time > 0` filter with `completion_status` exclusion logic |
| 189-201 | Update comments and variable names for clarity |

### Frontend
**File:** `src/pages/TeamScorecard.tsx`

| Line Range | Change |
|:---|:---|
| 680 | Update column header from "Call AHT" to "Avg Talk Time" |

---

## Validation Criteria

After implementation, the metric should satisfy:
```
|Lovable Avg Talk Time - Zendesk Explore Avg Talk Time| ≤ 1 second
```

Any larger discrepancy indicates:
- Wrong leg inclusion/exclusion (check `completion_status` filter)
- Incorrect aggregation level (should be per-leg, not per-call)
- Pre-rounding before averaging

---

## Edge Cases

1. **No legs in week**: Return `null` (already handled)
2. **All legs have `talk_time = 0`**: Return `0` seconds average (correct per-leg behavior)
3. **Missing `completion_status`**: Treat as included (defensive fallback for older API responses)
4. **Transferred legs**: Included (they have valid `completion_status` like "completed" or "customer_hang_up")

---

## Backwards Compatibility

- The database column name remains `call_aht_seconds`
- Saved scorecards are unaffected (they store the computed value)
- Fresh metric fetches will use the new formula going forward
