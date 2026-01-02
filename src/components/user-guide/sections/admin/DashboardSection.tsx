import { GuideSection, CalloutBox, Checklist, QuickTable } from '../../GuideComponents';

export function DashboardSection() {
  return (
    <GuideSection letter="K" color="bg-rose-500" title="Admin Dashboard">
      <p className="text-muted-foreground mb-4">
        The Admin Dashboard provides an overview of team acknowledgement progress across all updates.
      </p>

      <h3 className="font-semibold mb-2">Dashboard Features</h3>
      <Checklist items={[
        "Overview of all published updates.",
        "Acknowledgement counts for each update.",
        "Progress bars showing completion percentage.",
        "Filter by update or date range.",
        "Export functionality for reports.",
      ]} />

      <h3 className="font-semibold mb-2 mt-4">Understanding the Data</h3>
      <QuickTable 
        headers={['Metric', 'Description', 'How It Is Calculated']}
        rows={[
          ['Total Acknowledgements', 'Users who acknowledged.', 'Count of acknowledgement records.'],
          ['Pending', 'Users who have NOT acknowledged.', 'Total users minus acknowledged.'],
          ['Completion %', 'Percentage complete.', '(Acknowledged / Total) × 100.'],
        ]}
      />

      <h3 className="font-semibold mb-2 mt-4">User Acknowledgement Details</h3>
      <p className="text-sm text-muted-foreground mb-2">
        Clicking on an update shows detailed acknowledgement information:
      </p>
      <Checklist items={[
        "List of users who acknowledged.",
        "Acknowledgement date/time for each user.",
        "List of users who have NOT acknowledged.",
        "Export to CSV for reporting.",
      ]} />

      <CalloutBox variant="tip">
        Use the Dashboard to identify users who may need reminders about pending acknowledgements. The export feature is useful for compliance reporting.
      </CalloutBox>
    </GuideSection>
  );
}
