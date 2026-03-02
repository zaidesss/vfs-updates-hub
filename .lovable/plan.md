

## Plan: Add Score Override Dialog + Display Full Agent Names in Revalida V1

### Two features to implement:

### Feature 1: Display Full Agent Names Instead of Emails
Currently, `SubmissionTable`, `ReviewQueue`, `GradingDialog`, and `SubmissionDetailDialog` all display raw `agent_email`. We need to resolve emails to full names from `agent_profiles`.

**Approach:** Create a shared hook/utility that fetches a name map from `agent_profiles` once, then pass it through the components.

#### Step 1: Add name resolution to `Revalida.tsx`
- Fetch all agent profiles (`email`, `full_name`) on mount into a `Map<string, string>`
- Pass this map as `agentNameMap` prop to `SubmissionTable`, `ReviewQueue`, `GradingDialog`, and `SubmissionDetailDialog`

#### Step 2: Update display components
- **`SubmissionTable.tsx`** — Replace `attempt.agent_email` with resolved name (email as fallback)
- **`ReviewQueue.tsx`** — Same change in the Agent column
- **`GradingDialog.tsx`** — Show resolved name in the dialog description
- **`SubmissionDetailDialog.tsx`** — Show resolved name in the dialog description

---

### Feature 2: Score Override Dialog (Edit Icon)
Allow admins to manually override scores for any submitted/graded attempt.

#### Step 3: Add `overrideAnswer` and `recalculateAttemptScore` to `revalidaApi.ts`
- `overrideAnswer(answerId, pointsAwarded, isCorrect, feedback)` — updates `revalida_answers` row
- `recalculateAttemptScore(attemptId, graderEmail)` — recalculates `auto_score_points`, `manual_score_points`, `final_percent` from all answers, updates `revalida_attempts`

#### Step 4: Create `ScoreOverrideDialog.tsx`
- Similar layout to `SubmissionDetailDialog` but with editable points fields for each answer
- Shows question prompt, agent answer, correct answer (for MCQ/TF), and an editable points input + feedback textarea
- "Save & Recalculate" button that calls `overrideAnswer` for changed answers, then `recalculateAttemptScore`
- Overridden answers get a visual "Overridden" badge
- Audit log entry written on save

#### Step 5: Add edit icon to `SubmissionTable.tsx`
- Add a `PenTool` icon button next to the existing `Eye` button in the Actions column
- Only visible for `graded` or `needs_manual_review` status (submitted attempts that have answers)
- Wire to open `ScoreOverrideDialog` via new `onEditAttempt` callback

#### Step 6: Wire up in `Revalida.tsx`
- Add state for the override dialog (similar to grading/viewing dialog pattern)
- Add `handleEditAttempt` handler that loads batch, questions, answers
- Pass `onEditAttempt` to `SubmissionTable`
- Render `ScoreOverrideDialog`
- After save, reload attempts

