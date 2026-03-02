

## Investigation Findings

**Database state**: Only Feb 26 has FRT/ART values (ZD1: 23m FRT, 7m ART; ZD2: 2432m FRT, 2989m ART). Feb 27 through Mar 1 were **overwritten with zeros** during the last backfill re-run -- the edge function likely wasn't redeployed before the backfill was triggered, so the old code ran and returned 0s.

**Real-time FRT/ART** (SLA Monitor card): The `fetch-sla-responsiveness` function correctly fetches today's solved tickets and computes FRT/ART. The screenshot shows values (2h 29m FRT, 17h 53m ART), so this part works. No code change needed here.

**Historical FRT/ART** (Historical Trends section): All showing "—" because the DB has nulls for Feb 27+. Need to re-run the backfill after confirming the edge function is deployed.

**Missing metric**: "Total New Tickets Since Feb 26" needs to be added to the SLA Monitor card.

## Plan

### Step 1: Re-deploy backfill edge function and re-run
- The `backfill-sla-snapshots` function code already has the correct `status>=solved` query
- Deploy the edge function explicitly, then re-invoke it with `{"start_date": "2026-02-26"}` to repopulate all rows with correct ticket counts and FRT/ART values

### Step 2: Add "Total New Tickets Since Feb 26" to SLA Monitor
**File**: `src/pages/operations/Responsiveness.tsx`
- Import and use the `useSlaHistory` hook alongside the existing `useSlaResponsiveness` hook
- Compute cumulative total from snapshots: `snapshots.reduce((sum, s) => sum + s.total_new, 0)`
- Add a new `MetricRow` at the top of the `SlaSummaryCard` (before "Total Yesterday") with:
  - Icon: `Mail` or `Ticket`
  - Label: "Total New Tickets (Since Feb 26)"
  - Value: the cumulative total
  - Show ZD1/ZD2 split in the `sub` text for combined tab
  - Followed by a separator

### Step 3: Pass history data to SlaSummaryCard
- The `SlaSummaryCard` component needs to accept cumulative ticket count as a prop (computed from `useSlaHistory` snapshots in the parent)
- Add props for `totalSinceFeb26`, `totalSinceFeb26Zd1`, `totalSinceFeb26Zd2`

### Other considerations
- The `useSlaHistory` hook already fetches from the `sla_daily_snapshots` table with `.gte('date', '2026-02-26')`, so it will automatically reflect the repopulated data
- Once the backfill succeeds, the "All Time" summary cards (Avg First Reply, Avg Resolution) and the Weekly/Daily tables will all populate automatically since the UI code already reads `avg_first_reply_minutes` and `avg_full_resolution_minutes` from the snapshots

