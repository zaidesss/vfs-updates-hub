

## Schedule Changes Detected

I compared the reference images against the database. Here's a summary of all changes needed:

### Agents with Changes (14 of 17)

| Agent | What Changed |
|---|---|
| Bryan Santiago | Break 12:00-12:30→10:00-10:30, Off Wed-Thu→Tue-Wed |
| Catherine Jane Plaza | Break 12:30-1:00→11:00-11:30 |
| Jennifer Katigbak | Break 1:00-1:30→1:30-2:00 |
| Kent Michael Cerbeto | Off Sun-Mon→Fri-Sat, Break 1:00-1:30→12:00-12:30 |
| Lorenz Philip Malanog | Break 12:00-12:30→1:00-1:30 |
| Reza Joy Docto | Break 12:00-12:30→2:00-2:30 |
| Sheena Jane Camposo | Break 1:00-1:30→12:30-1:00 |
| Pauline Carbajosa | Off Mon-Sun→Tue-Wed, Break 1:00-1:30→12:00-12:30 |
| Precious Mae Gagarra | Break 11:30-12:00→1:00-1:30 |
| Princess Infinity F. Medina | Off Thu-Fri→Fri-Sat, Break 12:00-12:30→11:30-12:00 |
| Russell Kent I. Quieta | Shift 4:30→3:30 PM, Break 12:30-1:00→11:00-11:30 |
| Stephen Martinez | Break 12:30-1:00→2:00-2:30, OT added 5:30-7:30 PM |
| Trisha Nicolle Arancillo | Off Sun-Mon→Tue-Wed, Break 12:30-1:00→11:30-12:00 |
| Will Angeline Reyes | Shift 9:00-4:30→2:00-6:00, Break removed, OT added 6:00-7:00 PM |

**No changes**: Nikki Ignacio, Richelle Cayabyab, Ruth Gajo

### Implementation Plan

#### Step 1: Apply schedule changes to all 14 agents
For each agent, update three tables simultaneously:
- **agent_profiles** — update the permanent record (break, day_off, per-day schedules, OT fields)
- **agent_schedule_assignments** — upsert for week `2026-03-02` (current week) to bypass the deferment logic and take effect immediately
- **agent_directory** — sync the matching fields

This is done via SQL UPDATE/UPSERT statements. For agents whose day_off changed, all per-day schedule and OT columns must be re-nullified for new off-days and populated for new working days.

#### Step 2: Build Bulk Schedule Import feature
Create a new Admin-accessible page/dialog with two import modes:

**Mode A: Coverage Board Import** (current week only)
- Creates `coverage_overrides` entries for remaining days this week
- Does NOT touch agent_profiles — temporary, expires end of week
- Good for one-time adjustments

**Mode B: Agent Profile Import** (permanent, immediate)
- Updates `agent_profiles` directly
- Upserts `agent_schedule_assignments` for current week (bypasses deferment)
- Syncs `agent_directory`
- Changes persist for all future weeks

**Import format** (tab-separated, paste-friendly from spreadsheet):
```text
AGENT	SHIFT	BREAK	OFF	OT
Bryan Santiago	9:00 AM-3:30 PM	10:00 AM-10:30 AM	TUE-WED	
Catherine Jane Plaza	9:00 AM-3:30 PM	11:00 AM-11:30 AM	WED-THU	
```

The system provides a template download button and validates agent names against existing profiles before applying.

#### Step 3: Verify changes across all consumers
Spot-check that Dashboard, Team Status Board, Coverage Board, and Shift Schedule Table all reflect the updated schedules for the current week.

