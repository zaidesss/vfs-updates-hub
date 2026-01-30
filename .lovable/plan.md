
# Transfer Work Configuration from Master Directory to Bios

## Summary

Consolidate work configuration fields into **Bios (Agent Profile)** as the single source of truth. Select fields will sync to **Master Directory** for visibility and hours computation. Master Directory synced fields become read-only.

---

## Phase 1: Database Schema Changes

Add new columns to `agent_profiles` table to store work configuration data currently in `agent_directory`:

### New Fields for agent_profiles

| Field | Type | Description |
|-------|------|-------------|
| agent_name | text | Editable, defaults from first name |
| agent_tag | text | Auto-computed lowercase of agent_name |
| zendesk_instance | text | Dropdown: ZD1, ZD2 |
| support_account | text | Dropdown: 1-17 |
| support_type | text[] | Array for Hybrid, single value for others |
| views | text[] | Auto-set based on position |
| ticket_assignment_enabled | boolean | Toggle (replaces view ID text input) |
| ticket_assignment_view_id | text | Auto-determined from position |
| quota_email | integer | For Email/Chat/Hybrid |
| quota_chat | integer | For Chat/Hybrid |
| quota_phone | integer | For Phone/Hybrid |
| mon_schedule | text | Individual day schedule |
| tue_schedule | text | |
| wed_schedule | text | |
| thu_schedule | text | |
| fri_schedule | text | |
| sat_schedule | text | |
| sun_schedule | text | |
| break_schedule | text | |
| weekday_ot_schedule | text | |
| weekend_ot_schedule | text | |
| day_off | text[] | Array of day names |

---

## Phase 2: Position Dropdown and Field Logic

### Position Dropdown Values
```
Hybrid Support
Team Lead
Logistics
Email Support
Chat Support
Phone Support
Technical Support
```

### Position-Based Field Behavior

| Position | Quota Fields | Views | Support Type | Ticket View ID |
|----------|--------------|-------|--------------|----------------|
| Hybrid Support | Email, Chat, Phone (editable) | All | Multi-select (editable) | 50553259977753 |
| Email Support | Email only | Open | Email (read-only) | 50553259977753 |
| Chat Support | Email, Chat | New | Chat (read-only) | 48622289457049 |
| Phone Support | Email, Phone | New | Phone (read-only) | 48622289457049 |
| Team Lead | No quota | All | Email (read-only) | - |
| Logistics | No quota | All | Email (read-only) | - |
| Technical Support | No quota | All | Email (read-only) | - |

---

## Phase 3: UI Changes to Bios (AgentProfile.tsx and ManageProfiles.tsx)

### Work Information Section Updates

1. **Position/Role**: Change from text input to dropdown

2. **Agent Name**: New field
   - Defaults from first word of full_name
   - Editable by user

3. **Agent Tag**: New field (read-only)
   - Auto-computed: lowercase of agent_name

4. **Zendesk Instance**: New dropdown (ZD1, ZD2)

5. **Support Account**: New dropdown (1-17)

6. **Support Type**: Conditional rendering
   - Hybrid: Multi-select dropdown (Email, Chat, Phone)
   - Others: Read-only badge showing default type

7. **Views**: Read-only display based on position

8. **Ticket Assignment**: Toggle switch
   - Enabled/Disabled
   - View ID auto-determined by position

9. **Productivity (Quota)**: Conditional quota fields
   - Hybrid: 3 fields (Email, Chat, Phone quotas)
   - Email Support: 1 field (Email quota)
   - Chat Support: 2 fields (Email, Chat quotas)
   - Phone Support: 2 fields (Email, Phone quotas)
   - Team Lead/Logistics/Technical: No quota fields

10. **Weekday Schedule**: 5 individual fields (Mon-Fri)
    - Monday value auto-populates Tue-Fri
    - Each field remains editable

11. **Weekend Schedule**: 2 individual fields (Sat-Sun)
    - Saturday value auto-populates Sunday
    - Each field remains editable

12. **Break Schedule**: Text input (same format as before)

13. **Weekday OT Schedule**: Text input

14. **Weekend OT Schedule**: Text input

15. **Day Off**: Multi-select checkboxes (Mon-Sun)

---

## Phase 4: Sync Logic (Bios to Master Directory)

When saving Bios, sync these fields to `agent_directory`:

```typescript
async function syncProfileToDirectory(profileData: AgentProfileInput) {
  // Compute weekday_schedule from mon_schedule (first day)
  // Compute weekend_schedule from sat_schedule (first day)
  // Calculate hours using existing calculateTotalHours function
  
  await supabase.from('agent_directory').upsert({
    email: profileData.email,
    agent_name: profileData.agent_name,
    agent_tag: profileData.agent_tag,
    zendesk_instance: profileData.zendesk_instance,
    support_account: profileData.support_account,
    support_type: profileData.support_type,
    views: profileData.views,
    ticket_assignment_view_id: profileData.ticket_assignment_view_id,
    quota: aggregateQuota(profileData),
    mon_schedule: profileData.mon_schedule,
    // ... all schedule fields
    break_schedule: profileData.break_schedule,
    weekday_ot_schedule: profileData.weekday_ot_schedule,
    weekend_ot_schedule: profileData.weekend_ot_schedule,
    day_off: profileData.day_off,
    // Computed summary fields
    weekday_schedule: profileData.mon_schedule,
    weekend_schedule: profileData.sat_schedule,
    ...calculatedHours,
  });
}
```

