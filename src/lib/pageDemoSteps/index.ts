import type { TourStep } from '@/components/DemoTour';
import { UPDATES_USER_STEPS, UPDATES_ADMIN_STEPS } from './updatesSteps';
import { LEAVE_USER_STEPS, LEAVE_ADMIN_STEPS } from './leaveRequestSteps';
import { REPORTS_USER_STEPS, REPORTS_ADMIN_STEPS } from './agentReportsSteps';
import { MASTER_DIR_ADMIN_STEPS } from './masterDirectorySteps';
import { QA_USER_STEPS, QA_ADMIN_STEPS } from './qaSteps';
import { REVALIDA_USER_STEPS, REVALIDA_ADMIN_STEPS } from './revalidaSteps';
import { PROFILE_USER_STEPS, PROFILE_ADMIN_STEPS } from './profileSteps';
import { ADMIN_PANEL_STEPS } from './adminPanelSteps';
import { TICKET_LOGS_USER_STEPS, TICKET_LOGS_ADMIN_STEPS } from './ticketLogsSteps';
import { SCORECARD_USER_STEPS, SCORECARD_ADMIN_STEPS } from './scorecardSteps';
import { TEAM_STATUS_STEPS } from './teamStatusSteps';

// Central registry mapping page IDs to step configurations
export const PAGE_DEMO_REGISTRY: Record<string, {
  userSteps: TourStep[];
  adminSteps: TourStep[];
}> = {
  'updates': { 
    userSteps: UPDATES_USER_STEPS, 
    adminSteps: UPDATES_ADMIN_STEPS 
  },
  'update-detail': { 
    userSteps: UPDATES_USER_STEPS, 
    adminSteps: UPDATES_ADMIN_STEPS 
  },
  'leave-request': { 
    userSteps: LEAVE_USER_STEPS, 
    adminSteps: LEAVE_ADMIN_STEPS 
  },
  'calendar': { 
    userSteps: LEAVE_USER_STEPS, 
    adminSteps: LEAVE_ADMIN_STEPS 
  },
  'master-directory': { 
    userSteps: [], 
    adminSteps: MASTER_DIR_ADMIN_STEPS 
  },
  'agent-reports': { 
    userSteps: REPORTS_USER_STEPS, 
    adminSteps: REPORTS_ADMIN_STEPS 
  },
  'qa-evaluations': { 
    userSteps: QA_USER_STEPS, 
    adminSteps: QA_ADMIN_STEPS 
  },
  'revalida': { 
    userSteps: REVALIDA_USER_STEPS, 
    adminSteps: REVALIDA_ADMIN_STEPS 
  },
  'profile': { 
    userSteps: PROFILE_USER_STEPS, 
    adminSteps: [] 
  },
  'manage-profiles': { 
    userSteps: [], 
    adminSteps: PROFILE_ADMIN_STEPS 
  },
  'admin': { 
    userSteps: [], 
    adminSteps: ADMIN_PANEL_STEPS 
  },
  'ticket-logs': { 
    userSteps: TICKET_LOGS_USER_STEPS, 
    adminSteps: TICKET_LOGS_ADMIN_STEPS 
  },
  'scorecard': { 
    userSteps: SCORECARD_USER_STEPS, 
    adminSteps: SCORECARD_ADMIN_STEPS 
  },
  'team-status': { 
    userSteps: TEAM_STATUS_STEPS, 
    adminSteps: TEAM_STATUS_STEPS 
  },
};

/**
 * Get the appropriate steps for a page based on user role
 */
export function getPageSteps(pageId: string, isAdmin: boolean, isHR: boolean): TourStep[] {
  const pageConfig = PAGE_DEMO_REGISTRY[pageId];
  
  if (!pageConfig) {
    return [];
  }

  // Admins and HR get admin steps if available, otherwise user steps
  if (isAdmin || isHR) {
    return pageConfig.adminSteps.length > 0 
      ? pageConfig.adminSteps 
      : pageConfig.userSteps;
  }

  // Regular users get user steps
  return pageConfig.userSteps;
}

/**
 * Check if a page has a demo guide available
 */
export function hasPageGuide(pageId: string, isAdmin: boolean, isHR: boolean): boolean {
  const steps = getPageSteps(pageId, isAdmin, isHR);
  return steps.length > 0;
}
