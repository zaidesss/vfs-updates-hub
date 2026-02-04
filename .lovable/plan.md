

# Editable AHT/FRT with Actual Value + Percentage Display

## Summary
Enhance the Team Scorecard to display both actual time values and calculated percentages for AHT/FRT metrics, allow admins to edit these values inline, and add a "Save Changes" button that syncs edits to the database.

## Technical Context

### Current State
- AHT/FRT values are displayed as formatted time only (e.g., `3:43`)
- Values are read-only, pulled from `zendesk_agent_metrics` table
- Percentage is calculated but not displayed: `(goal / actual) * 100`
- Goal values: Call AHT = 300s, Chat AHT = 180s, Chat FRT = 60s

### Goals
- Call AHT goal: 300 seconds (5 minutes)
- Chat AHT goal: 180 seconds (3 minutes)  
- Chat FRT goal: 60 seconds (1 minute)

---

## Implementation Steps

### Step 1: Fix Call AHT Calculation (Talk Time Only)

Update the edge function to exclude wrap-up time from AHT calculation to match Zendesk Explore reports.

**File**: `supabase/functions/fetch-zendesk-metrics/index.ts`

**Change**:
```
// Before
const ahtSeconds = Math.round((totalTalkTime + totalWrapUpTime) / weekCalls.length);

// After  
const ahtSeconds = Math.round(totalTalkTime / weekCalls.length);
```

---

### Step 2: Update Display to Show Actual + Percentage

**File**: `src/pages/TeamScorecard.tsx`

For each AHT/FRT cell, display:
- **Line 1**: Actual time value (e.g., `3:43`) - editable for admins
- **Line 2**: Calculated percentage (e.g., `134.2%`) - color coded

**New Cell Structure**:
```
+------------------+
|     3:43         |  <- Actual (editable input for admins)
|    134.2%        |  <- Percentage (calculated, color coded)
|  [edited badge]  |  <- Only if value was modified
+------------------+
```

**Percentage Calculation**:
- Formula: `(goal / actual) * 100`, capped at 100%
- Color coding:
  - Green: >= 100%
  - Yellow: 80-99%
  - Red: < 80%

---

### Step 3: Add Edit State Management

**File**: `src/pages/TeamScorecard.tsx`

Add state to track edits:
```typescript
const [editedMetrics, setEditedMetrics] = useState<Record<string, {
  callAht?: number | null;
  chatAht?: number | null;
  chatFrt?: number | null;
}>>({});

const hasEdits = Object.keys(editedMetrics).length > 0;
```

**Edit Handler**:
```typescript
const handleMetricEdit = (agentEmail: string, metricKey: string, value: number | null) => {
  setEditedMetrics(prev => ({
    ...prev,
    [agentEmail]: {
      ...prev[agentEmail],
      [metricKey]: value
    }
  }));
};
```

---

### Step 4: Create Editable Input Component

**New Component**: Inline editable input for admin users

**Features**:
- Displays formatted time (mm:ss) when not editing
- On click (admin only): converts to input field
- Input accepts mm:ss format (e.g., "3:43") or seconds (e.g., "223")
- Auto-detection of input format
- Shows "edited" badge when value differs from original

**Input Parsing Logic**:
```typescript
function parseTimeInput(input: string): number | null {
  // Check for mm:ss format
  if (input.includes(':')) {
    const [mins, secs] = input.split(':').map(Number);
    return mins * 60 + secs;
  }
  // Otherwise treat as seconds
  return parseInt(input) || null;
}
```

---

### Step 5: Add "Save Changes" Button

**Location**: Inside the Card Header, next to "Save Scorecard" button

**Visibility**: Only shown when `hasEdits` is true AND user is admin

**Behavior**:
1. Collects all edited metrics
2. Updates `zendesk_agent_metrics` table for each edited agent
3. Clears edit state on success
4. Shows success toast
5. Refetches scorecard data to reflect changes

**API Function** (new in `src/lib/scorecardApi.ts`):
```typescript
export async function updateZendeskMetrics(
  weekStart: string,
  weekEnd: string,
  agentEmail: string,
  updates: {
    call_aht_seconds?: number | null;
    chat_aht_seconds?: number | null;
    chat_frt_seconds?: number | null;
  }
): Promise<{ success: boolean; error?: string }>
```

---

### Step 6: Update Database RLS (if needed)

Check if `zendesk_agent_metrics` has proper UPDATE policies for admins.

**Required Policy**: Allow admins/super_admins to update rows

---

## UI Changes Summary

### Current Cell (AHT/FRT)
```
+----------+
|   3:43   |
+----------+
```

### New Cell (Non-Admin View)
```
+-------------+
|    3:43     |  <- Actual value (read-only)
|   134.2%    |  <- Percentage (green/yellow/red)
+-------------+
```

### New Cell (Admin View - Unedited)
```
+-------------+
|  [ 3:43 ]   |  <- Editable input
|   134.2%    |  <- Auto-updates on edit
+-------------+
```

### New Cell (Admin View - Edited)
```
+-------------+
|  [ 2:30 ]   |  <- Modified value
|   200.0%    |  <- Recalculated
| [edited]    |  <- Badge indicator
+-------------+
```

---

## Button Layout

### Header (Admin View with Edits)
```
+-------------------------------------------------------+
| Team Scorecard                  [Save Changes] [Save Scorecard] |
+-------------------------------------------------------+
```

**Button States**:
- **Save Changes**: Primary button, enabled when edits exist
- **Save Scorecard**: Secondary/outline, saves entire week to `saved_scorecards`

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/fetch-zendesk-metrics/index.ts` | Remove wrap-up time from Call AHT calculation |
| `src/pages/TeamScorecard.tsx` | Add edit state, editable cells, percentage display, Save Changes button |
| `src/lib/scorecardApi.ts` | Add `updateZendeskMetrics` function, add `calculatePercentageFromGoal` helper |

---

## Testing Checklist

After implementation:
1. Verify AHT shows actual time + percentage below
2. Verify percentage is color-coded correctly
3. Test admin can click to edit AHT/FRT values
4. Test input accepts both "3:43" and "223" formats
5. Verify "edited" badge appears on modified values
6. Test "Save Changes" button updates database
7. Verify "Save Scorecard" includes edited values
8. Test non-admin users see read-only values

