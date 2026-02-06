

# Fix Demo Guide Interactivity Issues

## Problems Identified

| Issue | Symptom | Root Cause |
|-------|---------|------------|
| Guide card disappears | Grey screen, can't exit | Card rendered off-screen when target element not found |
| Full background blur | Blurs entire page instead of spotlight | Spotlight div doesn't render when target is null, but backdrop still shows |
| Unresponsive/frozen | Can't click any buttons | Card has no explicit background, becomes invisible against backdrop |
| No exit option | Must refresh page | Backdrop blocks all interaction, card is invisible |

---

## Technical Root Causes

### 1. Missing Explicit Background on Card
The Card component relies on `bg-card` CSS variable which can fail when:
- Combined with `backdrop-blur-sm` on the parent overlay
- The stacking context makes it transparent

### 2. Card Position Calculation Goes Off-Screen
When `targetRect` is null or the calculated position is negative/beyond viewport, the card becomes invisible but the blocking backdrop remains.

### 3. No Click Handler on Backdrop
Users cannot dismiss the guide by clicking outside (on the backdrop).

---

## Solution

### File 1: `src/components/PageDemoGuide.tsx`

**Changes:**
1. Add explicit solid background to the Card (`bg-card` + fallback)
2. Add click-to-close on backdrop
3. Ensure card position is always within viewport bounds
4. Add fallback center positioning when target not found

```tsx
// 1. Backdrop - make it clickable to close
<div 
  className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm cursor-pointer" 
  onClick={onClose}
/>

// 2. Card - add explicit background and ensure it's always visible
<Card
  className="fixed z-[102] w-[90vw] max-w-md shadow-2xl border-primary/20 bg-card"
  style={{
    ...getCardPosition(),
    backgroundColor: 'hsl(var(--card))', // Explicit fallback
  }}
>
```

### 3. Improve Position Calculation
Ensure card never renders off-screen:

```tsx
const getCardPosition = () => {
  const cardWidth = 400;
  const cardHeight = 300;
  const padding = 20;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Default to center if no target
  if (!targetRect || currentStepData?.position === 'center') {
    return {
      position: 'fixed' as const,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }
  
  // Calculate position based on target
  let top = 0;
  let left = 0;
  
  switch (currentStepData?.position) {
    case 'bottom':
      top = targetRect.bottom + padding;
      left = targetRect.left;
      break;
    // ... other cases
  }
  
  // CLAMP to viewport bounds
  top = Math.max(padding, Math.min(top, viewportHeight - cardHeight - padding));
  left = Math.max(padding, Math.min(left, viewportWidth - cardWidth - padding));
  
  return {
    position: 'fixed' as const,
    top: `${top}px`,
    left: `${left}px`,
  };
};
```

---

### File 2: `src/components/DemoTour.tsx`

Apply the same fixes for the global tour component.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/PageDemoGuide.tsx` | Add backdrop click handler, explicit Card background, viewport clamping |
| `src/components/DemoTour.tsx` | Same fixes for global tour |

---

## Expected Results After Fix

| Scenario | Before | After |
|----------|--------|-------|
| Target element not found | Grey screen, frozen | Card shows centered, can close |
| Card position off-screen | Card invisible, backdrop blocks | Card clamped to viewport |
| Click on backdrop | Nothing happens | Closes the guide |
| Card background | Sometimes transparent | Always solid background |

---

## Implementation Notes

1. Both components (`PageDemoGuide.tsx` and `DemoTour.tsx`) share similar code and need the same fixes
2. The explicit `backgroundColor` style is a fallback in case CSS variables fail
3. Viewport clamping ensures the card is always visible and accessible
4. Backdrop click provides an escape hatch even if buttons are somehow unreachable

