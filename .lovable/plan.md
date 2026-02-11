

## Full-Week Coverage Board Redesign (Final Plan)

### Layout

```text
STICKY (always visible)                     SCROLLABLE TIMELINE (one wide cell per row)
+-----------+--------+------------+   +---------- MON ----------+---------- TUE ----------+ ... +---------- SUN ----------+
| DAILY HRS |  OFF   | AGENT NAME |   | 0:00 1:00 2:00 ... 23:00| 0:00 1:00 2:00 ... 23:00|     | 0:00 1:00 2:00 ... 23:00|
+-----------+--------+------------+   +--------------------------+--------------------------+     +--------------------------+
| 9x5       |WED-THU | Agent A    |   |    [===regular===]       |    [===regular===]       |     |        OFF               |
```

### Grid Constants

| Constant | Value | Notes |
|----------|-------|-------|
| STICKY_COLS | 3 | Daily Hrs (70px), Off (90px), Agent Name (150px) |
| HOURS_PER_DAY | 24 | 0:00 through 23:00 |
| DAYS_IN_WEEK | 7 | Mon through Sun |
| TOTAL_HOUR_COLS | 168 | 7 x 24 |
| TOTAL_GRID_COLS | 171 | 3 + 168 (used ONLY for headers and group rows) |
| TIMELINE_START_COL | 4 | First hour column in the 171-col header grid |

### Rendering Strategy

**Headers and group rows** use a 171-column CSS grid (`70px 90px 150px repeat(168, minmax(28px, 1fr))`).

**Agent rows** use a 4-column grid (`70px 90px 150px 1fr`):
- Columns 1-3: sticky info cells (Daily Hrs, Off, Agent Name)
- Column 4: a single `position: relative` timeline cell spanning the full scrollable width
- Shift blocks inside column 4 use `position: absolute` with percentage-based `left` and `width`: `left = ((dayOffset * 24 + hour) / 168) * 100%`

This avoids rendering 168 background divs per row. Hour grid lines and day separators are rendered via CSS gradients on the timeline cell background:
- Thin lines every `(1/168)*100%` for hour marks
- Strong/thicker lines every `(24/168)*100%` for day boundaries

### Sticky Positioning

| Column | sticky left | z-index | width |
|--------|------------|---------|-------|
| DAILY HRS | 0px | 10 | 70px |
| OFF | 70px | 10 | 90px |
| AGENT NAME | 160px | 10 | 150px |

All sticky cells have explicit `bg-card` (agent rows) or `bg-muted` (headers) to prevent see-through.

### Overnight Shift Handling

When `endHour < startHour` (e.g., 22:00-6:00):
- Render segment 1: `[startHour, 24)` on current day
- Render segment 2: `[0, endHour)` on next day ONLY if `dayOffset < 6` (do not render beyond Sunday)

### Effective Schedule Precedence

A single function `getEffectiveBlocks(agent, dayIndex, dayName, override?, leave?)` returns an array of renderable blocks with explicit precedence:

1. **Manual override** (`coverage_overrides` for that date) -- replaces base schedule entirely
2. **Outage** (approved leave covering that date) -- renders outage overlay on top of base schedule
3. **Base schedule** (`{day}_schedule` + `{day}_ot_schedule`) -- always rendered unless overridden

The function always returns at least one block (even if it is a "day off" block), so shifts never disappear.

### computeDailyHours(agent)

1. If a stored label exists in the DB, use it directly.
2. Otherwise: parse schedule durations for all 7 days, count working days (non-day-off, non-null schedule), compute the mode duration across working days. Return `"{hours}x{days}"` (e.g., "9x5").
3. If durations are too inconsistent (no clear mode), return `"--"`.

### formatDaysOff(agent)

Convert `["Wednesday", "Thursday"]` to `"WED-THU"`. Single day returns `"WED"`. No days off returns `"--"`.

### Agent Name Fallback

`agent.display_name || agent.agent_name || agent.full_name || agent.email`

(Will check if `display_name` exists in DB; if not, skip it in the chain.)

### Current Time Indicator

Uses `usePortalClock().now` (EST). Computes day offset from `weekStart`:
- `dayOffset = differenceInDays(now, weekStart)` (clamped 0-6)
- `leftPercent = ((dayOffset * 24 + hours + minutes/60) / 168) * 100`
- Rendered as a vertical red line inside the timeline area

### Files Modified

| File | Changes |
|------|---------|
| `src/lib/coverageBoardApi.ts` | Add `computeDailyHours()`, `formatDaysOff()`, `getEffectiveBlocks()`, `fetchOverridesForWeek()`, `fetchLeavesForWeek()`. Add `display_name` to interface if DB supports it. |
| `src/pages/CoverageBoard.tsx` | Remove day tabs and `selectedDayOffset` state. Compute `weekEnd`. Fetch overrides/leaves for entire week. Pass `weekStart` + weekly data to timeline. |
| `src/components/coverage-board/CoverageTimeline.tsx` | Full rewrite: 171-col header grid, 4-col agent rows, sticky columns, day separators via CSS gradient, overnight split logic, `getEffectiveBlocks` per agent per day. |
| `src/components/coverage-board/ShiftBlock.tsx` | Add `dayOffset` prop. Change positioning to percentage of 168-hour span. Keep tooltip. |
| `src/components/coverage-board/GroupHeader.tsx` | Ensure `col-span-full` works (no structural change needed). |

### Implementation Order

1. Add helpers to `coverageBoardApi.ts`
2. Rewrite `CoverageBoard.tsx` (remove tabs, weekly fetch)
3. Rewrite `CoverageTimeline.tsx` (full week grid, sticky columns, CSS gradient lines)
4. Update `ShiftBlock.tsx` (dayOffset + percentage positioning)
5. Verify GroupHeader compatibility

### Post-Implementation Reminder

After changes are applied, you will need to click **"Update"** to see them reflected.

