import { CalloutBox, QuickTable, Checklist } from '../../GuideComponents';
import { KeyRound, Bell, Shield } from 'lucide-react';

export function GeneralSection() {
  return (
    <div className="space-y-8">
      {/* Authentication & Password */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <KeyRound className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Authentication & Password</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Manage your login credentials and account security.
        </p>

        <h4 className="font-medium mb-2">Login Process</h4>
        <Checklist items={[
          'Go to the login page',
          'Enter your registered email address',
          'Enter your password',
          'Click "Sign In"',
        ]} />

        <h4 className="font-medium mb-2 mt-4">Changing Your Password</h4>
        <Checklist items={[
          'Click the key icon in the header',
          'Enter your current password',
          'Enter your new password (minimum 8 characters)',
          'Confirm your new password',
          'Click "Change Password"',
        ]} />

        <h4 className="font-medium mb-2 mt-4">Forgot Password?</h4>
        <Checklist items={[
          'Click "Forgot Password" on the login page',
          'Enter your registered email address',
          'Check your email for reset link',
          'Click the link and set a new password',
        ]} />

        <CalloutBox variant="warning" title="Password Security">
          Use a strong password with a mix of letters, numbers, and symbols. Never share your password with anyone.
        </CalloutBox>
      </section>

      {/* Notifications */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Notifications</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Stay informed with in-app and email notifications for important events.
        </p>

        <h4 className="font-medium mb-2">Notification Types</h4>
        <QuickTable
          headers={['Type', 'Description', 'Delivery']}
          rows={[
            ['New Updates', 'When new updates are published', 'In-app + Email'],
            ['Request Status', 'When your requests are approved/declined', 'In-app + Email'],
            ['QA Evaluations', 'When you receive a new QA evaluation', 'In-app'],
            ['Agent Reports', 'When a compliance incident is logged', 'In-app'],
            ['Revalida', 'When new assessments are available', 'In-app + Email'],
          ]}
        />

        <h4 className="font-medium mb-2 mt-4">Managing Notifications</h4>
        <Checklist items={[
          'Click the bell icon to see recent notifications',
          'Unread notifications show a red badge count',
          'Click a notification to view details',
          'Click "Mark all as read" to clear all',
        ]} />

        <CalloutBox variant="tip">
          Configure your email notification preferences in Notification Settings to control which emails you receive.
        </CalloutBox>
      </section>

      {/* Roles & Permissions */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Roles & Permissions</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Understanding user roles and what each role can access.
        </p>

        <h4 className="font-medium mb-2">Role Types</h4>
        <QuickTable
          headers={['Role', 'Description', 'Access Level']}
          rows={[
            ['User', 'Standard agent account', 'View updates, submit requests, view own profile'],
            ['Admin', 'Team lead / supervisor', 'Manage updates, approve requests, view all profiles'],
            ['HR', 'Human resources', 'View profiles, limited admin access'],
            ['Super Admin', 'System administrator', 'Full access to all features including user management'],
          ]}
        />

        <h4 className="font-medium mb-2 mt-4">Feature Access by Role</h4>
        <QuickTable
          headers={['Feature', 'User', 'Admin', 'HR', 'Super Admin']}
          rows={[
            ['View Updates', '✓', '✓', '✓', '✓'],
            ['Create Updates', '✗', '✓', '✗', '✓'],
            ['Submit Outage Requests', '✓', '✓', '✓', '✓'],
            ['Approve Outage Requests', '✗', '✓', '✗', '✓'],
            ['View Own Profile', '✓', '✓', '✓', '✓'],
            ['View All Profiles', '✗', '✓', '✓', '✓'],
            ['Edit All Profiles', '✗', '✓', 'View Only', '✓'],
            ['Manage Users', '✗', '✗', '✗', '✓'],
          ]}
        />

        <CalloutBox variant="info">
          Your role is assigned by your administrator. If you need different access, contact your team lead.
        </CalloutBox>
      </section>
    </div>
  );
}
