

## Fix: Shift Blocks Not Draggable Due to Overlay Z-Index Conflict

### Root Cause
In `CoverageTimeline.tsx`, the **day click targets** (invisible overlay divs) are rendered with `z-10` and cover the entire day column. The **ShiftBlocks** have no explicit z-index, so they sit below these overlays. Every click intended for a shift block is intercepted by the overlay, which opens the Override Schedule dialog instead.

### Solution
Adjust the z-index layering so ShiftBlocks in edit mode sit **above** the day click targets, while empty timeline areas still open the Override dialog.

### File: `src/components/coverage-board/CoverageTimeline.tsx`

1. **Lower the day click target z-index** from `z-10` to `z-[5]` -- these should be the bottom interactive layer
2. **Add `z-[6]` to ShiftBlocks** when in edit mode -- so they float above the click targets and receive mouse events directly
3. **Add `e.stopPropagation()`** in ShiftBlock's `onMouseDown` handler (already present in the code) to prevent the click from bubbling to the day overlay

### File: `src/components/coverage-board/ShiftBlock.tsx`

4. **Add an `onClick` handler with `e.stopPropagation()`** to prevent click events (after a non-drag interaction) from bubbling up to the day overlay and opening the dialog
5. **Ensure the block has a higher z-index** when `editMode` is true and the block type is interactive (not dayoff/empty)

### Result
- Clicking **on a shift block** in Edit Mode: drag/resize works as intended
- Clicking **on empty timeline space** in Edit Mode: Override Schedule dialog opens (existing behavior)
- Non-edit mode: no change in behavior

### Technical Details

**CoverageTimeline.tsx -- day click targets:**
```
// Change z-10 to z-[5]
className="absolute top-0 bottom-0 z-[5] cursor-pointer ..."
```

**ShiftBlock.tsx -- interactive blocks in edit mode:**
```
// Add z-[6] when interactive, and onClick stopPropagation
className={cn(
  ...,
  isInteractive && 'z-[6]',
)}
onClick={(e) => { if (isInteractive) e.stopPropagation(); }}
```
