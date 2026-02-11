

## Draggable and Croppable Shift Blocks

### Overview
In Edit Mode, shift blocks (regular, OT, and override) become interactive -- you can **drag** them left/right to move the entire shift, or **crop** (resize) them from the left or right edge to adjust start/end times. All changes snap to 30-minute increments and are staged as pending overrides (saved with the Save button).

### How It Works

1. Enter Edit Mode (existing feature)
2. **Drag**: Click and hold the middle of a shift block, drag left/right to slide the entire shift
3. **Crop**: Hover near the left or right edge of a block -- a resize cursor appears. Drag the edge to extend or shorten the shift
4. Changes snap to the nearest 30 minutes
5. The block updates visually in real-time, with an amber dashed border indicating unsaved changes
6. Click "Save Changes" to persist all adjustments as overrides

### Technical Changes

#### File 1: `src/components/coverage-board/ShiftBlock.tsx`
- Add `editMode`, `onDragEnd`, and `onResizeEnd` callback props
- In Edit Mode, attach `onMouseDown` handlers:
  - **Edge detection**: If mouse is within 6px of the left/right border, enter **resize mode** (set cursor to `col-resize`)
  - **Otherwise**: Enter **drag mode** (set cursor to `grabbing`)
- Track drag state via `useState`: `isDragging`, `isResizing`, `resizeSide` ("left" | "right"), `deltaHours`
- On `mousemove` (attached to `document` during drag): compute pixel delta, convert to hours using the timeline container width, snap to 0.5hr increments, update a local visual offset
- On `mouseup`: call `onDragEnd(newStartHour, newEndHour)` or `onResizeEnd(newStartHour, newEndHour)`, which stages the change as a pending override
- Skip drag/resize for `dayoff` and `empty` block types

#### File 2: `src/components/coverage-board/CoverageTimeline.tsx`
- Pass `editMode` and a new `onBlockAdjust` callback to each `ShiftBlock`
- `onBlockAdjust(agent, dayOffset, newStartHour, newEndHour)` converts the decimal hours back to time strings (e.g., `9:30 AM`) and adds a `PendingOverride` entry to the parent's `pendingOverrides` map
- Add a `ref` to the timeline container div to measure its pixel width for accurate hour-to-pixel conversion
- Pass `timelineRef` to ShiftBlock so it can calculate snapping accurately

#### File 3: Helper utility (inside `ShiftBlock.tsx` or a small util)
- `snapToHalfHour(hours: number): number` -- rounds to nearest 0.5
- `decimalToTimeLabel(hours: number): string` -- converts e.g. 14.5 to "2:30 PM"
- Clamp logic: block cannot extend before hour 0 or after hour 24 within its day

### Visual Feedback
- **Drag cursor**: `grab` on hover in Edit Mode, `grabbing` while dragging
- **Resize cursor**: `col-resize` when hovering within 6px of block edges
- **Pending indicator**: Adjusted blocks get the existing amber dashed ring style
- **Tooltip update**: During drag/resize, the tooltip updates to show the new time range in real-time

### Edge Cases Handled
- Blocks cannot be dragged across day boundaries (clamped to 0-24 within day)
- Minimum block width of 30 minutes enforced during resize
- Overnight shifts that span into the next day: only the visible portion within each day is adjustable
- `dayoff` and `empty` blocks are not interactive (cannot be dragged/resized)
- Clicking without dragging (no movement) still opens the Override Editor dialog as before

### Implementation Order
1. Add snap/clamp utility functions and decimal-to-label converter
2. Update `ShiftBlock` with drag and resize mouse handlers
3. Update `CoverageTimeline` to wire `onBlockAdjust` callback and pass timeline ref
4. Test interactions and verify pending overrides integrate with existing Save flow

