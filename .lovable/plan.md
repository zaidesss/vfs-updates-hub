

## Plan: Fix OT Day-Off Logic, Team Lead Dropdown, and Zendesk User ID Lookup Table

### Issue 1: OT Schedules Incorrectly Set on Day-Off Days

**Root Cause**: When a day is toggled as "Day Off" in `handleDayOffToggle` (WorkConfigurationSection.tsx line 207), only the regular schedule is cleared -- the OT schedule for that day is NOT cleared. Additionally, the OT schedule inputs are never disabled for day-off days, so users can freely enter OT on days off.

**Affected Agents** (9 out of 11 OT-enabled agents have OT on their day-off days):
| Agent | Day Off | OT on Day Off |
|---|---|---|
| Richelle | Fri, Sat | Fri OT, Sat OT |
| Biah | Thu, Fri | Thu OT, Fri OT |
| Ellen | Thu, Fri | Thu OT, Fri OT |
| Jannah | Fri, Sat | Fri OT, Sat OT |
| Joy | Sat, Sun | Sat OT, Sun OT |
| Nikki | Sat, Sun | Sat OT, Sun OT |
| Precious | Mon, Tue | Mon OT, Tue OT |
| Ruth | Wed, Thu | Wed OT, Thu OT |
| Will | Fri, Sat | Fri OT, Sat OT |

Only Malcom and Erika are correct (they already have empty OT on day-off days).

**Fix (3 parts)**:
1. **Database**: Run UPDATE to null out OT schedules on day-off days for all 9 affected agents.
2. **UI**: In `WorkConfigurationSection.tsx`, disable OT inputs for day-off days (same pattern as regular schedule inputs). Also clear OT schedule when a day is toggled to day-off in `handleDayOffToggle`.
3. **Auto-populate logic**: The Monday OT auto-populate (`handleMondayOTChange`) currently blindly copies to Tue-Fri. It should skip day-off days. Same for Saturday OT auto-populate.

### Issue 2: Team Lead Field as Dropdown

**Current**: Plain text `<Input>` in both `ManageProfiles.tsx` (line 892) and `AgentProfile.tsx` (line 795).

**Fix**: Replace with a `<Select>` dropdown populated from the list of agents with `position @> ARRAY['Team Lead']`. The current Team Leads are:
- Cherry Ann B. Bayrante
- Jaeran Sanchez
- Juno Dianne Garciano
- Kristin Joann Argao
- Meryl Jean Esguerra Iman

Will query team leads dynamically from `agent_profiles` where position includes "Team Lead".

### Issue 3: Zendesk User ID Lookup Table

**Current**: `zendesk_user_id` is a manual text field on each agent profile.

**Proposed**: Create a `zendesk_user_ids` table that maps Support Account numbers to Zendesk User IDs per ZD instance. When an agent's Support Account and Zendesk Instance are set, auto-populate the Zendesk User ID from this lookup table.

**New table schema**:
```
zendesk_user_ids
- id (uuid, PK)
- zd_instance (text, not null) -- 'ZD1' or 'ZD2'
- support_account (text, not null) -- '1' through '17'
- zendesk_user_id (text, not null)
- UNIQUE(zd_instance, support_account)
```

**Seed data** (from the uploaded images):
- ZD1: 17 rows (accounts 1-17 with their numeric IDs)
- ZD2: 7 rows (accounts 1-7 with their numeric IDs)

**UI change**: When `zendesk_instance` or `support_account` changes in WorkConfigurationSection, auto-lookup and populate `zendesk_user_id` from the table. The field becomes read-only (auto-populated).

---

### Implementation Order (step by step as requested)

**Step 1**: Fix OT day-off data -- database UPDATE to null out incorrect OT schedules + UI fix to disable OT inputs on day-off days and clear OT when toggling day off.

**Step 2**: Convert Team Lead field to dropdown in both ManageProfiles and AgentProfile pages.

**Step 3**: Create `zendesk_user_ids` table, seed it with the data from images, and wire up auto-populate in WorkConfigurationSection.

