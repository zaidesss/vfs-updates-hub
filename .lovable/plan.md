

# Fix Year Selector to Start from 2026

## Problem
The Year dropdown on the Team Scorecard generates 10 years going backwards from the current year (line 641-646), showing 2025, 2024, etc. The portal was created in 2026, so years before 2026 are irrelevant.

## Solution
Replace the backward-looking year generation with a range starting from **2026** (the portal's inception year) up to the current year. This means:

- If the current year is 2026, only "2026" appears
- If the current year is 2027, "2026" and "2027" appear
- And so on

## Technical Change

**File: `src/pages/TeamScorecard.tsx` (lines 641-646)**

Replace:
```typescript
{Array.from({ length: 10 }, (_, i) => {
  const year = portalNow.getFullYear() - i + 1;
```

With:
```typescript
{Array.from(
  { length: portalNow.getFullYear() - 2026 + 1 },
  (_, i) => 2026 + i
).reverse().map((year) => (
```

This generates years from 2026 to the current year (in descending order so the latest year appears first). Optionally, the constant `2026` can be added to `weekConstants.ts` as `PORTAL_START_YEAR` for reuse.

