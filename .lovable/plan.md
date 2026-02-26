

## Issues Found

### Issue 1: OT Productivity Column Never Renders Actual Values (TeamScorecard.tsx)
**Root cause**: Lines 1153-1162 in `TeamScorecard.tsx` hardcode the OT Prod cell to always show `-`. The `scorecard.otProductivity` value is calculated correctly by the RPC but the UI never displays it.

```text
Current code (lines 1156-1158):
  <div className="px-2 py-1 rounded bg-muted/30">
    <span className="text-muted-foreground">-</span>   ← always shows dash
  </div>
```

**Fix**: Replace the hardcoded dash with actual rendering of `scorecard.otProductivity`, using the same pattern as the Productivity column (color-coded percentage with count display).

### Issue 2: Productivity Column Possibly Null
**Root cause**: If the previous code change (switching to RPC) hasn't fully deployed, the legacy path still sets `otProductivity: null` and may miscalculate productivity by mixing OT tickets. After verifying the RPC switch is live, productivity should display correctly. However, there's also a secondary concern: the `position` field stored as `['Hybrid']` (single-element array of the resolved key) rather than the original `['Chat', 'Email', 'Phone']` means the UI column shows `ChatEmailPhone` as the type badge correctly.

### Issue 3: Coverage Board Save Dialog Shows Wrong Day (SaveConfirmationDialog.tsx)
**Root cause**: Line 60 uses `new Date(dateStr)` where `dateStr` is `'2026-02-27'`. JavaScript's `new Date('2026-02-27')` creates a UTC midnight date. When `format()` renders it using the browser's local timezone (EST = UTC-5), midnight UTC becomes Feb 26 7:00 PM — showing **Thursday** instead of **Friday**.

**Fix**: Use `parseISO` from date-fns instead of `new Date()`. `parseISO` treats date-only strings as local dates, avoiding the timezone shift.

### Additional Considerations
- **Should the OT Prod column also be editable** like Call AHT/Chat AHT? Currently it's display-only. If OT Productivity should be manually overridable, it would need the `EditableMetricCell` wrapper.
- **Should OT Productivity be included in the scorecard_config for Hybrid/Chat types** so it contributes to the Final Score? Currently there's no `ot_productivity` row in `scorecard_config` for any support type, meaning it's displayed but not weighted.

---

## Implementation Plan

### Step 1: Fix OT Productivity display in TeamScorecard.tsx
**File**: `src/pages/TeamScorecard.tsx` (lines 1153-1162)

Replace the hardcoded dash with proper rendering:
```tsx
{showOtProductivity && (
  <TableCell className="text-center">
    {metricApplies(scorecard.agent.position, 'otProductivity') ? (
      <div className={`px-2 py-1 rounded ${getScoreBgColor(scorecard.otProductivity, getMetricGoal('ot_productivity'))}`}>
        <span className={getScoreColor(scorecard.otProductivity, getMetricGoal('ot_productivity'))}>
          {scorecard.otProductivity !== null ? formatScore(scorecard.otProductivity) : '-'}
        </span>
      </div>
    ) : (
      <span className="text-muted-foreground">-</span>
    )}
  </TableCell>
)}
```

Also ensure `getMetricGoal` handles `ot_productivity` — it should fall back to 100 (same as regular productivity).

### Step 2: Fix Coverage Board date display in SaveConfirmationDialog.tsx
**File**: `src/components/coverage-board/SaveConfirmationDialog.tsx`

- Add `import { parseISO } from 'date-fns'`
- Line 60: Change `date: new Date(dateStr)` to `date: parseISO(dateStr)`
- Line 65: Change `new Date(a.dateStr).getTime()` to `parseISO(a.dateStr).getTime()`

