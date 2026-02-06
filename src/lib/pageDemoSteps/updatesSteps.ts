import type { TourStep } from '@/components/DemoTour';

// User steps for Updates page
export const UPDATES_USER_STEPS: TourStep[] = [
  {
    title: 'Updates Overview',
    content: 'Welcome to the Updates page! This is where you\'ll find all important announcements and policy updates that require your attention.',
    position: 'center',
  },
  {
    title: 'Tab Navigation',
    content: 'Use these tabs to filter updates:\n\n• Unread: Updates you need to acknowledge\n• Read: Previously acknowledged updates\n• All: Complete list of all updates',
    target: '[data-tour="updates-tabs"]',
    position: 'bottom',
  },
  {
    title: 'Update Cards',
    content: 'Each card shows an update with its title, category, and publish date. Click on any card to read the full update and acknowledge it.',
    target: '[data-tour="updates-list"]',
    position: 'bottom',
  },
  {
    title: 'Acknowledging Updates',
    content: 'After reading an update, click the "Acknowledge" button to confirm you\'ve reviewed it. This helps track team compliance with important announcements.',
    position: 'center',
  },
  {
    title: 'Asking Questions',
    content: 'If you have questions about an update, you can submit a question directly from the update detail page. An admin will respond to your inquiry.',
    position: 'center',
  },
];

// Admin steps (includes user context + admin features)
export const UPDATES_ADMIN_STEPS: TourStep[] = [
  {
    title: 'Updates Management',
    content: 'Welcome to Updates! As an admin, you can create, edit, and manage updates for the team. You\'ll also see team acknowledgement status.',
    position: 'center',
  },
  {
    title: 'Create New Update',
    content: 'Click this button to create a new update. Updates go through a lifecycle:\n\n• Draft: Work in progress\n• Published: Visible to team\n• Obsolete: Archived',
    target: '[data-tour="create-update"]',
    position: 'bottom',
  },
  {
    title: 'Tab Navigation',
    content: 'Filter updates by status. As an admin, you can also see draft updates that aren\'t visible to regular users yet.',
    target: '[data-tour="updates-tabs"]',
    position: 'bottom',
  },
  {
    title: 'Acknowledgement Tracking',
    content: 'Each update shows how many team members have acknowledged it. Click on an update to see who has read it and who hasn\'t.',
    position: 'center',
  },
  {
    title: 'Managing Questions',
    content: 'Team members can ask questions about updates. You\'ll see pending questions in the update detail view where you can respond to them.',
    position: 'center',
  },
  {
    title: 'Update Lifecycle',
    content: 'Manage the update lifecycle:\n\n• Edit: Modify content while in draft\n• Publish: Make visible to team\n• Mark Obsolete: Archive old updates\n\nPublished updates cannot be edited.',
    position: 'center',
  },
];
