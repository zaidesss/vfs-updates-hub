
## Problem Analysis

The current `SubmissionDetailDialog` uses Radix's `<ScrollArea>` component (line 117) with the viewport height selector, but it still doesn't scroll. This is because:

1. **Radix ScrollArea Limitations in Portaled Dialogs**: The Radix component's internal viewport calculation fails when nested inside a portaled dialog with flex constraints
2. **Height Context Loss**: Even with `h-full [&_[data-radix-scroll-area-viewport]]:h-full`, the viewport doesn't receive a calculable height
3. **Native Solution Required**: A simple native `overflow-y-auto` container is guaranteed to work because it uses browser-native scrolling

## Solution

Replace the Radix `ScrollArea` with a native scroll container on lines 116-204:

**Current (Broken) - Lines 116-204:**
```tsx
<div className="flex-1 min-h-0">
  <ScrollArea className="h-full [&_[data-radix-scroll-area-viewport]]:h-full">
    <div className="p-6 pt-4 space-y-4">
      {orderedQuestions.map(...)}
    </div>
  </ScrollArea>
</div>
```

**Fixed (Native Scroll) - Lines 116-204:**
```tsx
<div className="flex-1 min-h-0 overflow-y-auto p-6 pt-4">
  <div className="space-y-4">
    {orderedQuestions.map(...)}
  </div>
</div>
```

## Key Changes

1. **Remove Radix ScrollArea**: Delete the `<ScrollArea>` wrapper completely (line 117)
2. **Apply Native Scroll**: Add `overflow-y-auto` directly to the outer container (line 116)
3. **Move Padding**: Move `p-6 pt-4` from the inner div to the scroll container
4. **Height Setup**: Keep `flex-1 min-h-0` on the outer container to ensure it has a constrained height

## Why This Works

- `flex-1 min-h-0` ensures the container takes remaining vertical space and can constrain height
- `overflow-y-auto` enables native browser scrolling when content overflows
- Padding on the scroll container prevents content from reaching the edges
- `DialogContent` with `h-[90vh]` provides the height constraint for overflow to trigger

## Structural Layout After Fix

```
DialogContent (h-[90vh] flex flex-col overflow-hidden)
├── Fixed Header (shrink-0 p-6)
│   ├── DialogHeader
│   ├── Metadata
│   ├── Score Summary
│   └── Separator
└── Scrollable Body (flex-1 min-h-0 overflow-y-auto p-6 pt-4)
    └── Questions Container (space-y-4)
        └── Question Cards (mapped)
```

## File to Modify

| File | Lines | Action |
|------|-------|--------|
| `src/components/revalida/SubmissionDetailDialog.tsx` | 116-204 | Replace Radix ScrollArea with native `overflow-y-auto` container |

## Also Need to Verify

- Remove the unused `ScrollArea` import from line 4 (optional cleanup, but recommended)
- Ensure `DialogContent` already has `h-[90vh]` class (it does on line 65)

## Acceptance Criteria

✓ Eye icon opens dialog with scrollable questions section  
✓ Scrollbar appears when content exceeds viewport  
✓ Mouse wheel and trackpad scrolling works  
✓ Dialog doesn't grow beyond viewport height  
✓ Header remains fixed at top  
✓ No visual regression in spacing or layout
