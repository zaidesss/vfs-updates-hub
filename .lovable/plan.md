

## Integrate Coverage Board Overrides with All Automations

### Overview
Create a centralized `get_effective_schedule` database function that all systems use to determine an agent's actual schedule for any given date. Coverage overrides take precedence over the permanent agent_profiles schedule, but only for the specific dates they cover.

---

### Architecture

The new RPC `get_effective_schedule(agent_id, target_date)` will:
1. Check `coverage_overrides` for the agent+date
2. If found, return the override start/end times
3. If not found, fall back to the agent's base schedule from `agent_profiles` for that day of week

All downstream systems will call this RPC (or its inline equivalent) instead of reading schedules directly from `agent_profiles` / `agent_directory`.

---

### Step-by-Step Implementation

#### Step 1: Create the `get_effective_schedule` RPC
**Database migration** -- a new PostgreSQL function:
- Input: `p_agent_id UUID, p_target_date DATE`
- Output: `effective_schedule TEXT, effective_ot_schedule TEXT, is_day_off BOOLEAN, is_override BOOLEAN, override_reason TEXT`
- Logic:
  1. Look up `coverage_overrides` where `agent_id = p_agent_id AND date = p_target_date`
  2. If override exists, return `override_start - override_end` as `effective_schedule`, set `is_override = true`
  3. If no override, get the day-of-week from `p_target_date`, read the corresponding `{day}_schedule` and `{day}_ot_schedule` from `agent_profiles`, check `day_off` array
  4. Return the result

Also create a batch variant `get_effective_schedules_for_week(p_agent_id, p_week_start)` that returns 7 rows (Mon-Sun) in one call, for efficiency.

#### Step 2: Update `get_agent_dashboard_data` RPC
- Add a CTE that joins `coverage_overrides` for the current week
- For each day's schedule column in the output, use `COALESCE(override_schedule, base_schedule)` logic
- This means the Dashboard's Shift Schedule table will automatically show the overridden schedule

#### Step 3: Update `get_weekly_scorecard_data` RPC
- Add a CTE that joins `coverage_overrides` for the scorecard week range
- The reliability calculation (scheduled days) should account for overrides that change a day off to a working day or vice versa
- Expected hours calculation should use effective schedule durations

#### Step 4: Update `generate-agent-reports` edge function
- Before processing each agent, query `coverage_overrides` for the target date
- If an override exists for the agent+date, use that schedule instead of `agent_directory`
- This prevents false LATE_LOGIN, EARLY_OUT, TIME_NOT_MET, and NO_LOGOUT flags when shifts are adjusted

#### Step 5: Update `teamStatusApi.ts` (Team Status Board)
- After fetching profiles, also fetch `coverage_overrides` for today's date
- For each agent, check if an override exists; if so, use the override times for the `isWithinScheduleWindow` check
- This ensures agents appear on Team Status Board based on their actual (overridden) shift

#### Step 6: Update `agentDashboardApi.ts` (real-time compliance)
- `checkAndAlertLateLogin`: Before comparing login time to schedule, check `coverage_overrides` for today
- `checkAndAlertEarlyOut`: Same -- use override end time if exists
- `calculateBioAllowanceForProfile`: Use effective schedule duration (override or base) for bio time calculation
- Stale session detection: Use effective schedule for overnight shift validation

#### Step 7: Update `ShiftScheduleTable.tsx` (Dashboard UI)
- `fetchDashboardProfile` should also fetch overrides for the selected week
- Pass overrides to `ShiftScheduleTable` so the "Schedule" column shows the effective schedule per day
- Visually mark overridden days (e.g., small indicator icon or different text color)

#### Step 8: Coverage Board outage labels
- In `CoverageTimeline.tsx`, when rendering outage blocks, use the `outage_reason` from `leave_requests` as the block label instead of generic "Outage"
- Show the actual time range from the outage request (`start_time - end_time`)
- Multiple outages on the same day render as separate blocks with their own reason labels

---

### What Changes Where (Summary)

| System | Current Source | New Source |
|--------|---------------|-----------|
| Dashboard Shift Schedule | agent_profiles | agent_profiles + coverage_overrides |
| Agent Reports (edge fn) | agent_directory | agent_directory + coverage_overrides |
| Team Status Board | agent_profiles_team_status | agent_profiles + coverage_overrides |
| Late Login/Early Out alerts | agent_directory | agent_directory + coverage_overrides |
| Bio allowance calc | agent_directory | agent_directory + coverage_overrides |
| Scorecard (reliability/hours) | agent_profiles | agent_profiles + coverage_overrides |
| Coverage Board outage labels | generic "Outage" | leave_requests.outage_reason |

---

### Important Constraints
- Agent Profiles remain the permanent source of truth -- overrides are date-specific and ephemeral
- Overrides only affect the specific date they're created for
- Next week automatically reverts to agent_profiles schedule (no override = base schedule)
- The `coverage_overrides` table already has a unique constraint on `(agent_id, date)`, so one override per agent per date

---

### Implementation Order
We will do this one step at a time:
1. Create `get_effective_schedule` RPC (foundation)
2. Update Agent Reports edge function (highest impact -- stops false flags)
3. Update Team Status Board
4. Update Dashboard (Shift Schedule table + compliance checks)
5. Update Scorecard RPC
6. Add outage reason labels to Coverage Board
7. Test end-to-end

