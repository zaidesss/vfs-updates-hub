

## Plan: Add Ticket Assignment View Dropdown in Master Directory

### Current State
- `ticket_assignment_view_id` column already exists in both `agent_directory` and `agent_profiles` tables.
- The edge function (`assign-tickets-on-login`) currently ignores this column and auto-determines the view based on `support_type_pattern` (email_hybrid or chat_phone).
- The `ticket_assignment_view_config` table has 2 ZD1 rows: OpenAssign and NewAssign. The new Billing&Payments view needs to be added.
- The Master Directory shows a "Views" column with read-only badges but has no dropdown for selecting the assignment view.

### Other Considerations
1. **Should the existing "Views" badge column be replaced or kept alongside the new dropdown?** The badges show general view membership, while the dropdown specifically controls which view tickets are pulled from during auto-assignment. I recommend keeping both: badges stay as-is, and a new "Assignment View" column with the dropdown is added.
2. **What about agents who don't have a `ticket_assignment_view_id` set yet?** The edge function should fall back to the current `support_type_pattern` logic so nothing breaks for existing agents.
3. **Should the dropdown be filtered to only show views for the agent's Zendesk instance (ZD1)?** Yes, since the new view is ZD1-only and ZD2 agents have ticket assignment disabled.

### Changes

| File/Resource | Change |
|---|---|
| **Database** (insert data) | Insert new row into `ticket_assignment_view_config`: ZD1, view_id `55417569574553`, name `Billing&Payments`, `support_type_pattern = 'billing_payments'`, enabled. |
| `src/lib/masterDirectoryApi.ts` | Add `ticket_assignment_view_id` to `DirectoryEntry` interface. Fetch view config options for dropdown. Include field in bulk save. |
| `src/pages/MasterDirectory.tsx` | Add "Assignment View" column with a Select dropdown. Populate options from `ticket_assignment_view_config` (ZD1 views). Only enabled for ZD1 agents with ticket assignment on. |
| `supabase/functions/assign-tickets-on-login/index.ts` | Update `processTicketAssignment` to first check the agent's `ticket_assignment_view_id` from `agent_directory`. If set, use it directly (look up view_name from config). If not set, fall back to current `support_type_pattern` logic. |

### Step-by-Step Execution
1. Insert the new Billing&Payments view config row into the database.
2. Update `masterDirectoryApi.ts` — add field to interface, fetch view configs, include in save.
3. Update `MasterDirectory.tsx` — add the Assignment View dropdown column.
4. Update the edge function to use per-agent view ID with fallback.

