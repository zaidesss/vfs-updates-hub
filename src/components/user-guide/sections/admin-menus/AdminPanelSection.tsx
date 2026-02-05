import { CalloutBox, QuickTable, Checklist } from '../../GuideComponents';
import { Settings, Users, Shield, FileText, Lightbulb, ArrowRight } from 'lucide-react';

export function AdminPanelSection() {
  return (
    <div className="space-y-8">
      {/* User Management */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">User Management</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Create, manage, and configure user accounts. Super Admin only.
        </p>

        <h4 className="font-medium mb-2">Creating Users</h4>
        <QuickTable
          headers={['Method', 'Description', 'Best For']}
          rows={[
            ['Single User', 'Create one user at a time with full details', 'New hires, individual additions'],
            ['Bulk Import', 'Upload CSV file with multiple users', 'Onboarding new teams, batch creation'],
          ]}
        />

        <h4 className="font-medium mb-2 mt-4">Single User Creation</h4>
        <Checklist items={[
          'Navigate to Admin Panel → User Management',
          'Click "Add User" button',
          'Enter email address and name',
          'Select role (User, Admin, HR)',
          'Set initial password or send invite',
          'Configure team and work settings',
          'Save to create the account',
        ]} />

        <h4 className="font-medium mb-2 mt-4">User Actions</h4>
        <QuickTable
          headers={['Action', 'Description', 'Who Can Perform']}
          rows={[
            ['Reset Password', 'Send password reset email to user', 'Super Admin'],
            ['Change Email', 'Update user login email address', 'Super Admin'],
            ['Change Role', 'Modify user permission level', 'Super Admin'],
            ['Deactivate', 'Disable account (keeps data)', 'Super Admin'],
            ['Delete', 'Permanently remove account', 'Super Admin'],
            ['Restore', 'Recover deleted user account', 'Super Admin'],
          ]}
        />

        <CalloutBox variant="warning" title="Deletion Warning">
          Deleted users can be restored within 30 days. After that, the account and associated data are permanently removed.
        </CalloutBox>
      </section>

      {/* Role Management */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Role Management</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Understanding and assigning user roles with appropriate permissions.
        </p>

        <h4 className="font-medium mb-2">Role Hierarchy</h4>
        <QuickTable
          headers={['Role', 'Manage Users', 'Delete Users', 'Edit All Profiles', 'View Compensation']}
          rows={[
            ['Super Admin', '✓', '✓', '✓ (All fields)', '✓'],
            ['Admin', '✗', '✗', '✓ (Except compensation)', '✗'],
            ['HR', '✗', '✗', 'View only', '✗'],
            ['User', '✗', '✗', 'Own profile only', '✗'],
          ]}
        />

        <h4 className="font-medium mb-2 mt-4">Changing User Roles</h4>
        <Checklist items={[
          'Find the user in User Management',
          'Click on their profile/row',
          'Locate the Role dropdown',
          'Select the new role',
          'Confirm the change',
          'New permissions apply immediately',
        ]} />

        <CalloutBox variant="info" title="Role Changes">
          Role changes take effect immediately. The user will see updated menus and permissions on their next page load or login.
        </CalloutBox>
      </section>

      {/* Changelog Management */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Changelog Management</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Document and communicate portal updates and new features.
        </p>

        <h4 className="font-medium mb-2">Creating Changelog Entries</h4>
        <Checklist items={[
          'Navigate to Admin Panel → Changelog tab',
          'Click "New Entry" button',
          'Enter version number and date',
          'Add title and description',
          'List new features, improvements, fixes',
          'Publish to make visible to users',
        ]} />

        <h4 className="font-medium mb-2 mt-4">Entry Categories</h4>
        <QuickTable
          headers={['Category', 'Icon', 'Use For']}
          rows={[
            ['New Feature', '✨', 'Brand new functionality'],
            ['Improvement', '⬆️', 'Enhancements to existing features'],
            ['Bug Fix', '🐛', 'Resolved issues and errors'],
            ['Breaking Change', '⚠️', 'Changes requiring user action'],
          ]}
        />

        <CalloutBox variant="tip">
          Keep changelog entries concise but informative. Users refer to this to understand what changed and how it affects them.
        </CalloutBox>
      </section>

      {/* Improvements Tracker */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Improvements Tracker</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Track feature requests, bug reports, and improvement ideas from users and stakeholders.
        </p>

        <h4 className="font-medium mb-2">Tracker Features</h4>
        <QuickTable
          headers={['Feature', 'Description']}
          rows={[
            ['Submit Ideas', 'Users can submit improvement suggestions'],
            ['Status Tracking', 'See which items are planned, in progress, or done'],
            ['Priority Levels', 'High, Medium, Low priority assignment'],
            ['Category Tags', 'Organize by feature area or type'],
            ['Comments', 'Discussion thread for each item'],
          ]}
        />

        <h4 className="font-medium mb-2 mt-4">Status Workflow</h4>
        <div className="p-4 bg-muted/50 rounded-lg my-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="px-2 py-1 bg-muted text-muted-foreground rounded font-medium">Submitted</span>
            <ArrowRight className="h-4 w-4" />
            <span className="px-2 py-1 bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded font-medium">Under Review</span>
            <ArrowRight className="h-4 w-4" />
            <span className="px-2 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded font-medium">Planned</span>
            <ArrowRight className="h-4 w-4" />
            <span className="px-2 py-1 bg-purple-500/20 text-purple-700 dark:text-purple-400 rounded font-medium">In Progress</span>
            <ArrowRight className="h-4 w-4" />
            <span className="px-2 py-1 bg-green-500/20 text-green-700 dark:text-green-400 rounded font-medium">Completed</span>
          </div>
        </div>

        <CalloutBox variant="info">
          Access the Improvements Tracker from the Admin dropdown menu. It helps prioritize development efforts based on user feedback.
        </CalloutBox>
      </section>
    </div>
  );
}
