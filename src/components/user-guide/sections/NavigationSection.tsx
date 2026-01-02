import { GuideSection, QuickTable, CalloutBox } from '../GuideComponents';

export function NavigationSection() {
  return (
    <>
      <GuideSection letter="D" color="bg-teal-500" title="Navigation - Main Menus">
        <p className="text-muted-foreground mb-4">
          The main navigation is located at the top of the page. Each menu contains related pages and features.
        </p>

        <h3 className="font-semibold mb-2">Updates Menu</h3>
        <QuickTable 
          headers={['Menu Item', 'Description', 'Who Can Access']}
          rows={[
            ['Updates', 'Main page showing all published updates. View, acknowledge, and ask questions about updates.', 'All users'],
            ['My Activity', 'Personal progress tracker showing your acknowledgement history and completion rate.', 'All users'],
            ['Knowledge Base', 'Searchable library of all published updates organized by category.', 'All users'],
            ['User Guide', 'This comprehensive guide explaining all portal features.', 'All users'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Outages Menu</h3>
        <QuickTable 
          headers={['Menu Item', 'Description', 'Who Can Access']}
          rows={[
            ['Leave Request', 'Submit and track outage/leave requests. View your request history.', 'All users'],
            ['Calendar', 'Visual calendar showing all pending and approved outages for the team.', 'All users'],
            ['Outage Report', 'Personal outage statistics showing your outage history by reason.', 'All users'],
            ['Outage Stats', 'Detailed analytics, trends, and repeat offender tracking for all agents.', 'Admin/HR only'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">People Menu</h3>
        <QuickTable 
          headers={['Menu Item', 'Description', 'Who Can Access']}
          rows={[
            ['My Profile', 'View and edit your personal information, emergency contacts, and work details.', 'All users'],
            ['Manage Profiles', 'View and edit all agent profiles in the system.', 'Admin only'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Admin Menu</h3>
        <QuickTable 
          headers={['Menu Item', 'Description', 'Who Can Access']}
          rows={[
            ['Admin Panel', 'Create/edit updates, manage users, view and respond to questions.', 'Admin/HR'],
            ['Manage Requests', 'Review and process article/update requests from users.', 'Admin/HR'],
            ['Dashboard', 'Team acknowledgement overview showing progress across all updates.', 'Admin/HR'],
          ]}
        />

        <CalloutBox variant="info" title="Menu Visibility">
          Menu items are shown based on your role. Regular users see Updates, Outages, and People menus. Admin and HR users also see the Admin menu.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="E" color="bg-teal-400" title="Navigation - Header Icons">
        <p className="text-muted-foreground mb-4">
          The header contains quick-access icons and user information.
        </p>

        <h3 className="font-semibold mb-2">Header Elements</h3>
        <QuickTable 
          headers={['Icon/Element', 'Location', 'What It Does']}
          rows={[
            ['Help Icon (?)', 'Header area', 'Quick access to this User Guide.'],
            ['Notification Bell', 'Top-right', 'Shows in-app notifications. Red badge indicates unread count.'],
            ['User Email', 'Top-right', 'Displays your logged-in email address.'],
            ['Role Badge', 'Next to email', 'Shows your role (User, Admin, or HR).'],
            ['Key Icon', 'Top-right', 'Opens the Change Password page.'],
            ['Logout', 'Top-right', 'Signs you out of the portal.'],
          ]}
        />

        <CalloutBox variant="tip">
          Click the notification bell to see recent notifications. Click "Mark all as read" to clear all unread notifications at once.
        </CalloutBox>
      </GuideSection>
    </>
  );
}
