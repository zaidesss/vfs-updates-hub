

## Coverage Board Improvements (4 Items)

### 1. Agent Name Showing Email

**Root cause**: The `getDisplayName()` function currently prioritizes `agent_name` over `full_name`. Two agents have `agent_name = null` but all agents have `full_name` populated. The fallback chain `agent_name || full_name || email` works, but some agents may appear inconsistent if their `agent_name` differs from expectations.

**Fix**: Change the priority to `full_name || agent_name || email` so the always-populated `full_name` is preferred.

| File | Change |
|------|--------|
| `src/lib/coverageBoardApi.ts` | Update `getDisplayName()` to return `agent.full_name \|\| agent.agent_name \|\| agent.email` |

---

### 2. Overnight Shift Rendering

**Current state**: The `splitOvernight()` function in `coverageBoardApi.ts` already handles overnight shifts correctly:
- Splits into two segments: `[startHour, 24)` on current day and `[0, endHour)` on next day
- Already guards against rendering beyond Sunday (`dayOffset < 6`)

This is already implemented correctly. No changes needed unless you're seeing specific agents whose overnight blocks are broken -- let me know and I'll investigate further.

---

### 3. Edit Mode for Drag/Crop Scheduling (Future Feature)

This is a larger feature that adds interactive schedule editing. The plan:

- Add an **Edit** button to the Coverage Board header (only visible to admins)
- When clicked, enters "edit mode" where shift blocks become draggable/resizable
- A **Save Changes** button appears to commit changes via `upsertOverride()`
- A **Cancel** button exits edit mode without saving

**Note**: This is a significant feature. I recommend implementing the other 3 items first, then tackling this as a separate step. Should I include it now or defer?

---

### 4. Sticky Scrollbar + Sticky Time Headers

**Current issue**: The horizontal scrollbar is at the bottom of a very tall container, requiring users to scroll all the way down to scroll horizontally. The day/hour headers also scroll out of view.

**Fix**: 
- Add `data-table-scroll` class to the scroll container (matches MasterDirectory pattern)
- Set a fixed height with `overflow: auto` so the scrollbar is always visible
- Make the two header rows (`sticky top-0`) so they stay visible when scrolling vertically

| File | Change |
|------|--------|
| `src/components/coverage-board/CoverageTimeline.tsx` | Add `data-table-scroll` class, set `height: calc(100vh - 220px)` and `overflow: auto`, make header rows use `sticky top-0 z-30` |

---

### Implementation Order

We'll do these **one step at a time**:

1. **Step 1**: Fix agent name display (swap `full_name` priority)
2. **Step 2**: Sticky scrollbar + sticky headers
3. **Step 3**: Defer edit mode to a separate follow-up

After each step, I'll ask you to verify before proceeding.

