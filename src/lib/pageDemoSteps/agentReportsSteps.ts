import type { TourStep } from '@/components/DemoTour';

// User steps for Agent Reports page
export const REPORTS_USER_STEPS: TourStep[] = [
  {
    title: 'Agent Reports',
    content: 'This page shows compliance incident reports that are relevant to you. Reports are generated automatically by the system based on attendance and performance data.',
    position: 'center',
  },
  {
    title: 'Your Reports',
    content: 'You can view reports related to your account. Each report shows:\n\n• Incident type (late login, quota, etc.)\n• Date of incident\n• Current status',
    position: 'center',
  },
  {
    title: 'Report Status',
    content: 'Reports go through a review process:\n\n• Open: Pending review\n• Escalated: Converted to outage request\n• Validated: Confirmed for coaching\n• Dismissed: Marked as invalid',
    position: 'center',
  },
  {
    title: 'Understanding Reports',
    content: 'Click on any report to see detailed information about the incident, including timestamps and calculations that triggered the report.',
    position: 'center',
  },
];

// Admin steps for Agent Reports page
export const REPORTS_ADMIN_STEPS: TourStep[] = [
  {
    title: 'Agent Reports Hub',
    content: 'Welcome to the Agent Reports hub! Review and investigate compliance incidents for all team members. Reports are generated automatically by the daily audit.',
    position: 'center',
  },
  {
    title: 'Summary Cards',
    content: 'Quick overview of report statistics:\n\n• Total: All reports in period\n• Open: Needs investigation\n• Escalated: Converted to outage\n• Validated: Coaching confirmed',
    target: '[data-tour="summary-cards"]',
    position: 'bottom',
  },
  {
    title: 'Filter Reports',
    content: 'Use these filters to focus on specific issues:\n\n• Date range: Filter by month\n• Agent: Find specific team member\n• Type: Filter by incident type\n• Status: Filter by review status',
    target: '[data-tour="report-filters"]',
    position: 'bottom',
  },
  {
    title: 'Report Types',
    content: 'The system detects various incidents:\n\n• LATE_LOGIN: Logged in after schedule start\n• EARLY_OUT: Logged out before shift end\n• TIME_NOT_MET: Insufficient logged hours\n• QUOTA_NOT_MET: Daily ticket quota missed\n• And more...',
    position: 'center',
  },
  {
    title: 'Investigation Actions',
    content: 'For each open report, you can:\n\n• Escalate as Outage: Creates an outage request for attendance issues\n• Validate (Coaching): Confirm for performance coaching\n• Dismiss (Invalid): Mark as false positive or excused',
    position: 'center',
  },
  {
    title: 'Escalation Workflow',
    content: 'When you escalate a report:\n\n1. An outage request is created automatically\n2. Request status is "For Review"\n3. Report is marked as "Escalated"\n4. Time range is calculated from incident data',
    position: 'center',
  },
  {
    title: 'Automated Triggers',
    content: 'Reports are generated automatically:\n\n• Daily audit runs at 5:00 AM UTC\n• Scans previous day\'s attendance data\n• Email notifications sent to leadership\n• In-app notifications for new reports',
    position: 'center',
  },
];
