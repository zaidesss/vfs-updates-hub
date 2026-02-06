import type { TourStep } from '@/components/DemoTour';

// Admin only page - no user steps
export const MASTER_DIR_ADMIN_STEPS: TourStep[] = [
  {
    title: 'Master Directory',
    content: 'Welcome to the Master Directory! This is a centralized view of all agent configurations and schedules. Data syncs from individual Bio profiles.',
    position: 'center',
  },
  {
    title: 'Sync from Bios',
    content: 'Click this button to sync the latest profile data from All Bios. This updates:\n\n• Schedules and work hours\n• Team assignments\n• Work configurations\n• Support type settings',
    target: '[data-tour="sync-button"]',
    position: 'bottom',
  },
  {
    title: 'Filter & Search',
    content: 'Find specific agents quickly:\n\n• Filter by Team Lead\n• Filter by Zendesk Instance\n• Filter by Support Type\n• Search by name or email',
    target: '[data-tour="filter-bar"]',
    position: 'bottom',
  },
  {
    title: 'Directory Table',
    content: 'The table shows all agents with their current configurations. Scroll horizontally to see all columns including schedules and assignments.',
    target: '[data-tour="directory-table"]',
    position: 'bottom',
  },
  {
    title: 'Editable Fields',
    content: 'Most fields are read-only (synced from Bios). You can directly edit:\n\n• Ticket Assignment: Toggle for routing\n• Schedule fields: Edit work hours\n• Queue assignments',
    position: 'center',
  },
  {
    title: 'Save Changes',
    content: 'After making edits, click Save All to persist changes. The button highlights when there are unsaved changes.\n\nChanges take effect immediately for ticket routing.',
    target: '[data-tour="save-button"]',
    position: 'bottom',
  },
  {
    title: 'Agent Dashboard Link',
    content: 'Click the link icon next to any agent to open their performance dashboard directly. This shows their metrics, ticket history, and more.',
    position: 'center',
  },
  {
    title: 'Data Accuracy',
    content: 'The Master Directory is the source of truth for:\n\n• Ticket assignment eligibility\n• Schedule-based calculations\n• Team reporting rollups\n\nKeep it synced regularly!',
    position: 'center',
  },
];
