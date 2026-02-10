import { GuideSection, CalloutBox, QuickTable } from '../../GuideComponents';
import { GuideImagePlaceholder } from '../../GuideImagePlaceholder';

export function UpdatedRolesSection() {
  return (
    <>
      {/* PART 1: ROLE DEFINITIONS */}
      <GuideSection letter="1" color="bg-primary" title="User Roles — Overview">
        <p className="text-muted-foreground mb-4">
          The VFS Agent Portal uses <strong>four distinct roles</strong> to control access. Your role is assigned by a Super Admin and determines every menu, button, and action you can see or perform.
        </p>

        <GuideImagePlaceholder description="Screenshot: Role badge displayed next to user email in the top navigation header" />

        <CalloutBox variant="info" title="How to Check Your Role">
          Your role badge (e.g., "User", "HR", "Admin", "Super Admin") is visible next to your email address in the top-right corner of the navigation bar. If you believe your role is incorrect, contact a Super Admin.
        </CalloutBox>
      </GuideSection>

      {/* PART 2: DETAILED ROLE BREAKDOWN */}
      <GuideSection letter="2" color="bg-primary" title="Role Definitions — Step by Step">
        <h3 className="font-semibold text-base mb-3">Role 1: User (Agent)</h3>
        <p className="text-muted-foreground mb-2">
          The default role for all team members. Users can consume content but cannot create, edit, or manage anything beyond their own profile and requests.
        </p>
        <QuickTable
          headers={['Capability', 'Details']}
          rows={[
            ['View Updates', 'Can see all published updates in the Updates page.'],
            ['Acknowledge Updates', 'Must click "Acknowledge" on each update. Pending count shows in the notification bell.'],
            ['Ask Questions', 'Can submit questions on any update. Can only view/reply to their OWN questions.'],
            ['Submit Leave Requests', 'Can file leave/outage requests via the Leave Request form.'],
            ['View Own Profile', 'Can see their Bio page. Most fields are locked (read-only).'],
            ['Request Profile Changes', 'Can submit a Profile Change Request for locked fields. Requires admin approval.'],
            ['View Dashboard', 'Can see their own Dashboard with login status, events, and weekly summary.'],
            ['View Team Status', 'Can see the real-time Team Status Board showing who is online.'],
            ['View Ticket Logs', 'Can see their own ticket counts and gap analysis.'],
            ['View Scorecard', 'Can view their own weekly scorecard.'],
            ['Take Revalida Tests', 'Can participate in Revalida batches and view their results.'],
            ['View Agent Reports', 'Can see their own automated incident reports.'],
          ]}
        />

        <CalloutBox variant="warning" title="Restrictions for Users">
          Users <strong>cannot</strong>: create or edit updates, view other agents' questions, approve leave requests, access the Admin Panel, manage profiles, or change any user's role. They also cannot delete any content.
        </CalloutBox>

        <GuideImagePlaceholder description="Screenshot: User role view — sidebar menu showing limited menu items" />

        <h3 className="font-semibold text-base mb-3 mt-6">Role 2: HR</h3>
        <p className="text-muted-foreground mb-2">
          Human Resources team members. They have all User capabilities <strong>plus</strong> management features for leave, questions, and content moderation.
        </p>
        <QuickTable
          headers={['Additional Capability', 'Details']}
          rows={[
            ['View All Questions', 'Can see questions from ALL agents, not just their own.'],
            ['Reply to Any Question', 'Can respond to any agent\'s question thread.'],
            ['Close Question Threads', 'Can mark any question as resolved/closed.'],
            ['View All Leave Requests', 'Can see every agent\'s leave/outage requests.'],
            ['Approve/Decline Leave', 'Can approve or decline pending leave requests.'],
            ['Delete Leave Requests', 'Can remove leave requests from the system.'],
            ['Delete Updates', 'Can delete published updates (cannot create or edit).'],
            ['Export Acknowledgements', 'Can export acknowledgement data to CSV.'],
            ['Access Admin Panel', 'Can see the Admin Panel with limited management tools.'],
            ['Access Dashboard (Admin)', 'Can view other agents\' dashboards via Team Status Board.'],
            ['Pre-Approve Article Requests', 'Can approve the first stage of article requests.'],
            ['View Outage Stats', 'Can access outage statistics and repeat offender reports.'],
            ['View All Agent Reports', 'Can see all agents\' incident reports and escalate them.'],
          ]}
        />

        <CalloutBox variant="info" title="HR Limitations">
          HR <strong>cannot</strong>: create or edit updates, add/delete users, reset passwords, change user emails, change user roles, or give final approval on article requests.
        </CalloutBox>

        <h3 className="font-semibold text-base mb-3 mt-6">Role 3: Admin</h3>
        <p className="text-muted-foreground mb-2">
          Full system administrators. They have all HR capabilities <strong>plus</strong> the ability to create content, manage users, and configure system settings.
        </p>
        <QuickTable
          headers={['Additional Capability', 'Details']}
          rows={[
            ['Create Updates', 'Can create new updates with markdown content, categories, and file attachments.'],
            ['Edit Updates', 'Can modify any existing update\'s content, category, or attachments.'],
            ['Add Users', 'Can create new user accounts with email and password.'],
            ['Delete Users', 'Can soft-delete user accounts (can be restored later).'],
            ['Reset User Passwords', 'Can trigger a password reset for any user.'],
            ['Change User Emails', 'Can update a user\'s login email address.'],
            ['Edit All Profiles', 'Can edit any agent\'s Bio, including work configuration fields.'],
            ['Manage Master Directory', 'Can view and manage the Master Directory (read-only sync from Bios).'],
            ['Final Approval on Requests', 'Designated admins can give final approval on article requests.'],
            ['Bulk User Import', 'Can import multiple users via CSV upload.'],
            ['Send Announcements', 'Can send email announcements to all users or specific roles.'],
            ['Manage Changelog', 'Can create and manage portal changelog entries.'],
            ['Create QA Evaluations', 'Can create and submit QA evaluations for agents.'],
            ['Manage Revalida Batches', 'Can create, edit, and manage Revalida test batches.'],
          ]}
        />

        <CalloutBox variant="warning" title="Admin Limitation">
          Admins <strong>cannot</strong> change user roles. Only Super Admins can promote or demote users between roles (User ↔ HR ↔ Admin ↔ Super Admin).
        </CalloutBox>

        <GuideImagePlaceholder description="Screenshot: Admin role view — sidebar showing full menu including Admin Panel" />

        <h3 className="font-semibold text-base mb-3 mt-6">Role 4: Super Admin</h3>
        <p className="text-muted-foreground mb-2">
          The highest-level administrator. Has <strong>all Admin and HR capabilities</strong> plus exclusive role management powers.
        </p>
        <QuickTable
          headers={['Exclusive Capability', 'Details']}
          rows={[
            ['Change User Roles', 'Can promote or demote any user between User, HR, Admin, and Super Admin.'],
            ['Protected Status', 'Cannot be demoted if they are the last remaining Super Admin.'],
            ['Compensation Access', 'Can view and edit the Compensation section of agent profiles (hourly rate, rate history, payment frequency).'],
            ['Full God-Mode Access', 'Has unrestricted SELECT, INSERT, UPDATE, DELETE on all tables.'],
          ]}
        />

        <CalloutBox variant="tip" title="Super Admin Safety Rule">
          The system prevents the last Super Admin from being demoted. There must always be at least one Super Admin in the portal. This is enforced at the database level.
        </CalloutBox>
      </GuideSection>

      {/* PART 3: COMPLETE FEATURE ACCESS MATRIX */}
      <GuideSection letter="3" color="bg-primary" title="Feature Access Matrix — Complete Reference">
        <p className="text-muted-foreground mb-4">
          Use this matrix to quickly check which role can perform which action. <strong>✓</strong> = allowed, <strong>✗</strong> = not allowed.
        </p>

        <h3 className="font-semibold mb-2">Updates & Knowledge Base</h3>
        <QuickTable
          headers={['Feature', 'User', 'HR', 'Admin', 'Super Admin']}
          rows={[
            ['View Updates', '✓', '✓', '✓', '✓'],
            ['Acknowledge Updates', '✓', '✓', '✓', '✓'],
            ['Ask Questions on Updates', '✓', '✓', '✓', '✓'],
            ['View Knowledge Base Articles', '✓', '✓', '✓', '✓'],
            ['View Own Activity Log', '✓', '✓', '✓', '✓'],
            ['Create New Updates', '✗', '✗', '✓', '✓'],
            ['Edit Existing Updates', '✗', '✗', '✓', '✓'],
            ['Delete Updates', '✗', '✓', '✓', '✓'],
            ['Export Acknowledgement Reports', '✗', '✓', '✓', '✓'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Questions Management</h3>
        <QuickTable
          headers={['Feature', 'User', 'HR', 'Admin', 'Super Admin']}
          rows={[
            ['View Own Questions', '✓', '✓', '✓', '✓'],
            ['Reply to Own Question Threads', '✓', '✓', '✓', '✓'],
            ['View All Agents\' Questions', '✗', '✓', '✓', '✓'],
            ['Reply to Any Question', '✗', '✓', '✓', '✓'],
            ['Close/Resolve Question Threads', '✗', '✓', '✓', '✓'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Leave & Outage Requests</h3>
        <QuickTable
          headers={['Feature', 'User', 'HR', 'Admin', 'Super Admin']}
          rows={[
            ['Submit Leave/Outage Requests', '✓', '✓', '✓', '✓'],
            ['View Own Requests', '✓', '✓', '✓', '✓'],
            ['Cancel Own Pending Requests', '✓', '✓', '✓', '✓'],
            ['View Outage Calendar', '✓', '✓', '✓', '✓'],
            ['View Personal Outage Report', '✓', '✓', '✓', '✓'],
            ['View All Agents\' Requests', '✗', '✓', '✓', '✓'],
            ['Approve or Decline Requests', '✗', '✓', '✓', '✓'],
            ['Delete Requests', '✗', '✓', '✓', '✓'],
            ['View Outage Statistics Dashboard', '✗', '✓', '✓', '✓'],
            ['View Repeat Offenders Report', '✗', '✓', '✓', '✓'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Article Requests</h3>
        <QuickTable
          headers={['Feature', 'User', 'HR', 'Admin', 'Super Admin']}
          rows={[
            ['Submit Article Requests', '✓', '✓', '✓', '✓'],
            ['View Own Requests', '✓', '✓', '✓', '✓'],
            ['View All Requests', '✗', '✓', '✓', '✓'],
            ['Pre-Approve Requests (Stage 1)', '✗', '✓', '✓', '✓'],
            ['Final Approval (Stage 2)', '✗', '✗', '✓ (designated)', '✓'],
            ['Delete Requests', '✗', '✓', '✓', '✓'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Profile & User Management</h3>
        <QuickTable
          headers={['Feature', 'User', 'HR', 'Admin', 'Super Admin']}
          rows={[
            ['View Own Profile (Bio)', '✓', '✓', '✓', '✓'],
            ['Edit Own Editable Fields', '✓', '✓', '✓', '✓'],
            ['Submit Profile Change Requests', '✓', '✓', '✓', '✓'],
            ['View All Profiles', '✗', '✗', '✓', '✓'],
            ['Edit All Profiles (Work Config)', '✗', '✗', '✓', '✓'],
            ['Edit Compensation Section', '✗', '✗', '✗', '✓'],
            ['Add New Users', '✗', '✗', '✓', '✓'],
            ['Delete Users (Soft Delete)', '✗', '✗', '✓', '✓'],
            ['Restore Deleted Users', '✗', '✗', '✓', '✓'],
            ['Reset User Passwords', '✗', '✗', '✓', '✓'],
            ['Change User Email Addresses', '✗', '✗', '✓', '✓'],
            ['Change User Roles', '✗', '✗', '✗', '✓'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Team Performance Tools</h3>
        <QuickTable
          headers={['Feature', 'User', 'HR', 'Admin', 'Super Admin']}
          rows={[
            ['View Own Dashboard', '✓', '✓', '✓', '✓'],
            ['View Team Status Board', '✓', '✓', '✓', '✓'],
            ['View Own Ticket Logs', '✓', '✓', '✓', '✓'],
            ['View All Ticket Logs', '✗', '✓', '✓', '✓'],
            ['View Own Scorecard', '✓', '✓', '✓', '✓'],
            ['View All Scorecards', '✗', '✓', '✓', '✓'],
            ['View Own Agent Reports', '✓', '✓', '✓', '✓'],
            ['View All Agent Reports', '✗', '✓', '✓', '✓'],
            ['Escalate Agent Reports', '✗', '✓', '✓', '✓'],
            ['Take Revalida Tests', '✓', '✓', '✓', '✓'],
            ['Manage Revalida Batches', '✗', '✗', '✓', '✓'],
            ['Create QA Evaluations', '✗', '✗', '✓', '✓'],
            ['View Own QA Evaluations', '✓', '✓', '✓', '✓'],
            ['View All QA Evaluations', '✗', '✓', '✓', '✓'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Admin Panel & System Tools</h3>
        <QuickTable
          headers={['Feature', 'User', 'HR', 'Admin', 'Super Admin']}
          rows={[
            ['Access Admin Panel', '✗', '✓', '✓', '✓'],
            ['Bulk User Import (CSV)', '✗', '✗', '✓', '✓'],
            ['Send Email Announcements', '✗', '✗', '✓', '✓'],
            ['Manage Portal Changelog', '✗', '✗', '✓', '✓'],
            ['Access Improvements Tracker', '✗', '✗', '✓', '✓'],
          ]}
        />

        <GuideImagePlaceholder description="Screenshot: Admin Panel showing the management tools available to Admin/Super Admin roles" />
      </GuideSection>

      {/* PART 4: ESCALATION RULES */}
      <GuideSection letter="4" color="bg-primary" title="Role Escalation Rules & Limitations">
        <p className="text-muted-foreground mb-4">
          Understanding who can escalate and the safeguards built into the system.
        </p>

        <h3 className="font-semibold mb-2">Role Change Rules</h3>
        <QuickTable
          headers={['Rule', 'Details']}
          rows={[
            ['Who can change roles?', 'Only Super Admins can change any user\'s role.'],
            ['Available role transitions', 'User ↔ HR ↔ Admin ↔ Super Admin (any direction).'],
            ['Last Super Admin protection', 'The system blocks demotion if there is only 1 Super Admin remaining.'],
            ['Self-demotion', 'A Super Admin CAN demote themselves — but only if another Super Admin exists.'],
            ['Role change visibility', 'Role changes are logged. The new role takes effect immediately upon save.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Escalation Paths</h3>
        <QuickTable
          headers={['Scenario', 'Who to Contact', 'Method']}
          rows={[
            ['Need role change', 'Super Admin', 'Verbally request or message a Super Admin.'],
            ['Profile field incorrect', 'Admin or Super Admin', 'Submit a Profile Change Request from your Bio page.'],
            ['Leave request stuck', 'HR, Admin, or Super Admin', 'Contact via team chat — they can approve/decline.'],
            ['Cannot access a feature', 'Check role badge first', 'If role is correct but feature missing, contact a Super Admin.'],
            ['System bug or error', 'Admin or Super Admin', 'Report via the Improvements Tracker or team chat.'],
          ]}
        />

        <CalloutBox variant="success" title="Quick Role Reference">
          <strong>User</strong> = View & acknowledge only &nbsp;|&nbsp; <strong>HR</strong> = User + manage leave & questions &nbsp;|&nbsp; <strong>Admin</strong> = HR + create content & manage users &nbsp;|&nbsp; <strong>Super Admin</strong> = Admin + change roles & compensation
        </CalloutBox>
      </GuideSection>
    </>
  );
}
