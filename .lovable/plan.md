
## Fix: Sunday Overnight Shifts Not Showing Spillover on Monday

### Problem
Agents with Sunday overnight shifts (e.g., 10:00 PM - 4:30 AM) have their shift blocks clamped at midnight on the Coverage Board. The portion that extends into Monday (12:00 AM - 4:30 AM) is invisible. OT blocks work because they are stored as separate daytime schedules (e.g., 4:30 AM - 5:30 AM) on each day.

### Root Cause
In `src/lib/coverageBoardApi.ts`, the `splitOvernight()` function (line 292) handles overnight shifts by extending past hour 24. But for Sunday (dayOffset=6, the last day in the grid), it clamps to `endHour: 24` since there is no "day 7" column to extend into. The Monday column (dayOffset=0) only renders Monday's own schedule and never checks if the previous Sunday had a spillover.

### Solution
Add spillover block generation in the `AgentRow` component (`CoverageTimeline.tsx`). After iterating through all 7 days (Mon-Sun), check if Sunday's schedule is an overnight shift. If so, create an additional "spillover" block on Monday (dayOffset=0) from hour 0 to the overnight end time.

### Technical Changes

**File: `src/components/coverage-board/CoverageTimeline.tsx`** (in the `allBlocks` useMemo, around line 278-366)

After the main day loop (lines 285-349), add logic to detect Sunday overnight spillover:

1. After generating all blocks for days 0-6, look at Sunday's (dayOffset=6) schedule
2. Parse the Sunday schedule. If it is an overnight shift (end time < start time), calculate the spillover hours
3. Create a new block on Monday (dayOffset=0) from startHour=0 to endHour=spilloverHours, with the same type (regular) and appropriate labels
4. Do the same check for Sunday OT if applicable
5. The spillover block should be rendered with slightly reduced opacity or a visual indicator to show it originates from the previous day

This approach keeps `splitOvernight()` unchanged (Sunday still clamps at 24) and adds the spillover as a separate block on Monday's column. This is consistent with how the grid already works -- blocks are positioned by dayOffset and hour offsets.

### Implementation Details

```text
allBlocks useMemo (after day loop ends):

1. Find Sunday blocks where type is 'regular' or 'ot'
2. For each, get the agent's Sunday schedule (from profile or override)
3. Parse start/end times
4. If overnight (end < start), spillover = end hours
5. Push new block: { dayOffset: 0, startHour: 0, endHour: spillover, type, labels }
```

### Edge Cases
- If Monday already has a schedule starting at or before the spillover end, both blocks will render (overlapping is acceptable and already handled visually by z-index)
- If Sunday has a coverage override that changes the overnight shift, the spillover should reflect the override, not the base schedule
- The spillover block should not be draggable/editable in edit mode (it is derived, not a standalone schedule)
