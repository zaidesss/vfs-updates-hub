import { TourStep } from '@/components/DemoTour';

// User Tour Steps - For all standard users
export const USER_TOUR_STEPS: TourStep[] = [
  {
    title: '🎉 Welcome to Agent Portal!',
    content: `Welcome! This interactive guide will walk you through all the features available to you.

You can navigate using:
• Arrow keys (← →) or Enter
• The Next/Back buttons below

Let's get started!`,
    position: 'center',
  },
  {
    title: '📋 Updates Menu',
    content: `The Updates menu is your primary hub for staying informed.

From here you can access:
• Updates - View and acknowledge important updates
• Knowledge Base - Search articles by category
• Update Requests - Submit requests for new articles
• Help Center - Guides, quick reference, and what's new`,
    target: '[data-tour="updates-menu"]',
    position: 'bottom',
  },
  {
    title: '📄 Viewing Updates',
    content: `On the Updates page, you'll see cards for each published update.

Each card shows:
• Title and category
• Posted date and author
• Summary preview
• Your acknowledgement status

Click any card to read the full update.`,
    position: 'center',
  },
  {
    title: '✅ Acknowledging Updates',
    content: `After reading an update, click the "Acknowledge" button to confirm you've read it.

Important notes:
• Some updates have deadlines - acknowledge before they expire!
• Acknowledgements are tracked for compliance
• You cannot undo an acknowledgement
• Green checkmark = acknowledged`,
    position: 'center',
  },
  {
    title: '❓ Asking Questions',
    content: `Have a question about an update? Ask directly!

How to ask:
1. Open the update
2. Scroll to the Questions section
3. Click "Ask a Question"
4. Type your question and submit

You'll receive a notification when answered.`,
    position: 'center',
  },
  {
    title: '⏰ Outages Menu',
    content: `The Outages menu helps you manage your time off.

You can:
• Submit outage/leave requests
• View the team calendar
• Check your personal outage report

Always check the calendar before submitting requests!`,
    target: '[data-tour="outages-menu"]',
    position: 'bottom',
  },
  {
    title: '📅 Outage Calendar',
    content: `The calendar shows all team outages visually.

Color coding:
• 🟡 Yellow = Pending (awaiting approval)
• 🟢 Green = Approved

Use the calendar to:
• Plan around team absences
• Check for conflicts before requesting time off`,
    position: 'center',
  },
  {
    title: '📝 Submitting Leave Requests',
    content: `To submit a leave request:

1. Go to Outage Requests
2. Click "New Request"
3. Fill in start/end dates and times
4. Select your outage reason
5. Add any remarks
6. Submit!

You'll be notified when your request is reviewed.`,
    position: 'center',
  },
  {
    title: '👤 Your Profile',
    content: `Access your profile from the People menu → My Bio.

You can view and update:
• Contact information & emergency contacts
• Work details (position, team lead, clients)
• Internet connectivity info
• Upwork & freelance details

Some fields require admin approval to change.`,
    target: '[data-tour="people-menu"]',
    position: 'bottom',
  },
  {
    title: '📝 Profile Change Requests',
    content: `Some profile fields are protected and require approval:
• Hourly rate & rate history
• Start date & position
• Banking information

To request a change:
1. Click "Request Change" next to the field
2. Enter the new value and reason
3. Submit - Super Admins will review

You'll be notified when approved/rejected.`,
    position: 'center',
  },
  {
    title: '🔔 Notifications',
    content: `The notification bell keeps you informed!

Click it to see:
• New update alerts
• Question replies
• Leave request decisions
• Profile change request updates

Red badge = unread notifications
Click "Mark all as read" to clear.`,
    target: '[data-tour="notification-bell"]',
    position: 'bottom',
  },
  {
    title: '🔑 Changing Your Password',
    content: `To change your password:

1. Click the key icon (🔑) in the header
2. Enter your current password
3. Enter and confirm new password
4. Click "Change Password"

Password requirements:
• 8+ characters
• Uppercase, lowercase, and number`,
    position: 'center',
  },
  {
    title: '🆕 Help Center',
    content: `Your one-stop destination for all portal help!

Go to Help Center to find:
• What's New - Latest features and changes
• User Guide - Complete documentation
• Admin Guide - Admin-specific docs
• Quick Sheets - Downloadable role references

New items are highlighted with a badge!`,
    position: 'center',
  },
  {
    title: '❓ Need Help?',
    content: `You can always access this guide again!

Options:
• Click the ❓ icon in the header
• Visit the Help Center page
• Download quick sheets for your role
• Check "What's New" for updates

The ❓ button reopens this interactive tour anytime.`,
    target: '[data-tour="help-button"]',
    position: 'bottom',
  },
  {
    title: '🎓 You\'re All Set!',
    content: `Congratulations! You've completed the portal tour.

Quick reminders:
✓ Check for updates daily
✓ Acknowledge updates promptly
✓ Use the calendar before requesting time off
✓ Ask questions when unclear
✓ Visit Help Center for guides and what's new

Click "Finish" to start using the portal!`,
    position: 'center',
  },
];

