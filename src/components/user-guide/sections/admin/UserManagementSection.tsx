import { GuideSection, CalloutBox, Checklist, QuickTable } from '../../GuideComponents';

export function UserManagementSection() {
  return (
    <>
      <GuideSection letter="F" color="bg-orange-500" title="Admin Panel - Admins Tab">
        <p className="text-muted-foreground mb-4">
          The Admins tab allows you to manage administrator access to the system.
        </p>

        <h3 className="font-semibold mb-2">Features</h3>
        <Checklist items={[
          "Add admin email input field.",
          "Add Admin button to grant admin access.",
          "List of current admins with remove button.",
          "Cannot remove yourself as admin.",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Adding an Admin</h3>
        <Checklist items={[
          "Enter the user's email address in the input field.",
          "Click 'Add Admin' button.",
          "User must already exist in the system.",
          "User's role is changed to Admin.",
        ]} />

        <CalloutBox variant="warning">
          Admin users have full access to the system including user management, update creation, and data viewing. Only grant admin access to trusted team members.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="G" color="bg-orange-400" title="Admin Panel - Users Tab">
        <p className="text-muted-foreground mb-4">
          The Users tab provides complete user account management capabilities.
        </p>

        <h3 className="font-semibold mb-2">Users Tab Features</h3>
        <Checklist items={[
          "Total users count displayed at the top.",
          "Add User section for single email addition.",
          "Create User with Password dialog for full setup.",
          "Bulk Import section for multiple emails.",
          "Change User Email button.",
          "Users table with all accounts.",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Add User (Simple)</h3>
        <QuickTable 
          headers={['Field', 'Required', 'Notes']}
          rows={[
            ['Email', 'Yes', 'User receives welcome email.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Create User with Password (Full Setup)</h3>
        <QuickTable 
          headers={['Field', 'Required', 'Notes']}
          rows={[
            ['Email', 'Yes', 'User\'s email address.'],
            ['Full Name', 'Yes', 'User\'s display name.'],
            ['Password', 'Yes', 'Can use auto-generate button.'],
            ['Role', 'Yes', 'User, Admin, or HR.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Bulk Import</h3>
        <Checklist items={[
          "Paste multiple email addresses (one per line).",
          "Click 'Import' to add all users at once.",
          "Invalid emails are skipped.",
          "Success count displayed after import.",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Users Table Columns</h3>
        <QuickTable 
          headers={['Column', 'Description']}
          rows={[
            ['Email', 'User\'s email address.'],
            ['Role', 'Badge showing User/Admin/HR.'],
            ['Created', 'Account creation date.'],
            ['Actions', 'Reset Password and Delete buttons.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">User Actions</h3>
        <QuickTable 
          headers={['Action', 'What It Does']}
          rows={[
            ['Reset Password', 'Sends password reset email to user.'],
            ['Delete', 'Permanently removes the user account.'],
            ['Change Email', 'Updates user\'s email address (separate dialog).'],
          ]}
        />

        <CalloutBox variant="warning" title="Deleting Users">
          Deleting a user is permanent. All their acknowledgements and questions will be removed. Consider deactivating instead if you may need the data later.
        </CalloutBox>
      </GuideSection>
    </>
  );
}
