

# Add Logistics Agents to Team Status Board (Under Email Support)

## What This Does

Logistics agents are currently falling into the "Other" category on the Team Status Board because the position-to-category mapping doesn't recognize "Logistics". This change maps them under **Email Support** so they appear alongside email support agents, sorted by their schedule as usual.

## Implementation

### File: `src/lib/teamStatusApi.ts`

One line addition in the `categorizeByPosition` function:

```
Current logic:
  if (positionLower === 'email support') return 'emailSupport';

Updated logic:
  if (positionLower === 'email support') return 'emailSupport';
  if (positionLower === 'logistics') return 'emailSupport';
```

That's it -- logistics agents will now appear under the "Email Support" category section on the board, still filtered by their actual schedule window.

## No Other Changes Needed

- No database changes
- No UI changes (they use the same StatusCard component)
- Their position will still display as "Logistics" on their individual card