---

## Phase 5: Master Directory Updates

### Read-Only Synced Fields
The following fields become read-only in Master Directory (they sync from Bios):

- Agent Name
- Agent Tag
- Zendesk Instance
- Support Account
- Support Type
- Views
- Ticket Assignment View ID
- Quota
- Weekday Schedule (single field display)
- Weekend Schedule (single field display)
- Break Schedule
- Weekday OT Schedule
- Weekend OT Schedule
- Day Off

### Still Computed in Master Directory
- Weekday Total Hours
- Weekend Total Hours
- OT Total Hours
- Unpaid Break Hours
- Overall Total Hours

---

## Phase 6: Data Migration

### Match Existing Position Values

Create migration to standardize existing position values:

```sql
UPDATE agent_profiles SET position = 
  CASE 
    WHEN LOWER(position) LIKE '%hybrid%' THEN 'Hybrid Support'
    WHEN LOWER(position) LIKE '%team lead%' THEN 'Team Lead'
    WHEN LOWER(position) LIKE '%logistics%' THEN 'Logistics'
    WHEN LOWER(position) LIKE '%email%' THEN 'Email Support'
    WHEN LOWER(position) LIKE '%chat%' THEN 'Chat Support'
    WHEN LOWER(position) LIKE '%phone%' OR LOWER(position) LIKE '%call%' THEN 'Phone Support'
    WHEN LOWER(position) LIKE '%technical%' THEN 'Technical Support'
    ELSE position
  END
WHERE position IS NOT NULL;
```

---

## Files to Modify

| File | Changes |
|------|---------|
| Database Migration | Add 20+ new columns to `agent_profiles` |
| `src/lib/agentProfileApi.ts` | Add new fields to interfaces, add sync function |
| `src/pages/AgentProfile.tsx` | Add Work Configuration section with conditional fields |
| `src/pages/ManageProfiles.tsx` | Add same Work Configuration fields for admin |
| `src/pages/MasterDirectory.tsx` | Make synced fields read-only |
| `src/lib/masterDirectoryApi.ts` | Update fetch to show synced fields as read-only |

---

## Implementation Order (Step by Step)

1. **Step 1**: Database migration - Add new columns to agent_profiles
2. **Step 2**: Update agentProfileApi.ts - Add new fields to interfaces
3. **Step 3**: Update AgentProfile.tsx - Add Position dropdown and conditional fields
4. **Step 4**: Update ManageProfiles.tsx - Add same fields for admin editing
5. **Step 5**: Add sync logic - Save to agent_directory when profile saves
6. **Step 6**: Update MasterDirectory.tsx - Make synced fields read-only
7. **Step 7**: Test and verify data flows correctly

---

## Technical Details

### Position Change Handler
```typescript
function handlePositionChange(position: string) {
  const defaults = getDefaultsForPosition(position);
  
  // Auto-set support type
  if (position !== 'Hybrid Support') {
    setProfile(prev => ({
      ...prev,
      position,
      support_type: defaults.defaultSupportType,
      views: defaults.views,
      ticket_assignment_view_id: defaults.viewId,
    }));
  } else {
    setProfile(prev => ({
      ...prev,
      position,
      views: ['All'],
      ticket_assignment_view_id: '50553259977753',
    }));
  }
}

function getDefaultsForPosition(position: string) {
  switch (position) {
    case 'Chat Support':
      return { defaultSupportType: 'Chat', views: ['New'], viewId: '48622289457049' };
    case 'Phone Support':
      return { defaultSupportType: 'Phone', views: ['New'], viewId: '48622289457049' };
    case 'Email Support':
      return { defaultSupportType: 'Email', views: ['Open'], viewId: '50553259977753' };
    case 'Hybrid Support':
      return { defaultSupportType: 'Hybrid', views: ['All'], viewId: '50553259977753' };
    case 'Team Lead':
    case 'Logistics':
    case 'Technical Support':
      return { defaultSupportType: 'Email', views: ['All'], viewId: null };
    default:
      return { defaultSupportType: null, views: [], viewId: null };
  }
}
```

### Schedule Auto-Population
```typescript
function handleMondayScheduleChange(value: string) {
  setProfile(prev => ({
    ...prev,
    mon_schedule: value,
    tue_schedule: value,
    wed_schedule: value,
    thu_schedule: value,
    fri_schedule: value,
  }));
}

function handleSaturdayScheduleChange(value: string) {
  setProfile(prev => ({
    ...prev,
    sat_schedule: value,
    sun_schedule: value,
  }));
}
```

---

## Potential Conflicts Addressed

1. **Position migration**: Will map existing free-text values to dropdown options
2. **Bi-directional sync**: Master Directory becomes read-only for synced fields (no conflict)
3. **Hours computation**: Stays in Master Directory, uses synced data from Bios
4. **Existing data**: Schedule fields from agent_directory will continue working, new profile fields will sync on next save
