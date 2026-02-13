

## Make "Today's Activity" Follow the Work Tracker Day Selection

### What Changes
The "Today's Activity" card currently always shows only today's events. After this change, it will:
- Display events for whichever day is selected in the Work Tracker day selector (Mon-Sun)
- Update its title dynamically (e.g., "Monday's Activity", "Today's Activity" for the current day)
- Work across weeks -- when you switch weeks via the Shift Schedule selector and pick a day in Work Tracker, the activity feed shows that day's events

### No Snapshot Involvement Needed
The `allEvents` data already covers the full selected week (fetched via `getWeekAllEvents`). The component just needs to filter by the selected day instead of hardcoding "today". For historical weeks beyond the live retention window, snapshot-based event data would be a separate enhancement.

### Technical Details

**File: `src/components/dashboard/DailyEventSummary.tsx`**
- Add `selectedDay` prop (Date)
- Replace `isToday(eventDate)` filter with `isSameDay(eventDate, selectedDay)`
- Update the card title: show "Today's Activity" when the selected day is today, otherwise show the day name (e.g., "Monday's Activity")
- Remove the `isToday` import, add `isSameDay` import

**File: `src/pages/AgentDashboard.tsx`**
- Pass `selectedDay` to `DailyEventSummary`:
  ```
  <DailyEventSummary events={allEvents} selectedDay={selectedDay} />
  ```

This is a minimal 2-file change with no database or API modifications.

