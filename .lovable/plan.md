
# Fix Call AHT Calculation Using Legs API

## Summary
Update the `fetch-zendesk-metrics` edge function to use the Zendesk Talk **Incremental Legs API** instead of the Incremental Calls API, ensuring AHT calculations match Zendesk Explore reports.

## Root Cause
The current implementation uses `/api/v2/channels/voice/stats/incremental/calls.json` which only attributes calls to the **first agent who answered**. Zendesk Explore uses "Call Legs" which captures **every agent involvement** including transfers and consultations.

**Example - Desiree's data:**
- Calls API: 40 calls × 150s avg = 6,000s total (incorrect)
- Legs API: 40 legs × 216s avg = 8,640s total (matches Explore)

---

## Implementation Steps

### Step 1: Update Call Record Interface

Add fields specific to the Legs API response.

**File**: `supabase/functions/fetch-zendesk-metrics/index.ts`

```typescript
// Rename to LegRecord for clarity
interface LegRecord {
  id: string | number;
  call_id: string | number;  // Parent call ID
  agent_id: string | number;
  talk_time: number;
  wrap_up_time: number;
  type: string;  // "customer", "agent", "external", "supervisor"
  updated_at?: string;
  created_at?: string;
}
```

---

### Step 2: Change API Endpoint to Legs

Update the pagination function to fetch from the Legs endpoint.

**Current**:
```typescript
const url = `https://${config.subdomain}.zendesk.com/api/v2/channels/voice/stats/incremental/calls.json?start_time=${currentStartTime}`;
```

**New**:
```typescript
const url = `https://${config.subdomain}.zendesk.com/api/v2/channels/voice/stats/incremental/legs.json?start_time=${currentStartTime}`;
```

---

### Step 3: Filter by Agent Type

Only count legs where `type === "agent"` to exclude customer and system legs.

```typescript
const agentLegs = allLegs.filter(leg => 
  String(leg.agent_id) === zendeskUserId && 
  leg.type === 'agent'  // Only count agent legs
);
```

---

### Step 4: Update AHT Calculation Logic

The calculation logic stays the same (sum of talk_time / count), but now operates on legs instead of calls.

```typescript
// Calculate AHT from agent legs
let totalTalkTime = 0;

for (const leg of weekLegs) {
  totalTalkTime += leg.talk_time || 0;
}

const ahtSeconds = Math.round(totalTalkTime / weekLegs.length);
console.log(`Call AHT for ${zendeskUserId}: ${ahtSeconds}s (${weekLegs.length} legs, talk: ${totalTalkTime}s)`);

return { ahtSeconds, totalCalls: weekLegs.length };
```

---

### Step 5: Update Response Field Parsing

The Legs API returns `legs` array instead of `calls` array.

```typescript
const data: { legs?: LegRecord[]; end_time?: number; count?: number } = await response.json();
const legs = data.legs || [];
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/fetch-zendesk-metrics/index.ts` | Switch from Calls API to Legs API, update interface, add type filter |

---

## Expected Result

After this change:
- Desiree's Call AHT should calculate to ~216 seconds (3:36)
- Matches Zendesk Explore's "Leg talk time (min): 3 min [avg]"
- Captures all agent interactions including transfers and consultations

---

## Verification Steps

1. Deploy the updated edge function
2. Trigger a fresh metrics fetch for the week (clear cache or use `scheduled: false`)
3. Compare new calculated values with Zendesk Explore
4. Desiree should show ~3:30-3:40 instead of 2:30
