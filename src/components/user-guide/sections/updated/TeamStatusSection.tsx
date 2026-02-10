import { GuideSection, CalloutBox, QuickTable, Checklist } from '../../GuideComponents';
import { GuideImagePlaceholder } from '../../GuideImagePlaceholder';

export function TeamStatusSection() {
  return (
    <div className="space-y-6">
      {/* A. Overview */}
      <GuideSection letter="A" color="bg-blue-600" title="Overview">
        <p className="text-sm text-muted-foreground mb-3">
          The Team Status Board provides <strong>real-time visibility</strong> into who is currently working — not just who is logged in, but every agent whose scheduled shift window covers the current EST time. This ensures leadership always knows who <em>should</em> be online, even if they haven't logged in yet.
        </p>
        <Checklist items={[
          'Agents appear automatically when the current EST time falls within their shift or OT schedule.',
          'Agents on their configured "Day Off" are excluded entirely.',
          'If a scheduled agent hasn\'t logged in, they appear with an "Offline" badge.',
        ]} />
        <GuideImagePlaceholder description="Full Team Status Board showing multiple category groups populated with agent cards" />
      </GuideSection>

      {/* B. Who Can See It */}
      <GuideSection letter="B" color="bg-indigo-600" title="Who Can See It">
        <QuickTable
          headers={['Role', 'Board Visibility', 'Dashboard Link on Cards']}
          rows={[
            ['User / Agent', 'Full board — all categories', 'No'],
            ['Admin / HR', 'Full board — all categories', 'Yes — ↗ icon links to agent dashboard'],
            ['Super Admin', 'Full board — all categories', 'Yes — ↗ icon links to agent dashboard'],
          ]}
        />
        <CalloutBox variant="info" title="Dashboard Link">
          Admin, HR, and Super Admin roles see a small external-link icon (↗) on each status card. Clicking it navigates to that agent's individual dashboard at <code>/people/&#123;profile_id&#125;/dashboard</code>.
        </CalloutBox>
      </GuideSection>

      {/* C. Category Groupings */}
      <GuideSection letter="C" color="bg-purple-600" title="Category Groupings">
        <p className="text-sm text-muted-foreground mb-3">
          Agents are automatically sorted into categories based on their <strong>Position</strong> field in their Bio/Profile. Each category has a dedicated icon and color.
        </p>
        <QuickTable
          headers={['Category', 'Icon', 'Badge Color', 'Mapped Position Values']}
          rows={[
            ['Phone Support', '📞 Phone', 'Purple', '"Phone Support"'],
            ['Chat Support', '💬 MessageSquare', 'Cyan', '"Chat Support"'],
            ['Email Support', '✉️ Mail', 'Orange', '"Email Support", "Logistics"'],
            ['Hybrid Support', '🔀 Shuffle', 'Pink', '"Hybrid Support"'],
            ['Team Leads', '🛡️ Shield', 'Indigo', '"Team Lead"'],
            ['Technical Support', '🛡️ Wrench', 'Teal', '"Technical Support"'],
            ['Logistics', '📦 Package', 'Amber', 'Any position not mapped above'],
          ]}
        />
        <CalloutBox variant="tip" title="Logistics agents in Email Support">
          Agents with the position "Logistics" are grouped under the <strong>Email Support</strong> category on the board. Their individual cards still display "Logistics" as their position badge. The catch-all "Logistics" category at the bottom captures any remaining unmapped positions.
        </CalloutBox>
      </GuideSection>

      {/* D. Layout */}
      <GuideSection letter="D" color="bg-teal-600" title="Board Layout">
        <h4 className="font-semibold text-sm mb-2">Desktop (two-column)</h4>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-3">
          <li><strong>Left column (wider):</strong> Phone Support, Chat Support, Email Support, Hybrid Support, Logistics</li>
          <li><strong>Right column (narrower):</strong> Team Leads, Technical Support, and the Live Activity Feed below them</li>
        </ul>

        <h4 className="font-semibold text-sm mb-2">Mobile (single column)</h4>
        <p className="text-sm text-muted-foreground mb-3">
          All categories stack vertically in a single scrollable column.
        </p>
      </GuideSection>

      {/* E. Status Card Details */}
      <GuideSection letter="E" color="bg-green-600" title="Status Card Anatomy">
        <p className="text-sm text-muted-foreground mb-3">
          Each card on the board represents one scheduled agent and shows:
        </p>
        <QuickTable
          headers={['Element', 'Description']}
          rows={[
            ['Agent Name', 'Full name, displayed prominently at the top of the card.'],
            ['Status Badge', 'Color-coded badge showing the agent\'s current state (see table below).'],
            ['Position Badge', 'Color matches the category grouping (e.g., purple for Phone Support).'],
            ['Shift Schedule', 'Today\'s shift time range. If OT is scheduled, appended as "+OT: X:XX–X:XX".'],
            ['Break Schedule', 'The agent\'s configured break window.'],
            ['Dashboard Link (↗)', 'Visible to Admin/HR/Super Admin only. Opens the agent\'s individual dashboard.'],
          ]}
        />
        <GuideImagePlaceholder description="Close-up of a single status card showing agent name, status badge, position badge, shift schedule, break schedule, and dashboard link icon" />

        <h4 className="font-semibold text-sm mt-4 mb-2">Status Badge Colors</h4>
        <QuickTable
          headers={['Status', 'Badge Color', 'Meaning']}
          rows={[
            ['Active', 'Green', 'Agent is logged in and working.'],
            ['Break', 'Amber', 'Agent is on their scheduled break.'],
            ['Coaching', 'Blue', 'Agent is in a coaching session.'],
            ['Offline', 'Gray', 'Agent is scheduled but has not logged in.'],
            ['On OT', 'Emerald', 'Agent is logged into an overtime shift.'],
            ['Restarting', 'Yellow', 'Agent is performing a device restart (5-min limit).'],
            ['Bio Break', 'Purple', 'Agent is on a bio break (consumable timer).'],
          ]}
        />

        <h4 className="font-semibold text-sm mt-4 mb-2">Outage / Leave Badge</h4>
        <p className="text-sm text-muted-foreground mb-3">
          If the agent has an <strong>approved leave request</strong> covering the current date and time, the status badge is replaced with the outage reason (e.g., "Medical Leave") in a <span className="text-sky-600 font-medium">sky-blue</span> badge, plus an additional "On Leave" outline badge.
        </p>
        <GuideImagePlaceholder description="Status card showing an agent on approved leave — sky-blue outage reason badge and 'On Leave' outline badge" />
      </GuideSection>

      {/* F. Sorting Options */}
      <GuideSection letter="F" color="bg-amber-600" title="Sorting Options">
        <QuickTable
          headers={['Sort Mode', 'Behavior', 'Default?']}
          rows={[
            ['By Login', 'Sorts agents by most recent status change timestamp (newest first).', 'Yes'],
            ['By Name', 'Sorts agents alphabetically by full name (A → Z).', 'No'],
          ]}
        />
        <GuideImagePlaceholder description="Sort toggle buttons showing 'By Login' and 'By Name' options" />
      </GuideSection>

      {/* G. Schedule Logic */}
      <GuideSection letter="G" color="bg-red-600" title="Schedule Visibility Logic">
        <p className="text-sm text-muted-foreground mb-3">
          The board determines which agents to display using the following step-by-step process, evaluated in real time:
        </p>
        <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2 mb-3">
          <li>Read the <strong>current EST day of the week</strong> (e.g., "tue").</li>
          <li>Check each agent's <code>day_off</code> array — if today is listed (e.g., "Tue"), the agent is <strong>skipped</strong>.</li>
          <li>Read the agent's schedule column for today (e.g., <code>tue_schedule</code>) — if the value is null, "Day Off", or "Off", the agent is <strong>skipped</strong>.</li>
          <li>Check if the current EST time (in minutes from midnight) falls within the agent's <strong>regular shift range</strong> OR their <strong>OT schedule range</strong> for today.</li>
          <li>Only agents passing all checks appear on the board.</li>
        </ol>
        <CalloutBox variant="warning" title="EST Is the Standard">
          All schedule comparisons use EST (UTC−5) as the authoritative timezone, regardless of the user's local browser timezone. The portal-wide EST clock drives this logic.
        </CalloutBox>
      </GuideSection>

      {/* H. Outage/Leave Handling */}
      <GuideSection letter="H" color="bg-sky-600" title="Outage & Leave Handling">
        <p className="text-sm text-muted-foreground mb-3">
          Agents with an <strong>approved leave request</strong> that covers today's date are still shown on the board (because they are scheduled), but their card reflects the leave status:
        </p>
        <Checklist items={[
          'The status badge is replaced with the specific outage reason (e.g., "Medical Leave", "Personal Leave").',
          'An additional "On Leave" outline badge appears next to the outage reason.',
          'These agents are NOT counted in the "online" total in the header stats.',
          'If the leave has specific start/end times, the outage badge only appears during those hours.',
        ]} />
      </GuideSection>

      {/* I. Live Activity Feed */}
      <GuideSection letter="I" color="bg-orange-600" title="Live Activity Feed">
        <p className="text-sm text-muted-foreground mb-3">
          The Live Activity Feed provides a real-time stream of status changes happening across the team.
        </p>
        <QuickTable
          headers={['Property', 'Value']}
          rows={[
            ['Location', 'Right column, below Team Leads and Technical Support (desktop)'],
            ['Time Window', 'Today only — no historical entries'],
            ['Max Items', '15 most recent status changes'],
            ['Container', 'Fixed 400px scrollable area'],
            ['Updates', 'Real-time — new events appear automatically'],
          ]}
        />
        <GuideImagePlaceholder description="Live Activity Feed showing recent status changes — e.g., 'John Doe → Active', 'Jane Smith → Break'" />
      </GuideSection>

      {/* J. Header Stats */}
      <GuideSection letter="J" color="bg-emerald-600" title="Header Statistics">
        <p className="text-sm text-muted-foreground mb-3">
          The board header displays a summary line: <strong>"X scheduled now (Y online)"</strong>
        </p>
        <QuickTable
          headers={['Metric', 'Definition']}
          rows={[
            ['X (Scheduled)', 'Total number of agents whose shift or OT window covers the current EST time.'],
            ['Y (Online)', 'Subset of scheduled agents who are NOT "Offline" (LOGGED_OUT) and do NOT have an active approved outage.'],
          ]}
        />
      </GuideSection>
    </div>
  );
}
