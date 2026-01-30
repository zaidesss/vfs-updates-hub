
# Clarifications and Additional Changes for Bios ↔ Master Directory

## Summary

Based on your feedback, I need to make the following adjustments to correctly implement the data flow between Bios and Master Directory:

---

## Changes Required

### 1. Master Directory: Make Synced Fields Read-Only

Fields that are editable in Bios and synced to Master Directory should be **read-only** (display only, no edit controls) in Master Directory:

| Field | Bios | Master Directory |
|-------|------|------------------|
| Agent Name | Editable | Read-only |
| Agent Tag | Auto-computed | Read-only |
| Zendesk Instance | Editable | Read-only |
| Support Account | Editable | Read-only |
| Support Type | Editable (Hybrid) / Read-only (others) | Read-only |
| Views | Auto-set | Read-only |
| Quota | Editable | Read-only |
| Weekday Schedule (single) | N/A | Read-only (computed from mon_schedule) |
| Weekend Schedule (single) | N/A | Read-only (computed from sat_schedule) |
| Break Schedule | Editable | Read-only |
| Weekday OT Schedule | Editable | Read-only |
| Weekend OT Schedule | Editable | Read-only |
| Day Off | Editable | Read-only |

### 2. Upwork Contract ID

- **Bios**: Add to Work Configuration section (editable)
- **Master Directory**: Remove completely

### 3. Ticket Assignment

- **Bios**: Remove Ticket Assignment Toggle (it was added in error)
- **Master Directory**: Keep Ticket Assignment Toggle here (it should remain editable in Master Directory)

### 4. Ticket Assignment View ID

- **Master Directory**: Remove this column entirely (it's auto-determined by position and not needed for display)

### 5. Day Off → Schedule Fields Auto-Disable in Bios

When a day is selected as a day off in Bios:
- The schedule input field for that day becomes disabled
- The field displays "Day Off" text instead of a time range

Example: If "Mon" is checked as day off, the Monday schedule field shows "Day Off" and is not editable.

### 6. Terminated Profiles Excluded from Master Directory

- Profiles with `employment_status = 'Terminated'` should NOT appear in Master Directory
- All computations/automations should skip terminated users
- Filter applied at the data fetch level

---

## Implementation Details

### File: `src/pages/MasterDirectory.tsx`

**Remove these columns:**
- Upwork Contract ID (column and input)
- Ticket Assignment View ID (column and input)

**Make these columns read-only (change from inputs to text display):**
- Zendesk Instance → Display text, not dropdown
- Support Account → Display text, not dropdown
- Support Type → Display text, not dropdown
- Agent Name → Display text, not input
- Agent Tag → Display text, not input
- Views → Display badges, no edit popover
- Quota → Display text, not input
- Weekday Schedule → Display text, not input
- Weekend Schedule → Display text, not input
- Break Schedule → Display text, not input
- Weekday OT Schedule → Display text, not input
- Weekend OT Schedule → Display text, not input
- Day Off → Display badges, no edit popover

**Keep editable:**
- WD Ticket Assign
- WE Ticket Assign
- Ticket Assignment Toggle (add this)

**Filter terminated profiles:**
```typescript
const filteredEntries = useMemo(() => {
  let result = editedData;
  
  // Exclude terminated profiles
  result = result.filter(entry => entry.employment_status !== 'Terminated');
  
  // Then apply search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    result = result.filter(
      (entry) =>
        entry.full_name?.toLowerCase().includes(query) ||
        entry.email.toLowerCase().includes(query)
    );
  }
  
  return result;
}, [editedData, searchQuery]);
```

### File: `src/components/profile/WorkConfigurationSection.tsx`

**Add Upwork Contract ID field:**
```typescript
<div className="space-y-2">
  <Label>Upwork Contract ID</Label>
  <Input
    value={profile.upwork_contract_id || ''}
    onChange={(e) => onInputChange('upwork_contract_id', e.target.value)}
    placeholder="Enter contract ID"
    disabled={!canEdit}
    className={!canEdit ? 'bg-muted' : ''}
  />
</div>
```

**Remove Ticket Assignment Toggle** (delete lines 212-225)

**Modify schedule inputs for day off auto-disable:**
```typescript
// Check if day is a day off
const isDayOff = (day: string) => (profile.day_off || []).includes(day);

// For each schedule input:
<div className="space-y-1">
  <Label className="text-xs">Monday</Label>
  <Input
    value={isDayOff('Mon') ? 'Day Off' : (profile.mon_schedule || '')}
    onChange={(e) => handleMondayChange(e.target.value)}
    placeholder="8:00 AM-5:00 PM"
    disabled={!canEdit || isDayOff('Mon')}
    className={cn(
      'text-xs',
      (!canEdit || isDayOff('Mon')) && 'bg-muted'
    )}
    readOnly={isDayOff('Mon')}
  />
</div>
```

### File: `src/lib/masterDirectoryApi.ts`

**Update `fetchAllDirectoryEntries`** to include `employment_status`:
```typescript
const { data: profiles, error: profilesError } = await supabase
  .from('agent_profiles')
  .select('id, email, full_name, position, team_lead, employment_status');
```

**Update `DirectoryEntry` interface** to include `employment_status`:
```typescript
export interface DirectoryEntry {
  // ... existing fields
  employment_status: string | null;
}
```

### File: `src/lib/agentProfileApi.ts`

**Add `upwork_contract_id` to sync function:**
```typescript
const syncData = {
  // ... existing fields
  upwork_contract_id: input.upwork_contract_id || null,
};
```

**Add `upwork_contract_id` to interfaces:**
```typescript
export interface AgentProfileInput {
  // ... existing fields
  upwork_contract_id?: string;
}
```

---

## Database Migration

Add `upwork_contract_id` column to `agent_profiles` if not exists:
```sql
ALTER TABLE public.agent_profiles
ADD COLUMN IF NOT EXISTS upwork_contract_id text;
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/MasterDirectory.tsx` | Make synced fields read-only, remove Upwork Contract ID & View ID columns, add Ticket Assignment Toggle, filter terminated profiles |
| `src/components/profile/WorkConfigurationSection.tsx` | Add Upwork Contract ID, remove Ticket Assignment Toggle, add day-off auto-disable logic |
| `src/lib/masterDirectoryApi.ts` | Add employment_status to interface and fetch, remove upwork_contract_id from interface |
| `src/lib/agentProfileApi.ts` | Add upwork_contract_id to interfaces and sync function |
| Database Migration | Add upwork_contract_id to agent_profiles |

---

## Result Summary

| Feature | Bios | Master Directory |
|---------|------|------------------|
| Upwork Contract ID | ✅ Editable | ❌ Removed |
| Ticket Assignment Toggle | ❌ Removed | ✅ Editable |
| Ticket Assignment View ID | N/A (auto-computed) | ❌ Removed |
| All synced fields | ✅ Editable | 📖 Read-only |
| Schedule fields when day off | 📖 Shows "Day Off" (disabled) | 📖 Read-only |
| Terminated profiles | Shows in Bios | ❌ Hidden |
