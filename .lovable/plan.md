

## Make Day Off Render as a Visible, Distinct Block

### The Real Problem
The Day Off block IS being rendered as a `ShiftBlock` with `type === 'dayoff'`, and `isInteractive` does include it. However, it doesn't LOOK like a block because:

1. It uses `top-0 bottom-0` (flush edges, no gap) instead of `top-1 bottom-1 rounded` like regular/OT blocks
2. Its color `bg-zinc-500/50 border-zinc-500/60` is too transparent and blends into the dark row background (`bg-zinc-800/50`), making it look like a background label rather than a distinct draggable block
3. There's no visual affordance (like rounded corners or contrast) telling the user "this is a block you can grab"

### Fix (Single File Change)

**File: `src/components/coverage-board/ShiftBlock.tsx`**

1. **Give dayoff blocks the same block shape as regular/OT**: Change the class logic so dayoff uses `top-1 bottom-1 rounded` (only `empty` stays flush):
   ```
   // Before:
   type === 'dayoff' || type === 'empty' ? 'top-0 bottom-0' : 'top-1 bottom-1 rounded'
   
   // After:
   type === 'empty' ? 'top-0 bottom-0' : 'top-1 bottom-1 rounded'
   ```

2. **Make dayoff color more visible/distinct**: Update `TYPE_STYLES.dayoff` from the near-invisible `bg-zinc-500/50` to a more solid, distinguishable style:
   ```
   dayoff: 'bg-zinc-400/70 border-zinc-400',
   ```
   This gives it a lighter gray that clearly stands out from the dark row background, making it obvious it's a block, not a background.

### Result
- Day Off blocks will have rounded corners, vertical margin, and a visible contrasting color -- visually identical in shape to Regular and OT blocks
- Users will see a distinct gray block spanning the full day that they can grab and resize
- No logic changes needed; the interactivity and drag/resize already work correctly

