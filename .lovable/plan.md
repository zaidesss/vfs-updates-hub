

## Update Schedules for Richelle & Stephen

This is a straightforward data update via a database migration. No code changes needed.

### Changes Required

**Richelle Cayabyab** (`0594fbb4-0f6f-499b-993b-8a0d394d83fa`):
- Break: `01:00 PM-01:30 PM` → `1:30 PM-2:00 PM`
- OT (all weekdays): `7:00 AM-9:00 AM` → `6:00 PM-8:00 PM`

**Stephen Martinez** (`5e42fe30-f03d-419b-bfca-6b2950915480`):
- Shift (all weekdays): `9:00 AM-3:30 PM` → `9:00 AM-5:30 PM`

### Implementation

Single migration that updates both `agent_profiles` (long-term source of truth) and `agent_schedule_assignments` for the current week (`2026-03-02`) so changes take effect immediately.

### Also updates `agent_directory`
The `agent_directory` table may have stale shift/break data. The migration will sync it as well to keep all three tables consistent.

