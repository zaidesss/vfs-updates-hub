import { GuideSection, CalloutBox, QuickTable } from '../GuideComponents';

export function EmailNotificationsSection() {
  return (
    <GuideSection letter="AA" color="bg-pink-500" title="Email Notifications">
      <p className="text-muted-foreground mb-4">
        The system sends email notifications for important events. This section explains when emails are sent and to whom.
      </p>

      <h3 className="font-semibold mb-2">Email Triggers</h3>
      <QuickTable 
        headers={['Event', 'Recipients', 'Content']}
        rows={[
          ['New Update Published', 'All users', 'Update title, summary, and link.'],
          ['Acknowledgement Reminder', 'Users who have not acknowledged', 'Reminder with deadline date.'],
          ['Question Submitted', 'HR and Admins', 'Question details and link.'],
          ['Question Reply', 'Question asker', 'Reply content and link.'],
          ['Leave Request Submitted', 'Super Admins, Admins, and HR', 'Request details and link.'],
          ['Leave Request Decision', 'Submitter (TO), Super Admins/Admins/HR (CC)', 'Approved/Declined with remarks.'],
          ['Override Request', 'Super Admins, Admins, and HR', 'Conflict details and override reason.'],
          ['Article Request - Stage Change', 'Relevant approvers', 'Request details and action needed.'],
          ['Article Request Approved', 'Submitter and HR', 'Approval notes.'],
          ['Article Request Rejected', 'Submitter and HR', 'Rejection reason.'],
          ['Password Reset', 'User', 'Reset link.'],
          ['Welcome Email', 'New user', 'Login credentials.'],
        ]}
      />

      <h3 className="font-semibold mb-2 mt-4">Failed Email Tracking</h3>
      <p className="text-sm text-muted-foreground mb-2">
        If an email fails to send, it is logged in the system for troubleshooting.
      </p>
      <QuickTable 
        headers={['Information Logged', 'Purpose']}
        rows={[
          ['Recipient email', 'Who should have received the email.'],
          ['Subject line', 'What the email was about.'],
          ['Error message', 'Why the email failed.'],
          ['Timestamp', 'When the failure occurred.'],
          ['Function name', 'Which system sent the email.'],
        ]}
      />

      <CalloutBox variant="info" title="Daily Digest">
        A daily digest email is sent to HR at 9 AM EST summarizing any failed emails from the previous day.
      </CalloutBox>

      <CalloutBox variant="tip">
        If you are not receiving expected emails, check your spam folder first. If emails continue to fail, contact an administrator.
      </CalloutBox>
    </GuideSection>
  );
}
