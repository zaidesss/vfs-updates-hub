

## Verification: OT Productivity

**Richelle (laraine.lopez@gmail.com)** has:
- 115 OT tickets this week
- `quota_ot_email = 29`
- OT scheduled on Mon, Tue, Wed, Thu, Sun = **5 OT days**
- Expected OT Prod = `115 / (29 × 5) = 115 / 145 = 79.3%`

Other agents with OT tickets: Bia (108), Nikki (94, but quota_ot_email is NULL so OT prod will be null), Ruth (87), Jannah (74), Will (70), Lhen (59), Hannah (44), Iman (12).

The OT calculation fix from the previous step is correctly using `otScheduledDays`. This should now reflect properly for agents with both `quota_ot_email` set AND OT schedules defined. Nikki has `quota_ot_email = null` so her OT prod won't compute.

---

## Pre-existing Bug: Productivity Goal in Final Score

The current `calculateMetricScore` receives productivity as a **percentage** (0-100) but the config goals are set to raw weekly ticket counts (e.g., 715 for Email, 257.6 for Hybrid). This means:
- `calculateMetricScore(100%, 715, 'productivity')` = `(100/715) × 100 = 14%` -- clearly wrong

**Fix**: Set productivity goal to `100` in the config, so 100% of quota = 100% score.

---

## Plan

### Step 1: Update position resolution

**Files**: `src/lib/positionUtils.ts`, `get_weekly_scorecard_data` RPC (database migration)

- Map `[Email, Chat]` → `"Chat"` instead of `"Email + Chat"`
- Remove `"Email + Phone"`, `"Email + Chat"` as separate categories
- Only 3 active categories: **Hybrid**, **Chat**, **Logistics**
- Update the RPC's CASE expression to match

### Step 2: Update SUPPORT_TYPES constant

**File**: `src/lib/scorecardApi.ts`

Change from 7 types to 3:
```typescript
export const SUPPORT_TYPES = ['Hybrid', 'Chat', 'Logistics'] as const;
```

### Step 3: Update `getWeeklyQuota` function

**File**: `src/lib/scorecardApi.ts`

- `"Chat"` case should sum `quota_email + quota_chat` (since Chat = Email + Chat tickets)
- Remove Email, Phone, Email + Phone, Email + Chat cases

### Step 4: Update productivity count switch

**File**: `src/lib/scorecardApi.ts`

- `"Chat"` case: `productivityCount = email_count + chat_count`
- Remove old Email, Phone, Email + Phone, Email + Chat cases

### Step 5: Update `scorecard_config` database data

Delete all rows for support types: `Email`, `Phone`, `Email + Phone`, `Email + Chat`.

Update **Chat** config to match the image:

| Metric | Weight | Goal | Display Order |
|--------|--------|------|---------------|
| productivity | 25% | 100 | 1 |
| chat_aht | 10% | 420 | 2 |
| chat_frt | 10% | 20 | 3 |
| qa | 20% | 96 | 4 |
| revalida | 5% | 95 | 5 |
| reliability | 30% | 98 | 6 |

Update **Hybrid** config:

| Metric | Weight | Goal | Display Order |
|--------|--------|------|---------------|
| productivity | 15% | 100 | 1 |
| call_aht | 10% | 240 | 2 |
| chat_aht | 10% | 420 | 3 |
| chat_frt | 10% | 20 | 4 |
| qa | 20% | 96 | 5 |
| revalida | 5% | 95 | 6 |
| reliability | 30% | 98 | 7 |

Update **Logistics** productivity goal to `100` as well (same bug fix).

### Step 6: Update compute-weekly-snapshots edge function

Ensure the snapshot function uses the updated position resolution (Chat instead of Email + Chat).

### Step 7: Update TeamScorecard UI default goals

**File**: `src/pages/TeamScorecard.tsx`

Update `DEFAULT_METRIC_GOALS` to match new values (call_aht: 240, chat_aht: 420, chat_frt: 20).

---

## Other considerations

- **Saved scorecards**: Historical saved_scorecards records with `support_type = 'Email + Chat'` won't match the new `'Chat'` key. These would need a data migration to rename them if you want old snapshots to load correctly.
- **weekly_scorecard_snapshots**: Same concern -- old snapshots may have `support_type = 'Email + Chat'`.
- **User Guide**: The TeamScorecardSection guide content references Email, Hybrid, and Logistics metrics that need updating.
- **Agent Reports / EOD Analytics**: These use position resolution too -- updating `positionUtils.ts` will cascade to those views.

