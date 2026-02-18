

## Step 1: Centralized Audit Log -- Foundation

This is the first step of a multi-step project. We will create the database table and the new Audit Log page. Later steps will add logging to each portal area one by one.

### What gets built in this step

1. **New `portal_audit_log` database table** to store all portal-wide changes in one place
2. **New Audit Log page** (`/admin/audit-log`) accessible to Super Admins, Admins, and HR
3. **Navigation link** added to the Admin Panel or a new tab
4. **"Create Update/Announcement" button** (Super Admin only) that pre-fills a draft from a log entry
5. **Backfill existing logs** -- query existing history tables (QA events, leave request history, update change history, directory history, coverage override logs) and display them in the unified view

### Database Table: `portal_audit_log`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| area | text | Which portal section (e.g., "QA Evaluations", "Updates", "Leave Requests", "User Management", "Profile", "Coverage Board", "Knowledge Base", "Scorecard", "Revalida", "Announcements") |
| action_type | text | "created", "updated", "deleted", "new_feature" |
| entity_id | text (nullable) | ID of the affected record |
| entity_label | text (nullable) | Human-readable label (e.g., update title, agent name) |
| reference_number | text (nullable) | Reference number if applicable (QA-0001, UPD-0001, etc.) |
| changed_by | text | Email of who made the change |
| changes | jsonb (nullable) | Details of what changed (field-level diffs) |
| metadata | jsonb (nullable) | Extra context (e.g., agent email for agent-relevant changes) |
| created_at | timestamptz | When the change happened |

RLS policies:
- Super Admin, Admin, HR can SELECT all rows
- INSERT allowed for authenticated users (the app writes logs)
- No UPDATE or DELETE (immutable audit trail)

### Audit Log Page Features

- Filterable by area, action type, date range, and who made the change
- Each log entry shows: timestamp, who, what area, what changed, action type badge
- Expandable rows to see detailed changes (similar to QA evaluation history)
- Super Admin sees a "Create Update" and "Create Announcement" button on each log entry
  - Opens the existing Create Update dialog or Announcement form pre-filled with:
    - Title: Summary of the change
    - Body: Details of what changed
    - The Super Admin can edit before saving as draft or publishing

### My Activity Page Enhancement (for agents)

- Not included in this step -- will come after logging is added to all areas
- Will be a follow-up step where agent-relevant audit log entries are surfaced on their Activity page, linked to reference numbers

### Technical Details

**New files:**
- `src/pages/AuditLog.tsx` -- the main page with filters, table, and expandable rows
- `src/lib/auditLogApi.ts` -- functions to write and read from `portal_audit_log`

**Modified files:**
- `src/App.tsx` -- add route `/admin/audit-log`
- `src/components/Layout.tsx` -- add nav link for Admin/HR/Super Admin
- `src/pages/Admin.tsx` -- optionally add a tab or link to Audit Log

**Database migration:**
- Create `portal_audit_log` table with RLS policies

### What comes next (future steps)
After this foundation is approved and implemented, we will add logging to each area one at a time:
1. Admin Panel actions (user create/delete/role change/email change)
2. Updates (create/edit/publish/delete)
3. QA Evaluations (already logged -- backfill to centralized table)
4. Leave Requests (already logged -- backfill)
5. Profile changes
6. Coverage Board overrides
7. Master Directory changes
8. Knowledge Base articles
9. Scorecard edits
10. Revalida batch changes
11. Announcements
12. My Activity page enhancement for agents

