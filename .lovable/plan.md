

## Fix Plan: OT Productivity Calculation

### Root Cause
OT Productivity uses `days_with_login` (total login days, e.g. 5) as the OT days denominator, when the agent may only have OT scheduled on 2 days. This inflates the weekly OT quota and makes OT productivity appear much lower than it should be.

**Example**: Agent has `quota_ot_email = 10`, logged in 5 days, but OT scheduled only on 2 days.
- Current: `otTickets / (10 × 5) = otTickets / 50` (wrong)
- Fixed: `otTickets / (10 × 2) = otTickets / 20` (correct)

### QA Clarification
The QA score in the Scorecard is already the **average percentage** across all QA evaluations for that week (`AVG(qe.percentage)`). If an agent has 5 QAs, the displayed value is the mean of all 5 scores. No change needed.

### Productivity Per-Day
Not needed in UI per your selection. The existing weekly aggregate stays as-is.

---

### Step 1: Update `calculateScheduledDaysFromRPC` to also return OT scheduled days

**File: `src/lib/scorecardApi.ts`**

Change the return type from `number` to `{ scheduledDays: number; otScheduledDays: number }`. Inside the loop (line 859-870), also count days where `daySchedule.otSchedule` exists and is not null/empty/"Day Off".

Update the caller at line 690 to destructure both values.

### Step 2: Use `otScheduledDays` in OT Productivity formula

**File: `src/lib/scorecardApi.ts`** (lines 753-758)

Replace:
```typescript
const otDaysWorked = row.days_with_login > 0 ? row.days_with_login : 1;
const weeklyOtQuota = row.quota_ot_email * otDaysWorked;
```
With:
```typescript
const weeklyOtQuota = row.quota_ot_email * otScheduledDays;
```

### Step 3: Apply same fix in legacy `fetchWeeklyScorecard` path

The legacy path (around line 1089) has a similar OT calculation. Apply the same fix there for consistency, using the effective schedules to count OT days.

### Step 4: Apply same fix in `compute-weekly-snapshots` edge function

The snapshot function (`supabase/functions/compute-weekly-snapshots/index.ts`) stores `ot_productivity` but currently has no OT day counting. Since it already calls `get_effective_schedules_for_week`, we can count OT days from the returned schedules and use that for the snapshot's OT productivity field.

### Result
- OT Productivity will correctly reflect `otTicketCount / (quotaPerDay × actualOtScheduledDays)`
- Historical snapshots will also compute correctly going forward
- No UI changes needed

