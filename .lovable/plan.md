
# Enforce Schedule Format Validation in Bios

## Problem

The schedule input fields in the Work Configuration section (Bios) currently accept any text input without validation. This can lead to:
- Typos (e.g., "8:00AM-5:00PM" vs "8:00 AM-5:00 PM")
- Invalid formats that break hour calculations in Master Directory
- Inconsistent data storage

## Solution

Add real-time format validation to all schedule input fields in the `WorkConfigurationSection.tsx` component, reusing the existing `validateScheduleFormat()` function from `masterDirectoryApi.ts`.

---

## Implementation Details

### Validation Behavior

**Required Format**: `H:MM AM-H:MM PM` or `HH:MM AM-HH:MM PM`

Examples of valid formats:
- `8:00 AM-5:00 PM`
- `12:00 PM-1:00 PM`
- `5:00 PM-7:00 PM`

**Validation Points**:
1. **On blur** (when field loses focus): Show error message if format is invalid
2. **On save**: Block save and show toast error if any schedule format is invalid
3. **Visual feedback**: Red border and error text for invalid fields

### File Changes

**File 1: `src/components/profile/WorkConfigurationSection.tsx`**

Add validation state and error display for each schedule field:

```typescript
import { validateScheduleFormat } from '@/lib/masterDirectoryApi';
import { useState } from 'react';

// Add validation state
const [scheduleErrors, setScheduleErrors] = useState<Record<string, string>>({});

// Validation handler
const handleScheduleBlur = (field: string, value: string) => {
  if (value && value !== 'Day Off' && !validateScheduleFormat(value)) {
    setScheduleErrors(prev => ({
      ...prev,
      [field]: 'Invalid format. Use: H:MM AM-H:MM PM (e.g., 8:00 AM-5:00 PM)'
    }));
  } else {
    setScheduleErrors(prev => {
      const { [field]: _, ...rest } = prev;
      return rest;
    });
  }
};

// Check if all schedules are valid
const hasScheduleErrors = Object.keys(scheduleErrors).length > 0;
```

Add `onBlur` handler and error styling to each schedule input:

```tsx
<Input
  value={getScheduleValue('Mon', profile.mon_schedule)}
  onChange={(e) => handleMondayChange(e.target.value)}
  onBlur={(e) => handleScheduleBlur('mon_schedule', e.target.value)}
  placeholder="8:00 AM-5:00 PM"
  disabled={!canEdit || isDayOff('Mon')}
  className={cn(
    'text-xs',
    (!canEdit || isDayOff('Mon')) && 'bg-muted',
    scheduleErrors['mon_schedule'] && 'border-red-500'
  )}
/>
{scheduleErrors['mon_schedule'] && (
  <p className="text-xs text-red-500 mt-1">{scheduleErrors['mon_schedule']}</p>
)}
```

**File 2: `src/pages/ManageProfiles.tsx`**

Add validation before save:

```typescript
import { validateScheduleFormat } from '@/lib/masterDirectoryApi';

const handleSave = async () => {
  if (!editData || !selectedUser) return;
  
  // Validate all schedule fields
  const scheduleFields = [
    { key: 'mon_schedule', label: 'Monday' },
    { key: 'tue_schedule', label: 'Tuesday' },
    { key: 'wed_schedule', label: 'Wednesday' },
    { key: 'thu_schedule', label: 'Thursday' },
    { key: 'fri_schedule', label: 'Friday' },
    { key: 'sat_schedule', label: 'Saturday' },
    { key: 'sun_schedule', label: 'Sunday' },
    { key: 'break_schedule', label: 'Break' },
    { key: 'weekday_ot_schedule', label: 'Weekday OT' },
    { key: 'weekend_ot_schedule', label: 'Weekend OT' },
  ];
  
  const invalidSchedules = scheduleFields.filter(f => {
    const value = editData[f.key as keyof typeof editData] as string;
    return value && !validateScheduleFormat(value);
  });
  
  if (invalidSchedules.length > 0) {
    toast({
      title: 'Invalid Schedule Format',
      description: `Please fix: ${invalidSchedules.map(f => f.label).join(', ')}. Format: H:MM AM-H:MM PM`,
      variant: 'destructive'
    });
    return;
  }
  
  // Continue with save...
};
```

**File 3: `src/pages/AgentProfile.tsx`**

Apply the same save validation logic to the Agent Profile page.

---

## Additional Considerations

Before implementing, I want to confirm a few things:

1. **Empty values**: Should empty schedule fields be allowed? (Currently yes - validation only triggers if there's content)

2. **Auto-formatting**: Would you like the input to automatically format as the user types? For example:
   - Auto-insert spaces around AM/PM
   - Auto-capitalize AM/PM
   - This would be more complex but more user-friendly

3. **Same validation for AgentProfile.tsx**: The self-service profile page should also have this validation when super admins edit their own profiles. Should I include that as well?

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/profile/WorkConfigurationSection.tsx` | Add onBlur validation, error state, visual feedback for invalid formats |
| `src/pages/ManageProfiles.tsx` | Add pre-save validation check for all schedule fields |
| `src/pages/AgentProfile.tsx` | Add same pre-save validation check |

---

## Technical Notes

- The validation regex already exists: `/^(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i`
- The format allows flexible spacing around AM/PM (with or without space)
- Hour can be 1-2 digits (8 or 08)
- Minutes must be 2 digits (00, 30, etc.)

