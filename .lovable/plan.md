

## Root Cause

The `agent_profiles_team_status` view has `security_invoker = false` and is owned by `postgres`, which should bypass RLS on the underlying `agent_profiles` table. However, due to a known Supabase/PostgREST behavior, this bypass does not reliably work for all user sessions.

The `agent_profiles` table has RLS where regular users can only SELECT their own row. So when a non-admin user loads the Team Status Board, the view query returns only their own profile instead of all 42 agents. Admins/HR/Super Admins have permissive SELECT policies and see everyone.

## Fix

**Replace the view query with a SECURITY DEFINER function** that explicitly bypasses RLS and returns only the non-sensitive columns needed by team status.

### Step 1: Database migration
- Create a new function `get_team_status_profiles()` as `SECURITY DEFINER` that returns the same columns as the current view, filtered to non-terminated agents
- This guarantees RLS bypass regardless of calling user

### Step 2: Update client code (`src/lib/teamStatusApi.ts`)
- Change `supabase.from('agent_profiles_team_status').select(...)` to `supabase.rpc('get_team_status_profiles')`
- Parse the returned rows identically

### Why not just add a SELECT policy?
The `agent_profiles` table contains sensitive columns (bank account numbers, hourly rates, home addresses). A blanket `USING (true)` policy would expose all that data to every user. The SECURITY DEFINER function only returns non-sensitive fields.

