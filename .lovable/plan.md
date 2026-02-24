

## Revised Plan: Use Support API for Messaging Stats

### Why the Previous Plan Won't Work

Your Zendesk account uses **Messaging** (part of Zendesk Suite), not the standalone **Chat** product. The Real-Time Chat API at `rtm.zopim.com` requires a Chat OAuth token that can only be generated when the standalone Chat product is enabled. This is why you got the "Something went wrong" error.

### New Approach

Instead of the Chat API, we will use the **Zendesk Support API** (which your existing `ZENDESK_API_TOKEN_ZD1` and `ZD2` tokens already support) to get messaging stats. This won't be a perfect 1:1 match to the Zendesk dashboard, but it will show meaningful live numbers.

#### What we will fetch

**Phone (Talk) -- unchanged:**
- Agents Online, On Call, Calls in Queue, Callbacks in Queue (from Talk API, already working)

**Messaging -- new approach using Support API:**
- **Active Conversations**: Count of open/pending tickets with channel = "messaging" (via Search API)
- **Unassigned (In Queue)**: Count of open tickets with channel = "messaging" that have no assignee
- **Assigned**: Active minus unassigned

This uses the Search API endpoint you already use elsewhere in the project (e.g., `fetch-volume-demand`).

#### Queries

For each ZD instance:

```text
Active:     type:ticket status<solved channel:messaging
In Queue:   type:ticket status:new channel:messaging
```

### Steps

**Step 1**: Update the edge function `fetch-zendesk-realtime/index.ts`:
- Replace the broken `fetchMessagingStats` (Sunshine API) with Support API search queries
- Remove all Sunshine API code and secret references
- Add temporary debug logging for Talk API to investigate the 0-agent issue

**Step 2**: Update the TypeScript interface in `zendeskRealtimeApi.ts`:
- Remove `assignees` array from `MessagingStats`
- Keep `agentsOnline`, `activeConversations`, `conversationsInQueue`

**Step 3**: Update the UI panel `ZendeskRealtimePanel.tsx`:
- Remove the per-assignee breakdown section
- Update labels to match the new data (Active, In Queue, Assigned)

**Step 4**: Test and verify numbers appear

**Step 5**: Once confirmed working, remove the 6 `SUNSHINE_*` secrets (they are no longer needed)

### Technical Details

**Files to modify:**
- `supabase/functions/fetch-zendesk-realtime/index.ts` -- replace messaging logic with Support API search
- `src/lib/zendeskRealtimeApi.ts` -- simplify MessagingStats interface
- `src/components/team-status/ZendeskRealtimePanel.tsx` -- update UI

**No new secrets needed** -- this approach uses the existing `ZENDESK_API_TOKEN_ZD1`, `ZENDESK_API_TOKEN_ZD2`, and `ZENDESK_ADMIN_EMAIL`.

### Trade-offs

- Search API counts are near-real-time (may lag 1-2 minutes vs the Zendesk dashboard)
- We cannot get "messaging agents online" count from the Support API -- we will show the active/queue breakdown instead
- This approach is reliable and uses credentials you already have

