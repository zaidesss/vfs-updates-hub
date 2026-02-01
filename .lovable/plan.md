

# Fix: Upwork Contract ID Not Loading in Agent Profiles

## Problem Summary

The Upwork Contract ID is being saved to the database successfully (confirmed: `malcom@persistbrands.com` has value `40482492`), but it disappears from the UI when you navigate away and return. This is because the field is not being loaded back from the database.

## Root Cause

There are **3 code locations** that need to be fixed:

| Location | Issue |
|----------|-------|
| `AgentProfile` interface | Missing `upwork_contract_id` field - TypeScript doesn't know it exists |
| `ManageProfiles.tsx` | Not loading `upwork_contract_id` when populating `editData` |
| `AgentProfile.tsx` | Not loading `upwork_contract_id` when populating the profile state |

## Implementation Plan

### Step 1: Add `upwork_contract_id` to `AgentProfile` Interface

**File:** `src/lib/agentProfileApi.ts`

Add the missing field to the `AgentProfile` interface (around line 128, after `upwork_username`):

```typescript
// Freelance fields
upwork_profile_url: string | null;
upwork_username: string | null;
upwork_contract_id: string | null;  // ADD THIS LINE
```

### Step 2: Fix ManageProfiles.tsx to Load the Field

**File:** `src/pages/ManageProfiles.tsx`

In the `handleSelectUser` function, add the missing field to `setEditData` (around line 91, after `upwork_username`):

```typescript
upwork_username: profile?.upwork_username || '',
upwork_contract_id: profile?.upwork_contract_id || '',  // ADD THIS LINE
```

### Step 3: Fix AgentProfile.tsx to Load the Field

**File:** `src/pages/AgentProfile.tsx`

In the `loadProfile` function, add the missing field when setting the profile state (around line 132, after `upwork_username`):

```typescript
upwork_username: result.data.upwork_username || '',
upwork_contract_id: result.data.upwork_contract_id || '',  // ADD THIS LINE
```

Also in the fallback case when creating a new profile (around line 194), add:
```typescript
upwork_username: '',
upwork_contract_id: '',  // ADD THIS LINE
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/agentProfileApi.ts` | Add `upwork_contract_id` to `AgentProfile` interface |
| `src/pages/ManageProfiles.tsx` | Load `upwork_contract_id` in `handleSelectUser` |
| `src/pages/AgentProfile.tsx` | Load `upwork_contract_id` in `loadProfile` (2 places) |

## Expected Result

After the fix:
1. Navigate to Manage Profiles
2. Select an agent with a saved Upwork Contract ID
3. The field will display the saved value correctly
4. Navigate away and return - the value will still be there
5. Upwork integration will work because the contract ID persists

