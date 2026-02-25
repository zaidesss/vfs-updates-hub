import { GuideSection, CalloutBox, QuickTable, Checklist } from '../../GuideComponents';
import { GuideImagePlaceholder } from '../../GuideImagePlaceholder';

export function TeamScorecardSection() {
  return (
    <div className="space-y-6">
      {/* A. Overview */}
      <GuideSection letter="A" color="bg-blue-600" title="Overview">
        <p className="text-sm text-muted-foreground mb-3">
          The Team Scorecard provides a <strong>comprehensive weekly performance overview</strong> (Monday–Sunday) for all agents. It aggregates productivity, quality, and reliability metrics into a single weighted final score per agent.
        </p>
        <Checklist items={[
          'Metrics are auto-populated from Ticket Logs, QA Evaluations, Revalida, and Leave Requests.',
          'Weighted scoring is driven by a database configuration table — no hardcoded goals.',
          'Admins can freeze (save) weekly results for permanent record-keeping.',
          'AHT and FRT values can be manually overridden when automated data is unavailable.',
        ]} />
        <GuideImagePlaceholder description="Full Team Scorecard page showing the week selector, support type tabs, and the agent performance table" />
      </GuideSection>

      {/* B. Date Selection */}
      <GuideSection letter="B" color="bg-indigo-600" title="Date Selection">
        <p className="text-sm text-muted-foreground mb-3">
          The scorecard uses <strong>Year → Month → Week</strong> dropdown selectors to choose the performance period:
        </p>
        <QuickTable
          headers={['Selector', 'Behavior']}
          rows={[
            ['Year', 'Restricted to 2026 and later (portal inception year).'],
            ['Month', 'Shows all 12 months for the selected year.'],
            ['Week', 'Shows only weeks that overlap with the selected month. Uses anchor-aligned boundaries (Feb 2, 2026) for consistency across all portal views.'],
          ]}
        />
        <CalloutBox variant="info">
          The scorecard defaults to the <strong>current work week</strong> on initial load, ensuring the most recent performance data is immediately visible.
        </CalloutBox>
      </GuideSection>

      {/* C. Support Type Tabs */}
      <GuideSection letter="C" color="bg-purple-600" title="Support Type & Metrics">
        <p className="text-sm text-muted-foreground mb-3">
          Performance metrics and their weights vary by support type. Each tab displays agents matching that position.
        </p>

        <h4 className="font-semibold text-sm mb-2">Email</h4>
        <QuickTable
          headers={['Metric', 'Weight', 'Goal', 'Source']}
          rows={[
            ['Productivity (Emails)', '35%', '715 tickets/week', 'Ticket Logs (excludes OT tickets)'],
            ['QA Score', '30%', '100%', 'QA Evaluations (matched by work_week_start)'],
            ['Revalida', '5%', '95%', 'Latest graded attempt in the week'],
            ['Reliability', '30%', '98%', 'Calculated from leave requests'],
          ]}
        />

        <h4 className="font-semibold text-sm mt-4 mb-2">Hybrid</h4>
        <QuickTable
          headers={['Metric', 'Weight', 'Goal', 'Source']}
          rows={[
            ['Call AHT', '—', '420s', 'Zendesk Talk API (avg call leg duration)'],
            ['Chat AHT', '—', '600s', 'Zendesk agent_work_time or requester_wait_time fallback'],
            ['Chat FRT', '—', '30s', 'Assignment-to-first-reply delta'],
            ['QA Score', '30%', '100%', 'QA Evaluations'],
            ['Reliability', '—', '100%', 'Calculated from leave requests'],
          ]}
        />

        <h4 className="font-semibold text-sm mt-4 mb-2">Logistics</h4>
        <QuickTable
          headers={['Metric', 'Weight', 'Goal', 'Source']}
          rows={[
            ['Order Escalation & Intervention', '35%', 'Manual %', 'Admin enters percentage manually'],
            ['QA Score', '30%', '100%', 'QA Evaluations'],
            ['Revalida', '5%', '95%', 'Latest graded attempt'],
            ['Reliability', '30%', '98%', 'Calculated from leave requests'],
          ]}
        />
        <GuideImagePlaceholder description="Scorecard table for Email showing Productivity, QA, Revalida, Reliability columns and final weighted score" />
      </GuideSection>

      {/* D. Metric Details */}
      <GuideSection letter="D" color="bg-teal-600" title="Metric Calculation Details">
        <h4 className="font-semibold text-sm mb-2">Reliability</h4>
        <p className="text-sm text-muted-foreground mb-3">
          Uses a <strong>deduction-based system</strong>: starts at 100% baseline, then deducts 1% for every unplanned outage day recorded in the leave requests table. "Planned Leave" is the only outage reason exempt from deductions.
        </p>

        <h4 className="font-semibold text-sm mb-2">QA Score</h4>
        <p className="text-sm text-muted-foreground mb-3">
          QA evaluations are matched to the scorecard week using the <code>work_week_start</code> field (not the physical audit date). This ensures evaluations are attributed to the correct performance week even if audited later.
        </p>

        <h4 className="font-semibold text-sm mb-2">AHT & FRT Display</h4>
        <QuickTable
          headers={['Display Element', 'Format']}
          rows={[
            ['Raw value', 'Shown in seconds (e.g., "420s")'],
            ['Percentage', 'Color-coded — green (at/above goal), red (below goal)'],
            ['Missing data', '⚠ warning icon with tooltip "Data unavailable — click to enter manually"'],
          ]}
        />

        <h4 className="font-semibold text-sm mt-4 mb-2">Revalida</h4>
        <p className="text-sm text-muted-foreground mb-3">
          Pulls the <strong>latest graded attempt's final percentage</strong> for each agent from batches whose <code>start_at</code> falls within the Monday–Sunday window. Target: 95%.
        </p>
      </GuideSection>

      {/* E. Team Lead Filter */}
      <GuideSection letter="E" color="bg-amber-600" title="Team Lead Filter">
        <QuickTable
          headers={['Role', 'Filter Behavior']}
          rows={[
            ['User / Agent', 'Automatically locked to their assigned team lead. Can see scores for all agents under the same lead.'],
            ['Admin / HR', 'Full filtering — can select any team lead or view all agents.'],
            ['Super Admin', 'Full filtering — same as Admin.'],
          ]}
        />
        <CalloutBox variant="tip" title="Team Visibility">
          Regular agents can see the performance scores of their entire team (all agents sharing the same team lead), not just their own. This promotes healthy competition and transparency.
        </CalloutBox>
      </GuideSection>

      {/* F. Admin Controls */}
      <GuideSection letter="F" color="bg-red-600" title="Admin Controls">
        <p className="text-sm text-muted-foreground mb-3">
          Admin and Super Admin users have additional controls:
        </p>

        <h4 className="font-semibold text-sm mb-2">Refresh Metrics</h4>
        <p className="text-sm text-muted-foreground mb-3">
          A per-support-type button that bypasses the 1-hour data cache and forces a fresh fetch from the Zendesk API. Normally, metrics are auto-refreshed every Tuesday at 2:00 AM EST via a scheduled job.
        </p>

        <h4 className="font-semibold text-sm mb-2">Manual AHT/FRT Overrides</h4>
        <Checklist items={[
          'Click the ⚠ icon or existing value to open the edit interface.',
          'Enter the value in raw seconds or mm:ss format.',
          'Click "Save Changes" to persist the override to the database.',
          'Overridden values display an "edited" badge for visibility.',
        ]} />

        <h4 className="font-semibold text-sm mb-2">Save Scorecard (Freeze)</h4>
        <p className="text-sm text-muted-foreground mb-3">
          The <strong>"Save Scorecard"</strong> button freezes the entire week's data as a permanent snapshot. A confirmation dialog requires the admin to verify that all values are 100% accurate.
        </p>
        <CalloutBox variant="warning" title="Frozen Data">
          Once saved, scorecard records in the database do <strong>not</strong> automatically reflect subsequent data changes (e.g., late QA evaluations or metric corrections). The freeze is intentional for record-keeping integrity.
        </CalloutBox>
        <GuideImagePlaceholder description="Admin view showing Refresh Metrics button, editable AHT cell with 'edited' badge, and Save Scorecard button" />
      </GuideSection>

      {/* G. Scoring Formula */}
      <GuideSection letter="G" color="bg-emerald-600" title="Final Score Calculation">
        <p className="text-sm text-muted-foreground mb-3">
          The final weighted score for each agent is calculated as:
        </p>
        <div className="bg-muted/50 rounded-lg p-4 my-3 font-mono text-sm">
          Final Score = Σ (Metric % × Weight)
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Each metric's percentage is computed relative to its goal (e.g., 700 emails against a 715 goal = 97.9%). The percentage is then multiplied by the metric's weight, and all weighted values are summed for the final score.
        </p>
        <CalloutBox variant="info" title="Database-Driven Goals">
          All metric goals and weights are stored in the <code>scorecard_config</code> database table. Changes to goals or weights take effect immediately without code updates.
        </CalloutBox>
      </GuideSection>
    </div>
  );
}
