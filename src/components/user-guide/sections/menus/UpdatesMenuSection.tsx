import { CalloutBox, QuickTable, Checklist } from '../../GuideComponents';
import { FileText, BookOpen, MessageSquare, HelpCircle } from 'lucide-react';

export function UpdatesMenuSection() {
  return (
    <div className="space-y-8">
      {/* Updates Page */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Updates Page</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          The central hub for all company updates. View, acknowledge, and ask questions about published updates.
        </p>

        <h4 className="font-medium mb-2">What You Can Do</h4>
        <Checklist items={[
          'View all published updates sorted by date',
          'Read full update content and attachments',
          'Acknowledge updates to mark completion',
          'Ask questions directly on any update',
          'Filter updates by category or search keywords',
          'Track your acknowledgement progress',
        ]} />

        <h4 className="font-medium mb-2 mt-4">Update Categories</h4>
        <QuickTable
          headers={['Category', 'Description']}
          rows={[
            ['Process Updates', 'Changes to workflows and procedures'],
            ['Policy Changes', 'Company policy updates'],
            ['System Updates', 'Technical and tool changes'],
            ['Announcements', 'General company announcements'],
          ]}
        />

        <CalloutBox variant="info" title="Acknowledgement Required">
          Some updates require acknowledgement before you can proceed. Look for the "Acknowledge" button at the bottom of the update.
        </CalloutBox>
      </section>

      {/* Knowledge Base */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Knowledge Base</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          A searchable library of all published updates organized by category. Find past updates quickly.
        </p>

        <h4 className="font-medium mb-2">Features</h4>
        <Checklist items={[
          'Search across all published updates',
          'Browse by category folders',
          'View update history and versions',
          'Quick access to frequently referenced content',
        ]} />

        <CalloutBox variant="tip">
          Use the search bar to find specific topics. The search looks through titles, content, and tags.
        </CalloutBox>
      </section>

      {/* Update Requests */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Update Requests</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Submit requests for new articles or updates to existing content.
        </p>

        <h4 className="font-medium mb-2">How to Submit a Request</h4>
        <Checklist items={[
          'Click "New Request" button',
          'Select request type (New Article or Update Existing)',
          'Provide a clear title and description',
          'Add relevant details or examples',
          'Submit for admin review',
        ]} />

        <h4 className="font-medium mb-2 mt-4">Request Status</h4>
        <QuickTable
          headers={['Status', 'Meaning']}
          rows={[
            ['Pending', 'Awaiting admin review'],
            ['In Progress', 'Being worked on by admin'],
            ['Completed', 'Request fulfilled'],
            ['Declined', 'Request not approved (reason provided)'],
          ]}
        />
      </section>

      {/* Help Center */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Help Center</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          This page! Contains user guides, admin guides, announcements, and changelog.
        </p>

        <h4 className="font-medium mb-2">Available Sections</h4>
        <QuickTable
          headers={['Tab', 'Content']}
          rows={[
            ['User Guide', 'Complete guide for all portal features (you are here)'],
            ['Admin Guide', 'Administrative features and workflows'],
            ['Announcements', 'Important portal announcements'],
            ['Changelog', 'Latest feature updates and improvements'],
          ]}
        />
      </section>
    </div>
  );
}
