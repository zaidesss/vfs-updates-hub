

## Position Array Migration: Complete Fix Plan

### Summary

The `position` column changed from a single string (e.g., `"Email Support"`) to a `text[]` array (e.g., `["Email"]`). All "Support" suffixes removed. "Hybrid" eliminated — agents with multiple roles just have `["Email", "Chat", "Phone"]`.

### Scorecard Config Mapping (per your confirmation)

| Agent Position Array | Config Key | Weight Source |
|---|---|---|
| `["Email"]` | `Email` | Email weights |
| `["Email", "Chat"]` | `Email + Chat` | Chat weights |
| `["Email", "Phone"]` | `Email + Phone` | Phone weights |
| `["Email", "Chat", "Phone"]` | `Hybrid` | Hybrid weights |
| `["Logistics"]` | `Logistics` | Logistics weights |

### Execution Steps (one at a time, step by step)

---

**Step 1: Database — Rename `scorecard_config` support_type values**

Update existing rows:
- `"Email Support"` → `"Email"`
- `"Chat Support"` → `"Chat"` (kept for reference, though no agent will be pure Chat)
- `"Phone Support"` → `"Phone"` (kept for reference)
- `"Hybrid Support"` → `"Hybrid"`

Insert two new config entries by cloning:
- `"Email + Chat"` — clone from `"Chat Support"` (now `"Chat"`) weights
- `"Email + Phone"` — clone from `"Phone Support"` (now `"Phone"`) weights

---

**Step 2: Database — Migrate `saved_scorecards` and `weekly_scorecard_snapshots` historical data**

Update `support_type` in both tables:
- `"Email Support"` → `"Email"`
- `"Chat Support"` → `"Chat"`
- `"Phone Support"` → `"Phone"`
- `"Hybrid Support"` → `"Hybrid"`

---

**Step 3: Database — Rewrite `get_weekly_scorecard_data` RPC**

Update the `eligible_agents` CTE:
- Replace `ap.position NOT IN ('Team Lead', 'Technical Support')` with `NOT ap.position && ARRAY['Team Lead','Technical']`
- Replace the position filter to use a helper function that resolves the position array to a config key, then filters by that key
- Return a resolved `agent_position` string (the config key) instead of the raw array

Position-to-config-key logic in SQL:
```text
IF position @> ARRAY['Email','Chat','Phone'] → 'Hybrid'
ELIF position @> ARRAY['Email','Chat']       → 'Email + Chat'
ELIF position @> ARRAY['Email','Phone']      → 'Email + Phone'
ELIF 'Email' = ANY(position)                 → 'Email'
ELIF 'Chat' = ANY(position)                  → 'Chat'
ELIF 'Phone' = ANY(position)                 → 'Phone'
ELIF 'Logistics' = ANY(position)             → 'Logistics'
ELSE 'Email'
```

---

**Step 4: Edge Function — Fix `generate-eod-analytics`**

- `EXCLUDED_POSITIONS` → `['Team Lead', 'Technical']`
- `TICKET_EXCLUDED_POSITIONS` → `['Team Lead', 'Technical', 'Logistics']`
- Replace `.not('position', 'in', ...)` with `.not('position', 'ov', '{"Team Lead","Technical"}')` (overlap operator)
- Replace `TICKET_EXCLUDED_POSITIONS.includes(p.position || '')` with `(p.position || []).some(pos => TICKET_EXCLUDED_POSITIONS.includes(pos))`
- Replace quota logic (`pos.includes('hybrid')`) with array element checks:
  ```text
  const posArr = p.position || [];
  const hasEmail = posArr.includes('Email');
  const hasChat = posArr.includes('Chat');
  const hasPhone = posArr.includes('Phone');
  // Hybrid = all three; Email+Chat = hasEmail && hasChat && !hasPhone; etc.
  ```

---

**Step 5: Edge Function — Fix `generate-weekly-analytics`**

Same fixes as Step 4 — identical broken patterns.

---

**Step 6: Edge Function — Fix `generate-agent-reports`**

- Change `AgentProfile.position` type from `string | null` to `string[] | null`
- Rewrite `calculateExpectedQuota()` to use array checks
- Rewrite `isEmailSupport()` to check `posArr.includes('Email') && !posArr.includes('Chat') && !posArr.includes('Phone')`

---

**Step 7: Client — Update `src/lib/scorecardApi.ts`**

- `SUPPORT_TYPES` → `['Hybrid', 'Email + Phone', 'Email + Chat', 'Phone', 'Chat', 'Email', 'Logistics']`
- `EXCLUDED_POSITIONS` → `['Team Lead', 'Technical']`
- Fix `fetchEligibleAgents()` filter for array column
- Update `getWeeklyQuota()` switch cases from old names to new
- Update `productivityCount` switch in `fetchWeeklyScorecardRPC()` from old names to new
- Update `agentSupportType` derivation to use position-array-to-config-key mapping
- Fix `saveScorecard()` support_type resolution

---

**Step 8: Client — Update `src/pages/TeamScorecard.tsx`**

- Line 245: `'Hybrid Support'` → `'Hybrid'`
- Lines 499-506: Update column visibility checks to new names
- Lines 536-558: Update `metricApplies()` to new names

---

**Step 9: Client — Fix `src/components/dashboard/DailyWorkTracker.tsx`**

Position is now an array. Update `getVisibleTicketTypes()`:
- Replace string-based checks (`pos.includes('support')`) with array element checks
- `showEmail` = always true for support agents
- `showChat` = `posArr.includes('Chat')` or quota_chat > 0
- `showCall` = `posArr.includes('Phone')` or quota_phone > 0

---

**Step 10: Client — Update `ShiftBlock.tsx` POSITION_COLORS**

Rename keys:
- `'Hybrid Support'` → `'Hybrid'`
- `'Email Support'` → `'Email'`
- `'Phone Support'` → `'Phone'`
- `'Chat Support'` → `'Chat'`

---

**Step 11: Client — Update `StatusCard.tsx` POSITION_BADGE**

Rename keys:
- `'Technical Support'` → `'Technical'`
- `'Hybrid Support'` → `'Hybrid'`
- `'Email Support'` → `'Email'`
- `'Phone Support'` → `'Phone'`
- `'Chat Support'` → `'Chat'`

---

**Step 12: Client — Update `coverageBoardApi.ts`**

- `POSITION_ORDER` → `['Hybrid', 'Phone', 'Chat', 'Email']`
- Line 464: `'Technical Support'` → `'Technical'`
- Line 491: `'Technical Support'` label → `'Technical'`

---

**Step 13: Documentation updates**

Update user guide and demo tour references to use new position names.

---

### Position-to-Config-Key Resolution (shared logic)

This function will be consistent across all edge functions and frontend:

```text
function resolveConfigKey(positionArray: string[]): string {
  const has = (r: string) => positionArray.includes(r);
  if (has('Email') && has('Chat') && has('Phone')) return 'Hybrid';
  if (has('Email') && has('Chat'))                 return 'Email + Chat';
  if (has('Email') && has('Phone'))                return 'Email + Phone';
  if (has('Email'))                                return 'Email';
  if (has('Chat'))                                 return 'Chat';
  if (has('Phone'))                                return 'Phone';
  if (has('Logistics'))                            return 'Logistics';
  return 'Email'; // fallback
}
```

