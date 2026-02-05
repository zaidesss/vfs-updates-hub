
## Problem Analysis

The `SubmissionDetailDialog` cannot scroll because:

1. **Layout Issue**: The `DialogContent` uses `grid` layout (from shadcn default) which conflicts with the `flex flex-col` and `max-h-[90vh]` constraints added to the component.

2. **Height Distribution**: Even with `max-h-[90vh]`, the flex container doesn't properly distribute the remaining height to the `ScrollArea` component because the `DialogContent` grid layout prevents proper flex behavior.

3. **Missing Height Constraint**: The `ScrollArea` on line 113 needs an explicit height or flex-grow to take up remaining space, but the grid parent prevents this from working.

## Solution

Update the `SubmissionDetailDialog` component to:

1. **Remove conflicting classes**: Remove `flex flex-col` from `DialogContent` since it conflicts with the grid layout
2. **Restructure the layout**: 
   - Keep header sections (DialogHeader, Metadata, Score Summary) as non-scrolling elements
   - Wrap the `ScrollArea` with proper height constraints using `flex-1 min-h-0` 
   - Ensure the outer dialog container is a proper flex column
3. **Properly configure ScrollArea**: The `ScrollArea` needs to take up all remaining vertical space with `flex-1` and `min-h-0` to allow scrolling

## Implementation Approach

Modify `src/components/revalida/SubmissionDetailDialog.tsx`:
- Change the dialog structure to use `flex flex-col` on the inner wrapper (not DialogContent)
- Apply `flex-1 min-h-0` to the ScrollArea container to enable scrolling
- Ensure DialogHeader, metadata, and score sections remain fixed at the top
- The layout will then be: Fixed header → Fixed metadata/score → Scrollable questions area

This matches the same pattern used successfully in other scrollable dialogs in the codebase (e.g., GradingDialog).

