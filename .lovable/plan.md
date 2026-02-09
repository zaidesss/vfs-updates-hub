

# Sticky Headers and Horizontal Scrollbar for Ticket Logs and Master Directory

## Problem

When scrolling down through large tables in the Ticket Logs dashboards (ZD1/ZD2) and Master Directory, the date headers (or column headers) disappear, making it hard to know which column you're looking at. The horizontal scrollbar is also only visible at the very bottom of the table.

## Solution

### 1. TicketDashboard.tsx (affects both ZD1 and ZD2)

- Replace the current `ScrollArea` with a plain `div` that has `overflow: auto` and a **fixed max-height** (e.g., `max-h-[70vh]`), so the table scrolls both vertically and horizontally within a contained box.
- Make the `thead` rows sticky (`sticky top-0 z-20`) so the date row and channel-type icon row stay visible while scrolling down.
- The horizontal scrollbar will naturally stick to the bottom of the visible container (since it's overflow-auto on a fixed-height div).
- The "Agent" column already has `sticky left-0` -- just need to increase z-index on the header intersection cell to `z-30` so it stays above both sticky axes.

### 2. MasterDirectory.tsx

- The Master Directory **already has** sticky headers (`sticky top-0 z-20/z-30`) and a fixed-height scrollable container (`height: calc(100vh - 220px)`).
- The horizontal scrollbar is already sticky by virtue of the fixed-height `overflow-auto` container.
- **No changes needed** for Master Directory -- it already works correctly.

## Technical Details (TicketDashboard.tsx only)

**Current structure:**
```
ScrollArea > div.min-w-max > table > thead (not sticky)
```

**New structure:**
```
div.overflow-auto.max-h-[70vh] > div.min-w-max > table > thead (sticky top-0)
```

Changes:
1. Replace `ScrollArea` + `ScrollBar` with a plain `div` using `overflow-auto max-h-[70vh] data-table-scroll` (reuses existing styled scrollbar CSS)
2. Add `sticky top-0 z-20 bg-muted/50` to the first header `tr` (dates row)
3. Add `sticky top-[37px] z-20` to the second header `tr` (icons row) -- offset by the height of the first row
4. Update the header corner cells (Agent / Type) to `z-30` so they stay on top at the intersection of sticky left + sticky top
5. Add proper background colors to all sticky header cells so content doesn't bleed through

