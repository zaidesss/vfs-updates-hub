

# Plan: Add Header Filters to Master Directory

## Summary
Add dropdown filters for **Team Lead**, **Zendesk Instance**, and **Support Type** to the Master Directory table, allowing admins to quickly filter the view by these criteria.

---

## Current State
- Master Directory has a search input for filtering by name/email
- No column-specific filters exist
- Table already displays Team Lead, Zendesk Instance, and Support Type columns

---

## Implementation

### UI Design
A filter bar will be added next to the search input with three dropdown selects and a Reset button:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [🔍 Search agents...]  [Team Lead ▼]  [ZD Instance ▼]  [Support Type ▼]  [Reset] │
└─────────────────────────────────────────────────────────────────────────────┘
```

- Filter options are **dynamically extracted** from the current data
- Empty/null values are excluded from filter options
- "All" option shows all entries (default)
- Reset button appears only when filters are active

---

## Technical Changes

### File: `src/pages/MasterDirectory.tsx`

| Change | Description |
|--------|-------------|
| Add imports | `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` from ui/select, `X` icon |
| Add filter state | `teamLeadFilter`, `zdInstanceFilter`, `supportTypeFilter` (default: `'all'`) |
| Add useMemo for options | Extract unique `team_lead`, `zendesk_instance`, `support_type` values from non-terminated profiles |
| Update `filteredEntries` | Apply the three new filters in addition to existing search filter |
| Update UI | Replace search-only bar with flex container holding search + 3 dropdowns + reset button |

---

## Code Snippets

### 1. Add Filter State
```typescript
const [teamLeadFilter, setTeamLeadFilter] = useState('all');
const [zdInstanceFilter, setZdInstanceFilter] = useState('all');
const [supportTypeFilter, setSupportTypeFilter] = useState('all');
```

### 2. Extract Unique Filter Options
```typescript
const filterOptions = useMemo(() => {
  const activeEntries = editedData.filter(e => e.employment_status !== 'Terminated');
  
  const teamLeads = [...new Set(activeEntries.map(e => e.team_lead).filter(Boolean))].sort() as string[];
  const zdInstances = [...new Set(activeEntries.map(e => e.zendesk_instance).filter(Boolean))].sort() as string[];
  const supportTypes = [...new Set(activeEntries.map(e => e.support_type).filter(Boolean))].sort() as string[];
  
  return { teamLeads, zdInstances, supportTypes };
}, [editedData]);
```

### 3. Update Filtered Entries Logic
```typescript
const filteredEntries = useMemo(() => {
  let result = editedData.filter(entry => entry.employment_status !== 'Terminated');
  
  if (teamLeadFilter !== 'all') {
    result = result.filter(entry => entry.team_lead === teamLeadFilter);
  }
  if (zdInstanceFilter !== 'all') {
    result = result.filter(entry => entry.zendesk_instance === zdInstanceFilter);
  }
  if (supportTypeFilter !== 'all') {
    result = result.filter(entry => entry.support_type === supportTypeFilter);
  }
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    result = result.filter(entry =>
      entry.full_name?.toLowerCase().includes(query) ||
      entry.email.toLowerCase().includes(query)
    );
  }
  
  return result;
}, [editedData, searchQuery, teamLeadFilter, zdInstanceFilter, supportTypeFilter]);
```

### 4. Reset Handler
```typescript
const resetFilters = () => {
  setTeamLeadFilter('all');
  setZdInstanceFilter('all');
  setSupportTypeFilter('all');
  setSearchQuery('');
};

const hasActiveFilters = teamLeadFilter !== 'all' || 
                         zdInstanceFilter !== 'all' || 
                         supportTypeFilter !== 'all' || 
                         searchQuery.trim() !== '';
```

---

## Files Changed

| File | Action |
|------|--------|
| `src/pages/MasterDirectory.tsx` | Add filter state, logic, and UI components |

---

## Benefits
- Quick filtering without scrolling through entire table
- Dynamic options based on actual data (no hardcoded values)
- Filters persist during session until manually reset
- Combines with existing search for powerful querying

