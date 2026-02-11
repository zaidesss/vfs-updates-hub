

## Fix Coverage Board Override Logic + Activity Log + Save Confirmation

### Problem Summary
1. **Override data loss**: The current `coverage_overrides` table has a unique constraint on `(agent_id, date)`, so only ONE override can exist per agent per date. When you adjust both the regular schedule and OT for the same day, only the last one saved survives.
2. **Day off not adjusting**: When Friday OT extends to 4:00 AM Saturday, the Saturday Day Off should shrink to start at 4:00 AM instead of disappearing entirely.
3. **No save confirmation**: Changes save silently without showing a summary of what changed.
4. **No activity log**: No visibility into who changed what and when.

---

### Step 1 -- Database Schema Changes

**A. Modify `coverage_overrides` table:**
- Add `override_type TEXT NOT NULL DEFAULT 'override'` column (values: `regular`, `ot`, `dayoff`, `override`)
- Add `break_schedule TEXT` column (nullable, for per-day break overrides)
- Add `previous_value TEXT` column (stores the "from" value for audit purposes)
- Drop the existing unique index on `(agent_id, date)` and replace with `(agent_id, date, override_type)`
- Update the `upsert` onConflict key accordingly

**B. Create `coverage_override_logs` table:**

| Column | Type | Purpose |
|---|---|---|
| id | uuid (PK) | Primary key |
| agent_id | uuid | Agent reference |
| agent_name | text | Display name (denormalized for easy display) |
| date | date | The date affected |
| override_type | text | Which block type was changed |
| previous_value | text | "From" schedule string |
| new_value | text | "To" schedule string |
| break_schedule | text | Break override if provided |
| changed_by | text | Email of the editor |
| created_at | timestamptz | When the change was made |

RLS: Service role + authenticated read access (for displaying the log).

---

### Step 2 -- Fix Override Save Logic

**Update `coverageBoardApi.ts`:**
- `upsertOverride()` now includes `override_type` and `break_schedule` fields
- `onConflict` changes from `'agent_id,date'` to `'agent_id,date,override_type'`
- Add function to insert into `coverage_override_logs`

**Update `CoverageBoard.tsx` save handler:**
- When saving pending overrides, each entry already has a `block_type` -- pass it as `override_type`
- After successful save, insert corresponding log entries

---

### Step 3 -- Fix Day Off Shortening Logic

**Update `getEffectiveBlocks()` in `coverageBoardApi.ts`:**
- When a previous day's block (regular or OT) extends past midnight into a day-off day, the day-off block should start at the overflow end time instead of hour 0
- For example: Friday OT 8:30 PM - 4:00 AM means Saturday day off renders as 4:00 AM - 24:00 (end of day) instead of 0:00 - 24:00
- This requires checking the previous day's blocks for overnight spillover

**Update `CoverageTimeline.tsx`:**
- After computing all blocks, post-process: if a day-off block exists on day N and day N-1 has a block with `endHour > 24`, adjust the day-off block's `startHour` to `(endHour - 24)`

---

### Step 4 -- Save Confirmation Dialog

**Create new component `SaveConfirmationDialog.tsx`:**
- A dialog that opens when the user clicks "Save Changes"
- Shows a table/list of all pending changes:
  - Agent name
  - Date
  - Block type (Regular / OT / Day Off)
  - From (previous schedule)
  - To (new schedule)
- Each row has an optional "Break Schedule" input field for per-day break override
- Two buttons: "Cancel" and "Confirm Save"
- Only on "Confirm Save" does the actual database write happen

---

### Step 5 -- Activity Log Component

**Create new component `CoverageActivityLog.tsx`:**
- Displayed below the timeline on the Coverage Board page
- Queries `coverage_override_logs` for the selected week
- Shows a compact table:
  - Date | Agent | Type | From | To | Break | Changed By | When
- Only loads data for the currently selected week
- Auto-refreshes after saves

---

### Step 6 -- Update `get_effective_schedule` RPC

The database RPC needs to handle multiple override types per date:
- Query all `coverage_overrides` for the agent+date
- If a `regular` type override exists, use it as `effective_schedule`
- If an `ot` type override exists, use it as `effective_ot_schedule`
- If a `dayoff` type override exists, adjust the day-off rendering
- Fall back to `override` type for backward compatibility (existing single-type overrides)

---

### Step 7 -- Remove Override Color Change

- Overridden blocks keep their original block-type color (regular stays position-colored, OT stays violet, day off stays zinc)
- The "Overridden" label text on the block and the tooltip indicator remain as the visual cue
- Remove the amber override color application when `isOverridden` is true

---

### Implementation Order
We will implement these step by step:
1. Database migration (add columns, new table, update constraints)
2. Fix the API layer (upsert with override_type, log insertion)
3. Fix day-off shortening logic
4. Build Save Confirmation Dialog
5. Build Activity Log component
6. Update the `get_effective_schedule` RPC
7. Remove override color change

