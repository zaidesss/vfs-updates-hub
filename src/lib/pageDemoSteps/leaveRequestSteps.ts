import type { TourStep } from '@/components/DemoTour';

// User steps for Leave Request page
export const LEAVE_USER_STEPS: TourStep[] = [
  {
    title: 'Outage Requests',
    content: 'Welcome to Outage Requests! Here you can submit and track your time-off requests, late logins, and other absences.',
    position: 'center',
  },
  {
    title: 'New Request',
    content: 'Click this button to submit a new outage request. You\'ll select the date, time range, and reason for your absence.',
    target: '[data-tour="new-request"]',
    position: 'bottom',
  },
  {
    title: 'Request Tabs',
    content: 'Filter your requests by status:\n\n• Pending: Awaiting approval\n• Approved: Confirmed requests\n• All: Complete history',
    target: '[data-tour="request-tabs"]',
    position: 'bottom',
  },
  {
    title: 'Request Details',
    content: 'Each request shows the date, time range, reason, and current status. Click on a request to see more details.',
    target: '[data-tour="requests-list"]',
    position: 'bottom',
  },
  {
    title: 'Request Status',
    content: 'Track your request status:\n\n• Pending: Under review\n• Approved: Confirmed\n• Declined: Not approved\n• Canceled: Withdrawn by you',
    position: 'center',
  },
  {
    title: 'Conflict Detection',
    content: 'The system automatically checks for scheduling conflicts when you submit a request. You\'ll be notified if there are any issues.',
    position: 'center',
  },
];

// Admin steps for Leave Request page
export const LEAVE_ADMIN_STEPS: TourStep[] = [
  {
    title: 'Outage Request Management',
    content: 'As an admin, you can review and manage all team outage requests. You have visibility into pending requests that need your attention.',
    position: 'center',
  },
  {
    title: 'All Team Requests',
    content: 'You can see requests from all team members, not just your own. Use the filters to find specific requests.',
    position: 'center',
  },
  {
    title: 'Request Tabs',
    content: 'Filter requests by status:\n\n• Pending: Need your approval\n• For Review: Auto-generated (late login detection)\n• All: Complete history',
    target: '[data-tour="request-tabs"]',
    position: 'bottom',
  },
  {
    title: 'Review Pending Requests',
    content: 'Click on a pending request to review details. You can approve, decline, or request more information before making a decision.',
    target: '[data-tour="requests-list"]',
    position: 'bottom',
  },
  {
    title: 'Auto-Generated Requests',
    content: 'Requests marked "For Review" were automatically generated from late login detection. These require validation:\n\n• Approve: Confirm the outage\n• Decline: Mark as invalid',
    position: 'center',
  },
  {
    title: 'Conflict Detection',
    content: 'Check for scheduling conflicts before approving. The system shows if multiple team members have overlapping absences.',
    position: 'center',
  },
  {
    title: 'Escalation from Reports',
    content: 'Agent Reports for LATE_LOGIN, EARLY_OUT, or TIME_NOT_MET can be escalated to create outage requests automatically.',
    position: 'center',
  },
];
