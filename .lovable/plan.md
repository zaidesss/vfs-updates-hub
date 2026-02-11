

## Slack Threading for Status Event Notifications

### Overview
Instead of posting every status event as a separate top-level message (cluttering channels), the first event for each agent per day per channel becomes the parent message, and all subsequent events reply as threaded replies under it.

### How It Works

```text
Current (messy):
  @channel Stephen Martinez started a break at 1:30 PM EST
  @channel Biah Mae Divinagracia started bio break at 1:29 PM EST
  @channel Stephen Martinez ended their break at 2:00 PM EST

After (threaded):
  @channel Stephen Martinez started a break at 1:30 PM EST
    └─ ended their break at 2:00 PM EST          (thread reply)
  @channel Biah Mae Divinagracia started bio break at 1:29 PM EST
    └─ ended bio break at 1:34 PM EST            (thread reply)
```

---

### Step 1: Create a `slack_threads` Table

A new database table to store the Slack `thread_ts` (thread timestamp) for each agent's first message per channel per day.

| Column | Type | Purpose |
|---|---|---|
| id | uuid (PK) | Primary key |
| agent_email | text | Agent identifier |
| channel | text | Slack channel name |
| thread_ts | text | Slack message timestamp (used as thread parent) |
| date | date | The EST date this thread belongs to |
| created_at | timestamptz | Record creation time |

Unique constraint on `(agent_email, channel, date)` to ensure one thread parent per agent per channel per day.

RLS: Service role only (edge function uses service role key).

---

### Step 2: Update `send-profile-status-notification` Edge Function

The updated logic:

1. Receive event as before (agentName, agentEmail, eventType, timestamp)
2. Determine the channel and format the message
3. Calculate today's date in EST
4. Query `slack_threads` for an existing thread for this agent + channel + today
5. **If no thread exists:** Post as a new top-level message, save the returned `ts` as the thread parent in `slack_threads`
6. **If thread exists:** Post as a reply using `thread_ts` parameter, with a shorter message (no agent name prefix needed since it's in context)

---

### Technical Details

**Slack API threading:** The `chat.postMessage` API accepts an optional `thread_ts` parameter. When provided, the message is posted as a reply in that thread.

**Thread reply format:** Replies will be shorter since the parent already identifies the agent:
- Parent: `@channel Stephen Martinez started a break at 1:30 PM EST`
- Reply: `ended their break at 2:00 PM EST`

**Daily reset:** The `date` column ensures threads reset each day. Old records can be cleaned up periodically but are harmless if left.

**Login/Logout channel (`a_cyrus_li-lo`):** LOGIN becomes the thread parent, LOGOUT replies under it.

**Status channel (`a_cyrus_cs-all`):** First break/bio/coaching event becomes the thread parent, subsequent events reply.

