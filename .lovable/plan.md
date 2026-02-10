

# Rename "Other" to "Logistics" on Team Status Board

## Change

**File: `src/pages/TeamStatusBoard.tsx`** (1 line change)

Update the "Other" CategorySection title from `"Other"` to `"Logistics"` so the label on the board reads "Logistics" instead of "Other".

## Technical Detail

- In `TeamStatusBoard.tsx`, the CategorySection for `categories.other` currently has `title="Other"` -- this will be changed to `title="Logistics"`.
- Optionally update the icon from the generic `Users` to something more fitting like `Package` from lucide-react.
- No API or data changes needed -- Logistics agents with recognized positions already appear under Email Support; this "Other/Logistics" bucket catches any remaining edge cases.

