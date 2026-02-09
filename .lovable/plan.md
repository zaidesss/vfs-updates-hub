

# Add "Per Team Lead" Filter to Team Scorecard

## What This Does

Adds a new "Team Lead" dropdown filter to the Scorecard filters row, allowing you to view only agents under a specific team lead (e.g., Jaeran Sanchez, Meryl Jean Iman, Juno Dianne Garciano, Kristin Joann Argao).

## How It Works

The filter uses the existing `AGENT_DIRECTORY` data (which already maps each agent to their `teamLead`) to match scorecard agents by email. No database changes needed.

## Implementation

### File: `src/pages/TeamScorecard.tsx`

1. **Import** `AGENT_DIRECTORY` from `src/lib/agentDirectory.ts`
2. **Add state**: `const [teamLeadFilter, setTeamLeadFilter] = useState<string>('all')`
3. **Derive unique team leads** from the current scorecard data (so only relevant team leads appear)
4. **Add filter dropdown** in the filters row (between Support Type and Search), labeled "Team Lead"
5. **Apply filter** in the `filteredScorecards` useMemo -- match agent email against `AGENT_DIRECTORY` to check their `teamLead`
6. **Include in "Clear" logic** -- reset team lead filter when year/month/week changes

### UI Placement

The new dropdown goes in Row 2 of the filters card, right after "Support Type":

```text
Support Type | Team Lead | Search | Score | Sort by
```

### Filter Logic

```text
if teamLeadFilter !== 'all':
  lookup agent email in AGENT_DIRECTORY
  keep only agents whose teamLead matches the selected value
```

## Considerations

- Agents not in `AGENT_DIRECTORY` (e.g., new hires not yet added) will show under all team lead filters but won't match any specific team lead filter. Should we show them anyway, or hide them?
- Team leads themselves appear in the scorecard -- they will show under their own filter (since their `teamLead` is typically "Patrick Argao" or themselves).

No database or edge function changes required.

