
# Fix Team Status Board Access for Regular Agents

## Problem Identified

The Team Status Board works for Admin/HR/Super Admin but **fails for regular agents** because of restrictive RLS policies:

### Current RLS Policies

| Table | Policy for Agents | Result |
|-------|------------------|--------|
| `profile_status` | ✅ Can view ALL records | Works |
| `agent_profiles` | ❌ Can only view OWN profile | **Blocks seeing other team members** |
| `agent_directory` | ❌ Can only view OWN record | **Blocks seeing others' schedules** |

### Data Flow Issue

```text
Step 1: Fetch profile_status (not LOGGED_OUT) → ✅ Returns all 5 logged-in users
Step 2: Fetch agent_profiles for those 5 IDs → ❌ Returns only 1 (agent's own profile)
Step 3: Result: Agent only sees themselves on the board
```

---

## Additional Issues Found

1. **Minor React Warning**: `StatusCard` component has a ref warning that should be addressed
2. **Schedule visibility**: Even if we fix the profiles issue, agents won't see others' shift/break schedules without fixing `agent_directory` RLS

---

## Solution

Add new RLS policies to allow **all authenticated users** to read basic info from `agent_profiles` and `agent_directory` for the Team Status Board.

### Option A: Add Global SELECT Policies (Simple)

Add policies that allow all authenticated users to SELECT from both tables. This approach is simple but may expose more data than necessary.

### Option B: Create a Database View (Recommended)

Create a secure view that only exposes the specific fields needed for the Team Status Board, with a simpler RLS policy.

**I recommend Option A** as these tables don't contain highly sensitive data (no passwords, tokens, or PII beyond names/emails which are visible on the board anyway).

---

## Implementation Steps

### Step 1: Add RLS Policy for `agent_profiles`

Allow all authenticated users to SELECT from `agent_profiles`:

```sql
CREATE POLICY "Authenticated users can view all agent_profiles for team status"
ON agent_profiles
FOR SELECT TO authenticated
USING (true);
```

**Fields exposed**: id, email, full_name, position, start_date, etc. These are already visible to team members in other parts of the app.

### Step 2: Add RLS Policy for `agent_directory`

Allow all authenticated users to SELECT schedule info from `agent_directory`:

```sql
CREATE POLICY "Authenticated users can view all agent_directory for team status"
ON agent_directory
FOR SELECT TO authenticated
USING (true);
```

**Fields exposed**: email, weekday_schedule, break_schedule, etc. Schedule visibility is expected for team coordination.

### Step 3: Fix React Warning in StatusCard

The `StatusCard` component has a ref-forwarding warning. Update it to use proper forwarding or remove the ref usage.

---

## Files to Modify

| File | Change |
|------|--------|
| Database Migration | Add 2 new RLS policies for global SELECT |
| `src/components/team-status/StatusCard.tsx` | Fix React ref warning |

---

## Security Considerations

- **No sensitive data exposed**: `agent_profiles` and `agent_directory` contain team directory information that's appropriate for all team members to see
- **Write operations unchanged**: INSERT, UPDATE, DELETE policies remain restrictive
- **Existing functionality**: Other parts of the app (like Master Directory) may already expect team members to see each other's basic info

---

## Summary

| Action | Purpose |
|--------|---------|
| Add `agent_profiles` global SELECT policy | Allow agents to see Team Leads/Tech Support names & positions |
| Add `agent_directory` global SELECT policy | Allow agents to see others' shift/break schedules |
| Fix StatusCard ref warning | Clean React warning in console |
