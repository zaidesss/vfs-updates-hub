import type { TourStep } from '@/components/DemoTour';

export const ADMIN_PANEL_STEPS: TourStep[] = [
  {
    title: 'Admin Panel',
    content: 'Central hub for system administration. Manage users, updates, settings, and system-wide configuration.',
    position: 'center',
  },
  {
    title: 'Admin Navigation',
    content: 'The panel is organized into tabs: User Management, Updates, Settings, and System Logs.',
    target: '[data-tour="admin-tabs"]',
    position: 'bottom',
  },
  {
    title: 'User Management',
    content: 'Create, edit, and delete user accounts. Assign roles (Admin, HR, User) and manage permissions.',
    target: '[data-tour="users-section"]',
    position: 'bottom',
  },
  {
    title: 'Manage Updates',
    content: 'Create and publish updates to the entire team. Updates can be marked as Draft, Published, or Obsolete.',
    target: '[data-tour="updates-section"]',
    position: 'bottom',
  },
  {
    title: 'System Settings',
    content: 'Configure system-wide settings like email templates, notification preferences, and API integrations.',
    target: '[data-tour="settings-section"]',
    position: 'bottom',
  },
  {
    title: 'System Logs',
    content: 'View audit logs for all system activity. Track user actions, data changes, and administrative operations.',
    target: '[data-tour="logs-section"]',
    position: 'bottom',
  },
  {
    title: 'Role Permissions',
    content: 'Admin: Full access to all features. HR: Manage profiles and outages. SuperAdmin: System configuration.',
    position: 'center',
  },
];
