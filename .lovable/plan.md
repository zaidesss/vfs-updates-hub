
# Add Full Email Preview to Confirmation Dialog

## Summary
Update the confirmation dialog to show a fully rendered preview that matches exactly how the email will appear when received, instead of just the first 200 characters of raw markdown text.

## Current Issue
- **Preview shows**: Raw markdown text (e.g., `**Discussion on the implementation**`)
- **Email received**: Full styled HTML template with gradient header, sender name, formatted content

## Solution Approach

### 1. Create a Shared Markdown-to-HTML Utility
Create a utility function on the frontend that mirrors the edge function's `markdownToHtml` logic so the preview matches the sent email exactly.

**File:** `src/lib/markdownToHtml.ts`

| Feature | Input | Output |
|---------|-------|--------|
| Bold | `**text**` | `<strong>text</strong>` |
| Italic | `*text*` | `<em>text</em>` |
| Links | `[text](url)` | `<a href="url">text</a>` |
| Unordered Lists | `- item` | `<li>item</li>` wrapped in `<ul>` |
| Ordered Lists | `1. item` | `<li>item</li>` wrapped in `<ol>` |
| Paragraphs | Plain text | `<p>text</p>` |

### 2. Create Email Preview Component
Create a reusable component that renders the exact email template shown in the second image.

**File:** `src/components/admin/EmailPreview.tsx`

**Structure:**
```text
+------------------------------------------+
| 📢 Announcement                          |  <- Purple gradient header
| From: [Sender Name]                      |
+------------------------------------------+
| [Subject as H2]                          |  <- White body section
|                                          |
| [Rendered HTML body content]             |
|   - Bold text rendered                   |
|   - Lists properly formatted             |
|   - Links clickable                      |
+------------------------------------------+
| Official announcement footer             |  <- Gray footer
| © 2026 Virtual Freelance Solutions       |
+------------------------------------------+
```

### 3. Update Confirmation Dialog
Modify `AnnouncementSender.tsx` to:
- Fetch current user's full name for the "From" field
- Replace text preview with the `EmailPreview` component
- Make the dialog scrollable for long emails

### 4. Fetch Sender Name
Add state and logic to fetch the current user's full name from `agent_profiles` to display in the preview header.

## Implementation Details

### Files to Create
| File | Purpose |
|------|---------|
| `src/lib/markdownToHtml.ts` | Shared markdown conversion utility |
| `src/components/admin/EmailPreview.tsx` | Styled email template preview component |

### Files to Modify
| File | Changes |
|------|---------|
| `src/components/admin/AnnouncementSender.tsx` | Import preview component, fetch sender name, update dialog |

### UI Changes in Dialog
- Remove: "Preview (first 200 chars)" text section
- Add: Full `EmailPreview` component with proper styling
- Add: `max-h-[60vh] overflow-y-auto` for scrollable preview
- Keep: Recipients count and subject display at top

### Technical Notes
- The preview component uses inline styles to match exactly what email clients render
- The markdown conversion is duplicated on frontend to avoid extra API calls
- The sender name is fetched once when the dialog opens
