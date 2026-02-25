

## Analysis

There are two concrete issues to fix, plus a verification:

### Issue 1: StatusCard shows only `position[0]` instead of individual position badges
In `src/components/team-status/StatusCard.tsx` (line 50), the card extracts `member.position[0]` and shows a single badge. For a Hybrid agent (Email + Chat + Phone), it should show three separate badges: (Email), (Chat), (Phone).

### Issue 2: Master Directory still shows "Support Type" column
The "Support Type" table header (line 402) and cell (line 447) are still visible. Per your request, this column should be removed entirely.

### Verification: Coverage Board schedule propagation
The Coverage Board uses the `coverage_overrides` table. The `scheduleResolver.ts` already chains: `coverage_overrides → agent_schedule_assignments → agent_profiles`. All downstream systems (Team Status Board, Dashboard, Scorecard/compute-weekly-snapshots, Agent Reports/generate-agent-reports) use the `get_effective_schedule` / `get_effective_schedules_for_week` RPCs through this resolver. **No issues found** — changes made in the Coverage Board will correctly propagate to all systems.

---

## Plan

### Step 1: Fix StatusCard to show individual position badges
In `src/components/team-status/StatusCard.tsx`:
- Replace the single `position[0]` badge with a loop over the full `position` array
- Each position value (Email, Chat, Phone) gets its own colored badge using the existing `POSITION_BADGE` map
- This way a Hybrid agent shows three badges: (Email) (Chat) (Phone)

### Step 2: Remove "Support Type" column from Master Directory
In `src/pages/MasterDirectory.tsx`:
- Remove the "Support Type" `<TableHead>` (line 402)
- Remove the "Support Type" `<TableCell>` (line 447)

No other files need changes. Coverage Board, Dashboard, Scorecard, and Agent Reports all use the schedule resolver correctly — no propagation issues.

