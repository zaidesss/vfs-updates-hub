

## Fix Attachments, Re-host, Notifications, and Editor Reliability

### Problems Identified

1. **Attach button uploads files but they go nowhere** -- Uploaded attachments are stored in the `attachments` state but are never inserted into the update body. The "Images will be embedded or grouped in a gallery based on context" message is misleading -- nothing actually embeds them. They only get passed to AI Format, which may or may not use them.

2. **Re-host button is confusing** -- It scans for external image URLs in the markdown body and re-uploads them to your storage. But it only works if there are already `![image](external-url)` patterns in the body. Users don't understand when or why to use it.

3. **Pasting an image URL into the OS file picker causes an OS-level error** -- The "Image" button opens the native file picker, which only accepts actual files. Pasting a URL there is an OS limitation (the error `0x80004002` is a Windows COM error). This needs a URL input option.

4. **Draft updates send notifications on edit** -- Already identified in the previous plan.

### Plan (Step by Step)

**Step 1: Fix draft notification issue**
- File: `src/lib/api.ts` (line 625)
- Wrap the `send-notifications` call with `if (editedUpdate.status === 'published')`

**Step 2: Replace "Attach" with auto-insert behavior**
- File: `src/components/editor/FileAttachmentButton.tsx`
- Instead of silently storing files in state, after each successful upload, automatically insert the markdown into the editor body:
  - Images: insert `![filename](url)` 
  - Documents: insert `[filename](url)`
- Add a callback prop `onInsert: (markdown: string) => void` to directly insert into the editor
- Remove the confusing "gallery" messaging

**Step 3: Add URL-based image insertion**
- File: `src/components/editor/ImageInsertButton.tsx`
- Add a small popover/dialog with two options: "Upload File" (existing) and "Paste URL"
- The URL option accepts a URL string and inserts `![image](url)` directly -- no OS file picker needed
- This fixes the error the user encountered when trying to paste a URL into the file dialog

**Step 4: Simplify Re-host button UX**
- File: `src/components/editor/RehostImagesButton.tsx`
- Keep functionality as-is (it works correctly for its purpose) but improve the tooltip/description
- Show a count badge when external images are detected, so users know when it's relevant
- Change the empty-state toast to be more descriptive

**Step 5: Wire up changes in MarkdownEditor**
- File: `src/components/MarkdownEditor.tsx`
- Pass `insertAtCursor` to the updated FileAttachmentButton so uploaded files get inserted into the body immediately
- Update ImageInsertButton integration with the new URL option
- Remove the `attachments`/`onAttachmentsChange` props since attachments are now directly inserted as markdown (simplifying the API)

### Technical Details

The key architectural change: attachments no longer live in a separate state array. Instead, every uploaded file (image or document) is immediately inserted as markdown text into the editor body. This means:
- What you upload is what you see in preview
- No hidden state that "might" get used by AI Format
- The AI Format button still works because it reads the body content which now contains the image/document markdown

Files to modify:
- `src/lib/api.ts` -- notification guard (1 line change)
- `src/components/editor/FileAttachmentButton.tsx` -- convert to direct-insert behavior
- `src/components/editor/ImageInsertButton.tsx` -- add URL paste option
- `src/components/editor/RehostImagesButton.tsx` -- improve UX hints
- `src/components/MarkdownEditor.tsx` -- wire up new behavior, remove attachment state
- `src/components/EditUpdateDialog.tsx` -- remove attachment state (no longer needed)
- `src/components/admin/CreateUpdateDialog.tsx` -- remove attachment state (no longer needed)

