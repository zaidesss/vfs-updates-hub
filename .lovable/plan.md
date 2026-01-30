# Bios ↔ Master Directory Implementation - COMPLETED

## Summary

Successfully implemented the data flow between Bios (Agent Profiles) and Master Directory with the following behavior:

---

## Completed Changes

### 1. Master Directory: Synced Fields are Read-Only ✅

Fields synced from Bios are now displayed as read-only text/badges in Master Directory:

| Field | Bios | Master Directory |
|-------|------|------------------|
| Agent Name | ✅ Editable | 📖 Read-only |
| Agent Tag | Auto-computed | 📖 Read-only |
| Zendesk Instance | ✅ Editable | 📖 Read-only |
| Support Account | ✅ Editable | 📖 Read-only |
| Support Type | ✅ Editable (Hybrid) / Read-only (others) | 📖 Read-only |
| Views | Auto-set | 📖 Read-only (badges) |
| Quota | ✅ Editable | 📖 Read-only |
| Weekday Schedule | ✅ Editable (individual days) | 📖 Read-only |
| Weekend Schedule | ✅ Editable (individual days) | 📖 Read-only |
| Break Schedule | ✅ Editable | 📖 Read-only |
| Weekday OT Schedule | ✅ Editable | 📖 Read-only |
| Weekend OT Schedule | ✅ Editable | 📖 Read-only |
| Day Off | ✅ Editable | 📖 Read-only (badges) |

### 2. Upwork Contract ID ✅

- **Bios**: Added to Work Configuration section (editable)
- **Master Directory**: Removed completely

### 3. Ticket Assignment ✅

- **Bios**: Toggle removed
- **Master Directory**: Toggle kept and editable (with immediate save to agent_profiles)

### 4. Ticket Assignment View ID ✅

- **Master Directory**: Column removed entirely

### 5. Day Off → Schedule Auto-Disable in Bios ✅

- When a day is selected as day off, the schedule field shows "Day Off" and becomes disabled
- Schedule fields are cleared when marking a day as off
- Monday auto-populate respects day-off status for Tue-Fri
- Saturday auto-populate respects day-off status for Sunday

### 6. Terminated Profiles Excluded ✅

- Profiles with `employment_status = 'Terminated'` are filtered out of Master Directory
- Filter applied in the `filteredEntries` useMemo

---

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/MasterDirectory.tsx` | Complete rewrite - synced fields now read-only, removed Upwork & View ID columns, added Ticket Assignment toggle, filter terminated profiles |
| `src/components/profile/WorkConfigurationSection.tsx` | Added Upwork Contract ID, removed Ticket Assignment Toggle, added day-off auto-disable logic for schedule fields |
| `src/lib/masterDirectoryApi.ts` | Updated DirectoryEntry interface - added employment_status, ticket_assignment_enabled; removed upwork_contract_id, ticket_assignment_view_id |
| `src/lib/agentProfileApi.ts` | Added upwork_contract_id to AgentProfileInput interface and sync function |

---

## Editable Fields in Master Directory

Only these fields remain editable in Master Directory:

1. **WD Ticket Assign** - Input field
2. **WE Ticket Assign** - Input field
3. **Ticket Assignment** - Toggle switch (syncs to agent_profiles)

All other fields are read-only and synced from Bios.

---

## Data Flow

```
Bios (Agent Profile) → Save → Sync to agent_directory → Master Directory (Read-Only Display)
                                                              ↓
                                                   Ticket Assignment Toggle
                                                   WD/WE Ticket Assign (editable)
```
