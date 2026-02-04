
# Plan: Add Auto-Populate Feature to OT Schedule

## Summary
Add the same auto-populate behavior to OT Schedule fields that exists for regular schedules:
- **Monday OT** → auto-populates Tuesday, Wednesday, Thursday, Friday OT
- **Saturday OT** → auto-populates Sunday OT

All fields remain individually editable after auto-population.

---

## Current Behavior (Regular Schedules)
```
Monday Schedule → Auto-populates Tue, Wed, Thu, Fri
Saturday Schedule → Auto-populates Sunday
```

## New Behavior (OT Schedules)
```
Monday OT → Auto-populates Tue OT, Wed OT, Thu OT, Fri OT
Saturday OT → Auto-populates Sunday OT
```

---

## Implementation

### File to Modify
`src/components/profile/WorkConfigurationSection.tsx`

### Changes Required

1. **Add `handleMondayOTChange` function** (similar to `handleMondayChange`):
```typescript
const handleMondayOTChange = (value: string) => {
  onInputChange('mon_ot_schedule', value);
  onInputChange('tue_ot_schedule', value);
  onInputChange('wed_ot_schedule', value);
  onInputChange('thu_ot_schedule', value);
  onInputChange('fri_ot_schedule', value);
};
```

2. **Add `handleSaturdayOTChange` function** (similar to `handleSaturdayChange`):
```typescript
const handleSaturdayOTChange = (value: string) => {
  onInputChange('sat_ot_schedule', value);
  onInputChange('sun_ot_schedule', value);
};
```

3. **Update Monday OT input** to use `handleMondayOTChange`

4. **Update Saturday OT input** to use `handleSaturdayOTChange`

5. **Add helper text** for both sections:
   - Weekday OT: "Monday OT auto-populates Tue-Fri OT."
   - Weekend OT: "Saturday OT auto-populates Sunday OT."

---

## Visual Preview

### Before (current)
```
Weekday OT Schedule
Configure OT schedule for each weekday (Mon-Fri)
[Monday OT] [Tuesday OT] [Wednesday OT] [Thursday OT] [Friday OT]
```

### After (with auto-populate)
```
Weekday OT Schedule
Monday OT auto-populates Tue-Fri OT.
[Monday OT] [Tuesday OT] [Wednesday OT] [Thursday OT] [Friday OT]
    ↓ auto-fills →    →    →    →
```

---

## Summary of Changes

| Location | Change |
|----------|--------|
| Line ~100 | Add `handleMondayOTChange` function |
| Line ~106 | Add `handleSaturdayOTChange` function |
| Line ~492 | Update Monday OT `onChange` to use `handleMondayOTChange` |
| Line ~486 | Update helper text for weekday OT section |
| Line ~560 | Update Saturday OT `onChange` to use `handleSaturdayOTChange` |
| Line ~554 | Update helper text for weekend OT section |
