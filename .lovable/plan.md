

## Plan: Convert NB Quiz to Multiple Choice (5 Options)

### What Changes

**1. Database: Add `options` column to `nb_quiz_questions`**
- Add a `jsonb` column `options` (nullable) to store an array of 5 strings (the choices, one of which is the correct answer)
- Migration: `ALTER TABLE nb_quiz_questions ADD COLUMN options jsonb;`

**2. Update the 20 existing questions for 03.04.26**
- Use the insert tool to UPDATE each question's `options` field with 5 choices (including the correct answer, shuffled among 4 distractors)
- The correct_answer column stays as-is; options just adds the selectable choices

**3. Update `QuestionCard` UI in `src/pages/NBQuiz.tsx`**
- Replace the `<Input>` text field with a radio group showing 5 labeled options (A–E)
- When `options` exist on a question, render radio buttons; fall back to text input for older fill-in-the-blank questions
- On results view, highlight the selected answer as correct/incorrect and show the correct option
- Update the page subtitle from "Fill-in-the-blank" to "Knowledge quiz"

**4. Admin inline edit**
- Not included per your selection (only updating existing questions)

### Technical Details

- The `options` array will contain 5 strings in display order. The correct answer will be one of them (matched by `correct_answer` field).
- Answers stored in submissions remain as `{ question_id, answer }` — the `answer` value will be the selected option text instead of typed text.
- AI grading via `grade-nb-quiz` still works since it compares agent answer to correct answer semantically, but for multiple choice it will effectively be an exact match.

### Implementation Order
1. Run migration to add `options` column
2. Insert the 5 options for each of the 20 questions (I'll craft the distractors based on the coaching content)
3. Update `NBQuiz.tsx` — QuestionCard renders radio buttons when options exist

