import { GuideSection, CalloutBox, Checklist, QuickTable } from '../../GuideComponents';

export function DashboardAdminSection() {
  return (
    <div className="space-y-8">
      {/* A: Slack Notifications */}
      <GuideSection letter="A" color="bg-blue-600" title="Slack Notification Routing">
        <p className="text-sm text-muted-foreground mb-3">
          Dashboard status changes trigger real-time Slack notifications routed to specific channels based on event type.
        </p>
        <QuickTable
          headers={['Event Type', 'Slack Channel', 'Mention']}
          rows={[
            ['Login / Logout', '#a_cyrus_li-lo', 'None — silent log'],
            ['Break, Coaching, Restart, Bio', '#a_cyrus_cs-all', '<!channel> mention'],
            ['Compliance Violations & Analytics', '#a_agent_reports', 'Hyperlinked message'],
          ]}
        />
        <CalloutBox variant="info" title="Email Alerts">
          Daily and weekly analytics summaries are also emailed to all Admin, HR, and Super Admin users. The system de-duplicates recipients so users with multiple roles receive only one email.
        </CalloutBox>
      </GuideSection>

      {/* B: Auto-Generated Outage Requests */}
      <GuideSection letter="B" color="bg-amber-600" title="Auto-Generated Outage Requests">
        <p className="text-sm text-muted-foreground mb-3">
          When an agent logs in more than <strong>10 minutes</strong> after their scheduled start time, the system automatically creates a <strong>"for_review"</strong> outage request.
        </p>
        <Checklist items={[
          'Timeframe: Scheduled start + 5-min grace period → 1 minute before actual login.',
          'Status: "for_review" (blue badge with eye icon) — distinguishable from manual submissions.',
          'Duplicate prevention: Skipped if a Late Login outage already exists for the same agent and date.',
          'Reason is auto-set to "Late Login" with calculated duration.',
        ]} />
        <CalloutBox variant="warning" title="Review Required">
          Auto-generated outage requests require admin review. They do not auto-approve — a Team Lead or Admin must take action (approve, reject, or dismiss).
        </CalloutBox>
      </GuideSection>

      {/* C: Team Lead Responsibilities */}
      <GuideSection letter="C" color="bg-green-600" title="Team Lead Responsibilities">
        <p className="text-sm text-muted-foreground mb-3">
          Team Leads should review the Agent Reports hub daily. The hub defaults to the <strong>"Open"</strong> status filter to prioritize actionable items.
        </p>
        <h4 className="font-semibold text-sm mb-2">Three Possible Outcomes for Each Report</h4>
        <QuickTable
          headers={['Action', 'When to Use', 'Result']}
          rows={[
            ['Escalate', 'Legitimate incident needing formal record', 'Creates a "for_review" outage request'],
            ['Validate', 'Confirmed incident for coaching', 'Marks as validated; available for coaching sessions'],
            ['Dismiss', 'False positive or justified absence', 'Closes the report with notes'],
          ]}
        />
        <Checklist items={[
          'Monitor Slack channels (#a_agent_reports) for real-time compliance alerts.',
          'Verify shift schedule accuracy — especially for overnight workers.',
          'Check Weekly Summary card for break variance and attendance trends.',
        ]} />
      </GuideSection>

      {/* D: Agent Report Auto-Generation */}
      <GuideSection letter="D" color="bg-purple-600" title="Agent Report Auto-Generation">
        <p className="text-sm text-muted-foreground mb-3">
          Incidents are detected and reported through two mechanisms:
        </p>
        <QuickTable
          headers={['Mechanism', 'Timing', 'Details']}
          rows={[
            ['Real-Time Detection', 'Immediately on trigger', 'Slack alert sent to #a_agent_reports as soon as the violation is detected (e.g., bio overuse, overbreak)'],
            ['Automated Daily Audit', '5:00 AM UTC daily', 'Comprehensive scan generates reports for NO_LOGOUT, TIME_NOT_MET, QUOTA_NOT_MET, HIGH_GAP, and any missed real-time incidents'],
          ]}
        />
        <CalloutBox variant="info" title="Notification Flow">
          Every new incident triggers both a Slack notification to <strong>#a_agent_reports</strong> and an email alert to all Admin/HR/Super Admin users.
        </CalloutBox>
      </GuideSection>

      {/* E: Status Restrictions and Violations */}
      <GuideSection letter="E" color="bg-red-600" title="Status Restrictions & Violations">
        <p className="text-sm text-muted-foreground mb-3">
          Every status button on the Agent Dashboard has defined limits. Exceeding these limits generates an Agent Report incident.
        </p>
        <QuickTable
          headers={['Status / Metric', 'Limit', 'Violation Trigger', 'Report Type', 'Severity']}
          rows={[
            ['Login', '1 session/day', 'Login >10 min after scheduled start', 'LATE_LOGIN', 'Medium'],
            ['Logout', 'Must log out', 'Still logged in 3+ hrs past shift end', 'NO_LOGOUT', 'High'],
            ['Break', 'Matches shift allowance', 'Exceeds allowance + 5 min grace', 'OVERBREAK', 'Medium'],
            ['Device Restart', '5 minutes', 'Timer expires without return', 'EXCESSIVE_RESTARTS', 'Low'],
            ['Bio Break', '5 min (5h+) / 2.5 min (shorter)', 'Allowance depleted, continues', 'BIO_OVERUSE', 'Low'],
            ['Early Out', 'Before scheduled end', 'Logout before shift end time', 'EARLY_OUT', 'Medium'],
            ['Time Not Met', 'Full shift hours', 'Logged hours < required (Upwork prioritized)', 'TIME_NOT_MET', 'Medium'],
            ['Quota Not Met', 'Email/Chat/Phone quota', 'Tickets handled < expected quota', 'QUOTA_NOT_MET', 'Medium'],
            ['High Gap', 'Position-specific threshold', 'Avg ticket gap exceeds threshold (Email only)', 'HIGH_GAP', 'Low'],
          ]}
        />
        <CalloutBox variant="warning" title="Severity Levels">
          <strong>High</strong> severity incidents (e.g., NO_LOGOUT) are flagged for immediate attention. <strong>Medium</strong> incidents are standard compliance items. <strong>Low</strong> severity items are tracked for patterns over time.
        </CalloutBox>
      </GuideSection>

      {/* F: OT Ticket Tracking */}
      <GuideSection letter="F" color="bg-violet-600" title="OT Ticket Tracking">
        <p className="text-sm text-muted-foreground mb-3">
          When an agent enters <strong>ON_OT</strong> status, the Zendesk webhook automatically flags all incoming tickets with <code className="bg-muted px-1 rounded text-xs">is_ot: true</code>.
        </p>
        <Checklist items={[
          'OT tickets are tracked separately using the quota_ot_email field from the agent profile.',
          'A violet "OT Email" progress bar appears on the dashboard during or after OT sessions.',
          'Regular email productivity calculations strictly exclude OT-flagged tickets.',
          'OT productivity is integrated into the weekly Team Scorecard.',
        ]} />
        <CalloutBox variant="tip" title="Admin Setup">
          Ensure each OT-eligible agent has a valid <strong>quota_ot_email</strong> value set in their profile. Without it, OT productivity cannot be calculated.
        </CalloutBox>
      </GuideSection>

      {/* G: Outage Reflection in Shift Schedule */}
      <GuideSection letter="G" color="bg-teal-600" title="Outage Reflection in Shift Schedule">
        <p className="text-sm text-muted-foreground mb-3">
          Outage requests only appear on the Shift Schedule when they are <strong>approved</strong>.
        </p>
        <Checklist items={[
          'Pending and "for_review" requests do not alter the schedule display.',
          'Approved outages show as "On Leave" with the specific leave type on the badge (e.g., Medical Leave).',
          'The shift schedule cell is replaced with the leave indicator for the affected day(s).',
        ]} />
      </GuideSection>

      {/* H: OT Schedule Overriding Day Off */}
      <GuideSection letter="H" color="bg-indigo-600" title="OT Schedule Overriding Day Off">
        <p className="text-sm text-muted-foreground mb-3">
          If an agent has a <strong>Day Off</strong> but an OT schedule is configured for that day, the OT schedule takes precedence.
        </p>
        <Checklist items={[
          'The agent appears on the Team Status Board during their OT window.',
          'OT attendance is tracked separately from regular attendance.',
          'The dashboard shows the OT schedule instead of "Day Off" for that day.',
        ]} />
        <CalloutBox variant="info">
          This is useful for agents who need to work extra shifts on their rest days. The OT toggle and per-day OT schedule fields in the profile control this behavior.
        </CalloutBox>
      </GuideSection>

      {/* I: Auto-Logout System */}
      <GuideSection letter="I" color="bg-rose-600" title="Auto-Logout System">
        <p className="text-sm text-muted-foreground mb-3">
          The system detects stale sessions (agents who forgot to log out) during the next <strong>LOGIN</strong> or <strong>LOGOUT</strong> attempt.
        </p>
        <Checklist items={[
          'A SYSTEM_AUTO_LOGOUT event is inserted at 11:59:59 PM EST of the missed day.',
          'A NO_LOGOUT incident report is automatically generated.',
          'Overnight shifts (e.g., 8 PM – 3:30 AM) are validated against the agent\'s schedule before flagging.',
          'A 30-minute grace period applies for overnight shift workers to avoid false positives.',
        ]} />
        <CalloutBox variant="warning" title="Why Both LOGIN and LOGOUT?">
          Because the dashboard uses a toggle button, a stale session prevents the agent from clicking LOGIN (they appear still logged in). Detection on LOGOUT attempts is essential to catch these cases.
        </CalloutBox>
      </GuideSection>

      {/* J: Overnight Shift Considerations */}
      <GuideSection letter="J" color="bg-slate-600" title="Overnight Shift Considerations">
        <p className="text-sm text-muted-foreground mb-3">
          Schedules that cross midnight (where end time is earlier than start time, e.g., 8:00 PM – 3:30 AM) require special handling.
        </p>
        <Checklist items={[
          'Logout events are searched on the next calendar day (EST) for proper pairing with the login.',
          'Team Status Board uses "overnight carryover" to keep the agent visible after midnight.',
          'The report generator uses an extended 5-hour query window (until 5:00 AM EST) to capture overnight logouts.',
          'Early Out detection accounts for the shift ending on the following day.',
        ]} />
      </GuideSection>

      {/* K: Break Variance Tracking */}
      <GuideSection letter="K" color="bg-orange-600" title="Break Variance Tracking">
        <p className="text-sm text-muted-foreground mb-3">
          The <strong>Weekly Summary</strong> card tracks total break time taken vs. total break allowance for the week.
        </p>
        <QuickTable
          headers={['Indicator', 'Color', 'Meaning']}
          rows={[
            ['+ minutes', 'Red', 'Agent took more break than allowed (over)'],
            ['– minutes', 'Green', 'Agent took less break than allowed (under)'],
            ['"On track"', 'Neutral', 'Break usage matches allowance'],
          ]}
        />
        <Checklist items={[
          'Per-day break cells show duration vs. allowance with a checkmark or warning icon.',
          'Exceeding the allowance by more than 5 minutes (grace period) triggers an OVERBREAK incident.',
          'Break allowance is auto-deducted from Total Hours calculation for every working day.',
        ]} />
      </GuideSection>

      {/* L: Upwork Time Fetch & Disabled Buttons */}
      <GuideSection letter="L" color="bg-cyan-600" title="Upwork Time Fetch & Disabled Buttons">
        <p className="text-sm text-muted-foreground mb-3">
          Upwork time tracking uses a <strong>logout-triggered sync model</strong> — data is fetched only on LOGOUT or OT_LOGOUT events.
        </p>
        <Checklist items={[
          'The system awaits the edge function completion (~1-2 seconds) before refreshing the UI.',
          'During the fetch, relevant buttons are disabled to prevent race conditions.',
          'Upwork Hours are only visible when a valid upwork_contract_id is configured in the profile.',
          'Time Logged (Upwork) is prioritized over Portal Time for TIME_NOT_MET calculations.',
        ]} />
        <CalloutBox variant="warning" title="Broken Token Chains">
          If Upwork data stops syncing, the OAuth token chain may be broken. Manual re-authorization via the OAuth callback URL is required to restore the connection.
        </CalloutBox>
      </GuideSection>
    </div>
  );
}
