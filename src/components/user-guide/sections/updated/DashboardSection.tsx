import { GuideSection, CalloutBox, QuickTable, Checklist } from '../../GuideComponents';
import { GuideImagePlaceholder } from '../../GuideImagePlaceholder';

export function UpdatedDashboardSection() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        The Agent Dashboard is your daily command center. It displays your real-time status, shift schedule, 
        ticket metrics, and logged hours. Each agent accesses their dashboard via <strong>People → [Your Name] → Dashboard</strong>.
      </p>

      <GuideImagePlaceholder description="Screenshot: Full Agent Dashboard view showing status buttons, shift schedule, and weekly summary cards" />

      {/* Section A: Status Buttons */}
      <GuideSection letter="A" color="bg-blue-600" title="Status Buttons">
        <p className="text-sm mb-4">
          The row of colored buttons at the top of your dashboard controls your real-time availability status. 
          Only one status can be active at a time. Your current status is broadcast to the Team Status Board.
        </p>

        <GuideImagePlaceholder description="Screenshot: Status button row showing Login, Break, Coaching, Device Restart, Bio Break, and OT buttons" />

        <h4 className="font-semibold mt-4 mb-2">Button Reference</h4>
        <QuickTable
          headers={['Button', 'Action', 'Timer', 'Limit']}
          rows={[
            ['Log In / Log Out', 'Toggles your shift on/off. Starts your workday timer.', 'None', 'One active session per day'],
            ['Break In / Break Out', 'Toggles your scheduled break. Shows green when on break.', 'None', 'Must match scheduled break window'],
            ['Coaching', 'Toggles coaching/training status. Shows blue when active.', 'None', 'No time limit'],
            ['Device Restart', 'Toggles restart status. Shows orange with a 5:00 countdown.', '5 minutes', 'Exceeding triggers a red pulse + alert'],
            ['Bio Break', 'Toggles bio break. Uses a consumable daily allowance.', '5 min (5+ hr shift) or 2.5 min (shorter)', 'Depleted = button disabled'],
            ['OT Login / OT Logout', 'Toggles overtime shift. Only visible if OT is enabled in your profile.', 'None', 'Locks all other buttons while active'],
          ]}
        />

        <CalloutBox variant="warning" title="OT Lock">
          When you click <strong>OT Login</strong>, all other status buttons (Break, Coaching, Restart, Bio) 
          become disabled. You must click <strong>OT Logout</strong> before using any other status.
        </CalloutBox>

        <h4 className="font-semibold mt-4 mb-2">How to Log In</h4>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Navigate to your Agent Dashboard.</li>
          <li>Click the green <strong>Log In</strong> button.</li>
          <li>Your status changes to <strong>LOGGED_IN</strong> and the button becomes a red <strong>Log Out</strong> button.</li>
          <li>Your login time is recorded in EST and appears in the Profile Events timeline.</li>
        </ol>

        <GuideImagePlaceholder description="Screenshot: Log In button in its default (green) state" />

        <h4 className="font-semibold mt-4 mb-2">How to Take a Break</h4>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>While logged in, click the amber <strong>Break In</strong> button.</li>
          <li>The button turns green and reads <strong>Break Out</strong>.</li>
          <li>When your break ends, click <strong>Break Out</strong> to return to LOGGED_IN.</li>
        </ol>

        <h4 className="font-semibold mt-4 mb-2">How to Use Device Restart</h4>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>While logged in, click the orange <strong>Device Restart</strong> button.</li>
          <li>A 5:00 countdown timer appears on the button.</li>
          <li>Complete your restart and click <strong>End Restart</strong> before the timer expires.</li>
          <li>If you exceed 5 minutes, the button turns red and pulses. An alert is sent to leadership.</li>
        </ol>

        <GuideImagePlaceholder description="Screenshot: Device Restart button showing the countdown timer (e.g., 3:42 remaining)" />

        <h4 className="font-semibold mt-4 mb-2">How to Use Bio Break</h4>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>While logged in, click the cyan <strong>Bio</strong> button (shows remaining time, e.g., "Bio (5:00 left)").</li>
          <li>The button shows a countdown of your remaining daily bio allowance.</li>
          <li>Click <strong>End Bio</strong> when done. Unused time is preserved for later use.</li>
          <li>Once your allowance reaches 0:00, the Bio button is permanently disabled for the rest of the shift.</li>
        </ol>

        <CalloutBox variant="info" title="Bio Allowance Reset">
          Your bio break allowance resets every time you log in for a new shift. 
          The allowance is 5 minutes for 5+ hour shifts and 2 minutes 30 seconds for shorter shifts.
        </CalloutBox>

        <GuideImagePlaceholder description="Screenshot: Bio Break button showing remaining allowance (e.g., '2:30 left')" />
      </GuideSection>

      {/* Section B: Auto-Logout & Stale Sessions */}
      <GuideSection letter="B" color="bg-red-600" title="Auto-Logout & Stale Sessions">
        <p className="text-sm mb-4">
          If you forget to log out at the end of your shift, the system automatically handles it the next day.
        </p>

        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>When you attempt to <strong>Log In</strong> the next day, the system detects your stale session.</li>
          <li>It inserts a <strong>SYSTEM_AUTO_LOGOUT</strong> event at 11:59:59 PM EST of the missed day.</li>
          <li>A <strong>NO_LOGOUT</strong> incident report is automatically generated in Agent Reports.</li>
          <li>Your new login proceeds normally after the auto-logout.</li>
        </ol>

        <CalloutBox variant="warning" title="Overnight Shifts">
          If your schedule spans midnight (e.g., 8:00 PM – 3:30 AM), the system checks your shift times 
          before flagging a stale session. A 30-minute grace period prevents false positives for overnight workers.
        </CalloutBox>

        <GuideImagePlaceholder description="Screenshot: Profile Events timeline showing a SYSTEM_AUTO_LOGOUT entry" />
      </GuideSection>

      {/* Section C: Profile Events Timeline */}
      <GuideSection letter="C" color="bg-green-600" title="Profile Events Timeline">
        <p className="text-sm mb-4">
          Every status change is logged as a <strong>Profile Event</strong> and displayed in your daily activity feed. 
          Events are timestamped in EST.
        </p>

        <QuickTable
          headers={['Event Type', 'Description', 'Example']}
          rows={[
            ['LOGIN', 'Agent started their shift', '9:00 AM EST'],
            ['LOGOUT', 'Agent ended their shift', '5:30 PM EST'],
            ['BREAK_IN', 'Agent started scheduled break', '12:00 PM EST'],
            ['BREAK_OUT', 'Agent returned from break', '12:30 PM EST'],
            ['COACHING_START', 'Agent entered coaching/training', '2:00 PM EST'],
            ['COACHING_END', 'Agent exited coaching/training', '2:45 PM EST'],
            ['DEVICE_RESTART_START', 'Agent began device restart', '3:15 PM EST'],
            ['DEVICE_RESTART_END', 'Agent completed device restart', '3:18 PM EST'],
            ['BIO_START', 'Agent started bio break', '10:30 AM EST'],
            ['BIO_END', 'Agent ended bio break', '10:33 AM EST'],
            ['OT_LOGIN', 'Agent started overtime shift', '6:00 PM EST'],
            ['OT_LOGOUT', 'Agent ended overtime shift', '8:00 PM EST'],
            ['SYSTEM_AUTO_LOGOUT', 'System closed a stale session at 11:59 PM', '11:59 PM EST'],
          ]}
        />

        <GuideImagePlaceholder description="Screenshot: Profile Events timeline showing a full day of status changes (login, break, coaching, logout)" />
      </GuideSection>

      {/* Section D: Shift Schedule Display */}
      <GuideSection letter="D" color="bg-purple-600" title="Shift Schedule Display">
        <p className="text-sm mb-4">
          Your dashboard shows your weekly shift schedule pulled from your Bio/Profile configuration. 
          This includes regular and OT schedules for each day of the week.
        </p>

        <QuickTable
          headers={['Column', 'Description']}
          rows={[
            ['Day', 'Monday through Sunday'],
            ['Regular Schedule', 'Your standard shift hours (e.g., "9:00 AM – 5:30 PM")'],
            ['OT Schedule', 'Your overtime hours if OT is enabled (e.g., "6:00 PM – 8:00 PM")'],
            ['Day Off', 'Marked if the day is in your day_off array or schedule is blank'],
          ]}
        />

        <GuideImagePlaceholder description="Screenshot: Shift Schedule table showing a week with regular hours, OT hours, and a day off" />
      </GuideSection>

      {/* Section E: Weekly Summary & Violations */}
      <GuideSection letter="E" color="bg-amber-600" title="Weekly Summary & Violations">
        <p className="text-sm mb-4">
          The Weekly Summary cards at the top of your dashboard show key performance metrics for the selected week. 
          Violation indicators highlight compliance issues.
        </p>

        <h4 className="font-semibold mt-4 mb-2">Summary Cards</h4>
        <QuickTable
          headers={['Card', 'Shows', 'Source']}
          rows={[
            ['Tickets Handled', 'Total email/chat/phone tickets for the week', 'Ticket Logs'],
            ['Avg Ticket Gap', 'Average time between ticket assignments', 'Gap Analysis'],
            ['Time Logged (Portal)', 'Total hours from login to logout events', 'Profile Events'],
            ['Time Logged (Upwork)', 'Upwork contract hours (if contract ID configured)', 'Upwork API'],
          ]}
        />

        <GuideImagePlaceholder description="Screenshot: Weekly Summary cards showing Tickets Handled, Avg Gap, Portal Hours, and Upwork Hours" />

        <h4 className="font-semibold mt-4 mb-2">Violation Types</h4>
        <p className="text-sm mb-2">
          These violations are automatically detected and generate incident reports in Agent Reports:
        </p>
        <QuickTable
          headers={['Violation', 'Trigger', 'Severity']}
          rows={[
            ['Late Login', 'Login time is after scheduled start (with grace period)', 'Medium'],
            ['Early Out', 'Logout time is before scheduled end', 'Medium'],
            ['No Logout', 'No logout event found for a workday', 'High'],
            ['Time Not Met', 'Total logged hours are below required shift duration', 'Medium'],
            ['Break Overuse', 'Total break time exceeds allowance + 5-minute grace', 'Low'],
            ['Excessive Restarts', 'Device restart exceeded the 5-minute limit', 'Low'],
            ['Bio Overuse', 'Bio break time exceeded the daily allowance', 'Low'],
          ]}
        />

        <CalloutBox variant="info" title="Day Off Protection">
          The system treats blank or null schedule strings as implicit "Days Off." 
          No violations are generated for days where you have no scheduled shift, 
          even if the day is not explicitly listed in your day_off array.
        </CalloutBox>

        <GuideImagePlaceholder description="Screenshot: Agent Reports showing a Late Login violation with schedule vs actual login times" />
      </GuideSection>

      {/* Section F: Day Selector & Daily Drill-Down */}
      <GuideSection letter="F" color="bg-cyan-600" title="Day Selector & Daily Drill-Down">
        <p className="text-sm mb-4">
          Below the week selector, a row of day pills (Mon–Sun) lets you drill into a specific day's data. 
          All metrics synchronize to the selected day.
        </p>

        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Use the <strong>Week Selector</strong> arrows to choose a Monday–Sunday range.</li>
          <li>Click a <strong>day pill</strong> (Mon, Tue, Wed, etc.) to filter all data to that day.</li>
          <li>For the current week, future days are disabled based on the current EST date.</li>
          <li>For past weeks, all seven days are selectable.</li>
          <li>By default, the current day is selected for the active week, or Sunday for past weeks.</li>
        </ol>

        <h4 className="font-semibold mt-4 mb-2">What Updates When You Select a Day</h4>
        <Checklist items={[
          'Shift Schedule highlights the selected day\'s row',
          'Tickets Handled shows only that day\'s email/chat/phone counts',
          'Average Ticket Gap recalculates for the selected day',
          'Portal Hours shows login-to-logout duration for that day only',
          'Upwork Hours shows the contract hours for that specific day',
          'Profile Events timeline filters to events from that day',
        ]} />

        <GuideImagePlaceholder description="Screenshot: Day selector pills with Wednesday selected, showing daily metrics below" />
      </GuideSection>

      {/* Section G: Timezone Note */}
      <GuideSection letter="G" color="bg-gray-600" title="Timezone: EST Standard">
        <p className="text-sm mb-4">
          All dashboard times, events, and date boundaries use <strong>EST (UTC-5)</strong> as the authoritative timezone. 
          This ensures consistency regardless of your physical location.
        </p>

        <QuickTable
          headers={['Boundary', 'EST Time', 'UTC Equivalent']}
          rows={[
            ['Start of Day', '12:00:00 AM EST', '05:00:00.000Z'],
            ['End of Day', '11:59:59 PM EST', '04:59:59.999Z (next day)'],
          ]}
        />

        <CalloutBox variant="tip" title="Why EST?">
          Your browser may show a different local time, but the portal always evaluates 
          login/logout compliance, report generation, and week boundaries in EST. 
          This prevents late-afternoon EST activities from being misattributed to the following calendar day.
        </CalloutBox>
      </GuideSection>
    </div>
  );
}
