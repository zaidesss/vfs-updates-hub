import { CalloutBox, QuickTable, Checklist } from '../../GuideComponents';
import { Clock, CalendarDays, FileBarChart } from 'lucide-react';

export function OutagesMenuSection() {
  return (
    <div className="space-y-8">
      {/* Outage Requests */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Outage Requests</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Submit and manage your outage/leave requests. Track approval status and view your request history.
        </p>

        <h4 className="font-medium mb-2">How to Submit an Outage Request</h4>
        <Checklist items={[
          'Click "New Request" button',
          'Select outage reason from dropdown',
          'Choose start date and time',
          'Choose end date and time (if multi-day)',
          'Add notes if needed',
          'Submit for approval',
        ]} />

        <h4 className="font-medium mb-2 mt-4">Outage Reasons</h4>
        <QuickTable
          headers={['Reason', 'Description']}
          rows={[
            ['Vacation Leave', 'Planned time off (requires advance notice)'],
            ['Sick Leave', 'Health-related absence'],
            ['Emergency Leave', 'Unexpected urgent absence'],
            ['Late Login', 'Arriving late to shift'],
            ['Undertime', 'Leaving before shift ends'],
            ['Technical Issues', 'System or connectivity problems'],
            ['Training', 'Scheduled training sessions'],
          ]}
        />

        <h4 className="font-medium mb-2 mt-4">Request Status Flow</h4>
        <div className="p-4 bg-muted/50 rounded-lg my-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="px-2 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded">Pending</span>
            <span>→</span>
            <span className="px-2 py-1 bg-green-500/20 text-green-700 dark:text-green-400 rounded">Approved</span>
            <span className="text-muted-foreground mx-2">or</span>
            <span className="px-2 py-1 bg-destructive/20 text-destructive rounded">Declined</span>
          </div>
        </div>

        <CalloutBox variant="warning" title="Approval Required">
          All outage requests require admin approval. Plan ahead for vacation and known absences.
        </CalloutBox>

        <CalloutBox variant="info" title="Override Requests">
          If your request is declined, you can submit an override request with additional justification.
        </CalloutBox>
      </section>

      {/* Calendar */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Calendar</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Visual calendar showing all pending and approved outages for the team. Plan your requests to avoid conflicts.
        </p>

        <h4 className="font-medium mb-2">Calendar Features</h4>
        <Checklist items={[
          'View team outages by day, week, or month',
          'Color-coded by outage status (pending vs approved)',
          'Click on entries to see details',
          'Check for scheduling conflicts before submitting requests',
          'Filter by team or individual',
        ]} />

        <h4 className="font-medium mb-2 mt-4">Color Legend</h4>
        <QuickTable
          headers={['Color', 'Status']}
          rows={[
            ['Yellow/Orange', 'Pending approval'],
            ['Green', 'Approved'],
            ['Blue', 'For Review (auto-generated)'],
            ['Purple', 'Override Pending'],
          ]}
        />

        <CalloutBox variant="tip">
          Before submitting a vacation request, check the calendar to see if too many team members are already scheduled off.
        </CalloutBox>
      </section>

      {/* My Outage Report */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <FileBarChart className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">My Outage Report</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Personal outage statistics showing your outage history organized by reason. Track your patterns over time.
        </p>

        <h4 className="font-medium mb-2">Report Features</h4>
        <Checklist items={[
          'View total outage hours by reason',
          'See monthly and yearly breakdowns',
          'Track approval rate for your requests',
          'Compare against team averages',
          'Export report for personal records',
        ]} />

        <CalloutBox variant="info">
          Use this report to monitor your attendance patterns and ensure you're within acceptable limits.
        </CalloutBox>
      </section>
    </div>
  );
}
