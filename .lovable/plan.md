

# Fix QA Score Filtering in Scorecard RPC

## Problem

The `get_weekly_scorecard_data` RPC filters QA evaluations by `audit_date` instead of `work_week_start`. This causes evaluations to appear in the wrong week on the scorecard.

**Example:** Jessie Argao has 5 QA evaluations all tagged to work week Feb 2-8 (`work_week_start = 2026-02-02`). However, one of them has `audit_date = 2026-02-10`. When viewing the Feb 9-15 scorecard, the RPC matches that record because `2026-02-10` falls within `Feb 9-15`, incorrectly showing a 100% QA score.

## Fix

Update the `qa_scores` CTE in the RPC to filter by `work_week_start` instead of `audit_date`.

**Current (line 97):**
```sql
WHERE qe.audit_date >= p_week_start AND qe.audit_date <= p_week_end
```

**New:**
```sql
WHERE qe.work_week_start >= p_week_start AND qe.work_week_start <= p_week_end
```

This ensures QA scores only appear in the week they were intentionally assigned to, regardless of when the audit was physically conducted.

## Additional Considerations

1. **QA Evaluations list page** -- Does the QA Evaluations page (`/qa-evaluations`) also filter by `audit_date`? If so, the same mismatch could appear there. The `fetchQAEvaluations` API function already filters by `work_week_start`, so this is fine.

2. **Saved scorecards** -- Any previously saved scorecards for Feb 9-15 that captured the incorrect QA value would retain that stale data. These would need to be re-saved after the fix to reflect the corrected score.

## Implementation

A single SQL migration to update the RPC function, replacing `audit_date` with `work_week_start` in the `qa_scores` CTE.
