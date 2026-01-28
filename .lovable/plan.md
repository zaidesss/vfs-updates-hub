

# Fix RLS Policy Mismatch and Data Sync Issues

## Summary

There are two related issues preventing the Agent Dashboard from working correctly for non-admin users:

1. **RLS Policy Error**: The "Users can insert own profile_status" policy fails because it checks against `agent_directory.id`, but the system now uses `agent_profiles.id`
2. **Data Not Reflecting**: Updates in Master Directory (agent_directory) not appearing in Agent Dashboard

---

## Root Cause Analysis

### The ID Mismatch Problem

The database has two separate tables for agent information:

| Table | Purpose | Example ID for salmeromalcom12@gmail.com |
|-------|---------|------------------------------------------|
| `agent_profiles` | Auth/identity, links to Supabase auth | `c10d78bb-9079-4608-a30f-313378a52829` |
| `agent_directory` | Operational data (schedules, quotas) | `9bbd45cc-7961-4317-8d20-192288f040a7` |

These are **different UUIDs** for the same user (linked by email).

### What Went Wrong

The previous migration fixed the **foreign key** to reference `agent_profiles(id)`, but the **RLS policies** still use this check:

```sql
-- Current RLS policy (BROKEN)
EXISTS (
  SELECT 1 FROM agent_directory ad
  WHERE ad.id = profile_status.profile_id  -- This compares agent_directory.id
  AND ad.email = current_user_email
)
```

This fails because:
- `profile_status.profile_id` is now an `agent_profiles.id` (e.g., `c10d78bb...`)
- The policy tries to match it against `agent_directory.id` (e.g., `9bbd45cc...`)
- They never match, so RLS denies the insert

---

## Solution

Update the RLS policies to reference `agent_profiles` instead of `agent_directory`:

### Database Migration

```sql
-- Drop and recreate the "Users can" policies for profile_status
DROP POLICY IF EXISTS "Users can insert own profile_status" ON profile_status;
DROP POLICY IF EXISTS "Users can update own profile_status" ON profile_status;
DROP POLICY IF EXISTS "Users can view own profile_status" ON profile_status;

CREATE POLICY "Users can insert own profile_status" ON profile_status
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM agent_profiles ap
    WHERE ap.id = profile_status.profile_id
    AND ap.email = lower((current_setting('request.jwt.claims', true)::json->>'email'))
  )
);

CREATE POLICY "Users can update own profile_status" ON profile_status
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM agent_profiles ap
    WHERE ap.id = profile_status.profile_id
    AND ap.email = lower((current_setting('request.jwt.claims', true)::json->>'email'))
  )
);

CREATE POLICY "Users can view own profile_status" ON profile_status
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM agent_profiles ap
    WHERE ap.id = profile_status.profile_id
    AND ap.email = lower((current_setting('request.jwt.claims', true)::json->>'email'))
  )
);

-- Same for profile_events
DROP POLICY IF EXISTS "Users can insert own profile_events" ON profile_events;
DROP POLICY IF EXISTS "Users can view own profile_events" ON profile_events;

CREATE POLICY "Users can insert own profile_events" ON profile_events
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM agent_profiles ap
    WHERE ap.id = profile_events.profile_id
    AND ap.email = lower((current_setting('request.jwt.claims', true)::json->>'email'))
  )
);

CREATE POLICY "Users can view own profile_events" ON profile_events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM agent_profiles ap
    WHERE ap.id = profile_events.profile_id
    AND ap.email = lower((current_setting('request.jwt.claims', true)::json->>'email'))
  )
);
```

---

## Data Sync Verification

The Agent Dashboard already correctly joins `agent_profiles` with `agent_directory` using email:

```typescript
// Current code in agentDashboardApi.ts (line 129-134)
const { data: directory } = await supabase
  .from('agent_directory')
  .select('agent_name, zendesk_instance, ...')
  .eq('email', profile.email)  // Joins by email
  .maybeSingle();
```

This should work. If data still doesn't reflect, we need to ensure:
1. The emails match exactly (case-insensitive comparison already in place)
2. The user has SELECT permission on `agent_directory` (non-admins need a policy)

### Additional: Add SELECT policy for agent_directory

Currently, only admins/HR/super_admins can view `agent_directory`. Regular users can't see their own row:

```sql
-- Add policy for users to see their own agent_directory row
CREATE POLICY "Users can view own agent_directory" ON agent_directory
FOR SELECT USING (
  email = lower((current_setting('request.jwt.claims', true)::json->>'email'))
);
```

---

## Implementation Steps

| Step | Action |
|------|--------|
| 1 | Run database migration to fix RLS policies on `profile_status` and `profile_events` |
| 2 | Add RLS policy for users to view their own `agent_directory` row |
| 3 | Test login flow with non-admin user |

---

## Files Changed

| File | Change |
|------|--------|
| Database (migration) | Update 6 RLS policies to use `agent_profiles` instead of `agent_directory` |
| Database (migration) | Add new SELECT policy on `agent_directory` for users |

---

## Expected Outcome

After the fix:
- Non-admin users can click "Log in" without RLS errors
- Agent Dashboard displays the correct schedule data from Master Directory
- Status changes (Login, Logout, Break, Coaching) work for all users

