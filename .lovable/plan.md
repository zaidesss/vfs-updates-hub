

# Fix Plan: Week Selector Visibility and Attachment 404 Issues

## Summary of Issues Found

### Issue 1: Missing Week Selector on Agent Dashboard
The current code **always renders** the `DashboardWeekSelector` dropdown in the Shift Schedule card header. Juno's screenshot shows a static "(Feb 16 - Feb 22, 2026)" text instead of the interactive dropdown, which matches an older version of the code. This is almost certainly a **stale cache or unpublished deployment** issue -- the latest code hasn't been published to production yet.

**Fix**: Re-publish the app to push the latest code to production. As a defensive code improvement, we can also add the date range as a visible label alongside the dropdown selector so users always see what week they're viewing even if the dropdown takes a moment to render.

### Issue 2: Attachment Links Showing 404
The 404 page in Juno's screenshot is the **app's own React Router NotFound page** (not a browser/server 404). The attachment links use `<a href={url} target="_blank">`, which should open external URLs in a new tab. However, on Safari/Mac, certain conditions can cause the link to navigate within the same tab instead of opening a new tab, which triggers the SPA's catch-all route and shows the 404 page.

**Root causes to address:**
- Safari can sometimes block `target="_blank"` or navigate in-page
- If the URL is somehow empty or malformed, the `<a>` tag navigates to the current page origin

## Implementation Steps (One at a Time)

### Step 1: Fix Attachment Links for Safari/Mac Compatibility
In `src/pages/LeaveRequest.tsx`, replace the plain `<a>` tag for attachment links with an `onClick` handler that uses `window.open()` as the primary method, with the `<a>` tag as fallback. This ensures the link always opens in a new tab regardless of browser behavior.

**Changes:**
- Add an `onClick` handler to attachment links that calls `window.open(url, '_blank', 'noopener,noreferrer')`
- Add `e.preventDefault()` to prevent the default anchor behavior
- Add a guard to skip empty/malformed URLs
- Apply this fix in both the Outage Request list view and the edit dialog where attachments are displayed

### Step 2: Re-publish the App
After fixing the attachment issue, the app needs to be re-published so Juno and all other users get the latest version with both the week selector and the attachment fix.

## Technical Details

### Attachment Fix (LeaveRequest.tsx, around line 1229-1240)
```tsx
// Before: plain <a> tag
<a href={url} target="_blank" rel="noopener noreferrer">

// After: onClick with window.open for Safari compatibility
<a 
  href={url}
  target="_blank"
  rel="noopener noreferrer"
  onClick={(e) => {
    e.preventDefault();
    if (url && url.startsWith('http')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }}
>
```

### What This Fixes
- Attachment links will reliably open in a new tab on all browsers including Safari on Mac
- The week selector will appear for all users once the app is re-published
- No database or backend changes required

