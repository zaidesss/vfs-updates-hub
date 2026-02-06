import type { TourStep } from '@/components/DemoTour';

export const SCORECARD_USER_STEPS: TourStep[] = [
  {
    title: 'Team Scorecard',
    content: 'View your performance metrics for the selected week. Compare your scores against team benchmarks.',
    position: 'center',
  },
  {
    title: 'Select Week',
    content: 'Use Year, Month, and Week filters to view scorecard for any week. Available weeks update based on your selections.',
    target: '[data-tour="date-filter"]',
    position: 'bottom',
  },
  {
    title: 'Support Type Filter',
    content: 'Filter by specific support type (Email, Chat, Call, Hybrid) or view "All Agents" together.',
    target: '[data-tour="support-type-filter"]',
    position: 'bottom',
  },
  {
    title: 'Performance Metrics',
    content: 'View key metrics: AHT (Average Handle Time), FRT (First Response Time), Reliability, and Final Score.',
    position: 'center',
  },
  {
    title: 'Final Score Rating',
    content: 'Excellent (90+), Good (80-89), Needs Improvement (<80), or On Leave. Color-coded for quick reference.',
    position: 'center',
  },
  {
    title: 'Search & Sort',
    content: 'Search by agent name or sort by Final Score to find specific team members.',
    target: '[data-tour="search-sort"]',
    position: 'bottom',
  },
];

export const SCORECARD_ADMIN_STEPS: TourStep[] = [
  {
    title: 'Team Scorecard Management',
    content: 'Monitor team performance metrics and save snapshots for historical comparison. Manage metric overrides.',
    position: 'center',
  },
  {
    title: 'Date Selection',
    content: 'Select Year, Month, and Week to view. Available weeks dynamically update based on your month selection.',
    target: '[data-tour="date-filter"]',
    position: 'bottom',
  },
  {
    title: 'Support Type Filtering',
    content: 'View metrics for specific support types or "All Agents" together. Logistics agents show Reliability only.',
    target: '[data-tour="support-type-filter"]',
    position: 'bottom',
  },
  {
    title: 'Refresh Metrics',
    content: 'Bypass the 1-hour cache and manually refresh metrics from Zendesk by support type.',
    target: '[data-tour="refresh-button"]',
    position: 'bottom',
  },
  {
    title: 'Save Scorecard',
    content: 'Freeze the entire week\'s data. Saved snapshots preserve historical metrics for comparison.',
    target: '[data-tour="save-button"]',
    position: 'bottom',
  },
  {
    title: 'Manual Metric Overrides',
    content: 'Edit AHT or FRT cells by typing raw seconds (e.g., 420s). Mark as "edited" and save changes.',
    position: 'center',
  },
  {
    title: 'Metric Breakdown',
    content: 'Each cell shows raw time (e.g., 420s) and calculated percentage (color-coded). Logistics see Reliability %.',
    position: 'center',
  },
  {
    title: 'Search & Advanced Sorting',
    content: 'Search by agent name or apply score range filter (Excellent, Good, Needs Improvement, On Leave).',
    target: '[data-tour="search-sort"]',
    position: 'bottom',
  },
];