// HR Tour Steps - Additional steps for HR role
export const HR_TOUR_STEPS: TourStep[] = [
  {
    title: '🎉 Welcome HR Team Member!',
    content: `Welcome! As an HR team member, you have extended access to manage leave requests and view agent profiles.

This guide covers both standard features and your HR-specific capabilities.

Let's explore your enhanced access!`,
    position: 'center',
  },
  ...USER_TOUR_STEPS.slice(1, 6), // Include common steps
  {
    title: '📋 Managing Leave Requests (HR)',
    content: `As HR, you can approve or reject ALL leave requests!

Your workflow:
1. Go to Outage Requests
2. View all pending requests
3. Check calendar for conflicts
4. Click Approve or Reject
5. Add remarks if needed

Always provide clear reasons for rejections.`,
    position: 'center',
  },
  {
    title: '📊 Outage Statistics (HR)',
    content: `Access detailed outage statistics for all agents.

You can view:
• Total outage hours
• Breakdown by reason
• Agent comparisons
• Trends over time

Use this data for planning and HR decisions.`,
    position: 'center',
  },
  {
    title: '👥 Managing Agent Profiles (HR)',
    content: `View and edit all agent profiles!

Go to People → All Bios to:
• Search for agents
• View complete profile details
• Update contact information
• Manage emergency contacts
• View connectivity & freelance info

Keep profiles accurate and up-to-date.`,
    position: 'center',
  },
  {
    title: '📝 Profile Change Requests (HR)',
    content: `You can submit change requests on behalf of agents!

Protected fields (rate, position, etc.) require Super Admin approval. When editing agent profiles:
1. Click "Request Change" for protected fields
2. Enter the new value and reason
3. Super Admin reviews and approves/rejects

Track requests in the Admin Panel.`,
    position: 'center',
  },
  ...USER_TOUR_STEPS.slice(10, 14), // Include notification, password, help center, and help steps
  {
    title: '🎓 HR Guide Complete!',
    content: `You're ready to manage HR functions!

HR responsibilities:
✓ Review leave requests promptly
✓ Keep profiles updated
✓ Monitor outage patterns
✓ Support agent questions
✓ Check Help Center for updates

Click "Finish" to start working!`,
    position: 'center',
  },
];

