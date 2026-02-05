

# Plan: Fix SubmissionDetailDialog Scrolling (Final Fix)

## Root Cause Identified

The current implementation has these issues:

1. **Nested flex containers**: Line 66 wraps everything in another `div className="flex flex-col h-full max-h-[90vh] overflow-hidden"` which breaks height propagation
2. **Missing viewport height enforcement**: The Radix ScrollArea's `[data-radix-scroll-area-viewport]` doesn't receive height context
3. **Padding on wrong element**: Some padding is applied in ways that break the height calculation

## Solution

Apply the exact fix as specified:

### Changes to `src/components/revalida/SubmissionDetailDialog.tsx`

**Current Structure (Broken):**
```tsx
<DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
  <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">  {/* ❌ Nested flex breaks height */}
    <div className="p-6 pb-0 space-y-4 shrink-0">...</div>
    <div className="flex-1 min-h-0 overflow-hidden">  {/* ❌ overflow-hidden blocks scroll */}
      <ScrollArea className="h-full">...</ScrollArea>
    </div>
  </div>
</DialogContent>
```

**Fixed Structure:**
```tsx
<DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden p-0">
  {/* Fixed Header Section */}
  <div className="shrink-0 p-6 space-y-4">
    <DialogHeader>...</DialogHeader>
    {/* Metadata / Score Summary */}
    <Separator />
  </div>

  {/* Scrollable Body */}
  <div className="flex-1 min-h-0">
    <ScrollArea className="h-full [&_[data-radix-scroll-area-viewport]]:h-full">
      <div className="p-6 pt-4 space-y-4">
        {/* Questions / Answers */}
      </div>
    </ScrollArea>
  </div>
</DialogContent>
```

### Key Changes

| What | Before | After |
|------|--------|-------|
| Nested flex wrapper | Present (line 66-67) | Removed |
| Header section | `p-6 pb-0` | `shrink-0 p-6` |
| Scroll wrapper | `overflow-hidden` | No overflow-hidden |
| ScrollArea | `h-full` only | `h-full [&_[data-radix-scroll-area-viewport]]:h-full` |
| Content padding | `p-6 pt-4` on inner div | Same (this is correct) |

### Mandatory Rules Enforced

- `DialogContent` is `flex flex-col` with `max-h-[90vh]`
- Header uses `shrink-0`
- Scroll container uses `flex-1 min-h-0` (NO `overflow-hidden`)
- ScrollArea has `h-full` AND viewport height enforcement via `[&_[data-radix-scroll-area-viewport]]:h-full`
- Padding is inside the scrollable content div, not on ScrollArea

### Fallback (if needed)

If Radix ScrollArea still fails after this fix, replace with:
```tsx
<div className="flex-1 min-h-0 overflow-y-auto p-6 pt-4 space-y-4">
  {/* Questions content */}
</div>
```

## Acceptance Criteria

- Dialog scrolls on mouse wheel and trackpad
- Scroll works on long content without expanding dialog height
- No body scrolling behind the dialog
- Works on desktop and mobile viewports

## File to Modify

| File | Action |
|------|--------|
| `src/components/revalida/SubmissionDetailDialog.tsx` | Restructure layout |

