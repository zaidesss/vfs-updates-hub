

## Plan: New Tickets Counter for Agent Dashboard & Team Status Board

### Step 1: Update `fetch-zendesk-realtime` edge function
Add a `newTickets` count to each instance's response. Use the existing `searchCount` helper with query `type:ticket status:new created>=2026-02-26` (hardcoded start date as requested — only count new tickets from today forward). Add `newTickets` field alongside existing `talk` and `messaging` in the response.

### Step 2: Update `zendeskRealtimeApi.ts` types
Add `newTickets: number` to `InstanceStats` interface.

### Step 3: Create `NewTicketsCounter.tsx` component
Shared component in `src/components/dashboard/NewTicketsCounter.tsx`:
- Takes ZD1 + ZD2 new ticket counts, fetchedAt, loading/error state, and refresh callback
- Large bold total count with red/orange accent color
- Per-instance breakdown (ZD1: X, ZD2: Y)
- "2hr SLA" badge reminder
- Auto-refreshes via the existing 60s polling in `useZendeskRealtime`

### Step 4: Add to Agent Dashboard
Place `NewTicketsCounter` after the debug card and before `ProfileHeader` (around line 818). Use `useZendeskRealtime` hook.

### Step 5: Add to Team Status Board
Place `NewTicketsCounter` before `<ZendeskRealtimePanel />` (around line 160). Use the same `useZendeskRealtime` hook.

### Files to change
| File | Change |
|---|---|
| `supabase/functions/fetch-zendesk-realtime/index.ts` | Add `newTickets` search query per instance |
| `src/lib/zendeskRealtimeApi.ts` | Add `newTickets` to `InstanceStats` |
| `src/components/dashboard/NewTicketsCounter.tsx` | New component |
| `src/pages/AgentDashboard.tsx` | Import hook + render counter |
| `src/pages/TeamStatusBoard.tsx` | Import hook + render counter |

