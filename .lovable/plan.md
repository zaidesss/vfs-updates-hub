

## Master Directory: Full Column Filtering

### Problem
Currently only 3 columns (Team Lead, ZD Instance, Position) have dropdown filters. The user wants **all columns** to be filterable, with clickable column headers and range filters for numeric columns.

### Approach
Add a **filter popover on every column header** — clicking a header opens a small popover with either a categorical checklist (for text columns) or a min/max range input (for numeric columns). Keep the existing top-level filters as quick-access shortcuts.

### Column Classification

**Categorical (dropdown/checklist filter):**
- Full Name, Position, Team Lead, ZD Instance, Support Account, Agent Name, Agent Tag
- Ticket Assignment (On/Off/ZD2), Assignment View
- Weekday Schedule, Weekend Schedule, Break Schedule, Weekday OT, Weekend OT
- Day Off

**Numeric (range filter with min/max):**
- Quota, WD Hours, WE Hours, OT Hours, Total Hours

### Implementation Steps

**Step 1: Create a reusable `FilterableColumnHeader` component**
- Renders the column title + a small filter icon
- On click, opens a Popover anchored to the header
- For categorical columns: shows a searchable checklist of unique values with Select All / Clear
- For numeric columns: shows min/max inputs
- Highlights the header when a filter is active
- Includes sort toggle (asc/desc/none) at the top of the popover

**Step 2: Add filter state management to MasterDirectory**
- A single `columnFilters` state object: `Record<string, { type: 'categorical' | 'numeric', values?: Set<string>, min?: number, max?: number }>`
- A `sortConfig` state: `{ column: string, direction: 'asc' | 'desc' } | null`
- Update the `filteredEntries` memo to apply all column filters and sorting
- Update `hasActiveFilters` and `resetFilters` to include column-level filters

**Step 3: Replace static `TableHead` elements with `FilterableColumnHeader`**
- Each column header gets the component with its column key, display name, and filter type
- Frozen/sticky columns retain their z-index and positioning styles

**Step 4: Visual indicators**
- Active filter icon changes color (e.g., primary blue) when a filter is set on that column
- Badge count on the Reset button showing total active filters
- Column headers with active filters get a subtle highlight

### Technical Notes
- The FilterableColumnHeader will use the existing Popover component from shadcn/ui
- Checkbox from shadcn/ui for categorical checklist items
- The component will receive the unique values / numeric range from the parent via props (derived from data)
- All filter logic stays in the `filteredEntries` useMemo for performance
- Day Off column filter will flatten the arrays to get unique day names

