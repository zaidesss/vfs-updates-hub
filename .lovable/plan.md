

## Fix Group/SubGroup Headers Sticky Behavior

### Problem
The `MainGroupHeader` and `SubGroupHeader` components are not sticking during horizontal scroll because they sit inside plain `<div>` wrappers that don't span the full scrollable width (`min-w-[5000px]`). The `sticky left-0` only works when the element's parent is wider than the viewport -- but the parent divs are just regular block elements that collapse to viewport width.

### Solution
Wrap each header's visible content in a two-layer structure:
1. **Outer div**: spans the full scrollable width (`min-w-[5000px]`) so the sticky context works
2. **Inner div**: has `sticky left-0` with the label content, solid background, and proper z-index

### Technical Details

**File: `src/components/coverage-board/GroupHeader.tsx`**

Update both components to use this structure:

**MainGroupHeader**:
- Outer: `min-w-[5000px]` + border/background styles
- Inner: `sticky left-0 z-20` with the label text, solid `bg-primary/10` background

**SubGroupHeader**:
- Outer: `min-w-[5000px]` + border styles  
- Inner: `sticky left-0 z-20` with the sublabel text, solid `bg-muted` background

This ensures the headers scroll vertically with the content but stay pinned to the left edge during horizontal scroll, matching the agent name columns.

