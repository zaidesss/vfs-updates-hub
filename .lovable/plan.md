

# Plan: Fix RLS Policy for Revalida Attempt Submission

## Problem Identified

When agents submit a test, the UPDATE on `revalida_attempts` fails with RLS violation because:

1. The current policy **"Agents can update own in_progress attempts"** has:
   - `USING: agent_email = jwt_email AND status = 'in_progress'`
   - `WITH CHECK: NULL` (defaults to same as USING)

2. When updating the attempt to change status from `in_progress` to `submitted` or `graded`:
   - USING clause passes (current row has status = 'in_progress')
   - WITH CHECK clause fails (new row has status = 'submitted', not 'in_progress')

3. PostgreSQL requires the NEW row values to satisfy WITH CHECK for UPDATE operations.

## Root Cause

The `WITH CHECK` clause is unintentionally blocking status changes because it enforces that the **resulting row** must also have `status = 'in_progress'`, which is impossible when submitting a test.

---

## Solution

Update the agent's UPDATE policy to allow status transitions during submission:

```sql
-- Drop the existing policy
DROP POLICY IF EXISTS "Agents can update own in_progress attempts" 
  ON public.revalida_attempts;

-- Create a new policy that:
-- - USING: Can update their own in_progress attempts
-- - WITH CHECK: Allows the update to result in submitted/graded status
CREATE POLICY "Agents can update own in_progress attempts"
  ON public.revalida_attempts FOR UPDATE
  USING (
    agent_email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text))
    AND status = 'in_progress'
  )
  WITH CHECK (
    agent_email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text))
    AND status IN ('in_progress', 'submitted', 'needs_manual_review', 'graded')
  );
```

This allows agents to:
- Only UPDATE their own attempts (email match)
- Only UPDATE attempts that are currently `in_progress` (USING)
- Set status to any valid value including `submitted`, `needs_manual_review`, or `graded` (WITH CHECK)

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| Database Migration | Create | Fix UPDATE policy WITH CHECK clause on revalida_attempts |

---

## Testing After Fix

1. Navigate to `/team-performance/revalida`
2. Start or continue an in-progress test
3. Answer questions and click "Submit Test"
4. Verify submission succeeds without RLS error
5. Verify test shows as "Submitted" or "Pending Review" (if has situational questions)

