

## Fix: Day Off Labels and Empty Shift Styling

### Problems Identified

1. **Day Off blocks never render**: The `isDayOff()` function compares full day names from `DAY_NAMES_FULL` (e.g., `"Saturday"`) against the database values which are abbreviated (e.g., `"Sat"`). Since `"saturday" !== "sat"`, the check always fails, so Day Off blocks are never created.

2. **Empty/Day Off blocks don't fill the row visually**: The `ShiftBlock` component uses `top-1 bottom-1` (4px margins), making day-spanning blocks look like floating bars instead of solid row backgrounds. For "empty" and "dayoff" types, they should fill the full row height (`top-0 bottom-0`) to create the dark background effect seen in the reference image.

3. **No background fill for unscheduled hours**: Looking at the reference image, every agent row should have a dark gray background across the entire timeline, with shift blocks rendered on top. Currently, only hours with explicit blocks get colored -- the rest is transparent, showing the grid lines underneath.

### Solution

#### File 1: `src/lib/coverageBoardApi.ts`
- Fix `isDayOff()` to handle abbreviated day names by comparing the first 3 characters of both strings (e.g., `"sat" === "sat"` from `"Saturday".substring(0,3)`).

#### File 2: `src/components/coverage-board/ShiftBlock.tsx`
- For `dayoff` and `empty` block types, remove the vertical margin (`top-0 bottom-0` instead of `top-1 bottom-1`) so they fill the entire row height as a background.
- Keep the rounded border and margin for all other block types (regular, ot, override, outage).

#### File 3: `src/components/coverage-board/CoverageTimeline.tsx`
- Add a dark gray background (`bg-zinc-800/50`) to the timeline cell div for every agent row, so unscheduled hours always appear dark rather than transparent. Shift blocks render on top of this base.

### Technical Details

**isDayOff fix:**
```
return agent.day_off.some(d => d.toLowerCase().substring(0, 3) === dayName.toLowerCase().substring(0, 3));
```

**ShiftBlock styling logic:**
```
const isBackground = type === 'dayoff' || type === 'empty';
// Use 'top-0 bottom-0' for background types, 'top-1 bottom-1' for shift types
```

**Timeline row background:**
```
className="relative border-b border-border bg-zinc-800/50"
```

