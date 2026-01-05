import { GuideSection, CalloutBox, QuickTable } from '../GuideComponents';

export function RolesSection() {
  return (
    <>
      <GuideSection letter="Y" color="bg-slate-500" title="Roles and Permissions - Definitions">
        <p className="text-muted-foreground mb-4">
          The VFS Agent Portal has four user roles, each with different access levels.
        </p>

        <h3 className="font-semibold mb-2">Role Definitions</h3>
        <QuickTable 
          headers={['Role', 'Description', 'Primary Responsibilities']}
          rows={[
            ['User (Agent)', 'Regular team members who view and acknowledge updates.', 'View updates, acknowledge, ask questions, submit leave requests.'],
            ['HR', 'Human Resources team with additional management capabilities.', 'All User permissions plus: approve leave, respond to questions, delete content.'],
            ['Admin', 'Administrators with full system access.', 'All HR permissions plus: create updates, manage users, system configuration.'],
            ['Super Admin', 'Highest level administrator with protected status.', 'All Admin + HR permissions. Can change user roles. Cannot be demoted when sole super admin.'],
          ]}
        />
      </GuideSection>

      <GuideSection letter="Z" color="bg-slate-400" title="Roles and Permissions - Feature Access Matrix">
        <p className="text-muted-foreground mb-4">
          The following table shows which features are available to each role.
        </p>

        <h3 className="font-semibold mb-2">Updates & Knowledge Base</h3>
        <QuickTable 
          headers={['Feature', 'User', 'HR', 'Admin', 'Super Admin']}
          rows={[
            ['View Updates', '✓', '✓', '✓', '✓'],
            ['Acknowledge Updates', '✓', '✓', '✓', '✓'],
            ['Ask Questions on Updates', '✓', '✓', '✓', '✓'],
            ['View Knowledge Base', '✓', '✓', '✓', '✓'],
            ['View My Activity', '✓', '✓', '✓', '✓'],
            ['Create Updates', '✗', '✗', '✓', '✓'],
            ['Edit Updates', '✗', '✗', '✓', '✓'],
            ['Delete Updates', '✗', '✓', '✓', '✓'],
            ['Export Acknowledgements', '✗', '✓', '✓', '✓'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Questions</h3>
        <QuickTable 
          headers={['Feature', 'User', 'HR', 'Admin', 'Super Admin']}
          rows={[
            ['View Own Questions', '✓', '✓', '✓', '✓'],
            ['Reply to Own Questions', '✓', '✓', '✓', '✓'],
            ['View All Questions', '✗', '✓', '✓', '✓'],
            ['Reply to Any Question', '✗', '✓', '✓', '✓'],
            ['Close Question Threads', '✗', '✓', '✓', '✓'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Leave/Outage Requests</h3>
        <QuickTable 
          headers={['Feature', 'User', 'HR', 'Admin', 'Super Admin']}
          rows={[
            ['Submit Leave Requests', '✓', '✓', '✓', '✓'],
            ['View Own Requests', '✓', '✓', '✓', '✓'],
            ['Cancel Own Pending Requests', '✓', '✓', '✓', '✓'],
            ['View Outage Calendar', '✓', '✓', '✓', '✓'],
            ['View Personal Outage Report', '✓', '✓', '✓', '✓'],
            ['View All Requests', '✗', '✓', '✓', '✓'],
            ['Approve/Decline Requests', '✗', '✓', '✓', '✓'],
            ['Delete Requests', '✗', '✓', '✓', '✓'],
            ['View Outage Stats', '✗', '✓', '✓', '✓'],
            ['View Repeat Offenders', '✗', '✓', '✓', '✓'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Article Requests</h3>
        <QuickTable 
          headers={['Feature', 'User', 'HR', 'Admin', 'Super Admin']}
          rows={[
            ['Submit Article Requests', '✓', '✓', '✓', '✓'],
            ['View Own Requests', '✓', '✓', '✓', '✓'],
            ['View All Requests', '✗', '✓', '✓', '✓'],
            ['Approve Requests (Pre-Approver)', '✗', '✓', '✓', '✓'],
            ['Final Approval', '✗', '✗', '✓ (specific admin)', '✓'],
            ['Delete Requests', '✗', '✓', '✓', '✓'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Profile & User Management</h3>
        <QuickTable 
          headers={['Feature', 'User', 'HR', 'Admin', 'Super Admin']}
          rows={[
            ['View/Edit Own Profile', '✓', '✓', '✓', '✓'],
            ['View All Profiles', '✗', '✗', '✓', '✓'],
            ['Edit All Profiles', '✗', '✗', '✓', '✓'],
            ['Add Users', '✗', '✗', '✓', '✓'],
            ['Delete Users', '✗', '✗', '✓', '✓'],
            ['Reset User Passwords', '✗', '✗', '✓', '✓'],
            ['Change User Emails', '✗', '✗', '✓', '✓'],
            ['Manage Admins', '✗', '✗', '✓', '✓'],
            ['Change User Roles', '✗', '✗', '✗', '✓'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Admin Tools</h3>
        <QuickTable 
          headers={['Feature', 'User', 'HR', 'Admin', 'Super Admin']}
          rows={[
            ['Access Admin Panel', '✗', '✓', '✓', '✓'],
            ['Access Dashboard', '✗', '✓', '✓', '✓'],
            ['Bulk User Import', '✗', '✗', '✓', '✓'],
          ]}
        />

        <CalloutBox variant="info">
          Role badges are displayed next to your email in the header. Your role determines which menu items and features you can see and use.
        </CalloutBox>
      </GuideSection>
    </>
  );
}
