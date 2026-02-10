

# Revalida V1 and V2: Fix Continue Test + Post-Expiry Results View

## Summary

Two changes for both Revalida V1 and V2:
1. **Continue Test Fix** -- Allow agents to resume an in-progress test without losing data or hitting errors. Answers are only saved upon final submission (no auto-save).
2. **Post-Expiry Results View** -- After the batch expires or is deactivated, agents can see their detailed submission (their answers, correct answers, points earned, and grading) similar to the admin Submission Detail view.

---

## Part 1: Fix "Continue Test" (V1)

**Problem:** V1's "Continue Test" button calls `handleStartTest()` which calls `startAttempt()`, which tries to INSERT a new record and fails with "You have already taken this test" (unique constraint violation).

**Fix:** Change the V1 "Continue Test" button to simply show the TestForm with the existing attempt, instead of calling `startAttempt()`.

### Changes:
- **`src/components/revalida/BatchCard.tsx`** -- Add a separate `onContinueTest` callback prop instead of reusing `onStartTest`.
- **`src/pages/Revalida.tsx`** -- Add a `handleContinueTest` function that sets `showTestForm = true` using the existing `myAttempt` (no API call needed). Pass it to BatchCard.

---

## Part 2: Fix "Continue Test" (V2)

**Current state:** V2's Continue Test already works -- `BatchCardV2.handleContinueTest()` navigates to `/take` route, and `startAttempt()` in the API returns the existing attempt if one exists. No changes needed here.

---

## Part 3: Post-Expiry Results View (V1)

**Current behavior:** After submission, agents only see the `AttemptResult` component showing a percentage score. No detailed view of their answers.

**New behavior:** Once the batch has expired (deadline passed) or is deactivated, and the agent has a submitted/graded attempt, show a "View My Results" button that opens a detailed view of their answers with correct answers shown.

### Changes:
- **`src/components/revalida/AttemptResult.tsx`** -- Add a "View My Results" button (visible only when batch is expired/deactivated). The button calls an `onViewResults` callback.
- **`src/pages/Revalida.tsx`** -- Handle the `onViewResults` callback: fetch the batch questions and answers, then open the existing `SubmissionDetailDialog` but with answers and correct answers visible (pass `isAdmin={false}` but with a new `showCorrectAnswers` prop).
- **`src/components/revalida/SubmissionDetailDialog.tsx`** -- Add a `showCorrectAnswers` boolean prop. When true (regardless of `isAdmin`), show correct answers and correctness indicators. Currently these are gated behind `isAdmin`.

---

## Part 4: Post-Expiry Results View (V2)

**Current behavior:** After submission, agents see the `AttemptResultV2` component showing percentage or "Pending AI Review". No detailed answer view.

**New behavior:** Once the batch has expired or is deactivated, show a "View My Results" button in `AttemptResultV2` or `BatchCardV2` that navigates to a results detail view.

### Changes:
- **`src/components/revalida-v2/AttemptResultV2.tsx`** -- Add a "View My Results" button (visible only when batch is expired/deactivated). Calls an `onViewResults` callback.
- **`src/pages/RevalidaV2.tsx`** -- In the agent batch detail view, when the batch is expired and attempt is submitted/graded, show a results view that displays each question, the agent's answer, the correct answer (for MCQ/T-F), points earned, and for situational questions: AI score/justification.
- Create **`src/components/revalida-v2/SubmissionDetailV2.tsx`** -- A new component (similar to V1's `SubmissionDetailDialog` but inline, not a dialog) that renders the agent's submission details with correct answers visible.

---

## Technical Details

### V1 Changes (4 files)

1. **`src/components/revalida/BatchCard.tsx`**
   - Add `onContinueTest` prop
   - Wire the Continue Test button to `onContinueTest` instead of `onStartTest`

2. **`src/pages/Revalida.tsx`**
   - Add `handleContinueTest` function that just sets `showTestForm = true`
   - Pass `onContinueTest` to BatchCard
   - Pass batch expiry/deactivation info and `onViewResults` handler to AttemptResult
   - Load answers and questions for the agent's own submission detail view
   - Pass `showCorrectAnswers={true}` to SubmissionDetailDialog when agent views post-expiry

3. **`src/components/revalida/AttemptResult.tsx`**
   - Accept `onViewResults` callback and `canViewResults` boolean props
   - Show "View My Results" button when `canViewResults` is true

4. **`src/components/revalida/SubmissionDetailDialog.tsx`**
   - Add `showCorrectAnswers` prop (defaults to `isAdmin`)
   - Use `showCorrectAnswers` instead of `isAdmin` to gate correct answer display and points

### V2 Changes (4 files)

1. **`src/components/revalida-v2/BatchCardV2.tsx`**
   - Pass `batchExpired` and `onViewResults` to AttemptResultV2

2. **`src/components/revalida-v2/AttemptResultV2.tsx`**
   - Accept `onViewResults` callback and `canViewResults` boolean props
   - Show "View My Results" button when `canViewResults` is true

3. **`src/components/revalida-v2/SubmissionDetailV2.tsx`** (new file)
   - Renders question list with agent's answer, correct answer, points earned
   - For situational: shows AI score, justification, and any admin override
   - Styled similarly to V1's SubmissionDetailDialog content

4. **`src/pages/RevalidaV2.tsx`**
   - Add a results section in the agent batch detail view
   - When batch is expired and agent clicks "View My Results", show SubmissionDetailV2 inline

### Implementation Order
Step 1: V1 Continue Test fix (BatchCard + Revalida.tsx)
Step 2: V1 Post-Expiry Results (AttemptResult + SubmissionDetailDialog + Revalida.tsx)
Step 3: V2 Post-Expiry Results (AttemptResultV2 + SubmissionDetailV2 + BatchCardV2 + RevalidaV2.tsx)

