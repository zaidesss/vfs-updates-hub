

## Add Full Update Preview to Eye Icon Dialog (Admin Panel)

### What Changes

The eye icon button on each row in "All Updates" currently opens a small dialog showing only the acknowledgement list. We will expand it to show a **full preview of the update** (title, metadata, rendered markdown body with images) followed by the acknowledgement list -- similar to how the Announcement feature shows a rich preview before the action section.

### Implementation

**File: `src/pages/Admin.tsx`** (lines ~1448-1490)

Replace the current eye icon Dialog content with an enhanced preview that includes:

1. **Header section**: Update title, reference number, category badge, status badge, posted date, deadline, posted by, and help center link
2. **Body section**: The update's markdown body rendered using `MarkdownRenderer` (which already handles images via `ReactMarkdown` with `remarkGfm` -- any `![image](url)` in markdown will render as actual images)
3. **Acknowledgement section**: The existing acknowledged users list with export button, kept below the preview with a separator

### Technical Details

- Import `MarkdownRenderer` from `@/components/MarkdownRenderer` (already used in `UpdateDetail.tsx`)
- Import `Separator` from `@/components/ui/separator`
- The `MarkdownRenderer` component uses `ReactMarkdown` with `remarkGfm` and already has `prose-img:rounded-lg prose-img:shadow-md` styling, so any markdown images (like the storage URLs shown in the screenshot) will render properly
- Set `showToc={false}` on `MarkdownRenderer` since this is a dialog preview, not a full page
- Widen the dialog to `max-w-4xl` for better readability
- Add proper scrolling for long update bodies

### Considerations

- **No other files need changes** -- the `MarkdownRenderer` already handles all markdown features including images, tables, callouts, and links
- The dialog will have two clear sections: "Preview" at the top and "Acknowledgements" at the bottom, separated by a visual divider
- The acknowledgement list and CSV export remain exactly as they are today

