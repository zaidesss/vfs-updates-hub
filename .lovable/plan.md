
# Fix Revalida 2.0 Test Submission Failure and Hide Evaluation Rubric

## Summary
Two issues need fixing:
1. **Test submission fails** because the database is missing a unique constraint required for the upsert operation
2. **Evaluation rubric is visible** to agents during situational questions, which should be hidden

---

## Issue 1: Test Submission Failure

### Root Cause
The `upsertAnswer` function in `revalidaV2Api.ts` uses:
```typescript
.upsert([answer], { onConflict: 'attempt_id,question_id' })
```

However, the `revalida_v2_answers` table has **no unique constraint** on `(attempt_id, question_id)`. The only unique constraint is on `id` (primary key). This causes the upsert to fail.

### Fix
Add a unique constraint on `(attempt_id, question_id)` to the database. This makes sense logically too — each answer should be unique per attempt and question combination.

**Database Migration:**
```sql
ALTER TABLE public.revalida_v2_answers
ADD CONSTRAINT revalida_v2_answers_attempt_question_unique 
UNIQUE (attempt_id, question_id);
```

---

## Issue 2: Evaluation Rubric Visible to Agents

### Root Cause
In `TestInterface.tsx` (lines 120-124), the evaluation rubric is displayed as part of the question:
```tsx
{orderedQuestion.type === 'situational' && orderedQuestion.evaluation_rubric && (
  <CardDescription className="mt-2 whitespace-pre-wrap">
    {orderedQuestion.evaluation_rubric}
  </CardDescription>
)}
```

The rubric is meant for:
- AI grading (used in the `grade-situational-v2` edge function prompt)
- Admin review during grading

It should **not** be shown to agents taking the test.

### Fix
Remove the rubric display from `TestInterface.tsx`. Agents should only see the question prompt and a text area for their response.

**File to Modify:** `src/components/revalida-v2/TestInterface.tsx`

Remove lines 120-124:
```tsx
{orderedQuestion.type === 'situational' && orderedQuestion.evaluation_rubric && (
  <CardDescription className="mt-2 whitespace-pre-wrap">
    {orderedQuestion.evaluation_rubric}
  </CardDescription>
)}
```

---

## Files to Change

| File | Action | Change |
|------|--------|--------|
| Database (migration) | **CREATE** | Add unique constraint on `(attempt_id, question_id)` |
| `src/components/revalida-v2/TestInterface.tsx` | **MODIFY** | Remove evaluation rubric display (lines 120-124) |

---

## Verification After Fix

1. **Test submission**: Create a new attempt, answer all questions, and submit. Should complete without error.
2. **Situational questions**: Confirm agents only see the prompt, not the evaluation rubric.
3. **Admin grading**: Confirm admins can still see rubrics in the grading interface (not affected by this fix).
