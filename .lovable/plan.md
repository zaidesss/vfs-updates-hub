

## Plan: Apply New Shift Schedules (Data-Only, No Code Changes)

The existing schedule resolution system already supports this perfectly. The `get_effective_schedule` RPC resolves:
1. **coverage_overrides** (date-specific) -- highest priority
2. **agent_schedule_assignments** (effective-dated weekly) -- mid priority
3. **agent_profiles** (fallback) -- lowest priority

**No base functions or code need to change.** This is purely a data operation.

---

### Step 1: Coverage Overrides for This Week (Thu Feb 26 - Sun Mar 1)

Insert `coverage_overrides` rows (type: `regular`) for each agent for Thu/Fri/Sat/Sun **only on their working days** (skip their day-off days). Also insert `ot` type overrides for agents with OT schedules, and update break schedules via the regular override's `break_schedule` field.

This immediately takes effect for today and the rest of this week without touching any base data.

**~30 agents x up to 4 days = ~80-120 override rows** (minus day-off days).

### Step 2: Schedule Assignments for Next Week Onward (Mar 2, 2026+)

Upsert `agent_schedule_assignments` with `effective_week_start = '2026-03-02'` for each agent. This sets the uniform schedule (same time every working day), break, OT, and preserves existing `day_off` arrays. Since the RPC picks the most recent assignment where `effective_week_start <= target_week`, this covers all future weeks automatically.

### Step 3: Update Agent Profiles (Base Fallback)

Update each agent's `agent_profiles` row with the new per-day schedules, break, and OT fields. This ensures the fallback layer is also current. Day offs remain unchanged.

---

### Schedule Data from Image

| Agent | Schedule | Break | OT |
|-------|----------|-------|-----|
| Malcom Joseph Vincent Salmero | 9:00 AM-5:30 PM | 12:00 PM-12:30 PM | -- |
| Ashley Nicole Nerviol | 9:00 AM-3:30 PM | 11:30 AM-12:00 PM | -- |
| Biah Mae Divinagracia | 9:00 AM-5:30 PM | 12:30 PM-01:00 PM | 7:00 AM-9:00 AM |
| Desiree Cataytay | 9:00 AM-5:30 PM | 12:30 PM-01:00 PM | -- |
| Dwight Lawrence Anora | 9:00 AM-3:30 PM | 11:30 AM-12:00 PM | -- |
| Ellen Eugenio | 9:00 AM-5:30 PM | 01:30 PM-02:00 PM | 5:30 PM-7:30 PM |
| Erika Rhea Santiago | 9:00 AM-5:30 PM | 12:30 PM-01:00 PM | -- |
| Jannah Bugayong | 9:00 AM-5:30 PM | 01:30 PM-02:00 PM | 5:30 PM-7:30 PM |
| Jasmin Ochoa | 9:00 AM-3:30 PM | 12:00 PM-12:30 PM | -- |
| Jennifer Katigbak | 9:00 AM-5:30 PM | 01:00 PM-01:30 PM | -- |
| Kimberly Lacaden | 9:00 AM-3:30 PM | 12:30 PM-01:00 PM | -- |
| Lorraine Velarte | 9:00 AM-3:30 PM | 12:00 PM-12:30 PM | -- |
| Pauline Desabilla | 9:00 AM-4:30 PM | 01:00 PM-01:30 PM | -- |
| Precious Mae Falcis Gagarra | 9:00 AM-3:30 PM | 11:30 AM-12:00 PM | 3:30 PM-5:30 PM |
| Princess Infinity Medina | 9:00 AM-3:30 PM | 12:00 PM-12:30 PM | -- |
| Richelle Cayabyab | 9:00 AM-5:30 PM | 01:00 PM-01:30 PM | 7:00 AM-9:00 AM |
| Russell Kent Quieta | 9:00 AM-3:30 PM | 12:30 PM-01:00 PM | -- |
| Ruth Gajo | 9:00 AM-5:30 PM | 01:00 PM-01:30 PM | 7:00 AM-9:00 AM |
| Stephen Martinez | 9:00 AM-5:30 PM | 01:30 PM-02:00 PM | -- |
| Trisha Nicole Arancillo | 9:00 AM-4:30 PM | 12:30 PM-01:00 PM | -- |
| Will Angeline Reyes | 9:00 AM-4:30 PM | 12:00 PM-12:30 PM | 4:30 PM-6:30 PM |
| Bryan Santiago | 9:00 AM-3:30 PM | 12:00 PM-12:30 PM | -- |
| Catherine Jane Plaza | 9:00 AM-3:30 PM | 12:30 PM-01:00 PM | -- |
| Kent Michael Cerbeto | 9:00 AM-3:30 PM | 01:00 PM-01:30 PM | -- |
| Lawrence Karl Prieto | 9:00 AM-3:30 PM | 12:30 PM-01:00 PM | -- |
| Lorenz Philip Malanog | 9:00 AM-3:30 PM | 12:00 PM-12:30 PM | -- |
| Maryll Kate C. Mahipos | 9:00 AM-3:30 PM | 12:30 PM-01:00 PM | -- |
| Nikki Ignacio | 9:00 AM-5:30 PM | 12:30 PM-01:00 PM | 7:00 AM-9:00 AM |
| Rezajoy Docto | 9:00 AM-5:30 PM | 12:00 PM-12:30 PM | 5:30 PM-7:30 PM |
| Sheena Jane Camposo | 9:00 AM-3:30 PM | 01:00 PM-01:30 PM | -- |
| Louella Trangia | 9:00 AM-5:00 PM | (keep current) | -- |
| Jesse Argao | 9:00 AM-5:00 PM | (keep current) | -- |
| Lauro Ednalaga | 9:00 AM-5:00 PM | (keep current) | -- |
| Juno Dianne Garciano | 9:00 AM-5:00 PM | (keep current) | -- |
| Jaeran Sanchez | 9:00 AM-5:00 PM | (keep current) | -- |
| Meryl Jean Esguerra Iman | 9:00 AM-5:00 PM | (keep current) | -- |
| Kristin Joann Argao | 9:00 AM-5:00 PM | (keep current) | -- |

### Execution Plan

I will execute this step-by-step:
1. First, query all agent IDs and current day_off arrays
2. Insert coverage overrides for Thu-Sun this week (step 1)
3. Upsert schedule assignments for next Monday (step 2)
4. Update agent_profiles base schedules (step 3)
5. Verify by querying `get_effective_schedule` for a sample agent

All done via data insert/update operations. Zero code file changes.

