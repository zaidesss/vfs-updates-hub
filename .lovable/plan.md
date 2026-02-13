
## Effective-Dated Schedule System

### Problem Summary

Currently, editing an Agent Profile schedule **immediately** overwrites the schedule in `agent_profiles` and syncs to `agent_directory`. Every module reads these live values without week context, meaning a profile edit today retroactively changes:
- Past week Dashboard attendance displays
- Scorecard scheduled days, quota targets, and reliability
- Agent Reports incident detection (late login thresholds, early out detection)
- Team Status Board visibility windows

### Current Bug Risk Inventory

| Module | File(s) | How it reads schedule | Risk |
|---|---|---|---|
| Dashboard attendance | `agentDashboardApi.ts` lines 290-357 | Reads `agent_directory` per-day schedules directly | Past week view shows current schedule, not what was effective |
| Late Login detection | `agentDashboardApi.ts` lines 948-1028 | Reads `agent_directory` for schedule start time | Late login threshold changes retroactively |
| Early Out detection | `agentDashboardApi.ts` lines 1033-1113 | Reads `agent_directory` for schedule end time | Early out threshold changes retroactively |
| Overbreak detection | `agentDashboardApi.ts` lines 1118-1220 | Reads `agent_directory` break_schedule | Break allowance changes retroactively |
| Bio allowance calc | `agentDashboardApi.ts` lines 760-808 | Reads `agent_directory` schedule duration | Shift duration determines 2 vs 4 min allowance |
| Stale session detection | `agentDashboardApi.ts` lines 489-536 | Reads `agent_directory` schedule for overnight check | Overnight shift detection uses current schedule |
| Scorecard scheduled days | `scorecardApi.ts` lines 211-244, 694-734 | Reads `agent_profiles` day_off + per-day schedules | Scheduled days and quota change for past weeks |
| Scorecard RPC | `get_weekly_scorecard_data` RPC | Reads `agent_profiles` directly | Same risk at database level |
| Agent Reports edge fn | `generate-agent-reports/index.ts` lines 216-341 | Reads `agent_directory`, checks `coverage_overrides` for today only | Only today uses overrides; no history protection |
| Team Status Board | `teamStatusApi.ts` | Reads `agent_profiles_team_status` view | Current-week only so lower risk, but still reads live profiles |
| Coverage Board | `coverageBoardApi.ts` lines 301-310 | Reads `agent_profiles` for base schedule display | Shows current profile as "base" even for past weeks |
| Existing `get_effective_schedule` RPC | Migration files | Exists but is **never called** from any frontend or edge function | Entirely unused |

### Solution Architecture

```text
Schedule Lookup Precedence (per agent + date):
  1. coverage_overrides (date-specific override)
  2. agent_schedule_assignments (effective-dated base schedule)
  3. agent_profiles (permanent fallback for pre-migration dates)
```

### Data Schema

**New table: `agent_schedule_assignments`**

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Auto-generated |
| agent_id | uuid (NOT NULL) | References agent_profiles.id |
| effective_week_start | date (NOT NULL) | Monday this schedule starts applying |
| mon_schedule | text | Monday schedule |
| tue_schedule | text | Tuesday schedule |
| wed_schedule | text | Wednesday schedule |
| thu_schedule | text | Thursday schedule |
| fri_schedule | text | Friday schedule |
| sat_schedule | text | Saturday schedule |
| sun_schedule | text | Sunday schedule |
| mon_ot_schedule | text | Monday OT |
| tue_ot_schedule | text | Tuesday OT |
| wed_ot_schedule | text | Wednesday OT |
| thu_ot_schedule | text | Thursday OT |
| fri_ot_schedule | text | Friday OT |
| sat_ot_schedule | text | Saturday OT |
| sun_ot_schedule | text | Sunday OT |
| day_off | text[] | Day off array |
| break_schedule | text | Break schedule |
| source | text | 'agent_profile', 'admin', 'import' |
| created_by | text | Email of who made the change |
| created_at | timestamptz | When created |
| notes | text | Optional context |

**Unique constraint**: `(agent_id, effective_week_start)` -- one assignment per agent per week start.

### Migration + Backfill

