

## Fix: Independent Block Adjustments + Draggable Day-Off Blocks

### Problem 1: OT Reverts When Regular Is Adjusted
The pending overrides map uses `agentId:date` as its key. Since both OT and Regular share the same agent+date, adjusting Regular **overwrites** the OT entry. The OT adjustment is lost.

**Fix**: Change the key to include the block type: `agentId:date:blockType`. This allows multiple independent adjustments per agent per day (one for regular, one for OT, one for dayoff).

### Problem 2: Day Off Is Not an Adjustable Block
ShiftBlock explicitly excludes dayoff from being interactive. The user wants Day Off to be a draggable/resizable block so it can be shortened to accommodate overnight shifts extending into it.

**Fix**: Remove the `type !== 'dayoff'` exclusion from `isInteractive` in ShiftBlock, and add `'dayoff'` as a valid `block_type` in the pending overrides system.

---

### Technical Changes

#### File: `src/components/coverage-board/OverrideEditor.tsx`
- Update `PendingOverride.block_type` to include `'dayoff'`:
  ```
  block_type?: 'regular' | 'ot' | 'dayoff' | 'override';
  ```

#### File: `src/pages/CoverageBoard.tsx`

1. **Change pending override key** to include block type:
   - `handleApplyOverride`: key becomes `${override.agent_id}:${override.date}:${override.block_type || 'override'}`
   - `handleRemoveOverride`: update key lookups accordingly
   - `handleBlockAdjust`: include `'dayoff'` as a valid block type to store
   - Update `pendingCount`, `deleteCount` calculations and `editorPendingOverride` lookup for the new key format

2. **Handle dayoff in `handleBlockAdjust`**: when `blockType === 'dayoff'`, store it as `block_type: 'dayoff'`

#### File: `src/components/coverage-board/ShiftBlock.tsx`

1. **Make dayoff interactive**: change the `isInteractive` check from:
   ```
   editMode && type !== 'dayoff' && type !== 'empty'
   ```
   to:
   ```
   editMode && type !== 'empty'
   ```

2. **Remove dayoff/empty bypass** in the `effectiveStart`/`effectiveEnd` drag calculations so dayoff blocks respond to drag/resize

3. **Apply proper styling** for dayoff in drag mode (cursor, z-index)

#### File: `src/components/coverage-board/CoverageTimeline.tsx`

1. **Update pending override lookups** to use the new key format with block type:
   - For each day, check for pending overrides keyed by `agentId:date:regular`, `agentId:date:ot`, and `agentId:date:dayoff` independently
   - Apply each pending override only to its matching block type
   - This means multiple blocks per day can have independent pending adjustments

2. **Handle dayoff pending adjustments**: when a dayoff block has a pending adjustment, render it with the adjusted start/end times instead of the full 0-24 range

3. **Update the edit-mode overlay pending indicators** to check for any pending override across all block types for that agent+date

### Result
- Adjusting OT no longer erases the Regular adjustment (and vice versa)
- Day Off appears as a gray draggable/resizable block spanning the full day
- You can shrink the Day Off block to make room for an overnight shift extending into it
- All adjustments remain staged until "Save Changes" is clicked

