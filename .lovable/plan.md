

## Investigation Findings

**FRT and Resolution are null** for all 8 rows in the database. The root cause is in the backfill edge function: it queries Zendesk with `status:solved solved>=DATE`, but tickets from past days have already transitioned from "solved" to "closed" in Zendesk. The query needs to use `status>=solved` (which includes both solved and closed tickets) to capture historical resolution metrics.

The same issue exists in the `snapshot-sla-daily` function for the nightly cron -- though less critical since it runs at end-of-day when tickets are still "solved".

## Plan

### Step 1: Fix the backfill and snapshot edge functions
**Files**: `supabase/functions/backfill-sla-snapshots/index.ts`, `supabase/functions/snapshot-sla-daily/index.ts`
- Change the resolution query from `status:solved solved>=DATE` to `status>=solved solved>=DATE solved<NEXTDATE` so it captures both solved and closed tickets
- This ensures historical backfills find tickets that have since been closed

### Step 2: Re-run the backfill
- Invoke the updated `backfill-sla-snapshots` function with `{"start_date": "2026-02-26"}` to repopulate FRT and resolution data

### Step 3: Redesign the real-time top section
**File**: `src/pages/operations/Responsiveness.tsx`
- Remove the "Last 60 Minutes" card entirely
- Replace the 4 summary cards + distribution chart with a single card matching the `NewTicketsCounter` MetricRow pattern:
  - **Awaiting Response** (emphasized, destructive) -- current new tickets
  - **Total New Tickets Today** -- total created today
  - **Responded** -- total - awaiting
  - Separator
  - **Total Yesterday** / **Worked Yesterday** / **Remaining Yesterday**
  - Separator
  - **Oldest New Ticket** -- age + ID
  - Separator
  - **Avg First Reply (Today)** / **Avg Resolution (Today)**
- Keep the Tabs (Combined / ZD1 / ZD2) around this redesigned card
- Keep the Resolution Distribution chart below the card

### Step 4: Add Resolution columns to weekly history table
**File**: `src/components/sla/SlaHistorySection.tsx`
- Add "Avg Resolution (ZD1)" and "Avg Resolution (ZD2)" columns to the weekly table (currently only has FRT)
- The `WeeklyBucket` type already has `avgFullResolution` so this is just a UI addition

### Other considerations
- The `SlaInstanceData` interface already includes `lastHourNew`/`lastHourResponded` -- these fields will remain in the API response but won't be displayed. No API change needed.
- The `combineInstances` function stays unchanged.

