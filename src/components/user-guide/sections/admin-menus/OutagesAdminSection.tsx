import { CalloutBox, QuickTable, Checklist } from '../../GuideComponents';
import { ClipboardCheck, BarChart3, Zap, ArrowUpRight, ArrowRight } from 'lucide-react';

export function OutagesAdminSection() {
  return (
    <div className="space-y-8">
      {/* Review Outage Requests */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Review Outage Requests</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Approve, decline, or review outage requests submitted by agents.
        </p>

        <h4 className="font-medium mb-2">Request Review Process</h4>
        <Checklist items={[
          'View pending requests in Leave Request page',
          'Check request details (date, time, reason)',
          'Verify against schedule and team coverage',
          'Approve or Decline with optional notes',
          'Agent receives notification of decision',
        ]} />

        <h4 className="font-medium mb-2 mt-4">Request Status Lifecycle</h4>
        <div className="p-4 bg-muted/50 rounded-lg my-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Standard Request:</p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="px-2 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded font-medium">Pending</span>
              <ArrowRight className="h-4 w-4" />
              <span className="px-2 py-1 bg-green-500/20 text-green-700 dark:text-green-400 rounded font-medium">Approved</span>
              <span className="text-muted-foreground">or</span>
              <span className="px-2 py-1 bg-destructive/20 text-destructive rounded font-medium">Declined</span>
              <span className="text-muted-foreground">or</span>
              <span className="px-2 py-1 bg-muted text-muted-foreground rounded font-medium">Canceled</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Override Request:</p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="px-2 py-1 bg-purple-500/20 text-purple-700 dark:text-purple-400 rounded font-medium">Pending Override</span>
              <ArrowRight className="h-4 w-4" />
              <span className="px-2 py-1 bg-green-500/20 text-green-700 dark:text-green-400 rounded font-medium">Approved</span>
              <span className="text-muted-foreground">or</span>
              <span className="px-2 py-1 bg-destructive/20 text-destructive rounded font-medium">Declined</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Auto-Generated (from Agent Reports):</p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="px-2 py-1 bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded font-medium">For Review</span>
              <ArrowRight className="h-4 w-4" />
              <span className="px-2 py-1 bg-green-500/20 text-green-700 dark:text-green-400 rounded font-medium">Approved</span>
              <span className="text-muted-foreground">or</span>
              <span className="px-2 py-1 bg-destructive/20 text-destructive rounded font-medium">Declined</span>
            </div>
          </div>
        </div>

        <CalloutBox variant="info" title="Override Requests">
          When an agent's request is declined, they can submit an override with additional justification. These appear with "Pending Override" status and require separate review.
        </CalloutBox>
      </section>

      {/* Automated Triggers */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Automated Triggers</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          The system automatically creates outage requests in certain scenarios.
        </p>

        <h4 className="font-medium mb-2">Auto-Generated Outage Requests</h4>
        <QuickTable
          headers={['Trigger', 'Condition', 'Action']}
          rows={[
            ['Late Login Auto-Request', 'Agent logs in >10 minutes after scheduled start', 'Creates "Late Login" outage with status "For Review"'],
            ['Grace Period Calculation', 'When auto-request is created', 'Start time = schedule + 5 min grace period'],
            ['End Time Calculation', 'When auto-request is created', 'End time = 1 minute before actual login'],
            ['Duplicate Prevention', 'Same agent, date, and reason already exists', 'System skips creation (no duplicate)'],
          ]}
        />

        <h4 className="font-medium mb-2 mt-4">Example Scenario</h4>
        <div className="p-4 bg-muted/50 rounded-lg my-4 text-sm space-y-2">
          <p><strong>Agent Schedule:</strong> Start at 9:00 AM</p>
          <p><strong>Actual Login:</strong> 9:25 AM (25 minutes late)</p>
          <p><strong>System Creates:</strong></p>
          <ul className="list-disc list-inside pl-4 space-y-1">
            <li>Outage Reason: "Late Login"</li>
            <li>Start Time: 9:05 AM (schedule + 5 min grace)</li>
            <li>End Time: 9:24 AM (1 min before login)</li>
            <li>Status: "For Review" (blue badge)</li>
          </ul>
        </div>

        <CalloutBox variant="warning" title="Review Required">
          Auto-generated requests still require admin review. The "For Review" status indicates these need attention.
        </CalloutBox>
      </section>

      {/* Escalation Workflows */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <ArrowUpRight className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Escalation Workflows</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Outage requests can be created from Agent Reports through the escalation workflow.
        </p>

        <h4 className="font-medium mb-2">Escalation from Agent Reports</h4>
        <QuickTable
          headers={['Agent Report Type', 'Escalation Action', 'Resulting Outage']}
          rows={[
            ['LATE_LOGIN', 'Click "Escalate as Outage"', 'Creates "Late Login" outage (For Review)'],
            ['EARLY_OUT', 'Click "Escalate as Outage"', 'Creates "Undertime" outage (For Review)'],
            ['TIME_NOT_MET', 'Click "Escalate as Outage"', 'Creates "Undertime" outage (For Review)'],
          ]}
        />

        <h4 className="font-medium mb-2 mt-4">Escalation Flow</h4>
        <div className="p-4 bg-muted/50 rounded-lg my-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="px-2 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded font-medium">Agent Report (Open)</span>
            <ArrowRight className="h-4 w-4" />
            <span className="text-muted-foreground">Admin clicks "Escalate"</span>
            <ArrowRight className="h-4 w-4" />
            <span className="px-2 py-1 bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded font-medium">Outage Created (For Review)</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            The Agent Report is marked as "Escalated" and linked to the new outage request.
          </p>
        </div>

        <CalloutBox variant="tip">
          Escalation is useful when an incident requires formal tracking as an outage for attendance records.
        </CalloutBox>
      </section>

      {/* Outage Statistics */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Outage Statistics & Analytics</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Comprehensive analytics on team outages, trends, and repeat offender identification.
        </p>

        <h4 className="font-medium mb-2">Available Analytics</h4>
        <QuickTable
          headers={['Report', 'Description']}
          rows={[
            ['Summary Dashboard', 'Total outages by reason, status, and time period'],
            ['Agent Breakdown', 'Individual agent outage counts and patterns'],
            ['Trend Analysis', 'Month-over-month and week-over-week trends'],
            ['Repeat Offenders', 'Agents with frequent late logins or undertimes'],
            ['Team Comparison', 'Compare outage rates across teams'],
          ]}
        />

        <h4 className="font-medium mb-2 mt-4">Repeat Offender Tracking</h4>
        <div className="p-4 bg-muted/50 rounded-lg my-4 text-sm">
          <p className="mb-2">The system identifies agents with recurring patterns:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Multiple late logins within a rolling period</li>
            <li>Frequent undertime or early logout</li>
            <li>High total outage hours compared to peers</li>
          </ul>
        </div>

        <CalloutBox variant="warning" title="Action Required">
          Use repeat offender data to identify coaching opportunities. Consistent patterns may indicate schedule issues or other concerns that need addressing.
        </CalloutBox>
      </section>
    </div>
  );
}
