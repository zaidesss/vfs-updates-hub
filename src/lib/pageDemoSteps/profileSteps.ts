import type { TourStep } from '@/components/DemoTour';

export const PROFILE_USER_STEPS: TourStep[] = [
  {
    title: 'My Bio Profile',
    content: 'Manage your personal profile information including contact details, schedule, and work configuration.',
    position: 'center',
  },
  {
    title: 'Profile Sections',
    content: 'Your profile is organized into sections: Personal, Work Configuration, Schedule, and Availability.',
    target: '[data-tour="profile-tabs"]',
    position: 'bottom',
  },
  {
    title: 'Edit Your Information',
    content: 'Click to edit your details. Some fields like name require admin approval before changes take effect.',
    target: '[data-tour="edit-button"]',
    position: 'bottom',
  },
  {
    title: 'Pending Changes',
    content: 'Changes marked as pending need admin review. You\'ll be notified once they\'re approved or rejected.',
    position: 'center',
  },
  {
    title: 'View Your Dashboard',
    content: 'Click the dashboard link to see your performance metrics and compliance overview.',
    target: '[data-tour="dashboard-link"]',
    position: 'bottom',
  },
];

export const PROFILE_ADMIN_STEPS: TourStep[] = [
  {
    title: 'All Bios',
    content: 'View and manage all agent profiles. This is the central place to edit team member information.',
    position: 'center',
  },
  {
    title: 'Search & Filter',
    content: 'Use search to find agents quickly. Filter by Team Lead, Support Type, or other criteria.',
    target: '[data-tour="search-filter"]',
    position: 'bottom',
  },
  {
    title: 'Edit Agent Information',
    content: 'Click on any agent to view and edit their profile. Some changes require approval workflow.',
    target: '[data-tour="agent-table"]',
    position: 'bottom',
  },
  {
    title: 'Permissions Management',
    content: 'You can grant or revoke permissions for specific features like Zendesk access or schedule editing.',
    position: 'center',
  },
  {
    title: 'Bulk Actions',
    content: 'Select multiple agents to perform bulk updates like team assignment or role changes.',
    target: '[data-tour="bulk-actions"]',
    position: 'bottom',
  },
  {
    title: 'Change Requests',
    content: 'Review pending profile changes from agents. Approve changes that comply with policies, reject others.',
    position: 'center',
  },
  {
    title: 'View Agent Dashboard',
    content: 'Click the dashboard link next to any agent to view their performance metrics and compliance.',
    position: 'center',
  },
];
