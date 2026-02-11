

## Fix Block Disappearing, Allow Cross-Day, and Add Day-Off Conflict Detection

### Overview
Three interconnected issues to resolve:
1. Dragging/resizing one block (Regular or OT) causes the other to disappear
2. Blocks cannot extend past midnight into the next day
3. Day-off blocks should visually conflict with blocks that extend into them

---

### Problem Analysis

**Why blocks disappear**: When you drag a Regular block, `handleBlockAdjust` creates a pending override keyed by `agentId:date`. In the rendering logic, any pending override fully replaces the day's schedule via `getEffectiveBlocks` (which treats overrides as a single replacement block). So the OT block vanishes.

**Why blocks can't cross days**: `ShiftBlock.tsx` clamps `effectiveEnd` to `HOURS_PER_DAY` (24), preventing extension past midnight.

**Day-off conflict**: Currently day-off blocks are full-width background fills. A block dragged into the next day should visually overlap and show a conflict indicator if that next day is a day off.

---

### Technical Changes

#### Step 1: Add `block_type` to PendingOverride

**File: `src/components/coverage-board/OverrideEditor.tsx`**
- Add `block_type?: 'regular' | 'ot' | 'override'` to the `PendingOverride` interface

#### Step 2: Pass block type through the adjustment chain

**File: `src/components/coverage-board/CoverageTimeline.tsx`**
- Update `onBlockAdjust` callback signature to include block type: `onBlockAdjust(agent, dayOffset, newStartHour, newEndHour, blockType)`
- In the `ShiftBlock` render loop, pass `block.type` through the callback
- Update `CoverageTimelineProps` interface accordingly

**File: `src/pages/CoverageBoard.tsx`**
- Update `handleBlockAdjust` to accept and store the `blockType` parameter in the pending override
- Handle overnight wrapping: if `newEndHour > 24`, convert the end label using `decimalToTimeLabel(newEndHour - 24)` so stored times are correct (e.g., 26.0 hours becomes "2:00 AM")

#### Step 3: Selective merge in rendering (fix disappearing blocks)

**File: `src/components/coverage-board/CoverageTimeline.tsx` (AgentRow `allBlocks` computation)**

Instead of replacing the entire day when a typed pending override exists:
- If `pending.block_type === 'regular'`: compute base schedule normally but replace only the regular block's start/end with pending values; keep OT block from base schedule
- If `pending.block_type === 'ot'`: keep the regular block from base schedule; replace only the OT block's start/end with pending values
- If `pending.block_type === 'override'` or no type: use existing full-replacement behavior (for manual dialog overrides)

This means the `allBlocks` loop will:
1. Always compute base blocks (regular + OT) via `getEffectiveBlocks` without override
2. Then apply any DB override on top
3. Then selectively patch individual blocks based on typed pending overrides

#### Step 4: Remove 24-hour clamp (allow cross-day)

**File: `src/components/coverage-board/ShiftBlock.tsx`**
- In `effectiveEnd` calculation for drag mode: allow the new end to extend up to `HOURS_PER_DAY * 2` (48) instead of clamping at `HOURS_PER_DAY`, except on Sunday (dayOffset 6) where it stays clamped at 24
- In resize-right mode: same change, allow extending past 24
- Keep `effectiveStart` clamped at 0 minimum

#### Step 5: Day-off conflict detection

**File: `src/components/coverage-board/CoverageTimeline.tsx`**
- In `AgentRow`, when rendering blocks, check if a block's `endHour > 24` and the next day (dayOffset + 1) is a day off for the agent
- If so, add a `hasConflict: true` flag to the block data

**File: `src/components/coverage-board/ShiftBlock.tsx`**
- Add `hasConflict?: boolean` prop
- When `hasConflict` is true, render a red/orange pulsing border or a warning indicator on the block
- Update the tooltip to show "Conflicts with Day Off on [next day]"

---

### Implementation Order
1. Add `block_type` to `PendingOverride` interface
2. Update callback chain to pass block type (Timeline -> CoverageBoard)
3. Rewrite `allBlocks` merge logic for selective per-block-type patching
4. Remove 24-hour end clamp in ShiftBlock drag/resize
5. Add day-off conflict detection and visual indicator

