

## Make Coverage Board Visible to All Users

### Problem
Regular (non-admin) users can only see their own schedule on the Coverage Board because `fetchAgentSchedules()` queries the `agent_profiles` table directly, which has RLS policies restricting non-admin users to their own row only.

### Solution
Use the existing `agent_profiles_team_status` security-definer view (which bypasses RLS and is accessible to all authenticated users) for the Coverage Board data. This view already contains schedule fields but is missing three columns needed by the Coverage Board: `agent_name`, `zendesk_instance`, and `support_type`.

### Steps

#### Step 1: Update the database view
Create a migration to recreate `agent_profiles_team_status` with the three additional columns (`agent_name`, `zendesk_instance`, `support_type`).

```sql
CREATE OR REPLACE VIEW public.agent_profiles_team_status AS
SELECT id, email, agent_name, full_name, position,
       zendesk_instance, support_type, employment_status, day_off, break_schedule,
       mon_schedule, tue_schedule, wed_schedule, thu_schedule, fri_schedule,
       sat_schedule, sun_schedule,
       mon_ot_schedule, tue_ot_schedule, wed_ot_schedule, thu_ot_schedule,
       fri_ot_schedule, sat_ot_schedule, sun_ot_schedule
FROM agent_profiles;
```

#### Step 2: Update `fetchAgentSchedules` in `coverageBoardApi.ts`
Change the query from `agent_profiles` to `agent_profiles_team_status`. This single change ensures all authenticated users see the full team's schedules on the Coverage Board while edit capabilities remain restricted to admins (controlled by the existing `canEdit` flag in the frontend and RLS on `coverage_overrides`).

### What stays the same
- Edit mode is still restricted to Admin/HR/Super Admin via the `canEdit` flag
- `coverage_overrides` table RLS still restricts writes to admin roles
- No changes to the Coverage Board UI or components

### Considerations
- The `agent_profiles_team_status` view is also used by the Team Status Board, so adding these columns is backward-compatible (existing queries simply ignore extra columns).
- Since `agent_name` is not PII-sensitive (it's a display name), exposing it via the view is safe.
