import { CalloutBox, QuickTable, Checklist } from '../../GuideComponents';
import { Users, ClipboardList, FileCheck, ArrowRight } from 'lucide-react';

export function PeopleAdminSection() {
  return (
    <div className="space-y-8">
      {/* All Bios Management */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">All Bios (Profile Management)</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          View and manage all agent profiles in the system based on your permission level.
        </p>

        <h4 className="font-medium mb-2">Permission Matrix</h4>
        <QuickTable
          headers={['Field Category', 'Super Admin', 'Admin', 'HR']}
          rows={[
            ['Personal Info (Name, Contact)', 'Edit', 'View', 'View'],
            ['Emergency Contacts', 'Edit', 'Edit', 'View'],
            ['Government IDs', 'Edit', 'View', 'View'],
            ['Work Configuration', 'Edit', 'Edit', 'View'],
            ['Compensation Details', 'Edit', 'No Access', 'No Access'],
            ['Employment Status', 'Edit', 'View', 'View'],
          ]}
        />

        <h4 className="font-medium mb-2 mt-4">Editing Profiles</h4>
        <Checklist items={[
          'Navigate to People → All Bios',
          'Search or filter for the agent',
          'Click on the profile to open details',
          'Edit available fields based on your permissions',
          'Save changes (some may require approval)',
        ]} />

        <CalloutBox variant="warning" title="Sensitive Data">
          Compensation details are only visible to Super Admins. Ensure you follow company policies when accessing or modifying sensitive information.
        </CalloutBox>
      </section>

      {/* Master Directory */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Master Directory</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Centralized view of all agents with schedule and work configuration management.
        </p>

        <h4 className="font-medium mb-2">Directory Features</h4>
        <QuickTable
          headers={['Feature', 'Description']}
          rows={[
            ['Agent List', 'Complete roster with status indicators'],
            ['Schedule View', 'Current work schedules for all agents'],
            ['Team Grouping', 'Filter and view by team/department'],
            ['Quick Edit', 'Inline editing for schedule adjustments'],
            ['Bulk Actions', 'Update multiple agents simultaneously'],
          ]}
        />

        <h4 className="font-medium mb-2 mt-4">Managing Schedules</h4>
        <Checklist items={[
          'Open Master Directory from People menu',
          'Find the agent needing schedule change',
          'Click edit on their schedule row',
          'Modify start time, end time, or days',
          'Save changes (effective immediately)',
        ]} />

        <CalloutBox variant="info" title="Schedule Impact">
          Schedule changes affect automated systems immediately. Late login detection, quota calculations, and time requirements are based on the schedule defined here.
        </CalloutBox>
      </section>

      {/* Profile Change Requests */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <FileCheck className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Profile Change Requests</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Review and approve profile changes submitted by agents. Super Admin only.
        </p>

        <h4 className="font-medium mb-2">Request Types Requiring Approval</h4>
        <QuickTable
          headers={['Change Type', 'Requires Approval', 'Who Can Approve']}
          rows={[
            ['Basic Contact Info', 'No', 'Self-service'],
            ['Emergency Contacts', 'No', 'Self-service'],
            ['Government IDs', 'Yes', 'Super Admin'],
            ['Bank Details', 'Yes', 'Super Admin'],
            ['Address Change', 'Yes', 'Super Admin'],
          ]}
        />

        <h4 className="font-medium mb-2 mt-4">Approval Workflow</h4>
        <div className="p-4 bg-muted/50 rounded-lg my-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="px-2 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded font-medium">Agent Submits Change</span>
            <ArrowRight className="h-4 w-4" />
            <span className="px-2 py-1 bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded font-medium">Pending Review</span>
            <ArrowRight className="h-4 w-4" />
            <span className="px-2 py-1 bg-green-500/20 text-green-700 dark:text-green-400 rounded font-medium">Approved</span>
            <span className="text-muted-foreground">or</span>
            <span className="px-2 py-1 bg-destructive/20 text-destructive rounded font-medium">Rejected</span>
          </div>
        </div>

        <h4 className="font-medium mb-2 mt-4">Processing Requests</h4>
        <Checklist items={[
          'Navigate to Admin Panel → Profile Requests',
          'Review pending change requests',
          'Verify documentation if provided',
          'Approve or reject with notes',
          'Agent is notified of the decision',
        ]} />

        <CalloutBox variant="warning" title="Verification Required">
          For government ID and bank detail changes, verify supporting documentation before approval to prevent fraud.
        </CalloutBox>
      </section>
    </div>
  );
}
