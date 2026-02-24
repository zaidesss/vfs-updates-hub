

## Fix Zendesk Realtime Panel - Two Issues

### Issue 1: ZD2 Does Not Have Talk
The edge function currently tries to fetch Talk stats for ZD2, which returns 401/404 errors. We need to skip Talk API calls for ZD2 and return zeroed-out Talk stats instead.

### Issue 2: Sunshine Conversations API Key Authentication Failing
Both ZD1 and ZD2 Sunshine API calls return "Invalid key id (kid)". The stored secrets may have whitespace or encoding issues from the initial entry. We need to:
- Add debug logging to the edge function to print the key ID length and first/last few characters (without exposing the full key)
- Re-store the secrets if they appear corrupted

### Changes

**File: `supabase/functions/fetch-zendesk-realtime/index.ts`**
1. Skip Talk API calls for ZD2 -- return zeroed Talk stats for ZD2
2. Add debug logging for Sunshine key IDs (length and trimming) to diagnose the auth issue
3. Trim whitespace from all secret values before using them

### Implementation Steps (done one by one)

**Step 1**: Update the edge function to skip Talk for ZD2 and add `.trim()` to all secret values, plus debug logging for key IDs.

**Step 2**: Test and check logs. If keys still fail, re-enter the Sunshine secrets with verified values.

### Technical Details

In `fetch-zendesk-realtime/index.ts`:
- Change `fetchTalkStats('customerserviceadvocates2', ...)` to return a zeroed-out `TalkStats` object directly
- Add `.trim()` to all `Deno.env.get()` calls for Sunshine secrets
- Add `console.log` for key ID lengths to verify no whitespace issues
- The `ZD_CONFIGS` array reference can be simplified since ZD2 Talk is always skipped
