

# Plan: Downgrade "Managed by HR" Field Permissions to Admin Role

## Overview
Change the Work Configuration section and related fields to be editable by both **Admin** and **Super Admin** roles, while keeping the **Compensation** section restricted to **Super Admin only**.

---

## Current vs Proposed Permissions

| Section/Fields | Current Access | Proposed Access |
|----------------|----------------|-----------------|
| Work Configuration (Position, Agent Name, Zendesk, Schedules, Quotas, etc.) | Super Admin only | Admin + Super Admin |
| Team Lead, Clients | Super Admin only | Admin + Super Admin |
| Employment Status, Start Date | Super Admin only | Admin + Super Admin |
| **Compensation** (Payment Frequency, Hourly Rate, Rate History) | Super Admin only | **Super Admin only (unchanged)** |

---

## Files to Modify

### 1. `src/pages/ManageProfiles.tsx`
**Line 243**: Change `canEditWorkInfo` from `isSuperAdmin` to `isAdmin`
```typescript
// Current
const canEditWorkInfo = isSuperAdmin;

// Proposed
const canEditWorkInfo = isAdmin;
```

**Lines 801-869 (Compensation section)**: Keep using `canEditWorkInfo` for the non-compensation Work Configuration fields, but add a separate `canEditCompensation` variable for Compensation:
```typescript
const canEditWorkInfo = isAdmin;        // NEW: Admins can edit work config
const canEditCompensation = isSuperAdmin; // Compensation stays Super Admin only
```

Then update the Compensation section (lines 801-869) to use `canEditCompensation` instead of `canEditWorkInfo`.

---

### 2. `src/components/profile/WorkConfigurationSection.tsx`
**Line 43**: Change the `canEdit` variable to accept an `isAdmin` prop instead of only `isSuperAdmin`
```typescript
// Current
const canEdit = isSuperAdmin;

// Proposed - Already receives isSuperAdmin prop, rename logic to accept isAdmin
```

**Interface update (line 24)**: Add `isAdmin` prop alongside `isSuperAdmin`:
```typescript
interface WorkConfigurationSectionProps {
  profile: AgentProfileInput;
  onInputChange: (field: keyof AgentProfileInput, value: any) => void;
  isSuperAdmin: boolean;
  isAdmin?: boolean; // NEW: Allow admin access
  // ...
}

// Then update canEdit:
const canEdit = isAdmin || isSuperAdmin;
```

---

### 3. `src/pages/AgentProfile.tsx` (Individual Profile Page)
Update the following fields to use `isAdmin` instead of `isSuperAdmin`:
- **Lines 600-651**: Team Lead, Clients, Employment Status, Start Date fields
- **WorkConfigurationSection** component call

Keep Compensation section (lines 668-750) using `isSuperAdmin`.

---

## Technical Implementation Details

### ManageProfiles.tsx Changes

1. **Add `isAdmin` to destructuring** (line 29 already has it)
2. **Split permission variables** (around line 243):
   ```typescript
   const canEditWorkInfo = isAdmin;        // Work config: admin+
   const canEditCompensation = isSuperAdmin; // Compensation: super_admin only
   ```
3. **Update ProfilesGrid props** to pass both permissions
4. **Update Compensation section** to use `canEditCompensation`

### WorkConfigurationSection.tsx Changes

1. **Update interface** to accept `isAdmin` prop
2. **Update `canEdit`** to `isAdmin || isSuperAdmin` (or just use the passed prop)
3. **Keep badge as "hr"** but the lock icon will only show when user cannot edit

### AgentProfile.tsx Changes

1. **Add `isAdmin` from useAuth**
2. **Update work fields** to check `isAdmin` instead of `isSuperAdmin`
3. **Keep Compensation** locked to `isSuperAdmin`

---

## Badge Display Update

The "Managed by HR" badge will still display on these sections, but:
- For **Admins**: Fields will be editable (no lock icon)
- For **Regular users**: Fields remain locked with lock icon
- **Compensation**: Only Super Admins see it unlocked

---

## Summary of Changes

| File | What Changes |
|------|--------------|
| `ManageProfiles.tsx` | Split `canEditWorkInfo` into work + compensation permissions |
| `WorkConfigurationSection.tsx` | Accept `isAdmin` prop, update `canEdit` logic |
| `AgentProfile.tsx` | Update work config fields to use `isAdmin`, keep compensation as `isSuperAdmin` |
| `ProfileSectionHeader.tsx` | No changes needed (badge logic unchanged) |

---

## Testing Plan

After implementation, test with:
1. **Regular User**: All "Managed by HR" fields should be read-only
2. **Admin**: Work Configuration editable, Compensation read-only
3. **Super Admin**: Everything editable including Compensation

