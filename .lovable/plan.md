

## Fix Master Directory Table Double Scrollbar

### Problem Identified

The table currently has **two nested `overflow-auto` containers**:
1. **Outer wrapper** in `MasterDirectory.tsx` (line 262): `className="border rounded-lg overflow-auto data-table-scroll"`
2. **Table component** in `table.tsx` (line 7): `<div className="relative w-full overflow-auto">`

This creates two horizontal scrollbars and broken scrolling UX.

---

### Solution

Follow the exact rules you specified:
- **ONE scroll container only** (the outer wrapper)
- **Fixed height** using `height` instead of `maxHeight`
- **Sticky header cells** with `sticky top-0`
- **Frozen first column** with `sticky left-0`
- **Solid backgrounds + z-index** on sticky cells

---

### Changes

#### File 1: `src/components/ui/table.tsx`

**Remove internal scrolling from Table component**

| Line | Current | New |
|------|---------|-----|
| 7 | `<div className="relative w-full overflow-auto">` | `<div className="relative w-full">` |

This removes the nested scroll container, letting the outer wrapper control all scrolling.

---

#### File 2: `src/pages/MasterDirectory.tsx`

**Update the outer scroll container**

| Line | Current | New |
|------|---------|-----|
| 261-265 | `maxHeight: 'calc(100vh - 220px)'` | `height: 'calc(100vh - 220px)'` |

Using fixed `height` ensures the scrollbar stays at the bottom of the visible area.

**Update header cells with sticky positioning**

All `TableHead` cells in the header row need:
- `sticky top-0` for vertical scroll
- Solid `bg-muted` background (already present on row, but needs to be on cells for sticky to work properly)

The first column header cell (Full Name) needs:
- `sticky left-0 top-0` (both directions)
- Higher z-index (`z-30`) to stay above both row and column scrolls

**Update body cells for frozen first column**

The first column body cells already have:
- `sticky left-0`
- `bg-background` (solid background)
- `z-10` z-index

This is correct, no changes needed for body cells.

---

### Technical Details

| Element | CSS Classes | Purpose |
|---------|-------------|---------|
| Outer container | `overflow-auto`, `height: calc(100vh - 220px)` | Single scroll controller |
| Table wrapper | `relative w-full` (no overflow) | No internal scrolling |
| Header row | `bg-muted` | Background for header |
| Header cells | `sticky top-0 bg-muted` | Freeze during vertical scroll |
| First header cell | `sticky left-0 top-0 z-30 bg-muted` | Corner cell - highest z-index |
| First body cells | `sticky left-0 z-10 bg-background` | Freeze during horizontal scroll |

---

### Visual Result

After the fix:
- ✅ Single horizontal scrollbar at the bottom
- ✅ Single vertical scrollbar on the right
- ✅ Header row stays visible when scrolling down
- ✅ Full Name column stays visible when scrolling right
- ✅ Corner cell (Full Name header) stays fixed in both directions

