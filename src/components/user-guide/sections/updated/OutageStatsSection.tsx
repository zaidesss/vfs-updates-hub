import { GuideSection, CalloutBox, Checklist, QuickTable } from '../../GuideComponents';
import { GuideImagePlaceholder } from '../../GuideImagePlaceholder';

export function OutageStatsSection() {
  return (
    <>
      {/* 1. Overview & Access */}
      <GuideSection letter="A" color="bg-indigo-500" title="Overview & Access">
        <p className="text-muted-foreground mb-4">
          The Outage Statistics page provides Admin-only analytics on approved outage requests. It surfaces trends, breakdowns by reason, repeat offender identification using HR policy thresholds, and a dedicated Policy reference tab.
        </p>

        <h3 className="font-semibold mb-2">Access Control</h3>
        <Checklist items={[
          'Only Admin and HR roles can access Outage Statistics.',
          'Non-admin users are automatically redirected to the Outage Request page.',
          'Data source: only APPROVED outage requests are included in all calculations.',
        ]} />

        <GuideImagePlaceholder description="Screenshot: Outage Statistics page header with month/agent filters and Export CSV button" />
      </GuideSection>

      {/* 2. Filters */}
      <GuideSection letter="B" color="bg-indigo-400" title="Filters & Controls">
        <p className="text-muted-foreground mb-4">
          Two primary filters control all data displayed across every tab.
        </p>

        <QuickTable
          headers={['Filter', 'Options', 'Default', 'Behavior']}
          rows={[
            ['Month', 'Jan 2024 – Dec 2026 (descending)', 'Current month', 'Filters requests whose date range overlaps the selected month.'],
            ['Agent', 'All Agents / individual agent dropdown', 'All Agents', 'Limits data to a single agent\'s approved requests.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Export</h3>
        <Checklist items={[
          'CSV export button appears when repeat offenders exist.',
          'Exports: Agent Name, Email, Reason, Count, Thresholds, Status, and Exceeded By.',
          'File is named: repeat-offenders-{YYYY-MM}.csv',
        ]} />

        <CalloutBox variant="tip" title="Date Overlap Logic">
          A request is included in a month if its start-to-end date range overlaps with any part of the selected month — not just the start date. This ensures multi-day outages are properly counted.
        </CalloutBox>
      </GuideSection>

      {/* 3. Overview Tab */}
      <GuideSection letter="C" color="bg-violet-500" title="Overview Tab — Summary Cards & Charts">
        <p className="text-muted-foreground mb-4">
          The Overview tab provides at-a-glance metrics and visual charts for the selected period.
        </p>

        <h3 className="font-semibold mb-2">Summary Cards (Top Row)</h3>
        <QuickTable
          headers={['Card', 'Metric', 'Description']}
          rows={[
            ['Monthly Outages', 'Total count', 'Number of approved outage requests in the selected month.'],
            ['Unique Agents', 'Agent count', 'Number of distinct agents with at least one approved outage.'],
            ['Needs Review', 'Yellow count', 'Agents with outage counts in the "Needs Review" tier.'],
            ['Action Required', 'Red count', 'Agents with outage counts in the "Action Required" tier.'],
          ]}
        />

        <GuideImagePlaceholder description="Screenshot: Four summary cards showing Monthly Outages, Unique Agents, Needs Review, and Action Required counts" />

        <h3 className="font-semibold mb-2 mt-4">Charts</h3>
        <QuickTable
          headers={['Chart', 'Type', 'Data']}
          rows={[
            ['Monthly Trend', 'Line chart', 'Outage count over the last 6 months (rolling window).'],
            ['Reason Distribution', 'Pie chart', 'Breakdown of outage reasons for the selected month, color-coded.'],
          ]}
        />

        <GuideImagePlaceholder description="Screenshot: Side-by-side line chart (Monthly Trend) and pie chart (Reason Distribution)" />
      </GuideSection>

      {/* 4. Breakdown Tab */}
      <GuideSection letter="D" color="bg-violet-400" title="Breakdown Tab — Reason-by-Reason Table">
        <p className="text-muted-foreground mb-4">
          The Breakdown tab shows a detailed table with one row per outage reason, displaying count, total hours, and total days.
        </p>

        <h3 className="font-semibold mb-2">Table Columns</h3>
        <QuickTable
          headers={['Column', 'Description']}
          rows={[
            ['Reason', 'Outage type with icon (e.g., ⚡ Power Outage, 📶 Wi-Fi Issue).'],
            ['Count', 'Number of approved requests for this reason.'],
            ['Total Hours', 'Sum of outage_duration_hours across all requests.'],
            ['Total Days', 'Sum of total_days across all requests.'],
          ]}
        />

        <GuideImagePlaceholder description="Screenshot: Breakdown table showing each outage reason with count, hours, and days" />

        <CalloutBox variant="info" title="Reason Icons">
          Each outage reason has a dedicated icon for quick visual identification: Power Outage (⚡), Wi-Fi Issue (📶), Medical Leave (❤️), Planned Leave (📅), Equipment Issue (🔧), Late Login (🕐), Undertime (⏱️), Unplanned (?).
        </CalloutBox>
      </GuideSection>

      {/* 5. Repeat Offenders Tab */}
      <GuideSection letter="E" color="bg-red-500" title="Repeat Offenders Tab — HR Policy Thresholds">
        <p className="text-muted-foreground mb-4">
          The Repeat Offenders tab identifies agents whose outage counts exceed HR policy thresholds. It uses a 3-tier system to classify severity.
        </p>

        <h3 className="font-semibold mb-2">3-Tier Threshold System</h3>
        <QuickTable
          headers={['Tier', 'Badge', 'Meaning', 'Action']}
          rows={[
            ['Acceptable', 'None', 'Count is within normal range.', 'No action needed.'],
            ['Needs Review', 'Yellow (⚠ Needs Review)', 'Count has reached the review threshold.', 'Coaching or discussion recommended.'],
            ['Action Required', 'Red (✕ Action Required)', 'Count exceeds the action threshold.', 'Formal corrective action recommended.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Threshold Values by Reason</h3>
        <QuickTable
          headers={['Outage Reason', 'Acceptable (≤)', 'Needs Review (≥)', 'Action Required (≥)']}
          rows={[
            ['Power Outage', '1', '2', '3'],
            ['Wi-Fi Issue', '1', '2', '3'],
            ['Medical Leave', '2', '3', '4'],
            ['Planned Leave', '—', '—', '— (No threshold)'],
            ['Equipment Issue', '1', '2', '3'],
            ['Late Login', '1', '2', '4'],
            ['Undertime', '1', '2', '3'],
            ['Unplanned', '1', '2', '3'],
          ]}
        />

        <GuideImagePlaceholder description="Screenshot: Repeat Offenders table showing agents with yellow 'Needs Review' and red 'Action Required' badges" />

        <h3 className="font-semibold mb-2 mt-4">How Offenders Are Identified</h3>
        <Checklist items={[
          'Each agent\'s approved outage count is compared against the threshold for each reason.',
          'Planned Leave is always exempt — no threshold applied.',
          'An agent appears in the list if ANY reason reaches "Needs Review" or higher.',
          'The "worst status" across all reasons determines the agent\'s overall badge.',
          'Sorting: Action Required agents appear first, then Needs Review, then by total exceeded count.',
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Offender Table Columns</h3>
        <QuickTable
          headers={['Column', 'Description']}
          rows={[
            ['Agent Name', 'The agent\'s display name.'],
            ['Status', 'Worst-case badge (Action Required or Needs Review).'],
            ['Violations', 'List of reasons exceeding thresholds with individual counts.'],
            ['Threshold', 'The threshold values for each violated reason.'],
            ['Exceeded By', 'How many occurrences above the threshold.'],
          ]}
        />

        <CalloutBox variant="warning" title="Proactive Use">
          Review the Repeat Offenders tab monthly. Consistent patterns (e.g., multiple late logins over consecutive months) may indicate scheduling conflicts, personal issues, or infrastructure problems that warrant a supportive conversation — not just corrective action.
        </CalloutBox>
      </GuideSection>

      {/* 6. Policy Tab */}
      <GuideSection letter="F" color="bg-blue-500" title="Policy Tab — HR Guidelines Reference">
        <p className="text-muted-foreground mb-4">
          The Policy tab provides an in-app reference for the HR outage policy, including threshold definitions, escalation paths, and guidelines for each outage reason.
        </p>

        <h3 className="font-semibold mb-2">Policy Tab Contents</h3>
        <Checklist items={[
          'Threshold definitions for each outage reason.',
          'Escalation paths: who to notify and when.',
          'Guidelines for coaching vs. formal action.',
          'Collapsible section available from any tab via the policy toggle.',
          'Info tooltips on reason columns reference the applicable threshold.',
        ]} />

        <GuideImagePlaceholder description="Screenshot: Policy tab showing HR guidelines with threshold table and escalation paths" />

        <CalloutBox variant="info" title="Always Accessible">
          The HR Policy guidelines are also accessible as a collapsible section from the page header, so you can reference thresholds without switching tabs.
        </CalloutBox>
      </GuideSection>

      {/* 7. CSV Export */}
      <GuideSection letter="G" color="bg-emerald-500" title="CSV Export — Repeat Offender Reports">
        <p className="text-muted-foreground mb-4">
          The Export CSV button generates a downloadable report of all agents flagged as repeat offenders for the selected month.
        </p>

        <h3 className="font-semibold mb-2">Export File Contents</h3>
        <QuickTable
          headers={['Column', 'Description']}
          rows={[
            ['Agent Name', 'Display name of the flagged agent.'],
            ['Email', 'Agent\'s email address.'],
            ['Reason', 'The outage reason that exceeded the threshold.'],
            ['Count', 'Number of approved outages for this reason.'],
            ['Needs Review At', 'The threshold count that triggers "Needs Review".'],
            ['Action Required At', 'The threshold count that triggers "Action Required".'],
            ['Status', '"Action Required" or "Needs Review".'],
            ['Exceeded By', 'How many occurrences above the applicable threshold.'],
          ]}
        />

        <Checklist items={[
          'File name format: repeat-offenders-YYYY-MM.csv',
          'One row per violation (an agent with multiple violated reasons gets multiple rows).',
          'Export button only visible when at least one repeat offender exists.',
        ]} />

        <CalloutBox variant="tip" title="Monthly Reports">
          Export the repeat offender CSV monthly and share it during team leads meetings for proactive coaching alignment.
        </CalloutBox>
      </GuideSection>
    </>
  );
}
