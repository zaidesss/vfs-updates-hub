import { GuideSection, CalloutBox, Checklist, QuickTable } from '../../GuideComponents';

export function UserManagementSection() {
  return (
    <GuideSection letter="F" color="bg-orange-500" title="Admin Panel - User Management">
      <p className="text-muted-foreground mb-4">
        The User Management section consolidates all user account management into a single, organized interface with three tabs: All Users, Quick Add, and Bulk Import.
      </p>

      <h3 className="font-semibold mb-2">All Users Tab</h3>
      <p className="text-sm text-muted-foreground mb-2">
        View and manage all user accounts in a comprehensive table with role badges and actions.
      </p>
      <QuickTable 
        headers={['Column', 'Description']}
        rows={[
          ['Email', 'User\'s email address.'],
          ['Role', 'Badge showing User/Admin/HR/Super Admin.'],
          ['Created', 'Account creation date.'],
          ['Role Dropdown', 'Change role (Super Admin only).'],
          ['Actions', 'Reset Password and Delete buttons.'],
        ]}
      />

      <h3 className="font-semibold mb-2 mt-4">Header Actions</h3>
      <Checklist items={[
        "Change Email - Update a user's email address.",
        "Create with Password - Create user with full setup and temporary password.",
      ]} />

      <h3 className="font-semibold mb-2 mt-4">Quick Add Tab</h3>
      <p className="text-sm text-muted-foreground mb-2">
        Add a single user by email. The user receives a welcome email to set up their account.
      </p>
      <QuickTable 
        headers={['Field', 'Required', 'Notes']}
        rows={[
          ['Email', 'Yes', 'User receives welcome email to set password.'],
        ]}
      />

      <h3 className="font-semibold mb-2 mt-4">Bulk Import Tab</h3>
      <p className="text-sm text-muted-foreground mb-2">
        Import multiple users at once with enhanced options for role selection and password configuration.
      </p>
      
      <h4 className="font-medium mb-2 mt-3">Step 1: Configure Import</h4>
      <QuickTable 
        headers={['Field', 'Required', 'Description']}
        rows={[
          ['Email Addresses', 'Yes', 'Paste emails one per line or comma-separated.'],
          ['Role for New Users', 'Yes', 'Select role: User, HR, Admin (Super Admin only can select all roles).'],
          ['Password Type', 'Yes', 'Single password for all OR auto-generate unique passwords.'],
          ['Single Password', 'If Single', 'Enter or generate a temporary password.'],
          ['Require Password Change', 'Optional', 'Force users to change password on first login (recommended).'],
        ]}
      />

      <h4 className="font-medium mb-2 mt-3">Step 2: Preview</h4>
      <Checklist items={[
        "Click 'Preview Import' to see parsed emails and passwords.",
        "Review the preview table showing each email and temporary password.",
        "Invalid emails are automatically filtered out.",
        "Adjust settings if needed before confirming.",
      ]} />

      <h4 className="font-medium mb-2 mt-3">Step 3: Confirm Import</h4>
      <Checklist items={[
        "Click 'Confirm Import' to create all users.",
        "Progress is displayed during import.",
        "Success count shown after completion.",
        "Users receive email notifications with their credentials.",
      ]} />

      <h3 className="font-semibold mb-2 mt-4">Create User with Password Dialog</h3>
      <p className="text-sm text-muted-foreground mb-2">
        For creating individual users with full setup including name and temporary password.
      </p>
      <QuickTable 
        headers={['Field', 'Required', 'Notes']}
        rows={[
          ['Email', 'Yes', 'User\'s email address.'],
          ['Full Name', 'Yes', 'User\'s display name.'],
          ['Password', 'Yes', 'Can use auto-generate button.'],
          ['Role', 'Yes', 'User, HR, Admin, or Super Admin (if you are Super Admin).'],
          ['Require Password Change', 'Optional', 'Force password change on first login.'],
        ]}
      />

      <h3 className="font-semibold mb-2 mt-4">User Actions</h3>
      <QuickTable 
        headers={['Action', 'What It Does']}
        rows={[
          ['Change Role', 'Updates user\'s role (Super Admin only). Cannot demote last Super Admin.'],
          ['Reset Password', 'Sends password reset email to user.'],
          ['Delete', 'Permanently removes the user account.'],
          ['Change Email', 'Updates user\'s email address (header button).'],
        ]}
      />

      <CalloutBox variant="tip">
        Use Bulk Import with "Auto-generate unique passwords" and "Require password change" enabled for the most secure onboarding of multiple users.
      </CalloutBox>

      <CalloutBox variant="warning" title="Deleting Users">
        Deleting a user is permanent. All their acknowledgements and questions will be removed. Consider deactivating instead if you may need the data later.
      </CalloutBox>
    </GuideSection>
  );
}
