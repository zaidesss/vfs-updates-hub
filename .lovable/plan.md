

## Edit Mode for Team Coverage Board

### Overview
Add an "Edit Mode" toggle that lets admins click on agent shift blocks to modify schedules for specific days. Changes are saved to the `coverage_overrides` table (already exists) and do NOT modify agent profiles. Overrides are day-specific and sync with the Effective view.

### How It Works

1. Admin clicks an **"Edit" button** in the header toolbar -- this enters Edit Mode
2. In Edit Mode, clicking any agent's timeline row for a specific day opens a **popover/dialog** to set override start/end times
3. Changes are staged locally with a visual indicator (pending badge count)
4. Admin clicks **"Save Changes"** to upsert all pending overrides to `coverage_overrides` table
5. A **"Cancel"** button discards all pending changes and exits Edit Mode
6. Existing overrides can be removed (reverts to base schedule)

### UI Changes

| Area | Change |
|------|--------|
| **Header toolbar** | Add "Edit" button (pencil icon) for admins only, visible next to the week selector |
| **Edit Mode header** | Replace "Edit" with "Save Changes" (green) + "Cancel" (ghost) buttons + pending count badge |
| **Timeline rows (Edit Mode)** | Day cells become clickable; hovering shows a subtle highlight per-day column |
| **Override dialog** | Small popover with start time, end time, optional reason, and a "Remove Override" option if one exists |
| **Visual feedback** | Pending (unsaved) overrides show with a dashed amber border to distinguish from saved overrides |

### Technical Details

#### File 1: `src/pages/CoverageBoard.tsx`
- Add `editMode` state (boolean) and `pendingOverrides` state (Map of `agentId:date` to override data)
- Add Edit/Save/Cancel buttons in the header (only for admin/superadmin/HR users via `useAuth`)
- On "Save Changes": loop through `pendingOverrides`, call `upsertOverride` for each, then invalidate queries and exit edit mode
- Pass `editMode`, `pendingOverrides`, and `onCellClick` handler down to `CoverageTimeline`

#### File 2: `src/components/coverage-board/CoverageTimeline.tsx`
- Accept new props: `editMode`, `pendingOverrides`, `onCellClick`
- In `AgentRow`, when `editMode` is true, render 7 invisible day-column click targets over the timeline
- Clicking a day target calls `onCellClick(agent, dayOffset, dateStr)`
- Pending overrides render with dashed amber border style

#### File 3: `src/components/coverage-board/OverrideEditor.tsx` (NEW)
- A `Dialog` component that opens when a day cell is clicked in Edit Mode
- Shows agent name, selected date, current base schedule (read-only)
- Input fields for override start time and end time (format: `HH:MM AM/PM`)
- Optional reason text input
- "Apply" button adds to pending overrides (local state, not saved yet)
- "Remove Override" button if an existing override is present for that agent+date
- Time validation: ensures start and end parse correctly

#### File 4: `src/lib/coverageBoardApi.ts`
- No changes needed -- `upsertOverride` and `deleteOverride` functions already exist and handle the DB operations

### Access Control
- Only users with `isAdmin`, `isSuperAdmin`, or `isHR` roles can see and use the Edit button
- The `coverage_overrides` table already has its own RLS policies

### Data Flow

```text
Click "Edit" --> Edit Mode ON --> Click day cell --> Override Editor dialog
  --> Set times --> "Apply" --> Added to pendingOverrides (local)
  --> Click "Save Changes" --> upsertOverride() for each pending --> refetch queries --> Edit Mode OFF
```

### Step-by-Step Implementation Order
1. Create `OverrideEditor.tsx` dialog component
2. Update `CoverageTimeline.tsx` with edit mode click targets
3. Update `CoverageBoard.tsx` with edit mode state, toolbar buttons, and save logic

