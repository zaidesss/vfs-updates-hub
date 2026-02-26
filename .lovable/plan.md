

## Plan: New Tickets Counter Breakdown

### Problem
Currently the counter only shows "New Tickets" (tickets still in `status:new`). The user wants three metrics:
1. **Awaiting Response** — tickets still in `status:new` (what we already fetch)
2. **Total New Tickets as of today** — ALL tickets created since Feb 26 regardless of current status
3. **Responded** — Total minus Awaiting

### Changes Required

**1. Edge function (`supabase/functions/fetch-zendesk-realtime/index.ts`)**
- Add 2 new search queries (one per instance): `type:ticket created>=2026-02-26` (no status filter) to get total tickets created today
- Return both `newTickets` (awaiting, status:new) and `totalTicketsToday` per instance

**2. Types (`src/lib/zendeskRealtimeApi.ts`)**
- Add `totalTicketsToday: number` to `InstanceStats` interface

**3. UI (`src/components/dashboard/NewTicketsCounter.tsx`)**
- Restructure the card to show three rows:
  - **Awaiting Response**: `{awaiting}` (ZD1: X / ZD2: Y) — highlighted in red/destructive
  - **Total New Tickets as of Today**: `{total}` (ZD1: X / ZD2: Y)
  - **Responded**: `{responded}` (ZD1: X / ZD2: Y) — in green

