

## Implementation Plan

### File: `src/components/dashboard/NextShiftDialog.tsx` (rewrite)

Two fixes in one pass:

1. **Fix infinite re-render**: Remove `now` from `useEffect` dependency array. Capture the current date once via `useRef` when `open` transitions to `true`, so the fetch runs exactly once per dialog open.

2. **Add X close button**: Replace `AlertDialog` with `Dialog` + `DialogContent`/`DialogHeader`/`DialogFooter` from `@/components/ui/dialog`. The Dialog component has a built-in X button that calls `onOpenChange(false)`, returning the agent to the dashboard without logging out. The "I Acknowledge" button still calls `onAcknowledge` to finalize logout.

No changes needed to `StatusButtons.tsx` or any other file — the props interface stays the same.

