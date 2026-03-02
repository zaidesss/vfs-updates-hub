

# Plan: Daily Ticket Counts (EST-aligned) + Yesterday Metrics + Ticket ID

Since Zendesk's account timezone is already set to EST, `created:today` and `created:yesterday` filters will naturally align with EST midnight boundaries. No manual date computation needed.

## Step 1: Update `fetch-zendesk-realtime` edge function
**Lines 133-136**: Replace hardcoded `created>=2026-02-26` with `created:today` for all 4 queries:
- `type:ticket status:new created:today` (awaiting)
- `type:ticket created:today` (total today)

This makes counts reset daily at midnight EST automatically.

## Step 2: Update `fetch-sla-responsiveness` edge function
Add 2 new queries per instance in `fetchInstanceData`:
- `totalYesterday`: `type:ticket created:yesterday`
- `workedYesterday`: `type:ticket status>new created:yesterday`

Add these to the `InstanceResult` interface and return them.

## Step 3: Update `slaResponsivenessApi.ts`
- Add `totalYesterday` and `workedYesterday` to `SlaInstanceData`
- Update `combineInstances` to sum them

## Step 4: Update `NewTicketsCounter.tsx`
- Update popover text: "Daily counts reset at 12:00 AM EST"
- Keep existing rows: Awaiting Response, Total New Tickets Today, Responded
- Add 3 rows after Responded: **Total Yesterday**, **Worked Yesterday**, **Remaining Yesterday**
- Update **Oldest New Ticket** to show ticket number: `#12345 — 6h 29m`

## Technical Details
- Zendesk Search API `created:today` / `created:yesterday` respects the account timezone (EST per screenshot)
- No EST date computation needed in edge functions — Zendesk handles it natively
- `oldestNewTicket.id` is already available in the data, just needs to be displayed

