

## Coverage Board Enhancements (3 Items)

We will implement these **one step at a time**, verifying after each.

---

### Step 1: Fix Current Time Indicator to Use Portal Clock (EST)

**Current issue**: The red line already uses `usePortalClock()` which returns EST time. It works correctly. However, the line color (red) clashes with the red "Outage" legend. We will change it to a distinct color (e.g., a dashed yellow/gold line with a small "NOW" label at top) so it is clearly a time marker and not an outage indicator.

| File | Change |
|------|--------|
| `src/components/coverage-board/CoverageTimeline.tsx` | Change the current-time indicator from solid red to a dashed yellow/gold line with a small "NOW" label |

---

### Step 2: Render Overnight Shifts as a Single Continuous Block

**Current issue**: The `splitOvernight()` function in `coverageBoardApi.ts` splits overnight shifts (e.g., 10:00 PM - 4:30 AM) into two separate blocks: one ending at midnight and one starting at midnight the next day. The user wants a single continuous block spanning across the day boundary.

**Fix**: Instead of splitting, compute a single block using an `endHour` greater than 24 (e.g., 22:00-28.5 means 10 PM to 4:30 AM next day). The `ShiftBlock` component already positions by percentage, so an `endHour` of 28.5 on Monday would render correctly into Tuesday's timeline space. The guard for Sunday overflow will clamp the end to hour 24 on Sunday (dayOffset 6).

| File | Change |
|------|--------|
| `src/lib/coverageBoardApi.ts` | Update `splitOvernight()` to return a single block with `endHour = 24 + originalEnd` instead of splitting into two. Clamp to 24 on Sunday. |
| `src/components/coverage-board/ShiftBlock.tsx` | Update `toPercent()` to handle `endHour > 24` by computing across day boundaries. No other changes needed since it already uses percentage positioning. |

---

### Step 3: Add Filter Bar (ZD Instance, Position, Agent Names, Day Off)

**Current issue**: No filtering -- all agents are shown. The user wants stackable filters.

**Design**: Add a filter row below the header with:
1. **ZD Instance** -- single-select dropdown: All, ZD1, ZD2
2. **Position** -- multi-select: Hybrid Support, Phone Support, Chat Support, Email Support, Logistics, Team Lead, Technical Support
3. **Agent Names** -- multi-select searchable combobox of all agent names
4. **Day Off** -- multi-select: Monday through Sunday (filter agents whose day off includes the selected days)

Filters stack (AND logic): selecting ZD1 + Hybrid Support shows only ZD1 Hybrid agents.

Filtering will happen at the page level (`CoverageBoard.tsx`) before passing agents to `groupAgents()`.

| File | Change |
|------|--------|
| `src/components/coverage-board/CoverageFilters.tsx` | Expand with ZD Instance, Position, Agent Names, Day Off filter controls |
| `src/pages/CoverageBoard.tsx` | Add filter state, apply filters to agents before grouping |

---

### Implementation Order

1. **Step 1**: Fix current time indicator styling
2. **Step 2**: Merge overnight blocks into single continuous blocks
3. **Step 3**: Add filter bar

After each step, I will ask you to verify before proceeding.

---

### Technical Details

**Overnight block math (Step 2)**:

```text
Example: 10:00 PM - 4:30 AM on Monday (dayOffset=0)
  Before: Block 1: day=0, start=22, end=24  |  Block 2: day=1, start=0, end=4.5
  After:  Single block: day=0, start=22, end=28.5
  Position: left = (0*24+22)/168*100 = 13.1%
            width = (28.5-22)/168*100 = 3.87%
```

The `toPercent` function change: `(dayOffset * 24 + hour) / 168 * 100` already works since we pass the full duration width as `endHour - startHour` regardless of day crossing.

**Filter state shape (Step 3)**:
```typescript
interface CoverageFilterState {
  zdInstance: string | null;        // null = all
  positions: string[];              // empty = all
  agentNames: string[];             // empty = all
  daysOff: string[];                // empty = all
}
```

