
# Revalida 2.0 - AI-Powered Knowledge Assessment (Updated)

## Updated Clarifications

### Scoring Structure (Fixed)
- **Multiple Choice**: 1 point each
- **True/False**: 1 point each
- **Situational**: 5 points each max per question
- **Total Score Calculation**: MCQ_Count×1 + TF_Count×1 + Situational_Count×5

**Example**: 5 MCQ + 3 T/F + 2 Situational = 5 + 3 + 10 = 18 total points

### Data Sources (Clarified)

1. **Knowledge Base Articles (Recent)**: Published articles in the `updates` table sorted by `posted_at`, filtered to the previous week (Monday-Sunday prior to batch generation)
2. **QA Evaluations (Previous Week)**: Records with `status: 'action_needed'` OR items from `qa_evaluation_scores.ai_justification` for evaluations in the previous week
3. **Customer Service Contracts**: PDFs uploaded to a new contract management system (merged knowledge base)

---

## Technical Implementation

### Database Schema (New Tables)

```sql
-- Revalida 2.0 Batches
CREATE TABLE revalida_v2_batches (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  mcq_count INT NOT NULL,
  tf_count INT NOT NULL,
  situational_count INT NOT NULL,
  total_points INT GENERATED ALWAYS AS (mcq_count + tf_count + (situational_count * 5)),
  generation_status TEXT DEFAULT 'pending',
  generation_error TEXT,
  source_week_start DATE, -- Week basis for question generation
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Revalida 2.0 Questions
CREATE TABLE revalida_v2_questions (
  id UUID PRIMARY KEY,
  batch_id UUID REFERENCES revalida_v2_batches(id),
  type TEXT NOT NULL, -- 'mcq' | 'true_false' | 'situational'
  prompt TEXT NOT NULL,
  choice_a TEXT,
  choice_b TEXT,
  choice_c TEXT,
  choice_d TEXT,
  correct_answer TEXT, -- 'A'/'B'/'C'/'D' for MCQ, 'True'/'False' for T/F, NULL for situational
  points INT NOT NULL,
  order_index INT NOT NULL,
  source_type TEXT NOT NULL, -- 'kb_article' | 'qa_action' | 'qa_ai_suggestion' | 'contract'
  source_reference TEXT, -- e.g., "UPD-123", "QA-EVAL-456"
  source_excerpt TEXT, -- Snippet used to generate question (admin view only)
  evaluation_rubric TEXT, -- For situational: what constitutes good answer
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Revalida 2.0 Attempts
CREATE TABLE revalida_v2_attempts (
  id UUID PRIMARY KEY,
  batch_id UUID REFERENCES revalida_v2_batches(id),
  agent_email TEXT NOT NULL,
  status TEXT DEFAULT 'in_progress', -- 'in_progress' | 'submitted' | 'graded'
  score INT,
  percentage DECIMAL(5,2),
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  graded_at TIMESTAMPTZ,
  question_order TEXT[], -- Shuffled question IDs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Revalida 2.0 Answers
CREATE TABLE revalida_v2_answers (
  id UUID PRIMARY KEY,
  attempt_id UUID REFERENCES revalida_v2_attempts(id),
  question_id UUID REFERENCES revalida_v2_questions(id),
  agent_answer TEXT,
  is_correct BOOLEAN, -- For MCQ/T/F (auto-graded)
  points_earned INT,
  ai_suggested_score INT, -- For situational (0-5)
  ai_score_justification TEXT, -- Why AI gave this score
  ai_status TEXT DEFAULT 'pending', -- 'pending' | 'graded' | 'override'
  admin_override_score INT,
  admin_override_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contract Management
CREATE TABLE revalida_v2_contracts (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  file_path TEXT, -- Supabase storage path
  parsed_content TEXT NOT NULL, -- Extracted text from PDF
  support_type TEXT, -- 'email' | 'chat' | 'phone' (optional)
  is_active BOOLEAN DEFAULT true,
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Data Fetching for Question Generation

**Edge Function**: `supabase/functions/generate-revalida-v2/index.ts`

#### 1. Fetch Previous Week Knowledge Base Articles
```sql
SELECT id, title, summary, body, category, posted_at 
FROM updates 
WHERE status = 'published'
  AND posted_at >= NOW() - INTERVAL '7 days'
ORDER BY posted_at DESC
```

#### 2. Fetch Previous Week QA Evaluations
```sql
-- Get all evaluations from previous week with their AI justifications
SELECT DISTINCT
  qa_evaluations.id,
  qa_evaluations.agent_email,
  qa_evaluations.evaluation_date,
  qa_evaluation_scores.subcategory,
  qa_evaluation_scores.ai_justification,
  qa_action_needed.action_needed
FROM qa_evaluations
LEFT JOIN qa_evaluation_scores ON qa_evaluations.id = qa_evaluation_scores.evaluation_id
LEFT JOIN qa_action_needed ON qa_evaluations.id = qa_action_needed.evaluation_id
WHERE evaluation_date >= NOW() - INTERVAL '7 days'
  AND (qa_evaluation_scores.ai_justification IS NOT NULL 
       OR qa_action_needed.action_needed = true)
ORDER BY qa_evaluations.evaluation_date DESC
```

#### 3. Fetch Active Contracts (Merged Knowledge Base)
```sql
SELECT parsed_content 
FROM revalida_v2_contracts 
WHERE is_active = true
ORDER BY uploaded_at DESC
```

### AI Prompt for Question Generation

```text
You are generating a knowledge assessment quiz for customer service agents.

CONTEXT:
- This week's focus is on reinforcing key processes and handling scenarios.
- Generate questions that test understanding of recent updates and compliance with service standards.

KNOWLEDGE BASE ARTICLES (Recent Updates):
{kb_articles_content}

