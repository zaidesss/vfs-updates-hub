

## Fix: Dashboard Link Missing for Some Users

### Root Cause

The "Dashboard" link in the People menu only appears when `profileId` is resolved in the authentication context. This value is fetched by querying the `agent_profiles` table filtered by email.

The query relies on an RLS (Row-Level Security) policy that matches the profile email against the JWT email claim. In some cases, this query silently returns `null` due to a timing issue -- the JWT claims may not be fully propagated to the database session at the moment the query runs (inside a `setTimeout(0)` in the auth state change handler). When this happens, `profileId` stays `null` and the Dashboard link never appears.

Both Maryll Kate and salmeromalcom12@gmail.com have identical configurations (both "user" role, both have agent profiles with matching emails). The difference is purely a race condition.

### Proposed Fix

**File: `src/context/AuthContext.tsx`**

Add a retry mechanism for the profile ID lookup. If the initial query returns no profile (likely due to RLS timing), retry once after a short delay (500ms). This ensures the JWT is fully set before the RLS policy evaluates.

Additionally, add a fallback: if the `maybeSingle()` query still returns null after retry, log a warning so the issue is visible in the console for debugging.

### Other Considerations Before Proceeding

1. **Should we also add a "Refresh" or re-fetch mechanism?** If a user logs in and the Dashboard link doesn't appear, currently the only fix is to reload the page. We could add a periodic re-check or a manual refresh option.

2. **Should the profile query bypass RLS entirely?** We could create a small database function (RPC) like `get_profile_id_by_email(email)` with `SECURITY DEFINER` that returns just the profile ID. This would eliminate the RLS race condition entirely and be more robust.

3. **Should we show a loading state for the People menu?** Right now, if `profileId` hasn't loaded yet, the Dashboard link simply doesn't appear. We could show a skeleton/loading indicator.

### Recommended Approach

Use option 2 (RPC function) as it is the most robust solution:

**Step 1: Create a database function**
- Create `get_profile_id_by_email(p_email text)` as a `SECURITY DEFINER` function
- Returns just the profile `id` from `agent_profiles` matching the email
- This bypasses RLS entirely, which is safe since it only returns a UUID

**Step 2: Update AuthContext**
- Replace the direct `agent_profiles` query with an RPC call to `get_profile_id_by_email`
- This eliminates the race condition since the RPC runs with definer privileges

### Technical Details

Database migration:
```sql
CREATE OR REPLACE FUNCTION public.get_profile_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id FROM public.agent_profiles
  WHERE LOWER(email) = LOWER(p_email)
  LIMIT 1;
$$;
```

AuthContext change (in both `onAuthStateChange` and `checkSession`):
```typescript
// Replace:
supabase.from('agent_profiles').select('id').eq('email', userEmail).maybeSingle()

// With:
supabase.rpc('get_profile_id_by_email', { p_email: userEmail })
```

Then set `profileId` from `result.data` (which will be the UUID directly).

