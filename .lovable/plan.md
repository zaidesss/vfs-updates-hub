

## Investigation Results

**The data exists in the database** (8 rows with real ticket volumes: 971, 892, 693, 643 for ZD1 and 233, 233, 197, 224 for ZD2). The RLS policy correctly allows authenticated users to SELECT. The user IS authenticated.

**Root cause**: The `useSlaHistory()` hook's Supabase query is likely failing silently on the client side. The Supabase JS client may return `{ data: null, error: null }` in certain edge cases (e.g., PostgREST response parsing issues with the JSONB `distribution` column), causing `data || []` to resolve to an empty array. The error is caught but `setSnapshots` receives `[]`. Additionally, there is a secondary issue: the `SlaCards` component lacks `forwardRef`, causing a React warning when used inside `TabsContent`.

## Plan

### Step 1: Fix the `useSlaHistory` query
In `src/lib/slaResponsivenessApi.ts`:
- Add `console.log` debugging for the raw query response
- Simplify the `.select()` to use `'*'` instead of listing individual columns (avoids potential column name mismatches with PostgREST)
- Add a fallback: if `data` is null but `error` is also null, set an explicit error message

### Step 2: Fix the `SlaCards` forwardRef warning
In `src/pages/operations/Responsiveness.tsx`:
- Wrap the `SlaCards` component with `React.forwardRef` to eliminate the console warning (this is a secondary fix but good housekeeping)

### Other considerations
- The `distribution` JSONB column may contain null values from the backfill that could cause type casting issues. The fix in Step 1 (using `'*'`) should handle this gracefully.
- The nightly cron job for `snapshot-sla-daily` should be verified separately to ensure future days populate correctly.

