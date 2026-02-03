
# Plan: Connect Ticket Assignment to Zendesk (ZD1 Only - ZD2 Disabled)

## Summary

This feature automatically assigns tickets from Zendesk to agents when they log in. The system checks if it's a weekday (Mon-Fri) or weekend (Sat-Sun), reads the corresponding ticket count from `WD Ticket Assign` or `WE Ticket Assign`, fetches unassigned tickets from the appropriate Zendesk View, and adds the agent's `agent_tag` to those tickets.

**ZD2 is currently disabled** until View IDs are provided.

---

## View ID Configuration (ZD1 Only)

| Zendesk Instance | Support Type Contains | View Name | View ID |
|------------------|----------------------|-----------|---------|
| ZD1 | Email or Hybrid | OpenAssign | (You'll provide) |
| ZD1 | Chat or Phone | NewAssign | (You'll provide) |
| ZD2 | * | DISABLED | N/A |

**Logic for determining View:**
- If `support_type` contains "Email" OR "Hybrid" → Use **OpenAssign** view
- If `support_type` contains "Chat" OR "Phone" (without Email/Hybrid) → Use **NewAssign** view

---

## Core Logic Flow

```text
Agent Logs In
     |
     v
Check: zendesk_instance = 'ZD1'?
     |
     +-- No (ZD2 or null) --> Skip assignment (ZD2 disabled)
     |
     v Yes
Check: ticket_assignment_enabled = true?
     |
     +-- No --> Skip assignment
     |
     v Yes
Get agent config:
  - agent_tag
  - support_type --> Determine View (OpenAssign or NewAssign)
     |
     v
Check: Is today Mon-Fri (weekday)?
     |
     +-- Yes --> ticket_count = wd_ticket_assign
     |
     +-- No --> ticket_count = we_ticket_assign
     |
     v
ticket_count > 0?
     |
     +-- No --> Skip assignment
     |
     v Yes
Acquire lock for this View ID
     |
     +-- Lock busy? --> Wait 2s, retry (max 3 attempts)
     |
     v Lock acquired
Fetch N tickets from View
     |
     v
For each ticket: Add agent_tag to ticket tags
     |
     +-- Success --> Continue to next
     |
     +-- Failure --> Retry once
           |
           +-- Still fails --> Abort, email admin, notify agent, log error
     |
     v
Release lock
Log success to database
```

---

## Master Directory UI Changes

### Disable Controls for ZD2 Users

For agents with `zendesk_instance = 'ZD2'` or no instance set:

| Control | State | Visual |
|---------|-------|--------|
| Ticket Assignment toggle | Disabled + OFF | Grayed out with tooltip "Not available for ZD2" |
| WD Ticket Assign input | Disabled | Grayed out, non-editable |
| WE Ticket Assign input | Disabled | Grayed out, non-editable |

**Implementation:**
```text
const isZD2orNull = !entry.zendesk_instance || entry.zendesk_instance === 'ZD2';

// Toggle
<Switch
  disabled={isZD2orNull}
  checked={!isZD2orNull && entry.ticket_assignment_enabled}
  ...
/>
{isZD2orNull && <span className="text-xs text-amber-600">ZD2 disabled</span>}

// Inputs
<Input
  disabled={isZD2orNull}
  value={isZD2orNull ? '' : entry.wd_ticket_assign}
  ...
/>
```

---

## Database Changes

### New Table: `ticket_assignment_view_config`

Central configuration for View IDs per instance and support type pattern:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| zendesk_instance | text | 'ZD1' or 'ZD2' |
| support_type_pattern | text | 'email_hybrid' or 'chat_phone' |
| view_id | text | Zendesk View ID |
| view_name | text | Display name (e.g., 'OpenAssign') |
| is_enabled | boolean | Whether this config is active |
| created_at | timestamptz | Timestamp |
| updated_at | timestamptz | Timestamp |

**Initial Data:**
```sql
INSERT INTO ticket_assignment_view_config VALUES
  ('ZD1', 'email_hybrid', 'YOUR_VIEW_ID_HERE', 'OpenAssign', true),
  ('ZD1', 'chat_phone', 'YOUR_VIEW_ID_HERE', 'NewAssign', true),
  ('ZD2', 'email_hybrid', NULL, 'Pending', false),
  ('ZD2', 'chat_phone', NULL, 'Pending', false);
```

### New Table: `ticket_assignment_locks`

Per-view locking to prevent race conditions:

| Column | Type | Description |
|--------|------|-------------|
| view_id | text | Primary key - the View ID being locked |
| locked_by | text | Email of agent holding the lock |
| locked_at | timestamptz | When lock was acquired |
| expires_at | timestamptz | Auto-expire after 60 seconds |

### New Table: `ticket_assignment_logs`

Audit trail for all assignment attempts:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| agent_email | text | Agent who triggered assignment |
| agent_name | text | Agent display name |
| zendesk_instance | text | ZD1 or ZD2 |
| view_id | text | View used |
| view_name | text | OpenAssign or NewAssign |
| tickets_requested | integer | Number requested |
| tickets_assigned | integer | Number successfully assigned |
| ticket_ids | text[] | Array of assigned ticket IDs |
| status | text | 'success', 'partial', 'failed', 'skipped' |
| error_message | text | Error details if failed |
| created_at | timestamptz | Timestamp |

---

## New Edge Function: `assign-tickets-on-login`

### Request Body

```json
{
  "agentEmail": "jane@example.com",
  "profileId": "uuid-of-profile"
}
```

### Response (Success)

```json
{
  "success": true,
  "ticketsAssigned": 5,
  "ticketIds": ["12345", "12346", "12347", "12348", "12349"],
  "viewName": "OpenAssign"
}
```

### Response (ZD2 Disabled)

```json
{
  "success": true,
  "skipped": true,
  "reason": "Ticket assignment not enabled for ZD2"
}
```

### Response (Failure)

```json
{
  "success": false,
  "error": "Failed to assign tickets - admin notified",
  "ticketsAssigned": 0
}
```

### Edge Function Logic

1. **Fetch agent config** from `agent_profiles` and `agent_directory`
2. **Check ZD1 only** - if `zendesk_instance !== 'ZD1'`, return skipped
3. **Check enabled** - if `ticket_assignment_enabled !== true`, return skipped
4. **Determine View** based on `support_type`:
   - Contains "Email" or "Hybrid" → Query config for `email_hybrid`
   - Contains "Chat" or "Phone" → Query config for `chat_phone`
5. **Get ticket count** - Check day of week:
   - Mon-Fri → Use `wd_ticket_assign`
   - Sat-Sun → Use `we_ticket_assign`
6. **Acquire lock** for the View ID (retry 3x with 2s delay)
7. **Fetch tickets** from Zendesk View API
8. **Tag tickets** - Add `agent_tag` to each ticket
9. **Handle failures** - On error: retry once → if still fails: email admin, release lock, log to DB
10. **Release lock** and log success

### Zendesk API Calls

**Fetch tickets from view:**
```text
GET https://customerserviceadvocates.zendesk.com/api/v2/views/{view_id}/tickets.json?per_page={count}
Authorization: Basic {base64(email/token:api_token)}
```

**Update ticket (add tag):**
```text
PUT https://customerserviceadvocates.zendesk.com/api/v2/tickets/{ticket_id}.json
Body: {
  "ticket": {
    "tags": [...existing_tags, "agent_tag_here"]
  }
}
```

---

## Frontend Changes

### MasterDirectory.tsx

1. **Add ZD2 detection** helper:
```typescript
const isTicketAssignDisabled = (entry: DirectoryEntry) => {
  return !entry.zendesk_instance || entry.zendesk_instance === 'ZD2';
};
```

2. **Disable toggle and inputs** for ZD2 users with visual indicator

3. **Add tooltip** explaining "Ticket assignment not available for ZD2"

### agentDashboardApi.ts

After successful login (status change to `LOGGED_IN`):

1. Call `assign-tickets-on-login` edge function
2. Handle response:
   - Success with tickets → Toast: "5 tickets assigned from OpenAssign"
   - Skipped → No toast (silent)
   - Failure → Error toast with message

---

## Failure Handling

| Scenario | Action |
|----------|--------|
| ZD2 user logs in | Skip silently, log as 'skipped' |
| View is empty | Log success with 0 tickets, no notification |
| Lock timeout (3 retries) | Return "Queue busy, try again shortly" |
| Zendesk API error | Retry once → If fails: abort all, email malcom@persistbrands.com, toast to agent, log to DB |
| Partial success | Abort remaining, treat as failure |

### Failure Email Template

```text
Subject: Ticket Assignment Failed - [Agent Name]

Agent: Jane Doe (jane@example.com)
Time: 2026-02-03 10:15:00 EST
Instance: ZD1
View: OpenAssign (view_id: 12345678)
Tickets Requested: 5
Error: Zendesk API returned 429 Rate Limited

Please check the ticket_assignment_logs table for details.
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/assign-tickets-on-login/index.ts` | **Create** - Main edge function |
| `src/pages/MasterDirectory.tsx` | **Modify** - Disable ZD2 controls |
| `src/lib/agentDashboardApi.ts` | **Modify** - Trigger assignment on login |
| Database migration | **Create** - New tables |
| `supabase/config.toml` | **Modify** - Add function config |

---

## Configuration Required Before Implementation

**ZD1 View IDs needed:**

1. **OpenAssign View ID** (for Email/Hybrid agents): `___________`
2. **NewAssign View ID** (for Chat/Phone agents): `___________`

You can find these in Zendesk Admin > Views > click on the view > the ID is in the URL.

---

## Implementation Order

1. Create database tables (migration)
2. Update Master Directory UI to disable ZD2 controls
3. Create edge function `assign-tickets-on-login`
4. Update `agentDashboardApi.ts` to trigger on login
5. Test with ZD1 agent
6. Future: Enable ZD2 when you provide View IDs

---

## Enabling ZD2 in the Future

When you have ZD2 View IDs:

1. Update `ticket_assignment_view_config` table:
```sql
UPDATE ticket_assignment_view_config 
SET view_id = 'YOUR_ZD2_VIEW_ID', is_enabled = true 
WHERE zendesk_instance = 'ZD2';
```

2. The UI and edge function will automatically enable for ZD2 users (no code changes needed)
