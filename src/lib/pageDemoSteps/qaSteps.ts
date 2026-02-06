import type { TourStep } from '@/components/DemoTour';

export const QA_USER_STEPS: TourStep[] = [
  {
    title: 'QA Evaluations',
    content: 'View quality evaluations of your support interactions. This page shows feedback and scoring from team leads.',
    position: 'center',
  },
  {
    title: 'Filter by Date',
    content: 'Use the Year, Month, and Week filters to view evaluations for specific time periods.',
    target: '[data-tour="qa-date-filter"]',
    position: 'bottom',
  },
  {
    title: 'Evaluation List',
    content: 'Click on any evaluation to view detailed feedback, categories, and scores.',
    target: '[data-tour="qa-table"]',
    position: 'bottom',
  },
  {
    title: 'Category Breakdown',
    content: 'Each evaluation includes category scores. Review feedback to improve in weak areas.',
    position: 'center',
  },
];

export const QA_ADMIN_STEPS: TourStep[] = [
  {
    title: 'QA Evaluations Hub',
    content: 'Create and manage quality evaluations for your team members. Track compliance and performance.',
    position: 'center',
  },
  {
    title: 'Unified Filtering',
    content: 'Filter by Year, Month, Week, and Agent to focus on specific team members or time periods.',
    target: '[data-tour="qa-date-filter"]',
    position: 'bottom',
  },
  {
    title: 'Statistics Dashboard',
    content: 'Summary cards show total evaluations, compliance rate, and average scores for quick insights.',
    target: '[data-tour="qa-stats"]',
    position: 'bottom',
  },
  {
    title: 'Create New Evaluation',
    content: 'Click to create a new evaluation. You\'ll audit tickets from Zendesk and score multiple categories.',
    target: '[data-tour="create-qa"]',
    position: 'bottom',
  },
  {
    title: 'Evaluation List',
    content: 'View all evaluations in the table. Click to edit or view details of existing evaluations.',
    target: '[data-tour="qa-table"]',
    position: 'bottom',
  },
  {
    title: 'Repeat Violation Warning',
    content: 'The system tracks repeat violations across evaluations. You\'ll be warned if an agent has failed the same category before.',
    position: 'center',
  },
];
