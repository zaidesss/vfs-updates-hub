

## Fix: Backfill Cursor Not Advancing

### Root Cause
The Zendesk Incremental **Cursor** API returns `after_url` containing a `cursor=<opaque_token>`, NOT `start_time=<unix>`. The regex on line 243 (`/start_time=(\d+)/`) never matches, so `cursorUnix` stays frozen. Every batch re-fetches the same first page of tickets.

This explains:
- 22,500 processed but 0 updated (same ~500 tickets scanned 45 times)
- `cursor_unix` stuck at `1757376000` in every response

### Fix Details

**File: `supabase/functions/zd-backfill-email-counted/index.ts`**

1. Add a `cursor_token` field to track the opaque cursor string (stored alongside `cursor_unix` in the DB).
2. On resume, use `cursor_token` to build the `after_url` instead of `start_time`.
3. After each page, save `data.after_cursor` (the opaque token) and the full `after_url`.
4. Remove the broken regex extraction.

**Database: `zd_backfill_jobs` table**

Add a `cursor_token` TEXT column to store the opaque cursor string.

### Changes

| File/Resource | Change |
|---|---|
| Database migration | Add `cursor_token TEXT` column to `zd_backfill_jobs` |
| `supabase/functions/zd-backfill-email-counted/index.ts` | Use `data.after_cursor` / `data.after_url` for pagination instead of regex. Store/resume from `cursor_token`. |

### What This Fixes
- Cursor will actually advance through tickets
- Job will reach the ~5k non-solved/closed email tickets that need tagging
- Resume will continue from the correct position

### Recommendation
After deploying, the existing jobs (with stuck cursors) should be abandoned. Start a fresh backfill job — it will now correctly page through all 27k tickets and tag the ~5k that qualify.

