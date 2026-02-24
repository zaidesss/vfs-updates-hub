

## Plan: Add "Upwork Contract" Dropdown Field to Work Configuration

This adds a new "Upwork Contract" field with dropdown values: **Hybrid**, **Emails**, **Chats** — stored in both `agent_profiles` and `agent_directory`, displayed on the Dashboard profile header, and available for Capacity Planning categorization.

---

### Step 1 — Database: Add `upwork_contract_type` column

Add a new text column `upwork_contract_type` to both tables:

- `agent_profiles.upwork_contract_type` (text, nullable)
- `agent_directory.upwork_contract_type` (text, nullable)

Single migration with both ALTER TABLE statements.

---

### Step 2 — Backend types & sync logic

**`src/lib/agentProfileApi.ts`:**
- Add `upwork_contract_type` to `AgentProfile` interface (line ~130)
- Add `upwork_contract_type` to `AgentProfileInput` interface (line ~203)
- Add `upwork_contract_type` to `syncProfileToDirectory()` sync data (line ~389)
- Export a `UPWORK_CONTRACT_TYPE_OPTIONS` constant: `['Hybrid', 'Emails', 'Chats']`

**`src/lib/agentDashboardApi.ts`:**
- Add `upwork_contract_type` to `DashboardProfile` interface
- Include it in the profile fetch query

**`src/lib/masterDirectoryApi.ts`:**
- Add `upwork_contract_type` to the select query for profile sync

---

### Step 3 — UI: Add dropdown to Work Configuration

**`src/components/profile/WorkConfigurationSection.tsx`:**
- Add a `Select` dropdown right after the existing "Upwork Contract ID" field (around line 405)
- Options: Hybrid, Emails, Chats
- Same edit permissions as other work config fields (Admin/Super Admin can edit, regular users see read-only)

---

### Step 4 — Dashboard Profile Header

**`src/components/dashboard/ProfileHeader.tsx`:**
- Add a new field entry showing "Upwork Contract" with the value from `profile.upwork_contract_type`
- Display as a badge (similar to Support Type)

---

### Step 5 — Capacity Planning integration

**`src/pages/operations/CapacityPlanning.tsx`:**
- The `upwork_contract_type` will be available in agent profiles for future capacity calculations
- No immediate formula changes needed — once agents have their types set, the data will be queryable for grouping agents by contract type when calculating capacity per channel

---

### Files to modify
- Database migration (2 ALTER TABLE statements)
- `src/lib/agentProfileApi.ts` — types, constants, sync
- `src/lib/agentDashboardApi.ts` — type + fetch
- `src/lib/masterDirectoryApi.ts` — select query
- `src/components/profile/WorkConfigurationSection.tsx` — dropdown UI
- `src/components/dashboard/ProfileHeader.tsx` — display field

