
# Plan: Integrate Revalida Scores into Scorecard + Fix Eye Icon with Role-Based Answer Visibility

## Summary of Issues

### Issue 1: Revalida Shows "Pending" in Scorecard
- In `scorecardApi.ts` lines 535-537 and 569, the Revalida score is hardcoded to `null`
- No query fetches the actual `revalida_attempts` table to get agent scores
- The Revalida metric is not included in the final score calculation

### Issue 2: Eye Icon Not Working for All Attempts
- In `Revalida.tsx` lines 333-338, `handleViewAttempt` only triggers the grading dialog if `status === 'needs_manual_review'`
- For graded or submitted attempts, clicking the eye does nothing

### Issue 3: Role-Based Answer Visibility
- **Admins**: Should see whether each answer is correct (show ✓ or ✗ indicators)
- **Regular users (agents)**: Should only see their score, not individual answer correctness

---

## Solution Overview

### Part 1: Scorecard Integration
Modify `fetchWeeklyScorecard` to:
1. Query `revalida_batches` to find batches whose `start_at` falls within the scorecard week
2. Query `revalida_attempts` for those batches to get agent scores
3. Populate the `revalida` field with `final_percent` (or `null` if not graded)
4. Include Revalida in final score calculation

### Part 2: Submission Detail Dialog
Create a new dialog component that:
- Shows attempt metadata (agent, batch, submission time, score)
- Lists all questions with the agent's answers
- **For Admins**: Shows whether each answer is correct (✓/✗)
- **For Regular users**: Shows only question/answer without correctness indicators

### Part 3: Eye Icon Fix
Update `handleViewAttempt` to open the new detail dialog for all statuses (not just `needs_manual_review`). For `needs_manual_review`, continue to also allow grading.

---

## Technical Implementation

### Files to Create

| File | Description |
|------|-------------|
| `src/components/revalida/SubmissionDetailDialog.tsx` | View-only dialog showing attempt details with role-based answer visibility |

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/scorecardApi.ts` | Add query for `revalida_attempts`, populate `revalida` field, include in final score |
| `src/pages/TeamScorecard.tsx` | Display actual Revalida score instead of "Pending" |
| `src/pages/Revalida.tsx` | Add state for detail dialog, update `handleViewAttempt` to work for all statuses |
| `src/lib/revalidaApi.ts` | Add function to fetch attempt details for viewing |

---

## Detailed Changes

### 1. scorecardApi.ts - Fetch Revalida Scores

```typescript
// Inside fetchWeeklyScorecard(), add:

// Fetch Revalida batches whose start_at falls within this week
const { data: revalidaBatches } = await supabase
  .from('revalida_batches')
  .select('id')
  .gte('start_at', weekStartStr)
  .lte('start_at', weekEndStr + 'T23:59:59');

const weeklyBatchIds = (revalidaBatches || []).map(b => b.id);

// Fetch graded attempts for those batches
let revalidaMap = new Map<string, number>();
if (weeklyBatchIds.length > 0) {
  const { data: attempts } = await supabase
    .from('revalida_attempts')
    .select('agent_email, final_percent')
    .in('batch_id', weeklyBatchIds)
    .eq('status', 'graded');
  
  for (const attempt of attempts || []) {
    if (attempt.final_percent !== null) {
      revalidaMap.set(attempt.agent_email.toLowerCase(), attempt.final_percent);
    }
  }
}

// Then in the scorecard building:
revalida: revalidaMap.get(agentEmailLower) ?? null,

// And update the final score calculation:
case 'revalida':
  metricValue = revalidaMap.get(agentEmailLower) ?? null;
  break;
