

## Fix: Re-host Button Visibility and Image URL Paste Support

### Problems Found

1. **Re-host button invisible**: The `RehostImagesButton` component returns `null` when the editor content is empty. Even after content is added, the toolbar has too many items (Image, Attach, Re-host, AI Format, "Supports Markdown" label) that can overflow in the dialog's limited width.

2. **Pasting image URLs doesn't work**: The current paste handler only detects binary image data from clipboard (e.g., screenshots or "Copy Image"). When you copy an image's URL text (e.g., `https://example.com/image.png`), it pastes as plain text without converting to a markdown image tag.

### Fixes

**Step 1: Make Re-host button always visible and fix toolbar overflow**

File: `src/components/editor/RehostImagesButton.tsx`
- Remove the `if (!content.trim()) return null;` condition so the button is always visible
- When clicked with no external images, show a toast saying "No external images found"

File: `src/components/MarkdownEditor.tsx`  
- Change the toolbar container from `flex` to `flex flex-wrap` so buttons wrap to a second line if needed instead of being cut off

**Step 2: Auto-detect pasted image URLs and convert to markdown**

File: `src/components/MarkdownEditor.tsx`
- Enhance the paste handler to also detect when pasted text looks like an image URL (ends in `.jpg`, `.png`, `.gif`, `.webp`, or matches common image hosting patterns)
- When an image URL is pasted, automatically wrap it in markdown syntax: `![image](pasted_url)` instead of just inserting raw text

### Technical Details

The paste handler enhancement will check for text clipboard data matching image URL patterns:

```text
Regex: /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i
```

If matched, it inserts `![image](url)` instead of the raw URL. This works alongside the existing binary image paste support.

