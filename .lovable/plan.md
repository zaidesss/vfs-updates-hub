

## Fix Zendesk Realtime Panel: Replace Broken Messaging API + Align to Dashboard

### Problem Summary

The current edge function uses the **Sunshine Conversations API** to fetch messaging stats, but this API requires a `userId` parameter and cannot list all conversations globally. This is the wrong API for real-time aggregate stats. The correct API is the **Zendesk Real-Time Chat API** at `rtm.zopim.com`.

### What Needs to Change

#### Step 1: Get a Chat OAuth Access Token

You will need a **Zendesk Chat OAuth access token** for each instance. Here is how to get one:

1. Log in to your **Zendesk Admin Center**
2. Go to **Apps and integrations** in the sidebar
3. Select **APIs > Zendesk API**
4. Click the **Chat API** tab (not Support API)
5. Under **OAuth Clients**, click **Add OAuth Client**
   - Give it a name like "Realtime Stats"
   - Set redirect URL to `http://localhost`
   - Save and note the **Client ID** and **Client Secret**
6. Generate an access token using the token endpoint (I will provide you a helper or walk you through this)
7. Repeat for ZD2 if it is a separate Chat account

I will prompt you for these tokens as new secrets:
- `ZENDESK_CHAT_TOKEN_ZD1`
- `ZENDESK_CHAT_TOKEN_ZD2`

#### Step 2: Update the Edge Function

Replace the broken `fetchMessagingStats` function with calls to the Real-Time Chat API:

| Current (broken) | New (correct) |
|---|---|
| Sunshine Conversations `/v2/apps/{appId}/conversations` | Real-Time Chat API `rtm.zopim.com/stream/chats` and `/stream/agents` |
| Requires userId -- cannot get global stats | Returns aggregate metrics: agents_online, active_chats, incoming_chats, waiting_time |

The new function will call two endpoints:
- `GET https://rtm.zopim.com/stream/chats` -- returns active_chats, incoming_chats (queue), waiting_time_avg, waiting_time_max
- `GET https://rtm.zopim.com/stream/agents` -- returns agents_online count

Authentication: `Authorization: Bearer {chat_oauth_token}`

#### Step 3: Add Talk API Debug Logging (Temporary)

Add temporary logging to the Talk API call to verify what data is being returned, since it currently shows 0 even when your dashboard shows 1 agent online.

#### Step 4: Update the UI Panel

Update the `ZendeskRealtimePanel` component to display the new metrics that align with your Zendesk dashboard:

**Phone section** (unchanged):
- Agents Online, On Call, Calls in Queue, Callbacks in Queue

**Messaging section** (updated to match dashboard):
- Agents Online (from Chat API)
- Active Conversations (active_chats)
- In Queue (incoming_chats)
- Avg Wait Time (waiting_time_avg, formatted as minutes)

#### Step 5: Remove Sunshine Conversations Secrets (Cleanup)

After confirming the new approach works, the 6 `SUNSHINE_*` secrets will no longer be needed for this feature.

### Technical Details

**Files to modify:**
- `supabase/functions/fetch-zendesk-realtime/index.ts` -- replace `fetchMessagingStats`, add Chat API calls, add Talk debug logging
- `src/lib/zendeskRealtimeApi.ts` -- update `MessagingStats` interface to include wait time
- `src/components/team-status/ZendeskRealtimePanel.tsx` -- update UI to show new metrics

**New secrets needed:**
- `ZENDESK_CHAT_TOKEN_ZD1`
- `ZENDESK_CHAT_TOKEN_ZD2`

### Execution Order

1. I will first guide you through getting the Chat OAuth tokens
2. Prompt you to enter them as secrets
3. Update the edge function to use the correct API
4. Update the UI panel
5. Test and verify
6. Remove debug logging once confirmed

