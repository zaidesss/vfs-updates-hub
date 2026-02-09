
# Auto-Email Notification on Revalida Batch Publish

## What Changes

When an admin publishes a Revalida (v1) or Revalida 2.0 batch, the system automatically emails all users with a styled announcement linking to the test. A small toast notification confirms the email was sent.

## Email Format

- **Subject**: `Revalida: [Batch Title]` (v1) or `Revalida 2.0: [Batch Title]` (v2)
- **Header**: Purple gradient with "Revalida Assessment" label (same style as announcements)
- **Body**: Batch title, message ("A new Revalida assessment is now available. You have 48 hours to complete it."), and a styled "Take the Test" button
- **Recipients**: All users via BCC (same as announcements)
- **Sender**: hr@virtualfreelancesolutions.com via Gmail API

## After Publish Behavior

- Batch publishes first (existing flow unchanged)
- Email sends in the background (non-blocking)
- On success: toast shows "Revalida test is live! All users have been notified via email."
- On failure: toast warning "Published successfully but email notification failed." -- batch stays published

## Technical Details

### Step 1: New Edge Function

**New file**: `supabase/functions/send-revalida-notification/index.ts`

- Accepts `{ batchTitle, testUrl, version }` ("v1" or "v2")
- Requires auth (admin/super_admin/HR only)
- Fetches all emails from `user_roles` table
- Builds announcement-style HTML email with "Take the Test" CTA button
- Sends via `sendGmailEmail` with BCC
- Subject: `Revalida: {title}` or `Revalida 2.0: {title}` based on version

**Register in** `supabase/config.toml`:
```
[functions.send-revalida-notification]
verify_jwt = false
```

### Step 2: Revalida v1 (`src/pages/Revalida.tsx`)

Add notification call in two places:

1. `handleSaveAndPublish` -- after `publishBatch(batch.id)` succeeds
2. `handlePublish` -- after `publishBatch(batchId)` succeeds

Both will call the edge function and show the appropriate toast on success/failure.

### Step 3: Revalida 2.0 (`src/pages/RevalidaV2.tsx`)

Update `handlePublish` -- after `publishBatch(targetId)` succeeds, fetch the batch title from the query cache and invoke the edge function. Show toast on success/failure.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/send-revalida-notification/index.ts` | New edge function |
| `supabase/config.toml` | Register new function |
| `src/pages/Revalida.tsx` | Add email call after publish (2 spots) |
| `src/pages/RevalidaV2.tsx` | Add email call after publish (1 spot) |

No database changes needed.
