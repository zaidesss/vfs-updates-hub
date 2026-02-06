import type { TourStep } from '@/components/DemoTour';

export const REVALIDA_USER_STEPS: TourStep[] = [
  {
    title: 'Revalida Assessments',
    content: 'Take weekly knowledge assessments to maintain certification. You get one attempt per 48-hour batch window.',
    position: 'center',
  },
  {
    title: 'Batch Status',
    content: 'Check the current batch window and deadline. Once you submit, you cannot retake until the next batch.',
    target: '[data-tour="batch-info"]',
    position: 'bottom',
  },
  {
    title: 'Start Assessment',
    content: 'Click to begin the assessment. You\'ll answer multiple choice, true/false, and situational questions.',
    target: '[data-tour="start-assessment"]',
    position: 'bottom',
  },
  {
    title: 'Question Types',
    content: 'Multiple Choice: Select one answer. True/False: Choose correct statement. Situational: Describe your approach.',
    position: 'center',
  },
  {
    title: 'Attempt History',
    content: 'View all your past attempts with scores, submission dates, and grading status.',
    target: '[data-tour="attempts-list"]',
    position: 'bottom',
  },
  {
    title: 'Final Score',
    content: 'Your score is calculated automatically (except situational questions that need manual review). This appears in your Team Scorecard.',
    position: 'center',
  },
];

export const REVALIDA_ADMIN_STEPS: TourStep[] = [
  {
    title: 'Revalida Management',
    content: 'Create and manage weekly knowledge assessment batches. Monitor submission rates and grades for your team.',
    position: 'center',
  },
  {
    title: 'Create Batch',
    content: 'Set up a new assessment batch with custom questions. Questions auto-grade except situational type.',
    target: '[data-tour="create-batch"]',
    position: 'bottom',
  },
  {
    title: 'Question Builder',
    content: 'Add Multiple Choice, True/False, or Situational questions. Set point values and auto-grade rules.',
    position: 'center',
  },
  {
    title: 'Edit After Publish',
    content: 'Even after publishing a batch, you can edit questions. Changes apply to all future attempts.',
    position: 'center',
  },
  {
    title: 'Batch List',
    content: 'View all batches with submission status and deadline. Check completion rates for your team.',
    target: '[data-tour="batch-list"]',
    position: 'bottom',
  },
  {
    title: 'Grade Situational Answers',
    content: 'Situational questions require manual grading. Review submissions and assign points.',
    position: 'center',
  },
  {
    title: 'View Submissions',
    content: 'Click on any submission to see detailed answers and grading. Provide feedback for coaching.',
    target: '[data-tour="submissions-table"]',
    position: 'bottom',
  },
  {
    title: 'Data Retention',
    content: 'Assessment data is retained for 14 days after batch completion, then automatically exported and deleted.',
    position: 'center',
  },
];
