

## Plan: Add Resume Button for Paused Backfill Jobs

### Problem
The job history table shows paused jobs but there's no way to resume them. The edge function already supports `resume: true` with a `job_id`, but the UI doesn't expose this.

### Other Considerations
1. **Should completed jobs be visually distinct from paused ones?** Currently both just show a badge. Paused jobs are the only ones that should be resumable.
2. **Should there be a cancel/delete option for old jobs?** Right now the history just accumulates.

### Implementation

Add a "Resume" button in each job history row for jobs with `status === 'Paused'` or `status === 'Running'` (stuck jobs). Clicking it will:
- Set `isRunning = true`
- Call `invokeBackfill` with `resume: true` and the job's `job_id`, `job_type`, and `dry_run`
- Auto-chain from there

### Changes

| File | Change |
|---|---|
| `src/components/admin/BackfillManager.tsx` | Add "Actions" column to job history table with a Resume button for paused jobs. Add `resumeJob()` function that calls `invokeBackfill` with `resume: true` and starts auto-chaining. |

### What This Does NOT Touch
- Edge function (already supports resume)
- Database schema (no changes needed)

