

## Plan: NB Quiz Page — AI-Generated Fill-in-the-Blank Quizzes

### What We're Building
A new "NB Quiz" page under Team Performance with 4 date tabs (03.03.26 through 03.06.26). Each tab contains 10 AI-generated fill-in-the-blank questions sourced from Knowledge Base articles. Agents type answers, submit, and see their score. Results persist to the database.

### Database Changes (2 new tables + 1 migration)

**Table: `nb_quiz_questions`**
- `id` uuid PK
- `quiz_date` date NOT NULL (e.g. 2026-03-03)
- `question_number` integer NOT NULL
- `question_text` text NOT NULL (with `______` blank marker)
- `correct_answer` text NOT NULL
- `source_article_title` text
- `created_at` timestamptz DEFAULT now()
- UNIQUE(quiz_date, question_number)

**Table: `nb_quiz_submissions`**
- `id` uuid PK
- `agent_email` text NOT NULL
- `quiz_date` date NOT NULL
- `answers` jsonb NOT NULL (array of {question_id, answer})
- `score` integer NOT NULL
- `total` integer NOT NULL
- `submitted_at` timestamptz DEFAULT now()
- UNIQUE(agent_email, quiz_date) — one attempt per day

RLS: Authenticated users can SELECT questions. Agents can INSERT their own submission (agent_email = auth email) and SELECT their own submissions. Admins can SELECT all submissions.

### Edge Function: `generate-nb-quiz`

- Accepts `{ quizDate: string }`
- Fetches all published KB articles from `updates` table
- Calls Lovable AI (google/gemini-2.5-flash) with a prompt to generate 10 fill-in-the-blank questions with answers
- Inserts into `nb_quiz_questions`
- Returns success

### New Page: `src/pages/NBQuiz.tsx`

- 4 date tabs: "03.03.26", "03.04.26", "03.05.26", "03.06.26"
- Each tab loads questions from `nb_quiz_questions` for that date
- If no questions exist yet (admin view), shows a "Generate Questions" button that calls the edge function
- Quiz UI: numbered questions with text inputs for blanks
- Submit button → grades answers (case-insensitive match), saves to `nb_quiz_submissions`, shows score card
- If agent already submitted for that date, shows their previous score (read-only)

### Navigation
- Add to Team Performance menu in `Layout.tsx` as "NB Quiz" with `BookOpen` icon
- Route: `/team-performance/nb-quiz`

### File Changes

| File | Change |
|------|--------|
| Migration SQL | Create `nb_quiz_questions` and `nb_quiz_submissions` tables with RLS |
| `supabase/functions/generate-nb-quiz/index.ts` | New edge function for AI question generation |
| `supabase/config.toml` | Add function entry (verify_jwt = false) |
| `src/pages/NBQuiz.tsx` | New page component with tabs, quiz form, scoring |
| `src/App.tsx` | Add route `/team-performance/nb-quiz` |
| `src/components/Layout.tsx` | Add "NB Quiz" nav item under Team Performance |

### Step-by-Step Implementation Order
1. Create database tables + RLS policies
2. Create edge function for AI generation
3. Build the NBQuiz page component
4. Wire up route + navigation

