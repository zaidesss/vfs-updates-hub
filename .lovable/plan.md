

# Fix Demo Guide Spotlight - Remove Backdrop Blur

## Problem Identified

The demo guide highlights are supposed to create a "spotlight" effect that shows the target element clearly while dimming the rest of the page. However, the entire page (including highlighted elements) appears blurred because of the `backdrop-blur-sm` CSS class on the backdrop overlay.

| Current Behavior | Expected Behavior |
|------------------|-------------------|
| Target element is blurred along with everything else | Target element should be crisp and clearly visible |
| "Spotlight" effect is useless | Spotlight should show a clear, focused target |
| User can't see what's being highlighted | User can clearly see the highlighted element |

---

## Technical Root Cause

The backdrop has this CSS:
```tsx
className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm cursor-pointer"
```

- `backdrop-blur-sm` blurs **everything behind it** (all page content)
- The spotlight div (z-index 101) creates a "cutout" using `box-shadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)'`
- But this cutout only reveals the **already-blurred content** underneath
- The blur cannot be "undone" for specific elements

---

## Solution

Remove `backdrop-blur-sm` from the backdrop overlay in both demo guide components. The dark overlay (`bg-black/60`) provides sufficient visual separation without blurring the content.

---

## Files to Modify

| File | Line | Change |
|------|------|--------|
| `src/components/PageDemoGuide.tsx` | 149 | Remove `backdrop-blur-sm` from className |
| `src/components/DemoTour.tsx` | 171 | Remove `backdrop-blur-sm` from className |

---

## Technical Changes

### File 1: `src/components/PageDemoGuide.tsx`

**Before (Line 149):**
```tsx
<div 
  className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm cursor-pointer" 
  onClick={onClose}
/>
```

**After:**
```tsx
<div 
  className="fixed inset-0 z-[100] bg-black/60 cursor-pointer" 
  onClick={onClose}
/>
```

---

### File 2: `src/components/DemoTour.tsx`

**Before (Line 171):**
```tsx
<div 
  className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm cursor-pointer" 
  onClick={onClose}
/>
```

**After:**
```tsx
<div 
  className="fixed inset-0 z-[100] bg-black/60 cursor-pointer" 
  onClick={onClose}
/>
```

---

## Expected Results After Fix

| Scenario | Before | After |
|----------|--------|-------|
| Backdrop appearance | Blurred entire page | Dark overlay only (60% black) |
| Spotlight target | Blurred and hard to read | Crisp and clearly visible |
| Text/elements in spotlight | Fuzzy/unreadable | Sharp and focused |
| Overall effect | Everything looks the same (blurred) | Clear contrast between dimmed and highlighted areas |

---

## Visual Effect After Fix

```text
+------------------------------------------+
|           DIMMED AREA (60% black)        |
|  +------------------------------------+  |
|  |                                    |  |
|  |    +--------------------------+    |  |
|  |    |  SPOTLIGHT - CLEAR &     |    |  |
|  |    |  CRISP TARGET ELEMENT    |    |  |
|  |    |  (ring highlight around  |    |  |
|  |    |   the actual button/UI)  |    |  |
|  |    +--------------------------+    |  |
|  |                                    |  |
|  +------------------------------------+  |
|                                          |
+------------------------------------------+
```

---

## Implementation Notes

1. This is a simple CSS class removal - no logic changes required
2. The `bg-black/60` still provides 60% opacity dark overlay for visual separation
3. The spotlight ring (`ring-4 ring-primary`) will now be clearly visible
4. Both files need the same change for consistency

