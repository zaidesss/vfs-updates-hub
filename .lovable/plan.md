

## Plan: Complete Schedule Data Synchronization

All agent data from the 3 reference images has been extracted. This is a comprehensive data-only update across `agent_profiles`, `agent_schedule_assignments`, and `agent_directory` for every agent that doesn't match. **No code changes needed** — only SQL data updates using the insert tool.

### Reference Data (29 agents total from images)

Every agent's correct schedule is captured above. Key clarifications resolved:
- **Lawrence Karl**: Sat-Sun (matches DB ✓)
- **Russell Kent**: Wed-Thu off, 9:00 AM-4:30 PM shift (DB wrong)
- **Stephen Martinez**: Sat-Sun off (DB has Fri-Sat-Sun — wrong)
- **Meryl Jean Esguerra Iman**: Not in images — skip unless confirmed separately

### Implementation Steps (executed one at a time)

**Step 1**: Query all 29 agents from `agent_profiles` to identify exact discrepancies vs reference data.

**Step 2**: Batch UPDATE `agent_profiles` for all agents with wrong data — correcting shift, break, day_off, OT, and nullifying schedule fields on off-days. Group into manageable batches (5-8 agents per SQL).

**Step 3**: Sync corrections to `agent_schedule_assignments` for weeks `2026-02-23` and `2026-03-02`.

**Step 4**: Sync corrections to `agent_directory`.

**Step 5**: Verify on Coverage Board and Team Status Board.

### Notes
- Agents already corrected (Biah, Richelle, Ruth, Erika) will be re-verified but may need minor tweaks (e.g., Biah's break was set to 12:00 PM-01:00 PM but image shows 12:30 PM-01:00 PM for THU-FRI off).
- All off-day schedule fields will be set to NULL.
- OT fields only populated for agents with OT in images; all others set to NULL with `ot_enabled = false`.