QA COACHING AREAS (From previous week evaluations):
{qa_actions_and_suggestions}

CUSTOMER SERVICE STANDARDS:
{contract_knowledge_base}

REQUIREMENTS:
Generate exactly:
- {mcq_count} Multiple Choice questions (1 point each)
- {tf_count} True/False questions (1 point each)
- {situational_count} Situational questions (5 points each)

RESPONSE FORMAT (JSON):
{
  "questions": [
    {
      "type": "mcq",
      "prompt": "...",
      "choice_a": "...",
      "choice_b": "...",
      "choice_c": "...",
      "choice_d": "...",
      "correct_answer": "A",
      "source_type": "kb_article|qa_action|contract",
      "source_reference": "UPD-123|QA-EVAL-456",
      "source_excerpt": "..."
    },
    {
      "type": "true_false",
      "prompt": "...",
      "correct_answer": "True|False",
      "source_type": "...",
      "source_reference": "...",
      "source_excerpt": "..."
    },
    {
      "type": "situational",
      "prompt": "...",
      "evaluation_rubric": "Excellent: ... Good: ... Acceptable: ... Below: ...",
      "source_type": "...",
      "source_reference": "...",
      "source_excerpt": "..."
    }
  ]
}
```

### AI Prompt for Situational Grading

```text
You are grading a customer service agent's response to a situational scenario.

SCENARIO:
{question_prompt}

EVALUATION RUBRIC:
{evaluation_rubric}

CONTEXT (source material):
{source_excerpt}

AGENT'S RESPONSE:
{agent_answer}

Evaluate and provide:
1. Score (0-5 points)
2. Brief justification (1-2 sentences)

RESPONSE FORMAT (JSON):
{
  "suggested_score": 4,
  "justification": "Agent demonstrated understanding of the core requirement and addressed the scenario appropriately, though could have included additional context."
}
```

---

## Frontend Components

### New Pages & Components

| Component | Purpose |
|-----------|---------|
| `src/pages/RevalidaV2.tsx` | Main page under Team Performance |
| `src/components/revalida-v2/BatchConfigForm.tsx` | Configure MCQ/T-F/Situational counts |
| `src/components/revalida-v2/ContractManager.tsx` | Upload & manage contract PDFs |
| `src/components/revalida-v2/GenerationStatus.tsx` | Show AI generation progress |
| `src/components/revalida-v2/QuestionPreview.tsx` | Admin: Review questions with sources |
| `src/components/revalida-v2/TestInterface.tsx` | Agent: Take the test |
| `src/components/revalida-v2/SituationalGrading.tsx` | Admin: Review AI scores + override |
| `src/lib/revalidaV2Api.ts` | API layer for all CRUD operations |

### Admin Workflow

1. **Create Batch**: Specify title, MCQ count, T/F count, Situational count
2. **Generate Questions**: AI fetches KB articles, QA data, contracts → generates questions
3. **Review Questions**: See each question with source excerpt, can edit before publishing
4. **Publish Batch**: Makes active for agents to take
5. **Review Results**: See auto-graded MCQ/T-F scores, review AI-suggested situational scores
6. **Override Scores** (Optional): Accept or adjust AI-suggested scores with reason

### Agent Workflow

1. **Take Test**: Answer all questions (1-by-1 with navigation)
2. **View Results**: See score breakdown
   - MCQ/T-F: Immediately shows if correct
   - Situational: Shows "Pending AI Review" until graded
3. **See Feedback**: View justifications for situational responses

---

## RLS Policies (Security)

| Table | Agent | Admin |
|-------|-------|-------|
| `revalida_v2_batches` | Read (active only) | Full CRUD |
| `revalida_v2_questions` | Read (in active batch) | Full CRUD |
| `revalida_v2_attempts` | CRUD own attempts | Read all |
| `revalida_v2_answers` | CRUD own answers | Read all |
| `revalida_v2_contracts` | No access | Full CRUD |

---

## Edge Functions to Create

| Function | Purpose |
|----------|---------|
| `generate-revalida-v2` | Fetch KB/QA/Contracts + call AI to generate questions |
| `grade-situational-v2` | Grade situational response with AI score suggestion |

---

## Routes to Add

- `/team-performance/revalida-v2` - Main page
- `/team-performance/revalida-v2/:batchId` - Batch detail / take test
- `/team-performance/revalida-v2/:batchId/results` - Results view
- `/team-performance/revalida-v2/admin/contracts` - Contract management

---

## Files to Create

**New Files**:
- `src/pages/RevalidaV2.tsx`
- `src/lib/revalidaV2Api.ts`
- `src/components/revalida-v2/BatchConfigForm.tsx`
- `src/components/revalida-v2/ContractManager.tsx`
- `src/components/revalida-v2/GenerationStatus.tsx`
- `src/components/revalida-v2/QuestionPreview.tsx`
- `src/components/revalida-v2/TestInterface.tsx`
- `src/components/revalida-v2/SituationalGrading.tsx`
- `supabase/functions/generate-revalida-v2/index.ts`
- `supabase/functions/grade-situational-v2/index.ts`

**Modify**:
- `src/App.tsx` - Add route
- `src/components/Layout.tsx` - Add menu item under Team Performance
- `supabase/config.toml` - Register new functions

---

## Summary

This is a complete AI-powered assessment system that:
- ✅ Auto-generates questions from 3 knowledge sources (KB articles, QA data, contracts)
- ✅ Fixed scoring: 1pt MCQ/T-F, 5pt Situational
- ✅ Auto-grades MCQ/T-F immediately
- ✅ AI-suggests scores for situational (like QA Eval)
- ✅ Admin can review, override, with audit trail
- ✅ Source tracking (admin only visibility)
- ✅ Full RLS security implementation
