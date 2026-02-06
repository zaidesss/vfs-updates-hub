

# Fix: Live Activity Feed Cropped at Bottom

## Problem Identified

The Live Activity Feed on the Team Status Board is cropped at the bottom because it uses a fixed height of `400px` that doesn't adapt to the available viewport space.

Looking at the current implementation:

| Issue | Location | Current Value |
|-------|----------|---------------|
| Fixed scroll height | `LiveActivityFeed.tsx` line 189 | `h-[400px]` |
| No viewport constraint | Card extends below visible area | N/A |

---

## Root Cause

**File: `src/components/team/LiveActivityFeed.tsx` (Line 189)**

```typescript
<ScrollArea className="h-[400px] px-4 pb-4">
```

The `400px` fixed height doesn't account for:
- The viewport height
- The card header height
- The position of the card on the page

When the Live Activity Feed has many entries, the card's content gets cropped because the fixed height cuts off entries, and the card itself may extend past the viewport bottom.

---

## Solution

Change the ScrollArea from a fixed height to a dynamic height that:
1. Uses `max-h-[calc(100vh-300px)]` to respect viewport bounds
2. Uses `min-h-[200px]` to ensure usability with few items
3. Keeps the Card's `h-full` but removes absolute height constraints

---

## Technical Changes

### File: `src/components/team/LiveActivityFeed.tsx`

**Line 189 - Change fixed height to dynamic viewport-based height:**

```typescript
// Before:
<ScrollArea className="h-[400px] px-4 pb-4">

// After:
<ScrollArea className="min-h-[200px] max-h-[calc(100vh-300px)] px-4 pb-4">
```

**Explanation:**
- `min-h-[200px]` - Ensures the feed is always at least 200px tall (shows ~3-4 entries)
- `max-h-[calc(100vh-300px)]` - Dynamically calculates max height based on viewport, leaving room for:
  - Header (64px)
  - Page title area (~80px)
  - Card header (~60px)
  - Bottom padding (~96px for mobile nav)

---

## Alternative Consideration

If the card should truly fill the remaining height of the right column, we could also add `flex-1` to make it grow within the parent container:

**Additional Change to TeamStatusBoard.tsx (Line 227):**

```typescript
// Before:
<div className="space-y-6">

// After:
<div className="space-y-6 flex flex-col">
```

And adjust the LiveActivityFeed Card:

```typescript
// Before:
<Card className={cn('h-full', className)}>

// After:
<Card className={cn('flex-1 flex flex-col min-h-0', className)}>
```

This approach would make the Live Activity Feed expand to fill all available vertical space in the right column.

---

## Summary

| File | Change |
|------|--------|
| `src/components/team/LiveActivityFeed.tsx` | Change `h-[400px]` to `min-h-[200px] max-h-[calc(100vh-300px)]` |

**Result:** The Live Activity Feed will dynamically size based on viewport height, preventing content from being cropped while still maintaining scrollability for long activity lists.

