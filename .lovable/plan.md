

# Plan: Replace Import with In-App Question Builder (Google Forms Style)

## Overview
Replace the Excel/CSV import workflow with an intuitive, in-app question builder similar to Google Forms. Admins will create questions directly on the page with a drag-and-drop style interface, eliminating the need for external file preparation.

---

## What This Change Includes

### New Features
- **Create New Batch** button opens a full-screen or modal question builder
- **Add Question** button with type selector (MCQ, True/False, Situational)
- **Inline editing** for each question card:
  - Edit prompt text
  - Add/remove choices (A, B, C, D for MCQ)
  - Select correct answer with radio buttons
  - Set point value
  - Reorder questions with up/down arrows (or drag-and-drop)
- **Delete question** with confirmation
- **Live preview** of total points and question count
- **Save as Draft** and **Save & Publish** options
- **Edit existing batches** (for draft batches only)

### What Gets Removed
- `ImportDialog.tsx` component
- `xlsx` dependency from package.json
- File upload functionality
- CSV/Excel parsing logic

---

## UI Design (Google Forms Style)

### Batch Creation Page

```text
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to Batches                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Batch Title *                                          │    │
│  │  [February Week 1                                     ] │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Question 1                                     [🗑] [⬆⬇]│    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │  Type: [Multiple Choice ▼]     Points: [5]              │    │
│  │                                                         │    │
│  │  Question: ____________________________________________ │    │
│  │  [What is the primary contact method for VFS?        ]  │    │
│  │                                                         │    │
│  │  ○ A: [Email support                              ] [x] │    │
│  │  ○ B: [Live chat                                  ]     │    │
│  │  ○ C: [Phone call                                 ]     │    │
│  │  ○ D: [Social media                               ]     │    │
│  │                                                         │    │
│  │  Correct Answer: ● A  ○ B  ○ C  ○ D                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Question 2                                     [🗑] [⬆⬇]│    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │  Type: [True/False ▼]          Points: [2]              │    │
│  │                                                         │    │
│  │  Question: ____________________________________________ │    │
│  │  [Agents should always verify customer identity first]  │    │
│  │                                                         │    │
│  │  Correct Answer: ● True  ○ False                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Question 3                                     [🗑] [⬆⬇]│    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │  Type: [Situational ▼]         Points: [10]             │    │
│  │                                                         │    │
│  │  Question: ____________________________________________ │    │
│  │  [A customer is frustrated about a delayed refund.    ] │    │
│  │  [Describe how you would handle this situation.       ] │    │
│  │                                                         │    │
│  │  ⚠️ Requires manual grading                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐    │
│  │  [+ Add Question]                                       │    │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  📊 3 Questions | 17 Total Points                               │
│                                                                 │
│  [Cancel]               [Save as Draft]   [Save & Publish]      │
└─────────────────────────────────────────────────────────────────┘
```

### Question Type Cards

**Multiple Choice (MCQ)**
- Question prompt (textarea)
- 2-4 choice inputs (A, B, C, D) - can add/remove C and D
- Radio buttons to select correct answer
- Points input (default: 5)

**True/False**
- Question prompt (textarea)
- Radio buttons for correct answer (True/False)
- Points input (default: 2)

**Situational**
- Question prompt (textarea, larger)
- Note: "Requires manual grading"
- Points input (default: 10)

---

## Technical Implementation

### New Components to Create

| Component | Description |
|-----------|-------------|
| `QuestionBuilder.tsx` | Full-page/modal for creating/editing a batch |
| `QuestionCard.tsx` | Single question editor card with type-specific fields |

### Components to Modify

| Component | Changes |
|-----------|---------|
| `BatchManagement.tsx` | Replace "Import New Batch" with "Create New Batch", add Edit button for drafts |
| `Revalida.tsx` | Add state for question builder view, handle create/edit flows |

### Components to Delete

| Component | Reason |
|-----------|--------|
| `ImportDialog.tsx` | No longer needed - replaced by QuestionBuilder |

### API Changes (revalidaApi.ts)

| Function | Change |
|----------|--------|
| `createBatch()` | Already works - accepts questions array |
| `updateBatch()` | **NEW** - update title and questions for draft batches |
| `addQuestion()` | **NEW** - add single question to batch |
| `updateQuestion()` | **NEW** - update a question |
| `deleteQuestion()` | **NEW** - remove a question from batch |
| `reorderQuestions()` | **NEW** - update order_index for questions |

### Dependency Changes

| Package | Action |
|---------|--------|
| `xlsx` | **REMOVE** - no longer needed |

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/revalida/QuestionBuilder.tsx` | Create | Full question building interface |
| `src/components/revalida/QuestionCard.tsx` | Create | Individual question editor card |
| `src/components/revalida/BatchManagement.tsx` | Modify | Replace import with create, add edit |
| `src/components/revalida/ImportDialog.tsx` | Delete | No longer needed |
| `src/lib/revalidaApi.ts` | Modify | Add update/CRUD functions for questions |
| `src/pages/Revalida.tsx` | Modify | Add question builder view/state |
| `package.json` | Modify | Remove xlsx dependency |

---

## Implementation Steps

### Step 1: Create QuestionCard Component
- Reusable card for editing a single question
- Type selector (MCQ, True/False, Situational)
- Dynamic fields based on type
- Points input
- Delete and reorder buttons

### Step 2: Create QuestionBuilder Component
- Batch title input
- List of QuestionCard components
- Add question button
- Summary bar (count, points)
- Save as Draft / Save & Publish buttons
- Edit mode for existing draft batches

### Step 3: Update API Functions
- Add `updateBatch`, `updateQuestion`, `deleteQuestion`, `reorderQuestions`

### Step 4: Update BatchManagement
- Replace "Import New Batch" button with "Create New Batch"
- Add Edit button for draft batches
- Remove ImportDialog reference

### Step 5: Update Revalida Page
- Add state for showing QuestionBuilder
- Handle navigation between list and builder views
- Pass batch data for edit mode

### Step 6: Cleanup
- Delete ImportDialog.tsx
- Remove xlsx from package.json

---

## Technical Notes

### Question State Structure
```typescript
interface QuestionDraft {
  id?: string;  // undefined for new questions
  type: 'mcq' | 'true_false' | 'situational';
  prompt: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string | null;
  points: number;
  order_index: number;
}
```

### Validation Rules
- Batch title required (non-empty)
- At least 1 question required
- Each question must have a prompt
- MCQ: At least choices A and B required
- MCQ/True-False: Correct answer required
- Points must be >= 1

### Save Logic
- **Save as Draft**: Create batch with `is_active: false`, no `start_at`/`end_at`
- **Save & Publish**: Create batch then immediately publish (48h deadline)
- **Edit Draft**: Update existing batch and its questions

