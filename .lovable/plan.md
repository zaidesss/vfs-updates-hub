

## Fix: Grading Dialog - Agent Response Text Overflow

### Problem
In the Grade Submission dialog, long agent responses expand indefinitely, pushing the grading inputs (Points Awarded, Feedback) and the Save Grade button below the visible area. The response container has no height limit or scrollbar.

### Solution
Add a max-height and vertical scroll to the "Agent's Response" container so long text becomes scrollable while keeping the grading inputs always visible.

### Technical Details

**File: `src/components/revalida/GradingDialog.tsx`**

- On the agent response `<div>` (currently `className="p-3 rounded-md bg-muted text-sm whitespace-pre-wrap"`), add `max-h-[200px] overflow-y-auto` so responses taller than 200px get a scrollbar.

This is a one-line CSS class change. No logic or structural changes needed.

