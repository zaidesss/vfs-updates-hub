
# Fix Call AHT Formula: Use Accepted Calls (Legs with Talk Time > 0)

## Problem Identified
The current formula uses **unique call IDs** as the denominator, but Zendesk Explore uses **Accepted call legs** (legs where `talk_time > 0`).

**Zendesk Explore Formula:**
```
(Leg talk time hrs × 3600) ÷ Accepted calls ÷ 60
```

Which translates to:
```
Total Talk Time (seconds) / Accepted Legs Count = AHT (seconds)
```

**Current System (Wrong):**
- Desiree: 8,489s talk time ÷ 51 unique calls = 166s (2:46)

**Correct Calculation:**
- Desiree: 8,489s talk time ÷ 40 accepted legs (talk_time > 0) = 212s (~3:32)

---

## Solution

### Step 1: Update `fetchCallMetrics` Function

**File:** `supabase/functions/fetch-zendesk-metrics/index.ts`

**Change 1:** Filter for accepted legs only (lines 167-170)
```typescript
// Before
const agentLegs = allLegs.filter(leg => 
  String(leg.agent_id) === zendeskUserId && 
  leg.type === 'agent'
);

// After
const agentLegs = allLegs.filter(leg => 
  String(leg.agent_id) === zendeskUserId && 
  leg.type === 'agent' &&
  (leg.talk_time || 0) > 0  // Only accepted legs with actual talk time
);
```

**Change 2:** Use accepted legs count as denominator (lines 186-202)
```typescript
// Before - uses unique call IDs
const uniqueCallIds = new Set(weekLegs.map(leg => String(leg.call_id)));
const uniqueCallCount = uniqueCallIds.size;
...
const ahtSeconds = uniqueCallCount > 0 ? Math.round(totalTalkTime / uniqueCallCount) : null;
return { ahtSeconds, totalCalls: uniqueCallCount };

// After - uses accepted legs count
// Formula: (Leg talk time hrs × 3600) / Accepted calls / 60
// Accepted calls = legs where agent actually talked (talk_time > 0)
const acceptedCallsCount = weekLegs.length;  // Already filtered for talk_time > 0
...
const ahtSeconds = acceptedCallsCount > 0 ? Math.round(totalTalkTime / acceptedCallsCount) : null;
return { ahtSeconds, totalCalls: acceptedCallsCount };
```

---

## Step 2: Deploy and Refresh Data

After code changes:
1. Deploy the updated edge function
2. Trigger a fresh fetch for Jan 26 - Feb 1 data to recalculate all agents

---

## Expected Results

| Agent | Before (unique calls) | After (accepted legs) |
|-------|----------------------|----------------------|
| Desiree | 2:46 (166s) | ~3:32 (212s) |
| Others | Similar or unchanged | Matches Zendesk Explore |

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/fetch-zendesk-metrics/index.ts` | Filter for `talk_time > 0`, divide by accepted legs count |

---

## Technical Explanation

**Why this works:**
- **Missed calls**: Agent was offered but didn't answer → `talk_time = 0` → excluded
- **Declined calls**: Agent rejected → `talk_time = 0` → excluded  
- **Monitoring legs**: Supervisor listening in → `talk_time = 0` → excluded
- **Accepted calls**: Agent spoke with customer → `talk_time > 0` → included

This matches exactly how Zendesk Explore calculates "Accepted call legs" for the AHT metric.
