

## Fix AI-Formatted (Playbook) Preview in Admin Update Dialog

### Problem

The eye icon preview dialog in the Admin panel only uses `MarkdownRenderer` to render the update body. Updates formatted by the AI use a JSON-based "Playbook" format (with `title`, `sections`, etc.). Since `MarkdownRenderer` cannot parse JSON, those updates display as raw JSON text instead of a rich preview.

The `UpdateDetail.tsx` page already handles this correctly by attempting to parse the body as JSON and rendering it with `PlaybookPage` when valid.

### Fix

**File: `src/pages/Admin.tsx`**

1. Import `PlaybookPage` and `PlaybookArticle` type (same as `UpdateDetail.tsx` does)
2. Before rendering the body in the preview dialog, attempt to parse it as Playbook JSON
3. If it parses successfully (has `title` and `sections` array), render with `PlaybookPage`
4. Otherwise, fall back to `MarkdownRenderer` as it does now

### Technical Details

Add these imports:
- `import { PlaybookPage } from '@/components/playbook/PlaybookPage'`
- `import { PlaybookArticle } from '@/lib/playbookTypes'`

Replace the body rendering block (~line 1483-1487) with logic that mirrors `UpdateDetail.tsx` lines 96-103:

```typescript
// Attempt playbook parse
let playbookData: PlaybookArticle | null = null;
try {
  const parsed = JSON.parse(update.body);
  if (parsed.title && parsed.sections && Array.isArray(parsed.sections)) {
    playbookData = parsed;
  }
} catch { /* not JSON, use markdown */ }

// Render
{playbookData ? <PlaybookPage article={playbookData} /> : <MarkdownRenderer ... />}
```

No other files need changes -- this reuses existing components.
