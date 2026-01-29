

# Upwork OAuth 2.0 Implementation Fix

## Problem Analysis

The current implementation has **critical flaws** causing fresh tokens to fail immediately:

1. **Static Token Storage**: Tokens are stored as environment secrets (Deno.env) which:
   - Cannot be updated programmatically when refreshed
   - Causes old refresh tokens to be reused after rotation (Upwork invalidates them)
   - Makes the manual copy-paste workflow inherently broken

2. **Token Rotation Not Handled**: Upwork rotates refresh tokens - each refresh returns a NEW refresh token, but the current code can't persist it

3. **Race Condition Risk**: Multiple concurrent requests could trigger parallel token refreshes

4. **Incorrect Error Handling**: The code assumes 401 = expired, but could be scope/permission issues

---

## Solution Overview

Store tokens in a **database table** with automatic refresh and rotation handling.

```text
+-----------------------+     +------------------+     +------------------+
| OAuth Callback        | --> | upwork_tokens    | <-- | fetch-upwork-time|
| (stores new tokens)   |     | (single row DB)  |     | (reads & refreshes)
+-----------------------+     +------------------+     +------------------+
```

---

## Implementation Steps

### Step 1: Create Database Table for Token Storage

Create a new table `upwork_tokens` to store OAuth tokens persistently:

**Table Schema:**
- `id` (text, primary key) - Always "default" (single row for org-wide tokens)
- `access_token` (text, not null)
- `refresh_token` (text, not null)
- `expires_at` (timestamptz, not null) - When access token expires
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `refresh_lock_until` (timestamptz) - Mutex lock to prevent concurrent refreshes

**RLS Policy:** Admin-only access (or service role only via edge functions)

---

### Step 2: Update OAuth Callback Edge Function

Modify `upwork-oauth-callback` to:

1. Calculate `expires_at` from response's `expires_in` value
2. Upsert tokens directly into `upwork_tokens` table
3. Show success page (no need to copy tokens manually anymore)

**Key Changes:**
- Create Supabase client with service role key
- Insert/update tokens in database immediately after exchange
- Display success message without exposing raw tokens

---

### Step 3: Update Fetch Upwork Time Edge Function

Complete rewrite of `fetch-upwork-time` to:

1. **Read tokens from database** (not environment variables)
2. **Check expiration** before making API calls
3. **Implement refresh mutex** to prevent concurrent refresh attempts
4. **Handle token rotation** - always save new refresh token from Upwork
5. **Better error categorization** - distinguish expired vs scope vs permission issues

**Token Refresh Logic:**
```text
1. Acquire refresh lock (set refresh_lock_until = now + 30 seconds)
2. Make refresh request to Upwork
3. Update BOTH access_token AND refresh_token in database
4. Update expires_at
5. Release lock (set refresh_lock_until = null)
```

**API Call Flow:**
```text
1. Read tokens from database
2. If expired or near expiry (<5 min): refresh first
3. Make Upwork API call
4. If 401 with explicit "expired" message: refresh and retry once
5. Log detailed error info for other 401 causes
```

---

### Step 4: Initial Token Migration

After approval, we'll need to:
1. Complete one fresh OAuth flow
2. Tokens will be stored directly in database
3. Remove reliance on UPWORK_ACCESS_TOKEN and UPWORK_REFRESH_TOKEN secrets

---

## Technical Details

### Database Migration SQL

```sql
CREATE TABLE public.upwork_tokens (
  id TEXT PRIMARY KEY DEFAULT 'default',
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  refresh_lock_until TIMESTAMPTZ DEFAULT NULL
);

-- RLS: Only allow access via service role (edge functions)
ALTER TABLE public.upwork_tokens ENABLE ROW LEVEL SECURITY;

-- No public policies - only service role can access
```

### Edge Function Changes Summary

**upwork-oauth-callback:**
- Add Supabase client initialization with service role
- After token exchange, upsert into `upwork_tokens` table
- Calculate expires_at as: `now() + expires_in seconds`
- Show clean success page without raw token display

**fetch-upwork-time:**
- Remove all `Deno.env.get('UPWORK_ACCESS_TOKEN')` references
- Add `getTokensFromDatabase()` function
- Add `refreshTokensWithLock()` function with mutex
- Add `shouldRefreshToken()` check (expired or within 5 min buffer)
- Update error logging to include token prefix + length
- Never assume 401 = expired unless Upwork explicitly says so

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/upwork-oauth-callback/index.ts` | Store tokens in DB instead of displaying |
| `supabase/functions/fetch-upwork-time/index.ts` | Read from DB, implement refresh with mutex |
| Database | New `upwork_tokens` table |

---

## Benefits After Implementation

1. **Tokens survive redeploys** - stored in database, not env vars
2. **Automatic refresh** - no manual re-authorization needed
3. **Token rotation handled** - new refresh tokens always saved
4. **No race conditions** - mutex prevents concurrent refresh
5. **Better debugging** - detailed error logging with token metadata

---

## Next Steps After Approval

1. Create the database table
2. Update OAuth callback function
3. Update fetch-upwork-time function
4. Deploy edge functions
5. Complete one OAuth flow to populate database
6. Test Upwork time fetch on dashboard

