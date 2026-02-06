import type { TourStep } from '@/components/DemoTour';

export const TICKET_LOGS_USER_STEPS: TourStep[] = [
  {
    title: 'Ticket Logs',
    content: 'View your ticket activity across all support channels. See email, chat, and call volumes for the current week.',
    position: 'center',
  },
  {
    title: 'Zendesk Instance Selection',
    content: 'Select which Zendesk instance to view (ZD1 or ZD2). Each instance shows separate ticket data.',
    target: '[data-tour="instance-selector"]',
    position: 'bottom',
  },
  {
    title: 'Rolling 2-Week Window',
    content: 'Data shows a 2-week rolling window: previous week + current week. This resets every Monday.',
    position: 'center',
  },
  {
    title: 'Ticket Breakdown',
    content: 'See your ticket counts by type: Email (blue), Chat (green), and Call (yellow). Each with separate metrics.',
    target: '[data-tour="ticket-grid"]',
    position: 'bottom',
  },
  {
    title: 'Real-Time Updates',
    content: 'Ticket counts update in real-time as new tickets are processed.',
    position: 'center',
  },
];

export const TICKET_LOGS_ADMIN_STEPS: TourStep[] = [
  {
    title: 'Team Ticket Logs',
    content: 'Monitor ticket volume across your entire team. Compare performance and identify high-volume periods.',
    position: 'center',
  },
  {
    title: 'Zendesk Instances',
    content: 'View separate dashboards for ZD1 (customerserviceadvocates) and ZD2 (customerserviceadvocateshelp).',
    target: '[data-tour="instance-selector"]',
    position: 'bottom',
  },
  {
    title: 'Date Range Indicator',
    content: 'Badge shows the rolling 2-week window (e.g., 1/26 - 2/8). Updates every Monday.',
    target: '[data-tour="date-badge"]',
    position: 'bottom',
  },
  {
    title: 'Team Grid View',
    content: 'See all agents in a grid with their ticket counts. Each agent shows Email, Chat, and Call sub-rows.',
    target: '[data-tour="ticket-grid"]',
    position: 'bottom',
  },
  {
    title: 'Performance Analysis',
    content: 'Use ticket logs alongside Ticket Logs metrics in Zendesk Explore for detailed analysis.',
    position: 'center',
  },
  {
    title: 'Real-Time Sync',
    content: 'Data syncs from Zendesk in real-time. Check back throughout the week for updated counts.',
    position: 'center',
  },
];
