

## Make Group/SubGroup Headers Sticky on Horizontal Scroll

### Problem
When scrolling horizontally through the Coverage Board timeline, the group headers (e.g., "ZD1", "ZD2") and subgroup headers (e.g., "Hybrid Support", "Chat Support") scroll out of view. The agent name columns are already sticky, but these category labels are not.

### Solution
Update the `MainGroupHeader` and `SubGroupHeader` components in `GroupHeader.tsx` to remain visible when scrolling horizontally, matching the sticky behavior of the agent metadata columns.

Currently these headers use `col-span-full sticky left-0` which only pins them left but they get clipped or scroll with the content depending on the overflow container. We need to ensure they behave consistently as sticky elements within the scrollable timeline container.

### Technical Details

**File: `src/components/coverage-board/GroupHeader.tsx`**

Both `MainGroupHeader` and `SubGroupHeader` already have `sticky left-0` classes, which should pin them to the left during horizontal scroll. However, they may need:

1. A higher `z-index` to ensure they layer above timeline content (currently `z-10`, may need adjustment to stay above agent row sticky cells which are also `z-10`).
2. Explicit `min-width` or `width` styling to prevent them from collapsing when the grid scrolls.
3. Verify they render inside the scrollable `div` (they do -- they're inside the `overflow-auto` container in `CoverageTimeline.tsx`).

The fix will:
- Increase z-index on group headers to `z-20` so they layer above agent row sticky cells
- Add a solid background to prevent content bleeding through during scroll
- Ensure both headers have proper `position: sticky` and `left: 0` behavior within the grid's horizontal scroll

This is a small CSS-only change to `GroupHeader.tsx` -- no logic changes needed.