// Admin Tour Steps
export const ADMIN_TOUR_STEPS: TourStep[] = [
  {
    title: '🎉 Welcome Admin!',
    content: `Welcome! As an Admin, you have extensive access to manage portal content, answer questions, and oversee operations.

This guide covers all your administrative capabilities.

Let's explore your admin powers!`,
    position: 'center',
  },
  ...USER_TOUR_STEPS.slice(1, 5), // Common steps
  {
    title: '🛡️ Admin Panel',
    content: `The Admin Panel is your command center!

Access it from Admin → Admin Panel.

Tabs available:
• Updates - Create and manage content
• Questions - Answer agent questions
• Admins - View admin users
• Users - View all users`,
    target: '[data-tour="admin-menu"]',
    position: 'bottom',
  },
  {
    title: '📝 Creating Updates',
    content: `Create new updates for all agents!

Steps:
1. Go to Admin Panel → Updates
2. Click "Create Update"
3. Fill in title, category, summary
4. Write content using Markdown
5. Set status and optional deadline
6. Publish!

Use "Check Similar Updates" to avoid duplicates.`,
    position: 'center',
  },
  {
    title: '❓ Answering Questions',
    content: `Respond to agent questions in the Questions tab.

Best practices:
• Reply within 24 hours
• Be thorough but concise
• Reference update content
• Follow up if needed

Agents are notified when you reply.`,
    position: 'center',
  },
  {
    title: '📋 Leave Request Management',
    content: `You can also manage all leave requests!

Same as HR:
• View all pending requests
• Approve or reject
• Add remarks
• Check calendar conflicts`,
    position: 'center',
  },
  {
    title: '👥 Profile Management',
    content: `Access all agent profiles via People → All Bios.

New features:
• Enhanced profile fields (Upwork, connectivity, equipment)
• Request changes to protected fields
• Super Admin reviews change requests

Profile data helps with resource planning.`,
    position: 'center',
  },
  ...USER_TOUR_STEPS.slice(10, 14), // Notification, password, help center, help
  {
    title: '🎓 Admin Guide Complete!',
    content: `You're ready to manage the portal!

Admin responsibilities:
✓ Create timely, accurate updates
✓ Answer questions promptly
✓ Process leave requests fairly
✓ Keep content current
✓ Check Help Center for updates

Click "Finish" to start administering!`,
    position: 'center',
  },
];

// Super Admin Tour Steps
export const SUPER_ADMIN_TOUR_STEPS: TourStep[] = [
  {
    title: '👑 Welcome Super Admin!',
    content: `Welcome! As Super Admin, you have COMPLETE control over the entire portal, including user management and system configuration.

This guide covers all features including exclusive Super Admin capabilities.

Let's explore your full powers!`,
    position: 'center',
  },
  ...ADMIN_TOUR_STEPS.slice(1, 10), // Include all admin steps
  {
    title: '👥 User Management (Super Admin)',
    content: `You can create and delete user accounts!

User management:
• Create new users with any role
• Delete or restore users
• Change user roles
• Reset passwords
• Change email addresses

Always maintain at least 2 Super Admins!`,
    position: 'center',
  },
  {
    title: '⚙️ Role Assignment',
    content: `Assign roles carefully:

• User - Standard agent access
• HR - Leave management + profiles
• Admin - Content management
• Super Admin - Full control

Use the principle of least privilege.`,
    position: 'center',
  },
  {
    title: '📝 Profile Change Requests',
    content: `You review and approve profile change requests!

When agents/HR request changes to protected fields:
1. Check Admin Panel for pending requests
2. Review the current vs. requested value
3. Approve or reject with notes
4. User is notified of decision

Rate reminders are sent 7 days before progressions.`,
    position: 'center',
  },
  {
    title: '💡 Improvements Tracker',
    content: `Full control over the improvements tracker!

You can:
• Create new improvements
• Assign to team members
• Set priorities and due dates
• Track progress
• Delete completed items

Keep the team focused on priorities.`,
    position: 'center',
  },
  {
    title: '📋 Changelog Management',
    content: `Manage the "What's New" section in Help Center!

In Admin Panel, you can:
• Add new changelog entries
• Set which roles see each entry
• Link entries to features
• Edit or delete entries

Keep users informed about portal changes!`,
    position: 'center',
  },
  {
    title: '🔐 Security Responsibility',
    content: `With great power comes responsibility!

Security best practices:
• Use strong passwords
• Never share credentials
• Audit roles periodically
• Remove inactive accounts
• Maintain backup Super Admin`,
    position: 'center',
  },
  {
    title: '🎓 Super Admin Guide Complete!',
    content: `You have complete control!

Super Admin duties:
✓ Manage all users and roles
✓ Review profile change requests
✓ All Admin responsibilities
✓ Update the changelog in Help Center
✓ Security maintenance

Click "Finish" to take command!`,
    position: 'center',
  },
];

// Get appropriate tour steps based on user role
export function getTourStepsForRole(isAdmin: boolean, isHR: boolean, isSuperAdmin: boolean): TourStep[] {
  if (isSuperAdmin) return SUPER_ADMIN_TOUR_STEPS;
  if (isAdmin) return ADMIN_TOUR_STEPS;
  if (isHR) return HR_TOUR_STEPS;
  return USER_TOUR_STEPS;
}
