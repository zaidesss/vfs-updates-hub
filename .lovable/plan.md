

## Fix: Batch Details Dialog Scroll Issue

**Problem:** The Batch Details popup (eye icon) doesn't allow scrolling through all questions. The dialog content is cut off.

**Root Cause:** In `BatchDetailDialog.tsx`, the `ScrollArea` component wraps the questions list, but the dialog's inner layout isn't properly constraining heights to allow the scroll area to activate. The `flex-1 min-h-0` container needs the ScrollArea to have an explicit height, and the viewport needs `overflow-y: auto`.

**Technical Details:**

File: `src/components/revalida/BatchDetailDialog.tsx`

1. Add `overflow-hidden` to the `DialogContent` and ensure `flex flex-col` is properly set with a fixed max height.
2. Ensure the scrollable container div has proper `overflow-auto` as a fallback, and that the `ScrollArea` component's viewport gets full height.

The fix is a small CSS adjustment to the scrollable section — replacing the `ScrollArea` with a simple `div` using `overflow-y-auto` (since the Radix ScrollArea can sometimes have viewport sizing issues in flex layouts), or ensuring the ScrollArea viewport gets proper styling.

**Approach:** Replace the `ScrollArea` wrapper with a plain `div` that has `overflow-y-auto` and proper flex constraints, which is more reliable in this flex dialog layout.

**Changes:**
- `src/components/revalida/BatchDetailDialog.tsx` — Change the scrollable questions section from `ScrollArea` to a simple `overflow-y-auto` div, removing the `ScrollArea` import if no longer needed.

