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
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Overview Tab Metrics</h3>
        <Checklist items={[
          "Monthly Outages count",
          "Unique Agents count",
          "Repeat Offenders count",
          "Total Violations count",
          "Monthly Trend line chart (6 months)",
          "Reason distribution pie chart",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Repeat Offender Thresholds</h3>
        <QuickTable 
          headers={['Reason', 'Monthly Limit', 'Notes']}
          rows={[
            ['Power Outage', '2', 'Exceeding triggers violation.'],
            ['Wi-Fi Issue', '2', 'Exceeding triggers violation.'],
            ['Medical Leave', '3', 'Exceeding triggers violation.'],
            ['Planned Leave', 'Unlimited', 'No violation threshold.'],
            ['Equipment Issue', '2', 'Exceeding triggers violation.'],
            ['Late Login', '3', 'Exceeding triggers violation.'],
            ['Undertime', '3', 'Exceeding triggers violation.'],
            ['Unplanned', '2', 'Exceeding triggers violation.'],
          ]}
        />

        <CalloutBox variant="info" title="Repeat Offenders">
          Agents who exceed the monthly limit for any reason type are listed in the Repeat Offenders tab. Use the "Export to CSV" button to download the data.
        </CalloutBox>
      </GuideSection>
    </>
  );
}
