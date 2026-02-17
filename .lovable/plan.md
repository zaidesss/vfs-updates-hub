

## Image Support for Updates, Guides, and Pasted Content

### What we're building

Three image capabilities across the portal:

1. **Inline image insertion in the Markdown Editor** -- both a toolbar "Insert Image" button and clipboard paste (Ctrl+V) support that auto-uploads to storage and inserts the markdown image tag into the body.
2. **Replace Guide Image Placeholders** -- swap the existing `GuideImagePlaceholder` components with real uploadable images stored in the `guide-images` bucket.
3. **Manual re-upload of external images** -- a "Re-host Images" button that detects external image URLs in content and re-uploads them to your own storage on demand.

### Why this won't be heavy

- Images go to blob storage (existing `article-attachments` and `guide-images` buckets), not the database
- No AI credits consumed for image upload/display
- Only the "AI Format" and "Re-host" features use credits/network, and those are on-demand

---

### Step 1: Inline Image Insert Button + Clipboard Paste

**File: `src/components/MarkdownEditor.tsx`**
- Add an "Insert Image" button (image icon) to the editor toolbar area
- Clicking it opens a file picker (images only: JPG, PNG, GIF, WebP)
- Selected file uploads to `article-attachments` bucket
- On success, inserts `![filename](public_url)` at the cursor position in the markdown textarea
- Also attach a `paste` event listener to the textarea that detects image clipboard data, auto-uploads, and inserts the markdown tag

**File: `src/components/editor/ImageInsertButton.tsx`** (new)
- Encapsulates the upload-and-insert logic
- Accepts a callback to insert text at cursor position
- Shows a loading spinner during upload

### Step 2: Replace Guide Image Placeholders with Real Images

**File: `src/components/user-guide/GuideImagePlaceholder.tsx`**
- Transform from a static placeholder into an interactive component
- For admins: shows an upload button overlaid on the placeholder; clicking uploads to `guide-images` bucket and stores the URL
- For non-admins: if an image URL exists, renders the image; if not, shows the current placeholder

**Storage: guide image mapping**
- Create a new `guide_images` database table with columns: `id`, `image_key` (unique identifier matching the placeholder's description/key), `image_url`, `uploaded_by`, `uploaded_at`
- Admins upload images that map to specific placeholder keys
- Components query by key to display the real image or fallback to placeholder

**Files: Various guide section files** (e.g., `src/components/user-guide/sections/updated/*.tsx`)
- Update `GuideImagePlaceholder` usage to pass a unique `imageKey` prop so each placeholder can be individually replaced

### Step 3: Manual External Image Re-host Button

**File: `src/components/editor/RehostImagesButton.tsx`** (new)
- Scans the current markdown content for external image URLs (non-storage URLs)
- Shows a dialog listing found external images with thumbnails
- User selects which to re-upload; each selected image is downloaded via a backend function and uploaded to `article-attachments`
- The markdown content is updated with the new storage URLs

**File: `supabase/functions/rehost-image/index.ts`** (new edge function)
- Accepts an external image URL
- Downloads the image server-side (to avoid CORS issues)
- Uploads to the `article-attachments` bucket
- Returns the new public URL

### Step 4: Test end-to-end

- Verify image insert button works in the update creation flow
- Verify clipboard paste uploads and inserts correctly
- Verify guide placeholders can be replaced by admins
- Verify re-host button correctly replaces external URLs

---

### Technical Details

**Database migration (Step 2):**
```sql
CREATE TABLE public.guide_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_key TEXT UNIQUE NOT NULL,
  image_url TEXT NOT NULL,
  uploaded_by TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.guide_images ENABLE ROW LEVEL SECURITY;

-- Anyone can read guide images
CREATE POLICY "Anyone can view guide images"
  ON public.guide_images FOR SELECT USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage guide images"
  ON public.guide_images FOR ALL
  USING (
    public.has_role(
      lower((SELECT auth.jwt() ->> 'email')),
      'admin'
    )
    OR public.is_super_admin(
      lower((SELECT auth.jwt() ->> 'email'))
    )
  );
```

**Cursor insertion approach:**
The `@uiw/react-md-editor` exposes a ref and commands API. We'll use `document.execCommand('insertText', ...)` or the editor's command dispatch to insert text at the current cursor position.

**Re-host edge function:**
Uses `fetch()` to download the external image, then the Supabase admin client to upload to storage. No API keys needed beyond the existing service role key.

### Implementation Order

We'll do this step by step:
1. Image Insert Button + Clipboard Paste (editor enhancement)
2. Guide images table + placeholder replacement
3. Re-host button + edge function
4. Testing

