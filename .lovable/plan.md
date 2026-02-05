

# Plan: Fix Batch Management Eye Icon, Enable Question Editing After Publish, and Fix Scroll Issue

## Issues Identified

### Issue 1: Batch Management Eye Icon Does Not Work
- **Location**: `src/pages/Revalida.tsx` line 336-338
- **Problem**: The `handleViewBatch` function only logs to console and does nothing:
  ```typescript
  const handleViewBatch = (batchId: string) => {
    console.log('View batch:', batchId);
  };
  ```
- **Solution**: Create a new `BatchDetailDialog.tsx` component that shows all questions in the batch, and update `handleViewBatch` to open this dialog

### Issue 2: Questions Should Be Editable Even After Publishing
- **Location**: `src/components/revalida/BatchManagement.tsx` lines 145-155
- **Problem**: The edit button only shows for draft batches (`isDraftBatch(batch)`):
  ```typescript
  {isDraftBatch(batch) && (
    <Button ... onClick={() => onEditBatch(batch.id)}>
      <Edit className="h-4 w-4" />
    </Button>
  )}
  ```
- **Solution**: Always show the edit button for all non-expired batches (drafts, active, and even expired if needed for corrections). The edit should update questions but preserve existing attempts/answers.

### Issue 3: Submissions Eye Icon Dialog Not Scrollable
- **Location**: `src/components/revalida/SubmissionDetailDialog.tsx`
- **Problem**: The ScrollArea isn't working because of a layout issue. Looking at the code:
  - The `DialogContent` has default `grid` layout from Shadcn which conflicts with `flex flex-col`
  - The nested structure needs the ScrollArea to have explicit height constraints
- **Root Cause**: The `ScrollArea` needs to be inside a container with a fixed height. Currently, the `flex-1 min-h-0` isn't working because the parent doesn't properly constrain height.
- **Solution**: Apply an explicit height to the ScrollArea using `h-[calc(90vh-280px)]` (subtracting the header + metadata + score section heights)

---

## Implementation Details

### Fix 1: Batch Management Eye Icon

**Create new component**: `src/components/revalida/BatchDetailDialog.tsx`

This dialog will show:
- Batch metadata (title, status, deadline, total points)
- All questions with their details:
  - Question number, type, points
  - Question prompt
  - For MCQ: All choices (A, B, C, D)
  - For MCQ/TF: Correct answer highlighted
  - For Situational: Note that manual grading is required

**Update**: `src/pages/Revalida.tsx`

Add state and handler for viewing batch:
```typescript
// New state
const [viewingBatchDetail, setViewingBatchDetail] = useState<RevalidaBatch | null>(null);
const [viewingBatchQuestions, setViewingBatchQuestions] = useState<RevalidaQuestion[]>([]);

// Updated handler
const handleViewBatch = async (batchId: string) => {
  try {
    const { batch, questions } = await fetchBatchById(batchId);
    setViewingBatchDetail(batch);
    setViewingBatchQuestions(questions);
  } catch (error: any) {
    toast({ title: 'Error', description: error.message, variant: 'destructive' });
  }
};

// Add dialog to render:
<BatchDetailDialog
  isOpen={!!viewingBatchDetail}
  onOpenChange={(open) => !open && setViewingBatchDetail(null)}
  batch={viewingBatchDetail}
  questions={viewingBatchQuestions}
/>
```

### Fix 2: Allow Editing After Publish

**Update**: `src/components/revalida/BatchManagement.tsx`

Change the edit button condition from:
```typescript
{isDraftBatch(batch) && (
```
To:
```typescript
{/* Allow editing for drafts and active batches (for typo corrections) */}
{(isDraftBatch(batch) || (batch.is_active && !isDeadlinePassed(batch.end_at))) && (
```

This allows admins to edit:
- Draft batches (before publishing)
- Active batches (while test is running - for typo corrections)

When editing an active batch, the `updateBatch` function in `revalidaApi.ts` will update the questions. This is safe because:
- Existing answers reference `question_id` which doesn't change
- Only the question text/choices/correct_answer are modified
- The `order_index` remains the same

### Fix 3: Submission Detail Dialog Scroll Issue

**Update**: `src/components/revalida/SubmissionDetailDialog.tsx`

The issue is that the Radix ScrollArea needs an explicit height constraint. The current structure with `flex-1 min-h-0` on ScrollArea isn't working because the parent container doesn't properly establish a height context due to the nested flex containers.

Solution: Use a simpler approach with an explicit max-height on the ScrollArea:

```tsx
{/* Scrollable Questions Section */}
<ScrollArea className="flex-1 min-h-0 px-6 pb-6" style={{ maxHeight: 'calc(90vh - 300px)' }}>
```

Or restructure the component to remove the nested flex container that's causing issues:

```tsx
<DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
  {/* Fixed Header Section - add shrink-0 */}
  <div className="space-y-4 shrink-0">
    <DialogHeader>...</DialogHeader>
    {/* Metadata */}
    {/* Score Summary */}
    <Separator />
  </div>

  {/* Scrollable Questions Section - needs explicit height */}
  <div className="flex-1 min-h-0 overflow-hidden">
    <ScrollArea className="h-full">
      <div className="space-y-4 px-6 pb-6 pt-4">
        {/* Questions */}
      </div>
    </ScrollArea>
  </div>
</DialogContent>
```

The key is to ensure ScrollArea has explicit height constraints by:
1. Making the ScrollArea's parent a flex child that can shrink (`flex-1 min-h-0`)
2. Giving ScrollArea `h-full` to fill that constrained space
3. Moving padding inside the scrollable content div

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/revalida/BatchDetailDialog.tsx` | Create | View batch questions and answers |
| `src/components/revalida/BatchManagement.tsx` | Modify | Show edit button for active batches too |
| `src/components/revalida/SubmissionDetailDialog.tsx` | Modify | Fix ScrollArea height constraints |
| `src/pages/Revalida.tsx` | Modify | Add batch view dialog state and handler |

---

## Implementation Order

1. **First**: Fix the ScrollArea in `SubmissionDetailDialog.tsx` (simpler fix)
2. **Second**: Update `BatchManagement.tsx` to show edit button for active batches
3. **Third**: Create `BatchDetailDialog.tsx` for viewing batch questions
4. **Fourth**: Update `Revalida.tsx` to use the new batch detail dialog

