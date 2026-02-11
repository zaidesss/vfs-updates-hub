

## Dashboard Admin Section — Updated Plan

### Changes from Previous Plan

Added the missing violation types to Section E. The complete status/violation table now includes **all** Agent Report incident types that are observable from the Dashboard:

### Updated Section E — Complete Status Restrictions and Violations Table

| Status / Metric | Limit | Violation Trigger | Report Type | Severity |
|-----------------|-------|-------------------|-------------|----------|
| Login | 1 session/day | Login >10 min after scheduled start | LATE_LOGIN | Medium |
| Logout | Must log out | Still logged in 3+ hrs past shift end | NO_LOGOUT | High |
| Break | Matches shift allowance | Exceeds allowance + 5 min grace | OVERBREAK | Medium |
| Device Restart | 5 minutes | Timer expires without return | EXCESSIVE_RESTARTS | Low |
| Bio Break | 4 min (8h+) / 2 min (shorter) | Allowance depleted, continues | BIO_OVERUSE | Low |
| Early Out | Before scheduled end | Logout before shift end time | EARLY_OUT | Medium |
| Time Not Met | Full shift hours | Logged hours < required (Upwork prioritized) | TIME_NOT_MET | Medium |
| Quota Not Met | Email/Chat/Phone quota | Tickets handled < expected quota | QUOTA_NOT_MET | Medium |
| High Gap | Position-specific threshold | Average ticket gap exceeds threshold (Email only) | HIGH_GAP | Low |

### Everything Else Unchanged

All other sections (A through L) from the previously approved plan remain the same:
- A: Slack Notifications routing
- B: Auto-Generated Outage Requests
- C: Team Lead Responsibilities
- D: Agent Report Auto-Generation
- E: Status Restrictions and Violations (now complete with all 9 types)
- F: OT Ticket Tracking
- G: Outage Reflection in Shift Schedule
- H: OT Schedule Overriding Day Off
- I: Auto-Logout System
- J: Overnight Shift Considerations
- K: Break Variance Tracking
- L: Upwork Time Fetch and Disabled Buttons

### Files
1. **Create** `src/components/user-guide/sections/updated-admin/DashboardAdminSection.tsx`
2. **Update** `src/components/user-guide/UpdatedAdminGuideContent.tsx` — import and render

