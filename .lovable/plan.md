
# Fix Agent Reports Dialog Overflow Issue

## Problem

The `ReportDetailDialog` content is overflowing beyond the dialog's white background. Elements like "Team Lead Notes", action buttons, and the header metadata (severity badge, status, date) are rendering outside the visible dialog container.

**Root Cause**: The `DialogContent` has no `max-height` constraint, so when the content grows (especially with the notes textarea and multiple buttons), it exceeds the viewport and overflows.

## Solution

Apply the same scrollable dialog pattern used in other components like `SubmissionDetailDialog` and `LeaveAuditLog`:

1. Add `max-h-[85vh]` to constrain the dialog height
2. Add `flex flex-col` for proper layout structure  
3. Add `overflow-hidden` to prevent content bleeding
4. Wrap the body content in a scrollable container with `overflow-y-auto`
5. Keep the header fixed at the top

## Implementation

### File: `src/components/agent-reports/ReportDetailDialog.tsx`

**Current structure (lines 386-512)**:
```jsx
<DialogContent className="max-w-lg">
  <DialogHeader>...</DialogHeader>
  <div className="space-y-4">
    {/* All content here - no scroll */}
  </div>
</DialogContent>
```

**Fixed structure**:
```jsx
<DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden p-0">
  {/* Fixed Header */}
  <div className="shrink-0 p-6 pb-0">
    <DialogHeader>...</DialogHeader>
  </div>
  
  {/* Scrollable Body */}
  <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-4">
    {/* Agent Info */}
    {/* Separator */}
    {/* Incident Details */}
    {/* Frequency warning */}
    {/* Separator */}
    {/* Notes section */}
    {/* Reviewed by info */}
    {/* Action Buttons */}
    {/* Escalation Dialog */}
  </div>
</DialogContent>
```

### Key Changes

| Change | Purpose |
|--------|---------|
| `max-h-[85vh]` | Limit dialog height to 85% of viewport |
| `flex flex-col` | Enable flex layout for fixed header + scrollable body |
| `overflow-hidden` | Prevent content from bleeding outside the dialog |
| `p-0` on DialogContent | Remove default padding so we can control it per section |
| Fixed header section | Keep title/description visible at all times |
| `overflow-y-auto` on body | Enable vertical scrolling when content exceeds available space |

### Additional Fix: Button Layout

While fixing overflow, also improve button layout:
- Add `flex-wrap` to allow buttons to wrap on narrow screens
- Remove `flex-1` so buttons size naturally based on content

```jsx
<div className="flex flex-wrap gap-2 pt-2">
  <Button variant="outline" ...>Escalate as Outage</Button>
  <Button variant="default" ...>Validate (Coaching)</Button>
  <Button variant="ghost" ...>Dismiss (Invalid)</Button>
</div>
```

### Also Fix: EscalationConfirmDialog Ref Warning

Remove `asChild` from `AlertDialogDescription` to fix the React ref warning seen in console logs.

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/agent-reports/ReportDetailDialog.tsx` | Add max-height, flex layout, scrollable body section |
| `src/components/agent-reports/EscalationConfirmDialog.tsx` | Remove `asChild` from AlertDialogDescription |

## Visual Result

After the fix:
- Dialog will be constrained to 85% of viewport height
- Header (title, description) stays fixed at top
- Body content scrolls when it exceeds available space
- Action buttons remain visible and wrap properly
- All content stays within the white dialog background
