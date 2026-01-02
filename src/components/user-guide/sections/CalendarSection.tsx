import { GuideSection, CalloutBox, Checklist, QuickTable } from '../GuideComponents';

export function CalendarSection() {
  return (
    <GuideSection letter="O" color="bg-green-500" title="Outage Calendar">
      <p className="text-muted-foreground mb-4">
        The Outage Calendar displays all pending and approved outages in a monthly calendar view.
      </p>

      <h3 className="font-semibold mb-2">Calendar Features</h3>
      <Checklist items={[
        "Monthly calendar view with navigation arrows.",
        "Previous/Next month buttons to browse different months.",
        "Today button to quickly return to the current date.",
        "Days with outages show colored indicator pills.",
        "Click on any day to see outage details in the right panel.",
      ]} />

      <h3 className="font-semibold mb-2 mt-4">Calendar Legend</h3>
      <QuickTable 
        headers={['Color', 'Status', 'Meaning']}
        rows={[
          ['Yellow dot', 'Pending', 'Request is waiting for approval.'],
          ['Green dot', 'Approved', 'Request has been approved.'],
        ]}
      />

      <h3 className="font-semibold mb-2 mt-4">Details Panel (Right Side)</h3>
      <p className="text-sm text-muted-foreground mb-2">
        When a day is clicked, the details panel shows:
      </p>
      <Checklist items={[
        "Selected date at the top.",
        "Count of outages for that day.",
        "List of outages with agent name.",
        "Client name for each outage.",
        "Status badge (Pending/Approved).",
        "Outage reason.",
        "Date range (start to end).",
      ]} />

      <CalloutBox variant="tip">
        Use the calendar to quickly check team availability before scheduling meetings or assigning work.
      </CalloutBox>
    </GuideSection>
  );
}
