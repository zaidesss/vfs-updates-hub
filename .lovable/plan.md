

# Fix Upwork Token Refresh Automation

## Root Cause

The `refresh-upwork-tokens` backend function is missing its JWT verification bypass in the configuration. The scheduled job sends requests with the standard key, but the function rejects them silently because JWT verification is enabled by default. This means the proactive token refresh **never actually ran**, and the tokens expired naturally on Feb 9th.

## Fix (1 step, 1 file)

### Step 1: Add JWT bypass for refresh-upwork-tokens

Add the missing configuration entry to `supabase/config.toml`:

```toml
[functions.refresh-upwork-tokens]
verify_jwt = false
```

This allows the scheduled job to successfully invoke the function every 6 hours.

### Step 2: Manual Re-authorization (you need to do this)

Since the current refresh token is expired/invalid, the automation cannot recover on its own. You need to visit the Upwork OAuth callback URL once to get a fresh token pair. After that, the now-working cron job will keep them alive automatically.

## Why This Happened

The function was created but its config entry was never added to the configuration file, so every scheduled call was silently rejected. The function code and cron job were correct -- it was just this one missing config line.

