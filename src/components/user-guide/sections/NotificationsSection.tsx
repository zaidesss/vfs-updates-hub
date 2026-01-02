import { GuideSection, CalloutBox, Checklist, QuickTable } from '../GuideComponents';

export function NotificationsSection() {
  return (
    <>
      <GuideSection letter="W" color="bg-sky-500" title="Notifications - Bell & In-App">
        <p className="text-muted-foreground mb-4">
          The notification bell in the header shows in-app notifications about important events.
        </p>

        <h3 className="font-semibold mb-2">Notification Bell Features</h3>
        <Checklist items={[
          "Located in the top-right header area.",
          "Red badge shows unread notification count.",
          "Click to open the notification dropdown.",
          "Mark all as read button clears all unread.",
          "Settings link opens notification preferences.",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Notification Types</h3>
        <QuickTable 
          headers={['Type', 'Trigger', 'Recipients']}
          rows={[
            ['New Update', 'An update is published.', 'All users.'],
            ['Update Acknowledged', 'A user acknowledges an update.', 'Admins (if enabled).'],
            ['Question Submitted', 'A question is asked.', 'HR and Admins.'],
            ['Question Reply', 'Admin replies to a question.', 'Question asker.'],
            ['Question Status Changed', 'Question status is updated.', 'Question asker.'],
            ['Leave Request Submitted', 'A leave request is submitted.', 'HR and Admins.'],
            ['Leave Decision', 'Request is approved/declined.', 'Submitter.'],
            ['Article Request Pending', 'A new request is submitted.', 'Approvers.'],
            ['Article Request Approved', 'Request is approved.', 'Submitter and HR.'],
            ['Article Request Rejected', 'Request is rejected.', 'Submitter and HR.'],
            ['System', 'System messages.', 'Varies.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Notification Item Display</h3>
        <Checklist items={[
          "Icon varies by notification type.",
          "Title shows the main message.",
          "Message provides additional details.",
          "Relative time (e.g., '2 hours ago').",
          "Read/Unread indicator (dot).",
          "Click to navigate to related page.",
        ]} />
      </GuideSection>

      <GuideSection letter="X" color="bg-sky-400" title="Notifications - Settings">
        <p className="text-muted-foreground mb-4">
          Notification preferences can be customized through the Notification Settings page.
        </p>

        <h3 className="font-semibold mb-2">Notification Methods</h3>
        <QuickTable 
          headers={['Method', 'Description', 'Toggle']}
          rows={[
            ['Email Notifications', 'Receive notifications via email.', 'On/Off'],
            ['In-App Notifications', 'Receive notifications in the portal.', 'On/Off'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Notification Type Toggles</h3>
        <QuickTable 
          headers={['Type', 'What It Controls', 'Default']}
          rows={[
            ['Updates', 'New updates and acknowledgement reminders.', 'On'],
            ['Leave Requests', 'Request status changes (approval/decline).', 'On'],
            ['Questions', 'Question replies and status changes.', 'On'],
            ['Article Requests', 'Request approval updates.', 'On'],
          ]}
        />

        <CalloutBox variant="warning" title="Minimum Requirement">
          At least one notification method (Email OR In-App) must be enabled for each notification type. You cannot disable both.
        </CalloutBox>

        <CalloutBox variant="info">
          Changes are saved by clicking the "Save Settings" button. A toast confirmation appears on successful save.
        </CalloutBox>
      </GuideSection>
    </>
  );
}
