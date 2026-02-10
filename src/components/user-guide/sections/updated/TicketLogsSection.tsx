import { GuideSection, CalloutBox, QuickTable, Checklist } from '../../GuideComponents';
import { GuideImagePlaceholder } from '../../GuideImagePlaceholder';

export function TicketLogsSection() {
  return (
    <div className="space-y-6">
      {/* A. Overview */}
      <GuideSection letter="A" color="bg-blue-600" title="Overview">
        <p className="text-sm text-muted-foreground mb-3">
          Ticket Logs is the portal's central hub for monitoring <strong>Zendesk ticket activity</strong> across all agents. It aggregates email, chat, and call ticket counts per agent per day, and surfaces average ticket gap metrics for productivity analysis.
        </p>
        <Checklist items={[
          'Data is pulled from Zendesk via automated webhooks — no manual entry required.',
          'Supports two Zendesk instances: ZD1 and ZD2, selectable via tabs.',
          'Displays daily breakdowns with agent-level drill-down capabilities.',
          'Tracks OT (overtime) tickets separately from regular productivity.',
        ]} />
        <GuideImagePlaceholder description="Full Ticket Logs page showing the ZD instance tabs, date range selector, and agent ticket table" />
      </GuideSection>

      {/* B. Dashboard UI */}
      <GuideSection letter="B" color="bg-indigo-600" title="Dashboard UI Walkthrough">
        <h4 className="font-semibold text-sm mb-2">Zendesk Instance Tabs</h4>
        <p className="text-sm text-muted-foreground mb-3">
          At the top of the page, two tabs allow switching between Zendesk instances. Each instance tracks its own set of agents and ticket data independently.
        </p>

        <h4 className="font-semibold text-sm mb-2">Date Range Selector</h4>
        <p className="text-sm text-muted-foreground mb-3">
          Select a <strong>work week</strong> (Monday–Sunday) to filter the displayed data. The selector uses the portal's anchor-aligned week system, ensuring consistent boundaries across all views.
        </p>

        <h4 className="font-semibold text-sm mb-2">Summary Cards</h4>
        <p className="text-sm text-muted-foreground mb-3">
          Above the main table, summary cards display high-level metrics for the selected period:
        </p>
        <QuickTable
          headers={['Card', 'Description']}
          rows={[
            ['Total Emails', 'Sum of all email tickets across all agents for the selected period.'],
            ['Total Chats', 'Sum of all chat tickets across all agents.'],
            ['Total Calls', 'Sum of all call tickets across all agents.'],
            ['Agents Active', 'Number of unique agents with at least one ticket in the period.'],
          ]}
        />
        <GuideImagePlaceholder description="Summary cards row showing Total Emails, Total Chats, Total Calls, and Agents Active" />

        <h4 className="font-semibold text-sm mt-4 mb-2">Agent Search</h4>
        <p className="text-sm text-muted-foreground mb-3">
          A search input allows filtering the table by <strong>agent name</strong>. The search is case-insensitive and matches partial names in real time.
        </p>

        <h4 className="font-semibold text-sm mb-2">Ticket Table</h4>
        <p className="text-sm text-muted-foreground mb-3">
          The main table displays one row per agent per day, with the following columns:
        </p>
        <QuickTable
          headers={['Column', 'Description']}
          rows={[
            ['Agent', 'The agent\'s tag name (from Master Directory). A green dot indicates the agent is currently logged in.'],
            ['Date', 'The date the tickets were handled.'],
            ['Emails', 'Number of email tickets handled that day (excludes OT tickets).'],
            ['Chats', 'Number of chat tickets handled that day.'],
            ['Calls', 'Number of call tickets handled that day.'],
            ['Avg Gap', 'Average time between consecutive tickets (in seconds), excluding inactive intervals. Shown as "—" if not yet calculated.'],
          ]}
        />
        <GuideImagePlaceholder description="Ticket table showing agent rows with email/chat/call counts, logged-in indicator, and avg gap column" />
      </GuideSection>

      {/* C. Gap Analysis */}
      <GuideSection letter="C" color="bg-purple-600" title="Average Ticket Gap">
        <p className="text-sm text-muted-foreground mb-3">
          The <strong>Average Ticket Gap</strong> measures the mean time between consecutive tickets handled by an agent during a shift. This metric helps identify productivity patterns and idle time.
        </p>

        <h4 className="font-semibold text-sm mb-2">How It Works</h4>
        <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2 mb-3">
          <li>The system records timestamps for each ticket an agent handles during the day.</li>
          <li>It calculates the elapsed time between each pair of consecutive tickets.</li>
          <li><strong>Inactive intervals are excluded</strong> — time spent on Break, Coaching, Restart, or Bio Break is subtracted from the gap calculation.</li>
          <li>The remaining gaps are averaged to produce the daily "Avg Gap" value in seconds.</li>
          <li>Only a <strong>LOGOUT</strong> event resets the daily gap counter.</li>
        </ol>

        <CalloutBox variant="info" title="Calculation Timing">
          Gap calculations are performed daily by an automated backend function for all active agents. Results are stored in a dedicated table and displayed in the Avg Gap column. If the value shows "—", the calculation has not yet run for that day.
        </CalloutBox>

        <h4 className="font-semibold text-sm mt-4 mb-2">Excluded Intervals</h4>
        <QuickTable
          headers={['Status', 'Effect on Gap Calculation']}
          rows={[
            ['ON_BREAK', 'Duration subtracted from elapsed time between tickets.'],
            ['COACHING', 'Duration subtracted from elapsed time.'],
            ['RESTARTING', 'Duration subtracted from elapsed time.'],
            ['ON_BIO', 'Duration subtracted from elapsed time.'],
            ['LOGGED_OUT', 'Resets the daily gap counter entirely.'],
          ]}
        />

        <CalloutBox variant="tip" title="Agent Matching">
          Gap tracking maps Zendesk <code>agent_name</code> to the Master Directory's <code>agent_tag</code> field to identify which portal profile owns each ticket. Each agent tag must be unique to ensure accurate tracking.
        </CalloutBox>
      </GuideSection>

      {/* D. OT Productivity Tracking */}
      <GuideSection letter="D" color="bg-emerald-600" title="OT (Overtime) Productivity">
        <p className="text-sm text-muted-foreground mb-3">
          Tickets handled while an agent's status is <strong>ON_OT</strong> are tracked separately from regular productivity to provide clear visibility into overtime output.
        </p>

        <h4 className="font-semibold text-sm mb-2">How OT Tickets Are Flagged</h4>
        <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2 mb-3">
          <li>When an agent clicks <strong>OT Login</strong> on the Dashboard, their status changes to <code>ON_OT</code>.</li>
          <li>All incoming Zendesk ticket webhook events for that agent are automatically flagged with <code>is_ot: true</code>.</li>
          <li>When the agent clicks <strong>OT Logout</strong>, the flag stops being applied to new tickets.</li>
        </ol>

        <h4 className="font-semibold text-sm mb-2">Where OT Data Appears</h4>
        <QuickTable
          headers={['Location', 'How OT Is Shown']}
          rows={[
            ['Agent Dashboard', 'A violet "OT Email" progress bar appears when the agent has OT tickets for the day. Uses the quota_ot_email field for the target.'],
            ['Team Scorecard', 'OT productivity is integrated as a separate metric with its own quota.'],
            ['Ticket Logs', 'Regular email counts in the table strictly exclude OT-flagged tickets to avoid double-counting.'],
          ]}
        />

        <CalloutBox variant="warning" title="No Double-Counting">
          Regular email productivity calculations <strong>always exclude</strong> tickets flagged as OT. This ensures that an agent's standard quota performance is measured independently from their overtime output.
        </CalloutBox>
        <GuideImagePlaceholder description="Agent Dashboard showing the violet OT Email progress bar alongside the regular email progress bar" />
      </GuideSection>

      {/* E. Who Can Access */}
      <GuideSection letter="E" color="bg-amber-600" title="Access & Permissions">
        <QuickTable
          headers={['Role', 'Access Level']}
          rows={[
            ['User / Agent', 'Can view the Ticket Logs page and see all agent data for both ZD instances.'],
            ['Admin / HR', 'Full access — same view as agents.'],
            ['Super Admin', 'Full access — same view as agents.'],
          ]}
        />
        <CalloutBox variant="info">
          Ticket Logs is a <strong>read-only</strong> view for all roles. Data is populated automatically via Zendesk webhooks and cannot be manually edited from this page.
        </CalloutBox>
      </GuideSection>
    </div>
  );
}
