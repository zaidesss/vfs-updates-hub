

## Add Real-Time Zendesk Stats Panel to Team Status Board

### Overview

Add a live metrics panel at the top of the Team Status Board showing real-time Zendesk Talk (phone) and Messaging stats for both ZD1 and ZD2 instances, refreshing every 60 seconds. Visible to all users.

### What the Panel Will Show

**For each ZD instance (ZD1 and ZD2):**

Phone (Talk) section:
- Agents online (Talk)
- Ongoing calls
- Calls in queue
- Callbacks in queue

Messaging section:
- Agents online (Messaging)
- Active conversations per assignee (showing individual agent loads)
- Conversations waiting in queue

### Architecture

A new edge function `fetch-zendesk-realtime` will be created. It calls two separate APIs:

1. **Zendesk Talk Real-Time API** (uses existing `ZENDESK_API_TOKEN_ZD1/ZD2` + `ZENDESK_ADMIN_EMAIL`):
   - `GET /api/v2/channels/voice/stats/agents_activity.json` -- agents online, on call
   - `GET /api/v2/channels/voice/stats/current_queue_activity.json` -- calls waiting, callbacks

2. **Sunshine Conversations API** (uses new secrets -- the credentials you just provided):
   - `GET /v2/apps/{appId}/conversations?filter[status]=open` -- active/queued conversations
   - Auth: Basic auth with `keyId:keySecret`
   - This provides conversation status (open/pending) and assignee info to calculate per-assignee loads and queue depth

### Secrets to Store (6 new secrets)

| Secret Name | Value Source |
|---|---|
| `SUNSHINE_KEY_ID_ZD1` | `619bc1f7c0917400e9835ad7` |
| `SUNSHINE_KEY_SECRET_ZD1` | `xBIq3udnyhIlRI8NYssF4DntmU5PuUNsovXy8qI5u6oQlBtsFyWZoNXcM3PRlHMwyMhgpumB59sRUbtgnST4Ag` |
| `SUNSHINE_APP_ID_ZD1` | `app_699cf0e9c817149916f27a56` |
| `SUNSHINE_KEY_ID_ZD2` | `67d337ed014b998308a349cc` |
| `SUNSHINE_KEY_SECRET_ZD2` | `3t_JCunxkTs6GP3KiH6ee9AdqzMQdFsizby2EgVjTCTaxmDk4k5qa3UW8eQsEDqzx9H7PzNHQ_1qIxTrrsKW0A` |
| `SUNSHINE_APP_ID_ZD2` | `app_699cf12476a169b5689c727c` |

### Files to Create/Modify

| File | Action | Purpose |
|---|---|---|
| `supabase/functions/fetch-zendesk-realtime/index.ts` | Create | Edge function that fetches Talk queue stats + Sunshine Conversations data for both instances |
| `src/components/team-status/ZendeskRealtimePanel.tsx` | Create | UI component showing the stats cards at top of board |
| `src/lib/zendeskRealtimeApi.ts` | Create | Client-side API to call the edge function with 60s auto-refresh |
| `src/pages/TeamStatusBoard.tsx` | Modify | Insert the new panel above the category sections |
| `supabase/config.toml` | Auto-updated | Add `verify_jwt = false` for new function |

### Implementation Steps

1. Store the 6 Sunshine Conversations secrets
2. Create the `fetch-zendesk-realtime` edge function
3. Create the client-side API hook with 60s polling
4. Create the `ZendeskRealtimePanel` UI component
5. Integrate the panel into `TeamStatusBoard.tsx`

### UI Design

The panel will sit between the header and the category sections, using a compact card-based layout similar to the screenshot:

```text
+------------------------------------------+------------------------------------------+
|  ZD1                                     |  ZD2                                     |
|  PHONE          MESSAGING                |  PHONE          MESSAGING                |
|  3 online       5 online                 |  2 online       3 online                 |
|  1 ongoing      Agent A: 2 sessions      |  0 ongoing      Agent X: 1 session       |
|  2 in queue     Agent B: 1 session       |  1 in queue     Agent Y: 2 sessions      |
|  0 callbacks    3 waiting in queue       |  0 callbacks    1 waiting in queue       |
+------------------------------------------+------------------------------------------+
```

Each instance gets a card with two sub-columns (Phone and Messaging). The messaging section shows per-assignee conversation counts and queue depth.

