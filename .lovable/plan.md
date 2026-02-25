

## Plan: Remove Views & Support Type from Agent Profiles, Fix Position-Based Derivation

### Summary
Remove "Support Type" and "Views" fields from Agent Profiles UI and data flow. The Master Directory will keep its "Support Type" column but derive it from Position (via `resolveConfigKey`). Views column will be removed from Master Directory. The Support Type filter in Master Directory will be replaced with a Position filter. All downstream consumers of `support_type` will derive from `position` instead.

### Technical Details

#### Step 1: Create shared `resolvePositionCategory` utility
Move `resolveConfigKey` from `scorecardApi.ts` to a new shared file `src/lib/positionUtils.ts` and re-export from scorecardApi for backward compatibility. This function resolves `["Email", "Chat", "Phone"]` → `"Hybrid"`, etc.

**New file**: `src/lib/positionUtils.ts`
**File**: `src/lib/scorecardApi.ts` — re-export from new location

#### Step 2: Remove Support Type & Views from Agent Profiles UI
Remove the "Support Type" checkboxes/badges section and the "Views" badges section from `WorkConfigurationSection.tsx`. Remove `handleSupportTypeToggle`, `SUPPORT_TYPE_OPTIONS` import, and related `support_type`/`views` `onInputChange` calls when position changes.

**File**: `src/components/profile/WorkConfigurationSection.tsx` — remove lines 410-443 (Support Type + Views sections), remove `handleSupportTypeToggle` (lines 238-245), remove `support_type`/`views` from position change handler (lines 147, 154)

#### Step 3: Remove Support Type & Views from profile form state
Stop reading/writing `support_type` and `views` in `AgentProfile.tsx` and `ManageProfiles.tsx` form initialization. Remove from `getPositionDefaults` return value (`supportType`, `views`, `supportTypeEditable`).

**Files**: `src/pages/AgentProfile.tsx`, `src/pages/ManageProfiles.tsx`, `src/lib/agentProfileApi.ts`

#### Step 4: Update Master Directory sync to derive Support Type from Position
In `masterDirectoryApi.ts` line 643, replace `profile.support_type.join(', ')` with `resolvePositionCategory(profile.position)` so the directory `support_type` column shows the resolved category (e.g., "Hybrid" for multi-position agents).

**File**: `src/lib/masterDirectoryApi.ts` — line 643

#### Step 5: Remove Views column from Master Directory
Remove the "Views" table header and cell from `MasterDirectory.tsx`. Remove `views` from the sync data in `masterDirectoryApi.ts` line 644.

**File**: `src/pages/MasterDirectory.tsx` — remove Views header (line 404) and Views cell (lines 451-460)
**File**: `src/lib/masterDirectoryApi.ts` — remove `views` from sync data

#### Step 6: Replace Support Type filter with Position filter in Master Directory
Replace the `supportTypeFilter` dropdown with a `positionFilter` dropdown populated from unique resolved position categories (Hybrid, Email, Chat, Phone, etc.). Filter logic uses `resolvePositionCategory(entry.position)` instead of `entry.support_type`.

**File**: `src/pages/MasterDirectory.tsx` — lines 100, 119-121, and filter dropdown UI

#### Step 7: Fix Coverage Board grouping
Update `groupAgents` in `coverageBoardApi.ts` to use `resolvePositionCategory(posArr)` instead of `posArr[0]` so multi-position agents (e.g., Email+Chat+Phone) are grouped under "Hybrid".

**File**: `src/lib/coverageBoardApi.ts` — lines 445-474

#### Step 8: Fix Team Status Board categorization
Update `categorizeByPosition` in `teamStatusApi.ts` to use `resolvePositionCategory(position)` to resolve the full array, mapping "Hybrid" → `hybridSupport`.

**File**: `src/lib/teamStatusApi.ts` — lines 57-72

#### Step 9: Fix Agent Dashboard API
Update `agentDashboardApi.ts` to derive support type from `position` using `resolvePositionCategory` instead of reading `support_type` from `agent_directory`.

**File**: `src/lib/agentDashboardApi.ts`

#### Step 10: Update `getPositionDefaults` for multi-position
Update `getPositionDefaults` to check for multi-position arrays (Email+Chat+Phone) before falling back to `position[0]`. Remove `supportType`, `views`, and `supportTypeEditable` from its return type since they're no longer needed in the UI.

**File**: `src/lib/agentProfileApi.ts` — lines 29-107

### Files affected
- **New**: `src/lib/positionUtils.ts`
- **Modified**: `src/lib/scorecardApi.ts`, `src/lib/agentProfileApi.ts`, `src/lib/teamStatusApi.ts`, `src/lib/coverageBoardApi.ts`, `src/lib/masterDirectoryApi.ts`, `src/lib/agentDashboardApi.ts`, `src/components/profile/WorkConfigurationSection.tsx`, `src/pages/AgentProfile.tsx`, `src/pages/ManageProfiles.tsx`, `src/pages/MasterDirectory.tsx`

