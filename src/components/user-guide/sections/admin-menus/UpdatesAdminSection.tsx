import { CalloutBox, QuickTable, Checklist } from '../../GuideComponents';
import { FileText, MessageSquareText, LayoutDashboard, ArrowRight } from 'lucide-react';

export function UpdatesAdminSection() {
  return (
    <div className="space-y-8">
      {/* Create/Edit Updates */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Create & Edit Updates</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Create new updates for agents and manage existing content throughout its lifecycle.
        </p>

        <h4 className="font-medium mb-2">Creating an Update</h4>
        <Checklist items={[
          'Navigate to Admin Panel → Updates tab',
          'Click "New Update" button',
          'Enter title and select category',
          'Write content using the rich text editor',
          'Attach files if needed (PDF, images, etc.)',
          'Set acknowledgement requirement (optional)',
          'Save as Draft or Publish immediately',
        ]} />

        <h4 className="font-medium mb-2 mt-4">Update Status Lifecycle</h4>
        <div className="p-4 bg-muted/50 rounded-lg my-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="px-2 py-1 bg-muted text-muted-foreground rounded font-medium">Draft</span>
            <ArrowRight className="h-4 w-4" />
            <span className="px-2 py-1 bg-green-500/20 text-green-700 dark:text-green-400 rounded font-medium">Published</span>
            <ArrowRight className="h-4 w-4" />
            <span className="px-2 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded font-medium">Obsolete</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Draft → Only visible to admins | Published → Visible to all users | Obsolete → Archived, no longer active
          </p>
        </div>

        <h4 className="font-medium mb-2 mt-4">Status Transitions</h4>
        <QuickTable
          headers={['Current Status', 'Available Actions', 'Result']}
          rows={[
            ['Draft', 'Publish', 'Becomes visible to all users'],
            ['Draft', 'Delete', 'Permanently removed'],
            ['Published', 'Edit', 'Update content (keeps published)'],
            ['Published', 'Mark Obsolete', 'Archived, hidden from main view'],
            ['Obsolete', 'Republish', 'Returns to Published status'],
          ]}
        />

        <CalloutBox variant="info" title="Edit vs New Version">
          Editing a published update modifies it in place. All acknowledgements are preserved. For major changes, consider creating a new update and marking the old one obsolete.
        </CalloutBox>
      </section>

      {/* Questions Management */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquareText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Questions Management</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          View and respond to questions submitted by agents on updates.
        </p>

        <h4 className="font-medium mb-2">Managing Questions</h4>
        <Checklist items={[
          'View all questions from Admin Panel → Questions tab',
          'Filter by update, status, or agent',
          'Click a question to view full details',
          'Write a response and submit',
          'Mark as answered to close the question',
        ]} />

        <h4 className="font-medium mb-2 mt-4">Question Status Flow</h4>
        <div className="p-4 bg-muted/50 rounded-lg my-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="px-2 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded font-medium">Pending</span>
            <ArrowRight className="h-4 w-4" />
            <span className="px-2 py-1 bg-green-500/20 text-green-700 dark:text-green-400 rounded font-medium">Answered</span>
          </div>
        </div>

        <CalloutBox variant="tip">
          Respond to questions promptly. Agents receive notifications when their questions are answered.
        </CalloutBox>
      </section>

      {/* Team Acknowledgement Dashboard */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Team Acknowledgement Dashboard</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Track acknowledgement progress across all agents and updates.
        </p>

        <h4 className="font-medium mb-2">Dashboard Features</h4>
        <QuickTable
          headers={['Feature', 'Description']}
          rows={[
            ['Overall Progress', 'Percentage of required acknowledgements completed'],
            ['By Update', 'Breakdown showing completion rate per update'],
            ['By Agent', 'Individual agent completion rates'],
            ['Pending List', 'Agents who have not yet acknowledged'],
            ['Export', 'Download acknowledgement data as CSV'],
          ]}
        />

        <h4 className="font-medium mb-2 mt-4">Using the Dashboard</h4>
        <Checklist items={[
          'Navigate to Admin Panel → Dashboard tab',
          'View overall team completion percentage',
          'Click an update to see individual agent status',
          'Send reminders to agents with pending acknowledgements',
          'Export reports for compliance tracking',
        ]} />

        <CalloutBox variant="warning" title="Compliance Tracking">
          Use this dashboard to ensure all agents acknowledge critical updates. Consider following up with agents who consistently have pending acknowledgements.
        </CalloutBox>
      </section>
    </div>
  );
}
