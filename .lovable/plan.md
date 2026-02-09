

# Team Scorecard: Show Same-Team Scores for Regular Users

## What Changes

Regular (non-admin) users will see scorecard data for all agents under their same team lead, instead of only their own scores. The Team Lead filter will be auto-filled and locked (not editable) for regular users.

**Example:** If you're under Jaeran Sanchez, you'll see scores for all agents under Jaeran -- but not agents under Meryl or Juno.

Admins and HR users will continue to see all agents with the Team Lead filter fully customizable, no changes for them.

## What the Regular User View Looks Like

- **Team Lead filter**: Shows their team lead name, grayed out / disabled (not a dropdown)
- **All other filters** (Year, Month, Week, Support Type, Search, Score, Sort): Still fully functional
- **Admin-only buttons** (Save Scorecard, Save Changes, Refresh Metrics): Already hidden for regular users via `canSave` checks -- no change needed

## Technical Details

### File: `src/pages/TeamScorecard.tsx`

**1. Detect user's team lead on load**

Using `AGENT_DIRECTORY` (already imported), look up the current user's email to find their `teamLead` value:

```typescript
const userTeamLead = useMemo(() => {
  if (isAdmin) return null; // Admins see everything
  const email = user?.email?.toLowerCase().trim();
  if (!email) return null;
  const info = AGENT_DIRECTORY[email];
  return info?.teamLead || null;
}, [user?.email, isAdmin]);
```

**2. Auto-set and lock team lead filter for regular users**

- Initialize `teamLeadFilter` to the user's team lead (if regular user)
- When `userTeamLead` is set, override the filter value and don't allow changes
- In the filter UI, render the Team Lead selector as disabled with the auto-filled value

**3. Filter scorecards by team lead (client-side)**

The existing `filteredScorecards` logic already filters by `teamLeadFilter`. Since we auto-set it for regular users, the filtering happens automatically -- no additional code needed for the data filtering itself.

**4. Team Lead filter UI change**

For regular users: replace the dropdown with a disabled select showing their team lead name. For admins: keep the current dropdown unchanged.

```tsx
{/* Team Lead Filter */}
<div className="flex flex-col gap-2">
  <label className="...">Team Lead</label>
  {userTeamLead ? (
    <Select value={userTeamLead} disabled>
      <SelectTrigger className="w-48" disabled>
        <SelectValue>{userTeamLead}</SelectValue>
      </SelectTrigger>
    </Select>
  ) : (
    // Existing admin dropdown unchanged
  )}
</div>
```

### No Database Changes

All filtering happens client-side using the existing `AGENT_DIRECTORY` lookup and the already-present team lead filter logic. The RPC returns all agents, and the frontend filters to the user's team.

### No RLS Changes

The scorecard data access is already controlled by the `SECURITY DEFINER` RPC function. Regular users can call the RPC and receive data -- we just filter what they see in the UI.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/TeamScorecard.tsx` | Add `userTeamLead` memo, auto-set filter, disable Team Lead dropdown for regular users |

