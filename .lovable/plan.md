
# Schedule Proactive Upwork Token Refresh via Cron Job

## Problem Summary
Currently, Upwork token refresh only happens **on-demand** when `fetch-upwork-time` is called. If no API calls are made for several days, tokens expire completely and require manual re-authorization. This creates unnecessary user friction.

**Solution**: Create a scheduled cron job that automatically refreshes tokens **before they expire** (proactively) to keep them valid at all times.

---

## Implementation Plan

### Step 1: Create New Edge Function for Token Refresh
**File**: `supabase/functions/refresh-upwork-tokens/index.ts` (new)

This function will:
- Fetch the current tokens from the database
- Check if they're within 12 hours of expiry (proactive refresh buffer)
- Call the existing `refreshTokensWithLock()` logic from `fetch-upwork-time`
- Return success/failure status with logging
- Be callable by the cron job via HTTP POST

**Key characteristics**:
- No CORS headers needed (internal only)
- Uses service role key (like fetch-upwork-time)
- Reuses token refresh logic to avoid duplication
- Logs all activity for debugging

### Step 2: Add Function to config.toml
**File**: `supabase/config.toml`

Add entry:
```toml
[functions.refresh-upwork-tokens]
verify_jwt = false
```

### Step 3: Create Cron Job via Migration
**File**: `supabase/migrations/[timestamp]_setup-upwork-token-refresh-cron.sql` (new)

Create a cron job that:
- Runs **every 6 hours** (or 12 hours if preferred)
- Calls the new `refresh-upwork-tokens` edge function via `net.http_post()`
- Uses the existing `pg_cron` and `pg_net` extensions (already enabled)
- Passes the anon key for authentication
- Includes the project URL (derived from environment or hardcoded from project config)

**Cron schedule options**:
- `0 */6 * * *` = Every 6 hours (refreshes 4x daily) - **Most reliable**
- `0 */12 * * *` = Every 12 hours (refreshes 2x daily)
- `0 0 * * *` = Daily at midnight - **Simplest**

**Recommended**: Every 6 hours. This ensures tokens are refreshed well before the ~24 hour Upwork token lifetime expires.

---

## Execution Flow

```
┌─────────────────────────────┐
│  pg_cron Job Triggers       │
│  Every 6 hours              │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ net.http_post() to              │
│ /functions/v1/refresh-upwork... │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ refresh-upwork-tokens           │
│ Edge Function                   │
│ - Get current tokens            │
│ - Check expiry (12hr buffer)    │
│ - Refresh if needed             │
│ - Log status                    │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ Tokens stay fresh 24/7          │
│ fetch-upwork-time always works  │
└─────────────────────────────────┘
```

---

## Technical Details

### Token Expiry Logic
- Upwork tokens expire in ~3600 seconds (1 hour typical OAuth)
- **12-hour proactive buffer**: Refresh if `now() >= (expires_at - 12 hours)`
- This ensures tokens are refreshed 12 hours before actual expiry
- Prevents edge cases where cron is delayed

### Database Requirements
No new tables needed. Uses existing `upwork_tokens` table with:
- `refresh_lock_until` column (prevents concurrent refreshes)
- Upsert logic already handles token rotation

### Error Handling
- If refresh fails, logs error but doesn't crash cron
- If no tokens exist, logs warning and exits gracefully
- Mutex lock prevents multiple concurrent refreshes

---

## Files to Create/Modify

| File | Action | Details |
|------|--------|---------|
| `supabase/functions/refresh-upwork-tokens/index.ts` | **CREATE** | New edge function for scheduled token refresh |
| `supabase/config.toml` | **MODIFY** | Add `[functions.refresh-upwork-tokens]` entry |
| `supabase/migrations/[timestamp]_setup-upwork-token-refresh-cron.sql` | **CREATE** | Migration to schedule the cron job |

---

## Verification After Implementation

1. **Check cron job is registered**:
   - Query `select * from cron.job;` in the database
   - Should show job for `refresh-upwork-tokens`

2. **Monitor function execution**:
   - Check edge function logs for `refresh-upwork-tokens`
   - Should see logs every 6 hours showing token refresh status

3. **Verify tokens stay fresh**:
   - Call `fetch-upwork-time` without manual re-authorization
   - Should work continuously for days/weeks

4. **Test failure recovery**:
   - Manually expire tokens in the database
   - Wait for next cron cycle or trigger manually
   - Tokens should refresh automatically

---

## Cron Job SQL (Overview)

The migration will include:
```sql
SELECT cron.schedule(
  'refresh-upwork-tokens-every-6-hours',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://PROJECT_ID.supabase.co/functions/v1/refresh-upwork-tokens',
    headers := '{"Authorization": "Bearer ANON_KEY"}'::jsonb
  ) AS request_id;
  $$
);
```

**Note**: The actual project URL and anon key will be inserted by the migration tool.

