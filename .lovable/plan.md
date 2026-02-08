
# Add Back Navigation to Revalida 2.0 Batch Detail Views

## Summary
When viewing a batch detail page in Revalida 2.0, there's no way to navigate back to the main page. A back button needs to be added to the header section of both admin and agent batch detail views.

---

## Implementation

### File to Modify
`src/pages/RevalidaV2.tsx`

### Changes

**1. Add ArrowLeft icon import (Line 31)**
```typescript
import { AlertCircle, ArrowLeft, CheckCircle2, Clock } from 'lucide-react';
```

**2. Add Back Button to Admin Batch Detail View (around Lines 182-188)**

Replace the current header:
```tsx
<div>
  <h1 className="text-3xl font-bold">{currentBatch.title}</h1>
  <p className="text-muted-foreground mt-2">
    {currentBatch.mcq_count} MCQ • {currentBatch.tf_count} T/F • {currentBatch.situational_count} Situational
  </p>
</div>
```

With:
```tsx
<div className="flex items-start gap-4">
  <Button
    variant="ghost"
    size="icon"
    onClick={() => navigate('/team-performance/revalida-v2')}
    className="mt-1"
  >
    <ArrowLeft className="h-5 w-5" />
  </Button>
  <div>
    <h1 className="text-3xl font-bold">{currentBatch.title}</h1>
    <p className="text-muted-foreground mt-2">
      {currentBatch.mcq_count} MCQ • {currentBatch.tf_count} T/F • {currentBatch.situational_count} Situational
    </p>
  </div>
</div>
```

**3. Add Back Button to Agent Batch Detail View (around Lines 295-301)**

Replace the current header:
```tsx
<div>
  <h1 className="text-3xl font-bold">Revalida 2.0</h1>
  <p className="text-muted-foreground mt-2">
    AI-powered knowledge assessment
  </p>
</div>
```

With:
```tsx
<div className="flex items-start gap-4">
  <Button
    variant="ghost"
    size="icon"
    onClick={() => navigate('/team-performance/revalida-v2')}
    className="mt-1"
  >
    <ArrowLeft className="h-5 w-5" />
  </Button>
  <div>
    <h1 className="text-3xl font-bold">Revalida 2.0</h1>
    <p className="text-muted-foreground mt-2">
      AI-powered knowledge assessment
    </p>
  </div>
</div>
```

---

## Visual Result

| View | Before | After |
|------|--------|-------|
| Admin Batch Detail | Title only | ← Back icon + Title |
| Agent Batch Detail | Title only | ← Back icon + Title |

---

## Technical Notes

- Uses `variant="ghost"` for a subtle button style consistent with other navigation patterns
- The `size="icon"` keeps it compact
- `mt-1` aligns the icon with the title text baseline
- Navigates to `/team-performance/revalida-v2` (the main dashboard)
