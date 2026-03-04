

## Plan: Manual Grading via Checkboxes in Expanded Leaderboard

### Summary
Replace AI grading with manual admin grading. Agents see "Pending review" after submitting. Admins expand a row in the Scores Summary table, see each answer alongside the correct answer, and toggle checkboxes to mark correct/incorrect. Score updates live (auto-saves each toggle to the database).

### Changes

**1. Submission flow (remove AI grading)**
- `handleSubmit` in `QuizTab`: Remove the call to `supabase.functions.invoke('grade-nb-quiz')`. Instead, save the submission with `score: 0`, `total: questions.length`, `grade_results: null` (ungraded).
- Remove the "Re-grade All Submissions (AI)" admin card entirely.

**2. Agent post-submission view**
- When `submission.gradeResults` is `null`, show a "Pending Review" badge instead of a score card.
- Hide correctness indicators (green/red) on individual questions until `gradeResults` is populated.
- Once graded, show the score card and correctness indicators as they do today.

**3. Admin grading UI in Scores Summary table**
- In the expanded row for each agent, add a `Checkbox` next to each question's agent answer.
- Checkbox is checked = correct, unchecked = incorrect.
- Pre-populate checkboxes from `grade_results` if already graded (allows corrections).
- On each checkbox toggle:
  - Compute new `grade_results` map and `score` count.
  - `UPDATE nb_quiz_submissions SET grade_results = {...}, score = X WHERE id = ...`
  - Update local state immediately (live update).
- Show a visual indicator (graded vs ungraded) on each row in the summary table.

**4. Scores Summary table adjustments**
- Add `id` to the submission query (needed for updates).
- For ungraded submissions, show "Pending" badge instead of score/percentage.
- Admin can still expand any row to view answers + grade them.

**5. No database schema changes needed**
- `grade_results` (jsonb) and `score` columns already exist on `nb_quiz_submissions`.
- `null` in `grade_results` will indicate "not yet graded."

### Files Modified
- `src/pages/NBQuiz.tsx` — all changes above (submission flow, ScoresSummaryTable grading UI, agent results display)

