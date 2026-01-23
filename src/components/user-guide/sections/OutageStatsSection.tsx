import { GuideSection, CalloutBox, Checklist, QuickTable } from '../GuideComponents';

export function OutageStatsSection() {
  return (
    <>
      <GuideSection letter="P" color="bg-green-400" title="Outage Report (User View)">
        <p className="text-muted-foreground mb-4">
          The Outage Report page shows your personal outage statistics.
        </p>

        <h3 className="font-semibold mb-2">Report Features</h3>
        <Checklist items={[
          "Month filter dropdown to select time period.",
          "Summary cards showing totals.",
          "Bar chart: Outages by Reason.",
          "Pie chart: Reason distribution.",
          "Detail table: Breakdown by reason type.",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Summary Cards</h3>
        <QuickTable 
          headers={['Card', 'What It Shows']}
          rows={[
            ['Total Outages', 'Count of all your outages in the selected period.'],
            ['Total Hours', 'Sum of all outage hours.'],
            ['Total Days', 'Sum of all outage days.'],
          ]}
        />
      </GuideSection>

      <GuideSection letter="Q" color="bg-emerald-500" title="Outage Stats (Admin Only)">
        <p className="text-muted-foreground mb-4">
          The Outage Stats page provides detailed analytics for administrators to monitor team outages.
        </p>

        <h3 className="font-semibold mb-2">Available Tabs</h3>
        <QuickTable 
          headers={['Tab', 'Content', 'Purpose']}
          rows={[
            ['Overview', 'High-level metrics and trends.', 'Quick snapshot of team outages.'],
            ['Breakdown', 'Detailed breakdown by agent.', 'Analyze individual agent patterns.'],
            ['Repeat Offenders', 'Agents exceeding monthly limits.', 'Identify policy violations.'],
            ['Policy', 'Complete HR policy guidelines.', 'Reference thresholds and discipline process.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Overview Tab Metrics</h3>
        <Checklist items={[
          "Monthly Outages count",
          "Unique Agents count",
          "Needs Review count (agents at review threshold)",
          "Action Required count (agents requiring formal action)",
          "Monthly Trend line chart (6 months)",
          "Reason distribution pie chart",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">3-Tier Threshold System (Per HR Policy)</h3>
        <p className="text-muted-foreground mb-2">
          The system uses three threshold levels based on the HR Policy for Remote Agent Attendance:
        </p>
        <QuickTable 
          headers={['Level', 'Description', 'Action']}
          rows={[
            ['Acceptable', 'Within normal expectations.', 'Standard monitoring.'],
            ['Needs Review', 'Early intervention stage.', 'Coaching, discussion, and guidance.'],
            ['Action Required', 'Formal corrective stage.', 'NTE or written warning.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Monthly Thresholds by Category</h3>
        <QuickTable 
          headers={['Reason', 'Acceptable', 'Needs Review', 'Action Required']}
          rows={[
            ['Power Outage', '≤1/mo', '2/mo', '≥3/mo'],
            ['Wi-Fi Issue', '≤1/mo', '2/mo', '≥3/mo'],
            ['Medical Leave', '≤2/mo', '3/mo', '≥4/mo'],
            ['Planned Leave', '—', '—', 'No limit'],
            ['Equipment Issue', '≤1/mo', '2/mo', '≥3/mo'],
            ['Late Login', '≤1/mo', '2/mo', '≥4/mo'],
            ['Undertime', '≤1/mo', '2/mo', '≥3/mo'],
            ['Unplanned', '≤1/mo', '2/mo', '≥3/mo'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Repeat Offenders Tab Features</h3>
        <Checklist items={[
          "Collapsible HR Policy Guidelines section",
          "Interactive threshold table with tooltips",
          "Color-coded callout boxes explaining each level",
          "Flagged agents table showing violations and status",
          "Export to CSV button for reporting",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Policy Tab Contents</h3>
        <Checklist items={[
          "Acceptable Monthly Thresholds reference table",
          "Intervention Levels comparison (Needs Review vs Action Required)",
          "Progressive Discipline Matrix (4 stages)",
          "Clearing Periods for warnings (60-90 days)",
          "Agent and Leader Responsibilities checklists",
        ]} />

        <CalloutBox variant="info" title="Pattern Detection">
          Patterns across multiple categories may trigger a review even if individual thresholds are not exceeded.
        </CalloutBox>

        <CalloutBox variant="warning" title="Progressive Discipline">
          Repeated violations follow a progressive discipline path: Verbal Warning → Written Warning → Final Written Warning → Termination. Each stage has defined clearing periods (60-90 days).
        </CalloutBox>
      </GuideSection>
    </>
  );
}
