

## Fix: Pending Drag/Resize Changes Not Visually Reflected

### Root Cause
When you drag or resize a block, `handleBlockAdjust` correctly adds the change to `pendingOverrides` in `CoverageBoard.tsx`. However, the `allBlocks` computation in `AgentRow` (inside `CoverageTimeline.tsx`) only reads from `overrideMap` (DB-saved overrides). It never checks `pendingOverrides`, so the block snaps back to its original position after releasing the mouse.

### Solution
Modify the `allBlocks` computation in `AgentRow` to merge `pendingOverrides` into the override lookup before computing blocks. If a pending override exists for a given agent+date, it should be treated as an effective override for rendering purposes.

### Technical Changes

**File: `src/components/coverage-board/CoverageTimeline.tsx`**

In the `allBlocks` useMemo inside `AgentRow`:

1. For each day, after looking up the DB override, also check `pendingOverrides` for a matching `agentId:dateStr` key
2. If a pending override exists (and is not marked `_delete`), construct a synthetic `CoverageOverride` object from its `override_start` and `override_end` values and use that instead of the DB override
3. If a pending override is marked `_delete`, treat it as if no override exists (pass `undefined` to `getEffectiveBlocks`)
4. Add `pendingOverrides` to the `useMemo` dependency array

The key change in pseudocode:
```
for each day:
  let override = overrideMap.get(key)  // existing DB override
  const pending = pendingOverrides?.get(key)
  if (pending && !pending._delete) {
    // Use pending as the override for rendering
    override = { override_start: pending.override_start, override_end: pending.override_end, ... }
  } else if (pending?._delete) {
    override = undefined  // Remove override visually
  }
  getEffectiveBlocks(agent, dayOff, override, leave, showEffective)
```

This ensures drag/resize changes are immediately visible on the timeline without touching the database. Only the "Save Changes" button persists them.

