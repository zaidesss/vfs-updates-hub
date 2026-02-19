

## Fix Reversed Slack Notifications, Activity Timeline, and False Reports

### Issues Found

**Issue 1: Reversed Slack Thread for Login/Logout**
When Rezajoy clicked LOGOUT first and then LOGIN (re-login for her next shift), the LOGOUT message became the parent Slack thread in #a_cyrus_li-lo, and the LOGIN became a reply. The user expects LOGIN to always be the parent thread.

**Root Cause:** In `supabase/functions/send-profile-status-notification/index.ts`, the first event of the EST day on a given channel creates the parent thread. Since she clicked LOGOUT before LOGIN, LOGOUT became the parent.

**Fix:** Modify the edge function so that LOGOUT events never create a new thread on the li-lo channel. If no existing thread exists for the day, post LOGOUT as a standalone message (no thread). When the subsequent LOGIN arrives, it will create the thread, becoming the parent. Any future events (including the standalone LOGOUT) won't be affected since Slack doesn't retroactively group standalone messages. Alternatively: if the event is LOGOUT and there's no existing thread, defer thread creation -- post the LOGOUT as a standalone message and do NOT save the thread_ts. The next event (LOGIN) will then create the actual parent thread.

---

**Issue 2: DailyEventSummary Timezone Bug**
In `src/components/dashboard/DailyEventSummary.tsx`, the component uses `isSameDay(eventDate, safeDay)` from date-fns, which compares dates in the browser's local timezone. For agents in non-EST timezones (e.g., Philippines, UTC+8), events are grouped by the wrong day boundary. For example, 2:58 PM EST (19:58 UTC) = 3:58 AM PHT the next day, so it would not appear on "today" for a PHT browser.

**Fix:** Replace `isSameDay` with an EST-based comparison using `getESTDateFromTimestamp` (already available in the codebase). Compare the EST date string of each event's `created_at` against the EST date string of the `selectedDay`.

---

**Issue 3: False NO_LOGOUT and TIME_NOT_MET Reports for Overnight Agents (2/18)**
The batch job `generate-agent-reports` ran at midnight EST on 2/18 and flagged ALL overnight shift agents with NO_LOGOUT because their shifts hadn't ended yet at batch run time. We already deployed the overnight shift fix to the edge function, so future runs won't have this problem. But the false reports from 2/18 need to be cleaned up.

**Affected agents (false NO_LOGOUT on 2/18):**
- arancillotrish06@gmail.com (5:00 PM - 12:30 AM)
- erikarheasantiago123@gmail.com (7:00 PM - 6:30 AM)
- jaeransanchez@gmail.com (4:00 PM - 2:00 AM)
- jannahdelacruz21@gmail.com (3:00 PM - 12:30 AM)
- joydocto56@gmail.com (3:00 PM - 12:30 AM)
- preciousgagarra21@gmail.com (10:00 PM - 4:30 AM)
- willangelinereyes@gmail.com (8:00 PM - 3:30 AM)

Each also has an associated false TIME_NOT_MET report (negative logged hours) caused by the missing logout confusing the time calculation.

**Note:** lorenzphilip0397@gmail.com (9 AM - 5 PM) and malcom@persistbrands.com (9 AM - 5 PM, schedule was broken until just now) have daytime schedules, so their NO_LOGOUT reports may be legitimate.

**Fix:** Delete the false NO_LOGOUT and TIME_NOT_MET reports for the 7 overnight agents listed above.

---

### Implementation Order

1. **Delete false reports** for overnight agents (database correction)
2. **Fix Slack thread logic** so LOGOUT never creates the parent thread (edge function)
3. **Fix DailyEventSummary timezone** to use EST-based day comparison (client code)

### Technical Details

**Files to modify:**
- `supabase/functions/send-profile-status-notification/index.ts` -- Add logic: if event is LOGIN or LOGOUT and no existing thread, only create a new thread for LOGIN. For LOGOUT without a thread, post as standalone (don't save thread_ts).
- `src/components/dashboard/DailyEventSummary.tsx` -- Replace `isSameDay(eventDate, safeDay)` with EST-based date comparison using `getESTDateFromTimestamp` from `agentDashboardApi.ts`.

**Database corrections:**
- Delete 7 false NO_LOGOUT reports (arancillo, erika, jaeran, jannah, joy, precious, will) for incident_date 2026-02-18
- Delete corresponding false TIME_NOT_MET reports for the same agents where loggedHours is negative

