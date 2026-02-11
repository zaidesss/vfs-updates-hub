

## Reset Malcom Testing Overrides and Revert Code

### Step 1: Delete Test Override Data
Remove the 2 test override records from the `coverage_overrides` table:
- Record for **Feb 13, 2026** (11:00 AM - 8:30 PM)
- Record for **Feb 14, 2026** (4:00 AM - 12:00 AM)

### Step 2: Revert Override Block Styling
Restore the amber color for override-type blocks in `ShiftBlock.tsx`:
- Change `override: ''` back to `override: 'bg-amber-500/70 border-amber-600'`

---

### Technical Details

**Database**: Delete 2 rows from `coverage_overrides` where `agent_id = 'c10d78bb-9079-4608-a30f-313378a52829'` and dates are `2026-02-13` and `2026-02-14`.

**File Change**: `src/components/coverage-board/ShiftBlock.tsx` -- line 40, restore `override` style string.

