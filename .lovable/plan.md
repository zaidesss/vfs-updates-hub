

## Color-Code Shift Blocks by Position + Add Legend

### What Changes

**1. `src/components/coverage-board/ShiftBlock.tsx`** -- Color regular blocks by position

- Add a new prop `supportType` (already passed but unused for styling).
- Create a `POSITION_COLORS` map for regular shift coloring:

| Position | Color | Class |
|----------|-------|-------|
| Hybrid Support | Blue | `bg-blue-500/80 border-blue-600` |
| Email Support | Emerald | `bg-emerald-500/80 border-emerald-600` |
| Phone Support | Orange | `bg-orange-500/80 border-orange-600` |
| Chat Support | Cyan | `bg-cyan-500/80 border-cyan-600` |
| Logistics | Indigo | `bg-indigo-500/80 border-indigo-600` |
| (fallback) | Slate | `bg-slate-500/80 border-slate-600` |

- For `type === 'regular'`, use `POSITION_COLORS[supportType]` instead of the hardcoded blue.
- OT, dayoff, outage, override colors stay the same (violet, muted, red, amber).

**2. `src/components/coverage-board/CoverageTimeline.tsx`** -- Add Legend

- Add a horizontal legend bar above the timeline grid (or just below the header).
- Show colored dots/chips for each position color, plus OT (violet), Override (amber), Outage (red hatched), and Day Off (muted).
- Export the `POSITION_COLORS` map from ShiftBlock so the legend can reference the same colors.

### Technical Details

The `supportType` prop is already being passed to `ShiftBlock` from `AgentRow` (line 273: `supportType={agent.position || undefined}`). The only change in ShiftBlock is to use it for selecting the color class when `type === 'regular'`.

The legend will be a simple flex row of small colored rectangles + labels, rendered once above the scrollable grid.

### Hour label fix (from previous request)

Line 148 will also be updated: `{hr % 3 === 0 ? lbl : ''}` becomes `{lbl}` to show all 0:00-23:00 labels.

### Files Modified

| File | Change |
|------|--------|
| `src/components/coverage-board/ShiftBlock.tsx` | Add position-based color map, use it for `regular` type |
| `src/components/coverage-board/CoverageTimeline.tsx` | Add legend component above timeline, fix hour labels to show all 0:00-23:00 |

### Post-Change Reminder

Click **"Update"** after the changes are applied.