1. Create `agent_schedule_assignments` table with RLS policies
2. Snapshot every active agent's current schedule from `agent_profiles` into this table with `effective_week_start = current Monday`
3. Update `get_effective_schedule` RPC to check `agent_schedule_assignments` before falling back to `agent_profiles`

### Implementation Steps

**Step 1: Database -- New table + migration + updated RPC**
- Create `agent_schedule_assignments` table
- Backfill current schedules from `agent_profiles`
- Update `get_effective_schedule` and `get_effective_schedules_for_week` RPCs to include assignment lookup in precedence chain
- Add RLS policies (admin/hr/super_admin can manage, authenticated can read)

**Step 2: Shared schedule resolver (`src/lib/scheduleResolver.ts`)**
- New module exporting `getEffectiveScheduleForDate(agentId, date)` and `getEffectiveSchedulesForWeek(agentId, weekStart)`
- Calls the updated `get_effective_schedule` RPC
- Returns typed result: `{ schedule, otSchedule, isDayOff, isOverride, breakSchedule }`
- All modules will import from here instead of reading `agent_profiles`/`agent_directory` directly

**Step 3: Agent Profile UI -- Next-week-only enforcement**
- In `agentProfileApi.ts` `upsertProfile()`: when schedule fields change, instead of directly writing to `agent_profiles`, write an `agent_schedule_assignments` row with `effective_week_start = next Monday`
- The `agent_profiles` table still gets updated (for "current default" display), but a trigger or application logic ensures old assignments are preserved
- Add warning text in the profile editing UI: "Schedule changes apply starting next week. For this week, use Coverage Board."
- Disable "this week" selection for schedule changes in the profile editor

**Step 4: Update Dashboard to use resolver**
- `fetchDashboardProfile()` -- for past week views, use resolver instead of `agent_directory`
- `checkAndAlertLateLogin()` -- use resolver for today's schedule
- `checkAndAlertEarlyOut()` -- use resolver for today's schedule
- `checkAndAlertOverbreak()` -- use resolver for break_schedule
- `calculateBioAllowanceForProfile()` -- use resolver for shift duration

**Step 5: Update Scorecard to use resolver**
- `getScheduledDays()` and `calculateScheduledDaysFromRPC()` -- use resolver per day instead of reading from `agent_profiles` columns
- Update `get_weekly_scorecard_data` RPC to join against `agent_schedule_assignments` for the target week

**Step 6: Update Agent Reports edge function**
- `generate-agent-reports/index.ts` -- replace `agent_directory` schedule lookup with `get_effective_schedule` RPC call per agent+date
- This already checks `coverage_overrides` today but will now also respect effective-dated assignments

**Step 7: Update Team Status Board and Coverage Board**
- Team Status: use resolver for visibility window calculation
- Coverage Board: display the effective base schedule for the selected week (not just current profile)

**Step 8: Profile save trigger -- auto-create assignment**
- When an agent profile schedule is saved, a database trigger (or application-level logic) automatically creates an `agent_schedule_assignments` row for `next Monday` with the new schedule
- The current profile values remain the "live default" for real-time operations (Team Status Board for current moment)

### Edge Cases to Handle

- **Timezone week start**: All week starts are Monday in EST, matching existing `ANCHOR_DATE` logic
- **Overnight shifts**: The resolver already handles these via the existing `get_effective_schedule` RPC logic
- **Multiple edits before next week**: Later edits overwrite the pending assignment (upsert on `agent_id + effective_week_start`)
- **Coverage Board overrides still take priority**: The precedence chain guarantees this
- **Pre-migration weeks**: Will fall through to `agent_profiles` (accepted risk per your answer)
- **Caching**: The resolver should cache results per session to avoid repeated RPC calls for the same agent+week

### What This Does NOT Change

- Coverage Board behavior (still week-scoped overrides, still highest priority)
- How real-time status changes work (LOGIN/LOGOUT/BREAK_IN etc.)
- Ticket assignment logic
- QA evaluation attribution (already uses `work_week_start`)
- Saved scorecard data (already frozen)

### Implementation Order

Given step-by-step preference: Steps 1-2 first (foundation), then Step 3 (profile lock), then Steps 4-7 (module updates), then Step 8 (auto-trigger). Each step will be confirmed before proceeding.
