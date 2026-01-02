import { GuideSection, CalloutBox, Checklist, QuickTable } from '../GuideComponents';

export function AuthenticationSection() {
  return (
    <>
      <GuideSection letter="A" color="bg-blue-500" title="Authentication - Login Page">
        <p className="text-muted-foreground mb-4">
          The login page is used to access the VFS Agent Portal. Only users who have been added to the system can log in.
        </p>

        <h3 className="font-semibold mb-2">Login Form Fields</h3>
        <QuickTable 
          headers={['Field', 'Required', 'Description']}
          rows={[
            ['Email', 'Yes', 'Must be in the allowlist (user_roles table). Only pre-approved emails can log in.'],
            ['Password', 'Yes', 'The password associated with the account.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Login Buttons and Links</h3>
        <QuickTable 
          headers={['Element', 'What It Does']}
          rows={[
            ['Sign In button', 'Attempts to log in with the entered credentials.'],
            ['Forgot password? link', 'Switches the form to password reset mode.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Error Messages</h3>
        <QuickTable 
          headers={['Message', 'What It Means']}
          rows={[
            ['Invalid email or password', 'The email or password entered is incorrect.'],
            ['Please verify your email', 'The email address has not been confirmed yet.'],
            ['Your account is not authorized', 'The email is not in the allowlist.'],
          ]}
        />

        <CalloutBox variant="info" title="First-Time Login">
          If the "must_change_password" flag is set on your account, you will be redirected to the Change Password page after logging in.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="B" color="bg-blue-400" title="Authentication - Password Reset">
        <p className="text-muted-foreground mb-4">
          If a password is forgotten, it can be reset through the password reset process.
        </p>

        <h3 className="font-semibold mb-2">Password Reset Process</h3>
        <Checklist items={[
          "Click 'Forgot password?' on the login page.",
          "Enter your email address in the form.",
          "Click 'Send Reset Link' button.",
          "Check your email inbox for the reset link.",
          "Click the link in the email to open the Reset Password page.",
          "Enter your new password and confirm it.",
          "Click 'Reset Password' to complete the process.",
        ]} />

        <CalloutBox variant="warning">
          Password reset links expire after a limited time. If the link expires, a new reset request must be submitted.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="C" color="bg-blue-300" title="Authentication - Change Password">
        <p className="text-muted-foreground mb-4">
          Passwords can be changed at any time through the Change Password page. This page is accessed by clicking the key icon in the header.
        </p>

        <h3 className="font-semibold mb-2">Change Password Form Fields</h3>
        <QuickTable 
          headers={['Field', 'Required', 'Validation Rules']}
          rows={[
            ['Current Password', 'Yes', 'Must match the existing account password.'],
            ['New Password', 'Yes', 'Must be at least 8 characters, contain 1 uppercase letter, 1 lowercase letter, and 1 number.'],
            ['Confirm Password', 'Yes', 'Must exactly match the new password.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Password Requirements</h3>
        <Checklist items={[
          "At least 8 characters in length",
          "At least 1 uppercase letter (A-Z)",
          "At least 1 lowercase letter (a-z)",
          "At least 1 number (0-9)",
        ]} />

        <CalloutBox variant="tip" title="Live Validation">
          As you type your new password, checkmarks appear next to each requirement as it is met. All checkmarks must be green before the password can be saved.
        </CalloutBox>

        <CalloutBox variant="info">
          After a successful password change, you will be redirected to the Updates page. The "must_change_password" flag (if set) will be cleared.
        </CalloutBox>
      </GuideSection>
    </>
  );
}
