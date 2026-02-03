
# Plan: Fix Team Status Board Visibility for All Users

## Problem Identified

The `agent_profiles_team_status` view was created with `security_invoker = on`, which forces the view to respect the RLS policies of the underlying `agent_profiles` table. 

Current `agent_profiles` RLS policies only allow:
- Super Admins, HR, Admins: view all profiles
- Regular agents: view only their **own** profile

This is why regular agents can only see team members who match their own profile (effectively just themselves or profiles that happen to get through other policies).

## Solution

Recreate the `agent_profiles_team_status` view **without** `security_invoker = on`. This allows the view to bypass the base table's RLS while still only exposing the intentionally limited, non-sensitive fields (id, email, full_name, position).

This is a secure pattern because:
1. The view only exposes non-sensitive fields needed for team coordination
2. Full profile data (with sensitive fields) remains protected by RLS on the base table
3. The use case (seeing who is online) requires all team members to see each other

---

## Database Migration

```sql
-- Drop the existing view with security_invoker = on
DROP VIEW IF EXISTS public.agent_profiles_team_status;

-- Recreate without security_invoker (defaults to off = bypasses RLS)
-- This is safe because we only expose non-sensitive fields
CREATE VIEW public.agent_profiles_team_status AS
SELECT 
  id,
  email,
  full_name,
  position
FROM public.agent_profiles;

-- Grant SELECT access to authenticated users
GRANT SELECT ON public.agent_profiles_team_status TO authenticated;
```

---

## Why This Is Safe

| Concern | Answer |
|---------|--------|
| Sensitive data exposure? | No - view only includes id, email, full_name, position |
| PII concerns? | Email and name are needed for team coordination and are visible in the app anyway |
| Password/auth data? | Not included in view |
| Financial data? | Not included in view |
| Personal schedules/details? | Not included - those stay protected on base table |

---

## Files Changed

| File | Change |
|------|--------|
| New migration | Recreate view without `security_invoker` |

No code changes needed - the `teamStatusApi.ts` already queries this view correctly.

---

## After This Fix

All authenticated users will be able to:
1. See all team members on the Team Status Board
2. View members across all support types (Phone, Chat, Email, Hybrid, Team Leads, Tech Support)
3. See status, shift schedule, and break schedule for online colleagues

The full `agent_profiles` table remains protected by existing RLS policies.
