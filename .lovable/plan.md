

# OT Schedule vs Regular Schedule Conflict Validation

## Problem Summary
When an agent's regular shift ends at 5:30 PM and their OT schedule is entered as 5:29 PM-6:30 PM, the system currently accepts this even though it creates a **1-minute overlap** between regular and OT hours. This could lead to incorrect hour calculations and scheduling conflicts.

## Business Rule
**OT schedule start time must be greater than or equal to the regular schedule end time for the same day.**

Example:
- Regular: 9:00 AM - 5:30 PM
- OT: 5:29 PM - 6:30 PM → **INVALID** (starts before regular ends)
- OT: 5:30 PM - 6:30 PM → **VALID** (starts exactly when regular ends)
- OT: 6:00 PM - 7:00 PM → **VALID** (starts after regular ends)

---

## Implementation Plan

### Step 1: Create Validation Utility Function
**File:** `src/lib/masterDirectoryApi.ts`

Add a new function `validateOTScheduleConflict()` that:
1. Parses both regular schedule and OT schedule
2. Extracts the **end time** of regular schedule
3. Extracts the **start time** of OT schedule
4. Compares in minutes (after converting to 24-hour format)
5. Returns validation result with error message if conflict exists

```text
┌─────────────────────┐     ┌─────────────────────┐
│   Regular Schedule  │     │    OT Schedule      │
│  9:00 AM - 5:30 PM  │────►│  5:30 PM - 6:30 PM  │
│   End: 17:30 (1050) │     │  Start: 17:30 (1050)│
└─────────────────────┘     └─────────────────────┘
           │                           │
           └───── Must be ≤ ───────────┘
```

### Step 2: Update WorkConfigurationSection Component
**File:** `src/components/profile/WorkConfigurationSection.tsx`

Modify the `handleScheduleBlur` function to:
1. When an OT schedule field is blurred, check against the corresponding regular schedule
2. If conflict detected, set an error for that OT field
3. Display a clear error message: "OT must start at or after regular shift ends"

Day mapping:
| OT Field | Compare Against Regular Field |
|----------|-------------------------------|
| mon_ot_schedule | mon_schedule |
| tue_ot_schedule | tue_schedule |
| wed_ot_schedule | wed_schedule |
| thu_ot_schedule | thu_schedule |
| fri_ot_schedule | fri_schedule |
| sat_ot_schedule | sat_schedule |
| sun_ot_schedule | sun_schedule |

### Step 3: Update Save Validation in AgentProfile.tsx
**File:** `src/pages/AgentProfile.tsx`

Add OT conflict validation alongside existing schedule format validation in `handleSave()`:
1. Loop through all days
2. Check if OT schedule conflicts with regular schedule
3. If any conflicts exist, show toast error and prevent save

---

## Technical Details

### New Function Signature
```typescript
export function validateOTScheduleConflict(
  regularSchedule: string | null | undefined,
  otSchedule: string | null | undefined
): { isValid: boolean; error?: string }
```

### Parsing Logic
Reuse existing schedule parsing regex to extract times, then convert to minutes from midnight for comparison:
- "5:30 PM" → 17:30 → 1050 minutes
- "5:29 PM" → 17:29 → 1049 minutes

Conflict exists when: `OT start time < Regular end time`

### Edge Cases Handled
1. **Empty schedules** - No validation needed (both must have values)
2. **Day off** - OT can still be validated independently if day is not a regular work day
3. **Overnight shifts** - Regular ends after midnight (e.g., 11:00 PM - 7:00 AM) - OT should start after 7:00 AM
4. **Invalid format** - Skip conflict check if either schedule format is invalid (handled by existing validation)

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/masterDirectoryApi.ts` | Add `validateOTScheduleConflict()` function |
| `src/components/profile/WorkConfigurationSection.tsx` | Add OT conflict check on blur |
| `src/pages/AgentProfile.tsx` | Add OT conflict validation before save |
| `src/pages/ManageProfiles.tsx` | Add same validation for admin profile editing (if applicable) |

---

## User Experience

**On blur (immediate feedback):**
When user finishes typing OT schedule, if conflict exists:
- Field border turns red
- Error message appears: "OT must start at or after 5:30 PM (regular shift end)"

**On save (final validation):**
If any OT conflicts remain:
- Toast notification: "Invalid OT Schedule - Monday OT conflicts with regular schedule"
- Save is blocked

