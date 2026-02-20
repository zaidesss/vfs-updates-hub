

## Add Team Lead Filter to Manage Agent Profiles

### What Changes

Add a "Team Lead" dropdown filter to the agent list in the Manage Profiles page. When a Team Lead logs in and views All Bios, the list automatically filters to show only their agents. HR and Super Admin roles see all agents by default (no auto-filter).

### How It Works

1. On page load, check if the logged-in user is a Team Lead (using `getAgentInfoByEmail` from `agentDirectory.ts` -- if their `position === 'Team Lead'`, they are one)
2. If they are a Team Lead, auto-set the filter to their name (from the directory)
3. Show a "Team Lead" dropdown filter above or next to the search bar, populated with all unique team leads via `getUniqueTeamLeads()`
4. Include an "All" option so team leads can clear the filter and browse everyone
5. HR (`isHR`) and Super Admin (`isSuperAdmin`) skip the auto-filter -- they see all agents by default

### Implementation

**File: `src/pages/ManageProfiles.tsx`**

- Import `getAgentInfoByEmail` and `getUniqueTeamLeads` from `@/lib/agentDirectory`
- Add state: `teamLeadFilter` (string, defaults to `''` meaning "All")
- In a `useEffect`, check if the current user is a Team Lead and not HR/Super Admin. If so, set `teamLeadFilter` to their name
- Update `filteredUsers` to also filter by `team_lead` field on the profile when `teamLeadFilter` is set
- Add a Select dropdown in the `ProfilesGrid` component (next to the search input) for choosing the team lead filter
- Pass the filter state and setter as new props to `ProfilesGrid`

### What the User Sees

- **Team Lead user**: Opens All Bios and sees only their team members listed. A "Team Lead" dropdown shows their name pre-selected. They can switch to "All" to see everyone.
- **HR / Super Admin user**: Opens All Bios and sees all agents. The dropdown defaults to "All". They can filter by any team lead if needed.

### Technical Details

The filter matches `user.profile?.team_lead` against the selected team lead name. The agent directory lookup uses the logged-in user's email to determine if they are a Team Lead and what their display name is. No database changes are needed -- this is purely a frontend filter using existing profile data.

