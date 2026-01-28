

## Fix Dashboard Access for All Agents

### Problem

Currently, the Dashboard link only appears if a user has an entry in `agent_directory`. However, `agent_profiles` is the source of truth for agent identity. Most agents have a profile in `agent_profiles` but may not yet have operational data in `agent_directory`.

### Data Model Clarification

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `agent_profiles` | Agent identity (source of truth for who is an agent) | `id`, `email`, `full_name` |
| `agent_directory` | Operational data (schedules, quota, etc.) | `email` (linked), operational fields |

### Solution

Change the Dashboard system to use `agent_profiles.id` as the primary key instead of `agent_directory.id`.

---

### Changes Required

#### File 1: `src/components/Layout.tsx`

**Change the profile lookup to use `agent_profiles` instead of `agent_directory`**

Current code (line 51-59):
```typescript
const { data } = await supabase
  .from('agent_directory')
  .select('id')
  .eq('email', user.email)
  .maybeSingle();
```

New code:
```typescript
const { data } = await supabase
  .from('agent_profiles')
  .select('id')
  .eq('email', user.email)
  .maybeSingle();
```

---

#### File 2: `src/lib/agentDashboardApi.ts`

**Update `fetchDashboardProfile` to:**
1. First fetch from `agent_profiles` using the profile ID to get `email` and `full_name`
2. Then fetch operational data from `agent_directory` using the email

Update the `DashboardProfile` interface and function:

```typescript
export interface DashboardProfile {
  id: string;                    // from agent_profiles
  email: string;                 // from agent_profiles
  full_name: string | null;      // from agent_profiles
  agent_name: string | null;     // from agent_directory
  zendesk_instance: string | null;
  support_account: string | null;
  support_type: string | null;
  ticket_assignment_view_id: string | null;
  break_schedule: string | null;
  quota: number | null;
  // ... schedule fields
}

export async function fetchDashboardProfile(profileId: string) {
  // 1. Fetch from agent_profiles (identity)
  const { data: profile } = await supabase
    .from('agent_profiles')
    .select('id, email, full_name')
    .eq('id', profileId)
    .single();

  // 2. Fetch from agent_directory (operational data)
  const { data: directory } = await supabase
    .from('agent_directory')
    .select('*')
    .eq('email', profile.email)
    .maybeSingle();

  // 3. Merge and return
  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    agent_name: directory?.agent_name || profile.full_name,
    zendesk_instance: directory?.zendesk_instance || null,
    // ... other fields with defaults
  };
}
```

---

#### File 3: `src/pages/AgentDashboard.tsx`

**Update access control check to use `agent_profiles`**

Current code checks `profile.email === user?.email` where `profile` comes from `agent_directory`.

After the API change, `profile` will come from `agent_profiles`, so the same check will work correctly.

---

#### File 4: `src/components/dashboard/ProfileHeader.tsx`

**Use `full_name` as fallback for display name**

Update to display `profile.full_name || profile.agent_name || profile.email`

---

#### File 5: `src/pages/MasterDirectory.tsx`

**Update dashboard link to use `agent_profiles.id` instead of `agent_directory.id`**

The MasterDirectory already merges data from both tables. We need to ensure the link uses the `agent_profiles` ID. However, since the current merge uses `agent_directory.id` as the `id` field (line 206), we need to:

1. Add `profile_id` (from agent_profiles) to the DirectoryEntry interface
2. Update the merge to include this field
3. Use `profile_id` for the dashboard link

---

#### File 6: `src/lib/masterDirectoryApi.ts`

**Add `profile_id` to DirectoryEntry interface and fetch**

```typescript
export interface DirectoryEntry {
  id: string;           // agent_directory.id (for save operations)
  profile_id: string;   // agent_profiles.id (for dashboard link)
  // ... rest of fields
}
```

Update the fetch to include `id` from agent_profiles:
```typescript
const { data: profiles } = await supabase
  .from('agent_profiles')
  .select('id, email, full_name, position, team_lead');

// In merge:
return {
  profile_id: profile.id,  // Use for dashboard link
  id: dirEntry?.id || '',  // Keep for save operations
  // ...
}
```

---

### Database Considerations

**No database changes required.** Both tables already exist and are linked by email.

The `profile_status` and `profile_events` tables reference `agent_directory.id` via `profile_id`. We have two options:

**Option A: Update references to use `agent_profiles.id`**
- Requires migration to update foreign key
- Cleaner long-term

**Option B: Keep as-is, create directory entry on first status change**
- When a user clicks a status button and no `agent_directory` entry exists, auto-create one
- No migration needed
- Simpler implementation

I recommend **Option B** for simplicity.

---

### Updated RLS Policies for `profile_status` and `profile_events`

The current RLS policies check against `agent_directory.id`. If we keep the current structure (Option B), these policies work fine. When an agent accesses their dashboard for the first time and clicks a status button, an `agent_directory` entry will be created for them.

---

### Summary of Files to Modify

| File | Change |
|------|--------|
| `src/components/Layout.tsx` | Query `agent_profiles` instead of `agent_directory` |
| `src/lib/agentDashboardApi.ts` | Fetch from `agent_profiles` + join with `agent_directory` |
| `src/lib/masterDirectoryApi.ts` | Add `profile_id` from `agent_profiles` to DirectoryEntry |
| `src/pages/MasterDirectory.tsx` | Use `profile_id` for dashboard link |
| `src/components/dashboard/ProfileHeader.tsx` | Use `full_name` as display name fallback |
| `src/pages/AgentDashboard.tsx` | Minor updates for new data structure |

