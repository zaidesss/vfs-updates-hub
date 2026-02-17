

## StatusCard Outage Display Fix

### Current behavior
- Approved: "Medical Leave" + "On Leave" badge
- Pending: "Medical Leave (Pending)" + "Pending Leave" badge (redundant)

### Desired behavior
- **Approved**: "Medical Leave" badge + "On Medical Leave" badge
- **Pending/For Review**: "Medical Leave (Pending)" badge only (no secondary badge)

### Changes (single file: `src/components/team-status/StatusCard.tsx`)

1. For **approved** outages:
   - Primary badge: show just the outage reason (e.g., "Medical Leave")
   - Secondary badge: show "On {reason}" (e.g., "On Medical Leave")

2. For **pending/for_review** outages:
   - Primary badge: show "{reason} (Pending)" (e.g., "Medical Leave (Pending)")
   - No secondary badge at all

### Technical detail
- `outageLabel`: always `member.outageReason` for approved, `member.outageReason + " (Pending)"` for non-approved
- Secondary badge: only render when `showOutageBadge && !isPendingOutage`, with text `On ${member.outageReason}`

