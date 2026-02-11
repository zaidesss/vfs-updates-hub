

## Fix: Day Off Filter Not Matching Abbreviated Values

### Root Cause

The database stores day-off values as **abbreviations** (e.g., `Sat`, `Sun`), but the filter dropdown uses **full day names** (`Saturday`, `Sunday`). The case-insensitive comparison in `applyFilters` compares `"saturday"` against `"sat"`, which never matches.

### Solution

Update `src/components/coverage-board/CoverageFilters.tsx` to align the filter options with the actual database values.

**Option A (Recommended):** Change `DAY_OPTIONS` to use abbreviations matching the DB:
```
['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
```

**Option B:** Keep full names in the UI but map them during comparison. This adds unnecessary complexity.

### File Changes

| File | Change |
|------|--------|
| `src/components/coverage-board/CoverageFilters.tsx` | Change `DAY_OPTIONS` from full day names to abbreviated forms: `['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']` |

This is a one-line fix. No other files need changes since the `applyFilters` function already does a case-insensitive comparison -- once both sides use the same format, it will work correctly.

