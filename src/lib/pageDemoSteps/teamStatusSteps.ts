import type { TourStep } from '@/components/DemoTour';

export const TEAM_STATUS_STEPS: TourStep[] = [
  {
    title: 'Team Status Board',
    content: 'Real-time view of all currently logged-in team members. See who\'s available and what support type they\'re handling.',
    position: 'center',
  },
  {
    title: 'Status Categories',
    content: 'Team members are grouped by support type: Phone, Chat, Email, Hybrid, Email + Chat, Email + Phone, Team Leads, and Technical.',
    target: '[data-tour="status-sections"]',
    position: 'bottom',
  },
  {
    title: 'Agent Status Card',
    content: 'Each card shows: name, current status, support type, team lead, and activity timestamp.',
    target: '[data-tour="status-card"]',
    position: 'bottom',
  },
  {
    title: 'Real-Time Updates',
    content: 'Status updates in real-time. When team members log in or out, the board updates automatically.',
    position: 'center',
  },
  {
    title: 'View Agent Dashboard',
    content: 'Click the dashboard link (↗) to jump to any agent\'s performance dashboard for detailed metrics.',
    position: 'center',
  },
];
