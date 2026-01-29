

## Fix: Upwork OAuth Redirect URI Mismatch

### Problem Identified
The edge function dynamically generates the `redirect_uri` using `url.origin`, but in the Supabase edge function runtime, this returns an internal URL (`http://localhost:9999`) rather than the public URL. This causes a mismatch with the callback URL registered in Upwork.

### Solution
Hardcode the correct public Supabase URL in the edge function instead of dynamically generating it.

### Changes Required

**File: `supabase/functions/upwork-oauth-callback/index.ts`**

Update both occurrences of the redirect URI (lines 26 and 46):

```typescript
// Before (dynamic - causes mismatch):
const redirectUri = `${url.origin}/functions/v1/upwork-oauth-callback`;

// After (hardcoded - exact match):
const redirectUri = 'https://rsjjvgyobtazxgeedmvi.supabase.co/functions/v1/upwork-oauth-callback';
```

### Technical Details
- The Supabase edge function runtime uses an internal proxy architecture
- `req.url` and `url.origin` reflect the internal runtime URL, not the public-facing URL
- This is a common pattern issue when dealing with OAuth callbacks in serverless functions
- Both the authorization redirect (line 26) AND the token exchange (line 46) need to use the same hardcoded URL

### After Implementation
1. The function will be redeployed automatically
2. Visit the same URL to authorize: `https://rsjjvgyobtazxgeedmvi.supabase.co/functions/v1/upwork-oauth-callback`
3. You'll be redirected to Upwork's authorization page with the correct callback URL
4. After authorizing, the tokens will be displayed for you to save

