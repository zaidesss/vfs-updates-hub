

## Track Auto-Solved Chats and Show Adjusted AHT

### Summary
Add tracking for `chat_autosolved` tickets across both ZD1 and ZD2. The autosolved count will appear separately in Ticket Logs (beside regular chats) and in a new section on Zendesk Insights showing the adjusted AHT calculation.

### What You Need to Do in Zendesk
For the **autosolved chat trigger** (the one that fires on 3-min inactivity), add one extra field to the webhook JSON body:

```text
{
  "zd_instance": "customerserviceadvocates",
  "ticket_id": "{{ticket.id}}",
  "status": "{{ticket.status}}",
  "timestamp": "{{ticket.updated_at_with_timestamp}}",
  "ticket_type": "Chat",
  "agent_name": "{{ticket.ticket_field_14923047306265}}",
  "is_autosolved": "true"
}
```

The manually solved chat trigger stays unchanged (it will default to `is_autosolved: false`). Do this for both ZD1 and ZD2 triggers.

---

### Portal Changes (Step by Step)

**Step 1 -- Add `is_autosolved` column to `ticket_logs` table**
- New boolean column, defaults to `false`, nullable
- No impact on existing data -- all current rows will be `false`

**Step 2 -- Update the webhook edge function**
- Accept `is_autosolved` from the payload
- Store it in the new column
- Backward-compatible: if the field is missing, defaults to `false`

**Step 3 -- Update `get_ticket_dashboard_data` database function**
- Add `autosolved_chat_count` to the return columns
- Count tickets where `ticket_type = 'Chat' AND is_autosolved = true`

**Step 4 -- Update Ticket Logs UI**
- Add a small autosolved indicator next to the chat count (e.g., "5 (2 auto)" or a separate sub-column)
- Show it in a non-intrusive way so it doesn't clutter the existing table

**Step 5 -- Add "Adjusted AHT" section to Zendesk Insights**
- New card/section showing:
  - Total autosolved chats for the selected week
  - Zendesk AHT (existing "Avg Resolution Time")
  - Adjusted AHT = removes 180 seconds per autosolved ticket from the total agent work time
  - Formula: `(Total Agent Work Time - (Autosolved Count x 180)) / Total Tickets`
- Kept visually separate from the existing metrics as requested

**Step 6 -- Update Zendesk Insights cache table**
- Add `autosolved_chat_count` column to `zendesk_insights_cache` so the count persists with cached data

### Considerations Already Addressed
- Both ZD1 and ZD2 supported
- Existing ticket_logs data unaffected (defaults to `false`)
- Deduplication logic unchanged -- same 120-second window applies
- OT tickets that are also autosolved will carry both flags independently
- The Team Scorecard's chat count will include autosolved chats in the total (they are still real chats handled by agents)

