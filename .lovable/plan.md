

# Logistics Scorecard Enhancement Plan

## Summary

This update enhances the Logistics position scorecard to include:
1. **Order Escalation and Intervention** (35% weight, 95% goal) - Manual percentage input replacing Productivity
2. **QA** (30% weight, 95% goal) - Auto-populated from QA Evaluations
3. **Revalida** (5% weight, 95% goal) - Auto-populated from Revalida page
4. **Reliability** (30% weight, 98% goal) - Already implemented

---

## What's Already Working

The good news is that most of the infrastructure already exists:
- The database RPC (`get_weekly_scorecard_data`) already fetches QA and Revalida scores for all agents
- The `AgentScorecard` interface already has `qa` and `revalida` fields
- The frontend currently hides these columns for Logistics with a visibility flag

The main changes needed are:
1. Enable QA and Revalida columns for Logistics
2. Add manual input capability for "Order Escalation and Intervention"
3. Update the scorecard configuration in the database

---

## Implementation Steps

### Step 1: Database Configuration Update
Update `scorecard_config` table for Logistics support type:
- Add `productivity` metric (renamed to "Order Escalation and Intervention") with 35% weight, 95% goal
- Add `qa` metric with 30% weight, 95% goal
- Add `revalida` metric with 5% weight, 95% goal
- Update existing `reliability` metric to 30% weight, 98% goal

### Step 2: Database Schema Changes
Add columns to `zendesk_agent_metrics` table:
- `order_escalation NUMERIC` - For storing manual Order Escalation percentage
- Also add to `saved_scorecards` table for data persistence

### Step 3: Update SQL RPC
Modify `get_weekly_scorecard_data` to return the new `order_escalation` field from `zendesk_agent_metrics`.

### Step 4: API Layer Updates (scorecardApi.ts)
- Add `orderEscalation` to `AgentScorecard` interface
- Update `upsertZendeskMetrics` to support `order_escalation`
- Modify score calculation to use `order_escalation` for Logistics instead of ticket-based productivity

### Step 5: UI Updates (TeamScorecard.tsx)
- Enable QA and Revalida columns for Logistics (`showQA`, `showRevalida`)
- Replace "Productivity" column with "Order Escalation" for Logistics agents
- Make the Order Escalation cell editable (percentage input mode)
- Update `metricApplies` function to include Logistics for `qa` and `revalida`

### Step 6: EditableMetricCell Enhancement
Add a "percentage mode" to handle direct percentage inputs:
- Accepts values like "95" or "85.5"
- Displays with % suffix
- Uses "higher is better" calculation (actual/goal × 100)

---

## Technical Details

### Database Changes

```sql
-- Update scorecard_config for Logistics
UPDATE scorecard_config 
SET weight = 30, goal = 98, display_order = 4 
WHERE support_type = 'Logistics' AND metric_key = 'reliability';

INSERT INTO scorecard_config (support_type, metric_key, weight, goal, is_enabled, display_order)
VALUES 
  ('Logistics', 'order_escalation', 35, 95, true, 1),
  ('Logistics', 'qa', 30, 95, true, 2),
  ('Logistics', 'revalida', 5, 95, true, 3);

-- Add order_escalation column
ALTER TABLE zendesk_agent_metrics ADD COLUMN order_escalation NUMERIC;
ALTER TABLE saved_scorecards ADD COLUMN order_escalation NUMERIC;
```

### Interface Updates

```typescript
// AgentScorecard interface
export interface AgentScorecard {
  // ... existing fields
  orderEscalation: number | null; // New field for Logistics
}
```

### Column Visibility Logic Change

```typescript
// Current (hides for Logistics)
const showQA = isAllMode || supportType !== 'Logistics';
const showRevalida = isAllMode || supportType !== 'Logistics';

// Updated (shows for everyone)
const showQA = true;
const showRevalida = true;
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/[new].sql` | Update scorecard_config, add order_escalation columns |
| `src/lib/scorecardApi.ts` | Add orderEscalation field, update save/fetch logic |
| `src/pages/TeamScorecard.tsx` | Enable columns for Logistics, rename Productivity header |
| `src/components/scorecard/EditableMetricCell.tsx` | Add percentage input mode |
| `get_weekly_scorecard_data` (RPC) | Return order_escalation from zendesk_agent_metrics |

---

## UI Preview

After implementation, the Logistics Scorecard will display:

| Agent Name | Order Escalation | QA | Revalida | Reliability | Final Score |
|------------|------------------|-----|----------|-------------|-------------|
| John Doe   | 92% (editable)   | 98% | 95%      | 100%        | 95.4%       |

- **Order Escalation**: Manual input with percentage format
- **QA**: Auto-populated from QA Evaluations (existing data)
- **Revalida**: Auto-populated from Revalida page (existing data)
- **Reliability**: Already working (attendance-based)

