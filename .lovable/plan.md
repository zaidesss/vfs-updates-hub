

# Fix: OT Schedule Sync + Automatic Sync Already Exists

## Good News: Automatic Sync Already Works!

Looking at the code, automatic syncing from Bios to Master Directory is **already implemented**:

**File: `src/lib/agentProfileApi.ts` (Lines 447-453)**
```typescript
// Sync to agent_directory for Master Directory visibility
try {
  await syncProfileToDirectory(input);
} catch (syncError) {
  console.error('Failed to sync profile to directory:', syncError);
  // Don't fail the save for sync errors
}
```

Every time a profile is saved via `upsertProfile()`, it automatically calls `syncProfileToDirectory()` to update the Master Directory.

---

## The Real Issue: OT Summary Logic Bug

The problem is that the sync function tries to use fields that don't exist in the input:

| Line | Current Code | Problem |
|------|--------------|---------|
| 371 | `weekday_ot_schedule: input.weekday_ot_schedule \|\| null` | `weekday_ot_schedule` is NOT a field in `AgentProfileInput` |
| 372 | `weekend_ot_schedule: input.weekend_ot_schedule \|\| null` | `weekend_ot_schedule` is NOT a field in `AgentProfileInput` |

The agent_profiles table stores **per-day OT** (`mon_ot_schedule`, `tue_ot_schedule`, etc.), but the Master Directory displays **summary columns** that need to be derived.

---

## Solution: Fix OT Summary Derivation

### File 1: `src/lib/agentProfileApi.ts`

**Lines 371-372 - Derive OT summary from per-day fields:**

```typescript
// Before:
weekday_ot_schedule: input.weekday_ot_schedule || null,
weekend_ot_schedule: input.weekend_ot_schedule || null,

// After:
// Derive weekday OT summary from first available Mon-Fri OT schedule
weekday_ot_schedule: input.mon_ot_schedule || input.tue_ot_schedule || 
                     input.wed_ot_schedule || input.thu_ot_schedule || 
                     input.fri_ot_schedule || null,
// Derive weekend OT summary from first available Sat-Sun OT schedule
weekend_ot_schedule: input.sat_ot_schedule || input.sun_ot_schedule || null,
```

### File 2: `src/lib/masterDirectoryApi.ts`

**Lines 531-532 - Same fix for bulk sync:**

```typescript
// Before:
weekday_ot_schedule: profile.weekday_ot_schedule || null,
weekend_ot_schedule: profile.weekend_ot_schedule || null,

// After:
// Derive weekday OT summary from first available Mon-Fri OT schedule
weekday_ot_schedule: profile.mon_ot_schedule || profile.tue_ot_schedule || 
                     profile.wed_ot_schedule || profile.thu_ot_schedule || 
                     profile.fri_ot_schedule || null,
// Derive weekend OT summary from first available Sat-Sun OT schedule
weekend_ot_schedule: profile.sat_ot_schedule || profile.sun_ot_schedule || null,
```

---

## Summary of Changes

| File | Lines | Change |
|------|-------|--------|
| `src/lib/agentProfileApi.ts` | 371-372 | Derive OT summary from per-day fields |
| `src/lib/masterDirectoryApi.ts` | 531-532 | Same derivation for bulk sync |

---

## How It Works After Fix

1. **Individual Save** (Automatic): When any profile is saved in Bios, `syncProfileToDirectory()` automatically runs and correctly populates OT summary columns

2. **Bulk Sync** (Manual): When "Sync from Bios" button is clicked, `syncAllProfilesToDirectory()` correctly populates OT summary for all profiles

---

## Expected Result for Malcolm

After fix, when Malcolm's profile is saved (or bulk sync is run):

| Column | Current | After Fix |
|--------|---------|-----------|
| Weekday OT | `-` (NULL) | `5:30 PM-7:30 PM` |
| Weekend OT | `-` (NULL) | `5:00 PM-7:00 PM` |
| OT Hours | `10.0` | `10.0` (unchanged, already correct) |