```

### 2. TeamScorecard.tsx - Display Actual Revalida Score

Replace the "Pending" placeholder (lines 897-906) with:

```tsx
{showRevalida && (
  <TableCell className="text-center">
    {metricApplies(scorecard.agent.position, 'revalida') ? (
      scorecard.revalida !== null ? (
        <div className={`px-2 py-1 rounded ${getScoreBgColor(scorecard.revalida, getMetricGoal('revalida', scorecard.agent.position))}`}>
          <span className={getScoreColor(scorecard.revalida, getMetricGoal('revalida', scorecard.agent.position))}>
            {formatScore(scorecard.revalida)}
          </span>
        </div>
      ) : (
        <div className="px-2 py-1 rounded bg-muted/30">
          <span className="text-muted-foreground">-</span>
        </div>
      )
    ) : (
      <span className="text-muted-foreground">-</span>
    )}
  </TableCell>
)}
```

### 3. SubmissionDetailDialog.tsx (New Component)

```tsx
interface SubmissionDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  attempt: RevalidaAttempt | null;
  batch: RevalidaBatch | null;
  questions: RevalidaQuestion[];
  answers: RevalidaAnswer[];
  isAdmin: boolean;  // Determines if correctness indicators are shown
}
```

Key features:
- Header with agent email, batch title, submitted date
- Score summary (auto-graded points, manual points, final %)
- Question list showing:
  - Question prompt
  - Agent's answer
  - **Admin only**: ✓ green or ✗ red indicator for correctness
  - **Admin only**: Points awarded vs max points
  - **Agents**: Just the question and their answer (no correctness)

### 4. Revalida.tsx - View Attempt Handler Update

```typescript
// New state
const [viewingAttempt, setViewingAttempt] = useState<RevalidaAttempt | null>(null);
const [viewingBatch, setViewingBatch] = useState<RevalidaBatch | null>(null);
const [viewingQuestions, setViewingQuestions] = useState<RevalidaQuestion[]>([]);
const [viewingAnswers, setViewingAnswers] = useState<RevalidaAnswer[]>([]);
const [viewLoading, setViewLoading] = useState(false);

// Updated handler
const handleViewAttempt = async (attemptId: string) => {
  const attempt = allAttempts.find(a => a.id === attemptId);
  if (!attempt) return;

  setViewLoading(true);
  try {
    const { batch, questions } = await fetchBatchById(attempt.batch_id);
    const answers = await fetchAnswersForAttempt(attemptId);
    
    setViewingAttempt(attempt);
    setViewingBatch(batch);
    setViewingQuestions(questions);
    setViewingAnswers(answers);
  } finally {
    setViewLoading(false);
  }
};

// In render, add the dialog:
<SubmissionDetailDialog
  isOpen={!!viewingAttempt}
  onOpenChange={(open) => !open && setViewingAttempt(null)}
  attempt={viewingAttempt}
  batch={viewingBatch}
  questions={viewingQuestions}
  answers={viewingAnswers}
  isAdmin={isAdmin}
/>
```

---

## Role-Based Answer Visibility Logic

| User Role | What They See |
|-----------|---------------|
| **Admin/Super Admin** | Question, Agent's Answer, ✓/✗ indicator, Points (e.g., "5/5" or "0/5"), Feedback if any |
| **Regular User (Agent)** | Question, Agent's Answer only - no correctness indicators |

This is controlled by the `isAdmin` prop passed to `SubmissionDetailDialog`. The component conditionally renders correctness indicators based on this prop.

---

## Week-Batch Matching Logic

Batches are matched to scorecard weeks using the batch's `start_at` timestamp:
- If a batch's `start_at` falls within Monday-Sunday of the scorecard week, that batch's scores are included
- If multiple batches exist in one week, all of them are considered (latest graded attempt per agent is used)
- If an agent hasn't taken the test or it's not graded, `revalida` remains `null`

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/revalida/SubmissionDetailDialog.tsx` | Create | Role-based attempt detail view |
| `src/lib/scorecardApi.ts` | Modify | Fetch Revalida scores from attempts table |
| `src/pages/TeamScorecard.tsx` | Modify | Display actual Revalida percentages |
| `src/pages/Revalida.tsx` | Modify | Add detail dialog state and update view handler |

---

## Implementation Order

1. **First**: Update `scorecardApi.ts` to fetch and include Revalida scores
2. **Second**: Update `TeamScorecard.tsx` to display actual scores
3. **Third**: Create `SubmissionDetailDialog.tsx` with role-based visibility
4. **Fourth**: Update `Revalida.tsx` to use the new detail dialog
