
# Plan: Build Revalida Module (Team Performance)

## Overview
Build a weekly knowledge test system ("Revalida") under Team Performance. Agents take a randomized test once per batch, with automatic scoring for MCQ/True-False and manual grading for situational questions. Includes CSV/Excel import, 14-day data retention with export to storage, and scorecard write-back.

---

## Database Schema

### 1. New Tables

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  revalida_batches                                                        │
├──────────────────────────────────────────────────────────────────────────┤
│  id (uuid, PK)                                                           │
│  title (text, NOT NULL)                                                  │
│  is_active (boolean, DEFAULT false)                                      │
│  start_at (timestamptz, NULL until published)                            │
│  end_at (timestamptz, NULL until published)                              │
│  total_points (integer, auto-calculated)                                 │
│  question_count (integer, auto-calculated)                               │
│  created_by (text, email of creator)                                     │
│  created_at (timestamptz, DEFAULT now())                                 │
│  updated_at (timestamptz, DEFAULT now())                                 │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  revalida_questions                                                      │
├──────────────────────────────────────────────────────────────────────────┤
│  id (uuid, PK)                                                           │
│  batch_id (uuid, FK → revalida_batches.id)                               │
│  type (text: 'mcq', 'true_false', 'situational')                         │
│  prompt (text, NOT NULL)                                                 │
│  choice_a (text, NULL for situational)                                   │
│  choice_b (text, NULL for situational)                                   │
│  choice_c (text, NULL)                                                   │
│  choice_d (text, NULL)                                                   │
│  correct_answer (text: 'A', 'B', 'C', 'D', 'True', 'False', NULL)        │
│  points (integer, NOT NULL)                                              │
│  order_index (integer, for display in admin/import)                      │
│  is_required (boolean, DEFAULT true)                                     │
│  created_at (timestamptz, DEFAULT now())                                 │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  revalida_attempts                                                       │
├──────────────────────────────────────────────────────────────────────────┤
│  id (uuid, PK)                                                           │
│  batch_id (uuid, FK → revalida_batches.id)                               │
│  agent_id (uuid, FK → agent_profiles.id)                                 │
│  agent_email (text, NOT NULL)                                            │
│  question_order (jsonb, shuffled array of question IDs)                  │
│  status (text: 'in_progress', 'submitted', 'needs_manual_review',        │
│          'graded')                                                       │
│  started_at (timestamptz, DEFAULT now())                                 │
│  submitted_at (timestamptz, NULL)                                        │
│  auto_score_points (integer, DEFAULT 0)                                  │
│  auto_total_points (integer, DEFAULT 0)                                  │
│  manual_score_points (integer, DEFAULT 0)                                │
│  manual_total_points (integer, DEFAULT 0)                                │
│  final_percent (numeric, NULL until fully graded)                        │
│  graded_by (text, email of grader, NULL)                                 │
│  graded_at (timestamptz, NULL)                                           │
│  created_at (timestamptz, DEFAULT now())                                 │
│  UNIQUE (batch_id, agent_id)  ← Enforces one attempt per agent per batch │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  revalida_answers                                                        │
├──────────────────────────────────────────────────────────────────────────┤
│  id (uuid, PK)                                                           │
│  attempt_id (uuid, FK → revalida_attempts.id)                            │
│  question_id (uuid, FK → revalida_questions.id)                          │
│  answer_value (text, agent's selected answer or free text)               │
│  is_correct (boolean, NULL for situational until graded)                 │
│  points_awarded (integer, NULL until graded)                             │
│  feedback (text, optional grader feedback for situational)               │
│  graded_at (timestamptz, NULL)                                           │
│  created_at (timestamptz, DEFAULT now())                                 │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  revalida_exports                                                        │
├──────────────────────────────────────────────────────────────────────────┤
│  id (uuid, PK)                                                           │
│  exported_at (timestamptz, DEFAULT now())                                │
│  range_start (date, earliest attempt date in export)                     │
│  range_end (date, latest attempt date in export)                         │
│  file_path (text, path in storage bucket)                                │
│  rows_exported (integer)                                                 │
│  exported_by (text, 'system' for cron job)                               │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2. Storage Bucket
Create `revalida-exports` bucket (private) for retention export files.

---

## RLS Policies Summary

| Table | Role | SELECT | INSERT | UPDATE | DELETE |
|-------|------|--------|--------|--------|--------|
| revalida_batches | Admin/Super Admin | All | Yes | Yes | Yes |
| revalida_batches | Agent | Active only | No | No | No |
| revalida_questions | Admin/Super Admin | All | Yes | Yes | Yes |
| revalida_questions | Agent | Own batch | No | No | No |
| revalida_attempts | Admin/Super Admin | All | Yes (grading) | Yes | Yes |
| revalida_attempts | Agent | Own only | Own only | No | No |
| revalida_answers | Admin/Super Admin | All | Via function | Yes (grading) | Yes |
| revalida_answers | Agent | No | Yes (submit) | No | No |
| revalida_exports | Admin/Super Admin | Yes | (service role) | No | No |

---

## Implementation Steps

### Step 1: Database Migration
Create all tables with:
- Unique constraint on `(batch_id, agent_id)` in revalida_attempts
- Foreign keys with ON DELETE CASCADE for answers/attempts
- Trigger for `updated_at` on batches and attempts
- RLS policies matching the security requirements

### Step 2: Storage Bucket
Create `revalida-exports` bucket (private).

### Step 3: Backend API Library
Create `src/lib/revalidaApi.ts` with functions:
- `fetchBatches()` - all batches for admin, active for agents
- `fetchBatchById(id)` - single batch with questions
- `createBatch(title, questions)` - import batch from parsed CSV
- `publishBatch(id)` - set start_at=now, end_at=now+48h, is_active=true
- `deactivateBatch(id)` - set is_active=false
- `startAttempt(batchId)` - create attempt with shuffled question_order
- `submitAttempt(attemptId, answers)` - auto-grade MCQ/TF, set status
- `fetchMyAttempt(batchId)` - agent's own attempt
- `fetchAllAttempts(batchId)` - admin view
- `gradeAnswer(answerId, points, feedback)` - manual grading
- `finalizeAttempt(attemptId)` - calculate final_percent, update scorecard
- `fetchReviewQueue()` - attempts needing manual review

### Step 4: Edge Function - Retention Job
Create `supabase/functions/revalida-retention-job/index.ts`:
- Run daily via cron (pg_cron)
- Find attempts older than 14 days
- Export to JSON file in `revalida-exports` bucket
- Log to `revalida_exports` table
- Delete answers then attempts only after successful export

### Step 5: Frontend Components

**Components to create in `src/components/revalida/`:**

| Component | Purpose |
|-----------|---------|
| `BatchCard.tsx` | Card showing batch title, deadline countdown, status |
| `BatchManagement.tsx` | Admin: upload, preview, validate, save, publish |
| `ImportDialog.tsx` | CSV/Excel file upload with preview table |
| `TestForm.tsx` | Agent: renders questions in stored order |
| `QuestionRenderer.tsx` | MCQ/TF radio buttons or situational textarea |
| `SubmissionTable.tsx` | Admin: list of all submissions with filters |
| `ReviewQueue.tsx` | Admin: attempts needing manual grading |
| `GradingDialog.tsx` | Admin: grade situational answers |
| `AttemptResult.tsx` | Agent: shows final percent or "Pending review" |

### Step 6: Pages

**Create `src/pages/Revalida.tsx`:**
- Main page with tabs or conditional rendering
- Agent view: active batch card, start/submit test, results
- Admin view: batch management, submissions, review queue

**Update routes in `src/App.tsx`:**
```tsx
<Route path="/team-performance/revalida" element={<Revalida />} />
```

**Update navigation in `src/components/Layout.tsx`:**
Add Revalida to Team Performance menu items.

### Step 7: Scorecard Integration
After `final_percent` is calculated:
- Call existing scorecard API pattern to upsert agent's Revalida score
- Include batch_id and status (graded vs pending) for tracking

### Step 8: Edge Function Registration
Add to `supabase/config.toml`:
```toml
[functions.revalida-retention-job]
verify_jwt = false
```

Schedule with pg_cron for daily execution.

---

## UI Wireframes (Text)

### Agent View - Active Batch
```text
┌─────────────────────────────────────────────────┐
│ 📝 Revalida                                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  Weekly Knowledge Test                    │  │
│  │  Batch: February Week 1                   │  │
│  │                                           │  │
│  │  ⏰ Deadline: 23h 45m remaining           │  │
│  │  📊 10 Questions | 50 points total        │  │
│  │                                           │  │
│  │  [Start Test]                             │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  Past Results: 92% (Week 4 Jan)                 │
└─────────────────────────────────────────────────┘
```

### Agent View - After Submit
```text
┌─────────────────────────────────────────────────┐
│  ✅ Test Submitted                              │
│                                                 │
│  Your Score: 85%                                │
│  (or "⏳ Pending Review" if situational)        │
│                                                 │
│  Note: Correct answers are not shown.           │
└─────────────────────────────────────────────────┘
```

### Admin View - Batch Management
```text
┌─────────────────────────────────────────────────┐
│ Revalida - Admin Panel                          │
├─────────────────────────────────────────────────┤
│ [Batches] [Submissions] [Review Queue]          │
├─────────────────────────────────────────────────┤
│                                                 │
│ Batches:                                        │
│ ┌──────────────────────────────────────────┐    │
│ │ Feb Week 1 │ Active │ 48h │ [Deactivate] │    │
│ │ Jan Week 4 │ Closed │     │ [View]       │    │
│ └──────────────────────────────────────────┘    │
│                                                 │
│ [+ Import New Batch]                            │
└─────────────────────────────────────────────────┘
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/Revalida.tsx` | Create | Main page with agent/admin views |
| `src/lib/revalidaApi.ts` | Create | API functions for all operations |
| `src/components/revalida/BatchCard.tsx` | Create | Active batch display for agents |
| `src/components/revalida/BatchManagement.tsx` | Create | Admin batch list and controls |
| `src/components/revalida/ImportDialog.tsx` | Create | CSV/Excel upload and preview |
| `src/components/revalida/TestForm.tsx` | Create | Test-taking form with questions |
| `src/components/revalida/QuestionRenderer.tsx` | Create | Render different question types |
| `src/components/revalida/SubmissionTable.tsx` | Create | Admin submissions list |
| `src/components/revalida/ReviewQueue.tsx` | Create | Manual grading queue |
| `src/components/revalida/GradingDialog.tsx` | Create | Dialog for grading situational |
| `src/components/revalida/AttemptResult.tsx` | Create | Show result after submission |
| `supabase/functions/revalida-retention-job/index.ts` | Create | Daily retention cleanup |
| `src/App.tsx` | Modify | Add route for /team-performance/revalida |
| `src/components/Layout.tsx` | Modify | Add Revalida to Team Performance nav |
| `supabase/config.toml` | Modify | Register edge function |
| **Database Migration** | Create | All tables, RLS, triggers |

---

## Technical Notes

### Randomization Logic
When creating an attempt:
```typescript
const questionIds = questions.map(q => q.id);
const shuffled = [...questionIds].sort(() => Math.random() - 0.5);
// Store in attempt.question_order as JSONB
```

### Auto-Grading on Submit
```typescript
for (const answer of answers) {
  const question = questionsMap.get(answer.question_id);
  if (question.type !== 'situational') {
    const isCorrect = answer.answer_value === question.correct_answer;
    answer.is_correct = isCorrect;
    answer.points_awarded = isCorrect ? question.points : 0;
  }
}
```

### Deadline Enforcement
```typescript
// Before starting or submitting
if (batch.end_at && new Date() > new Date(batch.end_at)) {
  throw new Error('Batch deadline has passed');
}
```

### Scorecard Write-back
After final_percent is set:
```typescript
await supabase.from('saved_scorecards').upsert({
  agent_email,
  revalida: final_percent,
  week_start: batch.start_at,
  // ...
});
```

---

## Sequence Diagram - Agent Test Flow

```text
Agent                    Frontend                  Database
  │                         │                         │
  │  Open Revalida page     │                         │
  │────────────────────────>│                         │
  │                         │  fetch active batch     │
  │                         │────────────────────────>│
  │                         │<────────────────────────│
  │                         │                         │
  │  Click "Start Test"     │                         │
  │────────────────────────>│                         │
  │                         │  create attempt         │
  │                         │  (shuffle questions)    │
  │                         │────────────────────────>│
  │                         │<────────────────────────│
  │                         │                         │
  │  Answer questions       │                         │
  │  Click "Submit"         │                         │
  │────────────────────────>│                         │
  │                         │  submit answers         │
  │                         │  (auto-grade MCQ/TF)    │
  │                         │────────────────────────>│
  │                         │                         │
  │                         │  update attempt status  │
  │                         │────────────────────────>│
  │                         │<────────────────────────│
  │                         │                         │
  │  See result/pending     │                         │
  │<────────────────────────│                         │
```
