

## Add Editable Productivity Ticket Count to Scorecard

### What Changes

**Step 1 — Database**: Add `productivity_count_override` (integer, nullable) column to `zendesk_agent_metrics`.

**Step 2 — API (`scorecardApi.ts`)**:
- Add `productivity_count_override` to `upsertZendeskMetrics` accepted fields
- In `fetchWeeklyScorecardRPC`, read the override from `zendesk_agent_metrics` and apply it: override the `productivityCount` and recalculate `productivity` percentage
- Add `productivityCountOverride` to `AgentScorecard` interface for tracking

**Step 3 — UI (`TeamScorecard.tsx`)**:
- Add `productivityCount` to `EditedMetrics` interface
- Replace the static Productivity cell with an editable cell (admin-only click to edit the count)
- Display: percentage + count (same as now), but admins can click the count to override it
- On edit, recalculate and display the new productivity percentage live
- Include `productivity_count_override` in `saveChangesMutation` payload
- Include in audit log diff
- Apply override when saving scorecard snapshot

**Step 4 — Audit logging**: Productivity count overrides included in existing "Save Changes" audit entry.

### Technical Notes
- The Productivity cell will show the percentage and ticket count. Admins click the count number to edit it inline.
- The percentage auto-recalculates based on the edited count and weekly quota.
- "edited" badge appears when override differs from auto-calculated count.
- Override persists in `zendesk_agent_metrics` and carries through to `saved_scorecards` via the existing save flow.

