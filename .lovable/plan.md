

## Outage Statistics: Quarterly Breakdown + Team Lead Filter

### Overview

Two enhancements to both the **Outage Stats** (admin) and **Outage Report** (user/admin) pages:

1. **Quarterly Breakdown Toggle** - A Monthly/Quarterly toggle in the Overview section that groups data by Q1-Q4. When quarterly is active, repeat offenders aggregate across 3 months.
2. **Team Lead Filter** - A new dropdown to filter outage data by team lead, using the existing `AGENT_DIRECTORY` data.

Both filters work alongside the existing month dropdown and agent filter.

---

### Changes

#### 1. Outage Stats page (`src/pages/OutageStats.tsx`)

**New state variables:**
- `viewMode`: `'monthly' | 'quarterly'` (default: `'monthly'`)
- `selectedQuarter`: e.g., `'2026-Q1'` (derived from current date)
- `selectedTeamLead`: `'all' | team lead name` (default: `'all'`)

**Quarter filter dropdown:**
- Options generated from 2024-2026: "Q1 2024", "Q2 2024", ... "Q4 2026"
- Each quarter maps to a 3-month date range (Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec)
- Only visible when `viewMode` is `'quarterly'`; the month dropdown hides

**Monthly/Quarterly toggle:**
- A small toggle/segmented control placed next to the existing filters
- Switches between monthly and quarterly filtering of all data

**Team Lead filter dropdown:**
- Extract unique team leads from `AGENT_DIRECTORY`
- Filter requests by matching agent emails to directory entries with the selected team lead
- Placed alongside the existing agent filter

**Impact on existing features:**
- Overview cards, charts, breakdown table all respect the quarterly date range
- Repeat Offenders tab aggregates across 3 months when quarterly is active, with thresholds effectively tripled (or shown per-month average)
- Trend chart shows quarterly bars instead of monthly when in quarterly mode
- CSV export includes quarter label in filename

#### 2. Outage Report page (`src/pages/OutageReport.tsx`)

**Same two new filters added:**
- Monthly/Quarterly toggle with quarter dropdown
- Team Lead filter (admin only, same as agent filter visibility)
- Existing summary cards, charts, and breakdown table respect the new filters

#### 3. Agent Directory (`src/lib/agentDirectory.ts`)

**New helper function:**
- `getUniqueTeamLeads()`: Returns sorted array of unique non-empty team lead names from `AGENT_DIRECTORY`
- `getAgentEmailsByTeamLead(teamLead: string)`: Returns array of agent emails for a given team lead

---

### Implementation Order (Step by Step)

**Step 1:** Add helper functions to `agentDirectory.ts` (team lead utilities)

**Step 2:** Add team lead filter to Outage Stats page

**Step 3:** Add quarterly toggle and quarter filter to Outage Stats page

**Step 4:** Add both filters to Outage Report page

**Step 5:** Verify and test end-to-end

