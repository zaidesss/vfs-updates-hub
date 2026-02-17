

## Step 5: Replace Performance Card with Time Card in Individual Agent Analytics

### What changes
The "Performance" card (currently showing Avg Gap and Break) will be renamed to **"Time"** and will display **Logged Time** vs **Required Time** instead. The required time will be derived from the agent's effective schedule using the `get_effective_schedule` RPC.

### How Required Time is calculated
- **Daily**: Call `get_effective_schedule(agent_id, date)` to get the effective shift (e.g., "9:00 AM - 6:00 PM"). Parse the start/end times to compute the shift duration in hours, then subtract the break duration from the effective break schedule.
- **Weekly**: Call `get_effective_schedules_for_week(agent_id, week_start)` to get all 7 days. Sum the non-day-off shift durations minus breaks for the required total.

### Technical Details

**File: `src/components/agent-reports/IndividualAgentAnalytics.tsx`**

1. **Update data interfaces**
   - Add `requiredHours: number | null` to `AgentMetrics` (daily)
   - Add `totalRequiredHours: number` to `WeeklyAgentMetrics` (weekly)

2. **Add schedule parsing helper**
   - A function to parse schedule strings like "9:00 AM - 6:00 PM" and break strings like "2:30 PM - 3:00 PM" into hours, computing `shiftHours - breakHours`

3. **Update `loadDailyMetrics`**
   - Call `get_effective_schedule` RPC with the agent's profile ID and the selected date
   - Parse the returned `effective_schedule` and `effective_break_schedule` to compute required hours
   - If it's a day off, required hours = 0
   - Store in `requiredHours`

4. **Update `loadWeeklyMetrics`**
   - Call `get_effective_schedules_for_week` RPC with the agent's profile ID and week start
   - Sum required hours across non-day-off days
   - Store in `totalRequiredHours`

5. **Update the UI cards (both daily and weekly views)**
   - Rename "Performance" to "Time"
   - Replace "Avg Gap" row with "Logged" showing actual hours worked
   - Replace "Break" row with "Required" showing required hours from schedule
   - Keep the purple color scheme

### No other files need changes
The `get_effective_schedule` and `get_effective_schedules_for_week` RPCs already exist in the database, so no backend changes are needed.

