
## Fix Three Dashboard & Compliance Bugs

### Bug 1: Malcom's Schedule Data Issue + Missing Proactive Stale Detection

**Root Cause:** Malcom's schedule is stored as "9:00 PM-5:00 PM" instead of "9:00 AM-5:00 PM". The PM/PM format makes the code interpret it as an overnight shift, preventing stale session cleanup. Additionally, stale session detection only fires on LOGIN/LOGOUT button clicks, not on dashboard page load.

**Fix:**
1. Correct Malcom's schedule data from "9:00 PM-5:00 PM" to "9:00 AM-5:00 PM" in the database (both `agent_directory` and any `agent_schedule_assignments` if applicable).
2. Add proactive stale session detection on dashboard page load -- when the dashboard component mounts and detects `profile_status.status_since` is from a previous EST day, automatically trigger the same auto-logout logic (insert SYSTEM_AUTO_LOGOUT event at 11:59:59 PM EST of the stale day, reset status to LOGGED_OUT, create NO_LOGOUT report).

---

### Bug 2: False NO_LOGOUT for Overnight Shifts (Precious)

**Root Cause:** The `generate-agent-reports` batch job runs at 5 AM UTC (midnight EST). For overnight shifts ending after midnight EST (e.g., 10 PM - 4:30 AM), the agent hasn't logged out yet because their shift isn't over. The batch incorrectly flags them for NO_LOGOUT.

**Fix:**
In the `generate-agent-reports` edge function, before creating a NO_LOGOUT report for an overnight shift, check if the shift end time (in UTC) is AFTER the current time. If the shift hasn't ended yet, skip the NO_LOGOUT check for that agent. Specifically:
- Detect overnight shifts (endMinutes < startMinutes)
- Calculate the UTC time when the shift actually ends (next day at endMinutes EST)
- If `Date.now()` is before that UTC time, skip the NO_LOGOUT report

Also delete the false NO_LOGOUT report already created for Precious on 2/18.

---

### Bug 3: False Late OT for Back-to-Back Shifts (Precious)

**Root Cause:** Precious's regular shift ends at 4:30 AM and her OT starts at 4:30 AM. She physically cannot OT_LOGIN at exactly 4:30 AM because she needs to LOGOUT first and re-LOGIN. The 10-minute grace period doesn't account for this transition time when OT immediately follows a regular shift.

**Fix:**
In the OT late detection logic (`agentDashboardApi.ts`, around line 1580), when checking if an OT login is late, detect if the OT schedule start matches the regular shift end time. If they are back-to-back (OT start === shift end), extend the grace period to 30 minutes instead of 10 to account for the logout/login transition.

---

### Implementation Order
1. Fix Malcom's schedule data (database correction)
2. Delete Precious's false NO_LOGOUT report (database correction)
3. Fix the batch job overnight shift logic (edge function)
4. Fix OT late detection grace period for back-to-back shifts (client code)
5. Add proactive stale session detection on dashboard page load (client code)

### Technical Details

**Files to modify:**
- `supabase/functions/generate-agent-reports/index.ts` -- Add overnight shift time check before NO_LOGOUT creation
- `src/lib/agentDashboardApi.ts` -- Add back-to-back OT grace period logic (~line 1580) and proactive stale detection function
- `src/components/dashboard/StatusButtons.tsx` or the dashboard page component -- Call proactive stale detection on mount

**Database corrections:**
- Update `agent_directory` schedule for malcom@persistbrands.com
- Delete false agent_report for Precious (incident_type=NO_LOGOUT, incident_date=2026-02-18)
