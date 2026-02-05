import { CalloutBox, QuickTable, Checklist } from '../../GuideComponents';
import { User, Users, LayoutDashboard } from 'lucide-react';

export function PeopleMenuSection() {
  return (
    <div className="space-y-8">
      {/* My Bio */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <User className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">My Bio (Profile)</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          View and manage your personal profile information, emergency contacts, and work details.
        </p>

        <h4 className="font-medium mb-2">Profile Sections</h4>
        <QuickTable
          headers={['Section', 'What You Can Edit']}
          rows={[
            ['Personal Info', 'Name, contact details, address'],
            ['Emergency Contacts', 'Primary and secondary contacts'],
            ['Government IDs', 'SSS, PhilHealth, Pag-IBIG, TIN (view only after submission)'],
            ['Work Info', 'View only - managed by admin'],
          ]}
        />

        <h4 className="font-medium mb-2 mt-4">Updating Your Profile</h4>
        <Checklist items={[
          'Navigate to My Bio from the People menu',
          'Click "Edit" on the section you want to update',
          'Make your changes',
          'Click "Save" to submit',
          'Some changes require admin approval',
        ]} />

        <CalloutBox variant="warning" title="Sensitive Information">
          Changes to government IDs or work configuration require admin approval and may take time to process.
        </CalloutBox>

        <CalloutBox variant="tip">
          Keep your emergency contacts up to date. This information is critical in case of emergencies.
        </CalloutBox>
      </section>

      {/* Team Status Board */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Team Status Board</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Real-time view of team member statuses. See who's online, in a meeting, on break, or offline.
        </p>

        <h4 className="font-medium mb-2">Status Types</h4>
        <QuickTable
          headers={['Status', 'Indicator', 'Meaning']}
          rows={[
            ['Online', '🟢 Green', 'Active and available'],
            ['Away', '🟡 Yellow', 'Temporarily away'],
            ['In Meeting', '🔵 Blue', 'In a scheduled meeting'],
            ['On Break', '🟠 Orange', 'Taking a break'],
            ['Offline', '⚫ Gray', 'Not logged in'],
          ]}
        />

        <h4 className="font-medium mb-2 mt-4">Features</h4>
        <Checklist items={[
          'See all team members at a glance',
          'Filter by status or team',
          'View current activity duration',
          'Quick access to team member profiles',
        ]} />
      </section>

      {/* Dashboard */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Dashboard</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Your personal performance dashboard. View your metrics, achievements, and progress over time.
        </p>

        <h4 className="font-medium mb-2">Dashboard Widgets</h4>
        <QuickTable
          headers={['Widget', 'What It Shows']}
          rows={[
            ['Ticket Stats', 'Daily, weekly, monthly ticket counts'],
            ['QA Scores', 'Recent evaluation scores and trends'],
            ['Attendance', 'Login/logout times and compliance'],
            ['Acknowledgements', 'Update completion rate'],
            ['Agent Reports', 'Recent compliance incidents'],
          ]}
        />

        <CalloutBox variant="info">
          Your dashboard updates in real-time. Use it to track your daily progress and identify areas for improvement.
        </CalloutBox>
      </section>
    </div>
  );
}
