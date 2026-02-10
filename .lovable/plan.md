

# Add Multiple Attachments to Outage Requests

## Overview

Currently outage requests support only a single file attachment (stored as `attachment_url` text column). This plan upgrades it to support up to 3 file attachments per request, with a simple multi-file input (no popover), and migrates existing single attachments to the new format.

## Approach

Store multiple attachment URLs as a JSON array string in the existing `attachment_url` column. This avoids creating a new table or column, and keeps the migration simple.

- Old value: `"https://...single-file.pdf"`
- New value: `'["https://...file1.pdf","https://...file2.png"]'`

## Step-by-Step Changes

### Step 1: Database Migration

Migrate existing single-URL values in `attachment_url` to JSON array format:

```sql
UPDATE leave_requests 
SET attachment_url = '["' || attachment_url || '"]'
WHERE attachment_url IS NOT NULL 
  AND attachment_url != '' 
  AND attachment_url NOT LIKE '[%';
```

### Step 2: Update `leaveRequestApi.ts`

- Add a helper to parse `attachment_url` (handle both old string and new JSON array formats)
- Update `uploadAttachment` to return a URL (no change needed -- it already returns a single URL per call)
- Update create/update functions to serialize the array back to JSON string

### Step 3: Update `LeaveRequest.tsx` Form

- Replace single `attachment_url` string state with an array (e.g., `attachmentUrls: string[]`)
- Change `handleFileUpload` to append new URLs to the array (up to 3 max)
- Replace the single file display with a list showing all attachments, each with a remove button
- Add "3 files max" hint text
- Serialize array to JSON string when saving to `formData.attachment_url`

### Step 4: Update Request List Display

- Where `req.attachment_url` is displayed in the table (line ~1181), parse the JSON array and show multiple attachment links (e.g., "Attachment 1", "Attachment 2")

### Step 5: Update Audit Log

- Update `LeaveAuditLog.tsx` to handle the new JSON array format when displaying attachment changes

### Step 6: Update Notification Edge Functions

- Update `send-leave-request-notification` and `send-leave-decision-notification` to handle multiple attachment URLs if they reference `attachmentUrl`

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Convert existing single URLs to JSON array format |
| `src/lib/leaveRequestApi.ts` | Add parse/serialize helpers for attachment URLs |
| `src/pages/LeaveRequest.tsx` | Multi-file upload UI (max 3), display list of attachments |
| `src/components/leave/LeaveAuditLog.tsx` | Parse JSON array for attachment display |
| `supabase/functions/send-leave-request-notification/index.ts` | Handle array format |
| `supabase/functions/send-leave-decision-notification/index.ts` | Handle array format |

