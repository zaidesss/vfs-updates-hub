import type { TourStep } from '@/components/DemoTour';
import { UPDATES_USER_STEPS, UPDATES_ADMIN_STEPS } from './updatesSteps';
import { LEAVE_USER_STEPS, LEAVE_ADMIN_STEPS } from './leaveRequestSteps';
import { REPORTS_USER_STEPS, REPORTS_ADMIN_STEPS } from './agentReportsSteps';
import { MASTER_DIR_ADMIN_STEPS } from './masterDirectorySteps';

// Central registry mapping page IDs to step configurations
export const PAGE_DEMO_REGISTRY: Record<string, {
  userSteps: TourStep[];
  adminSteps: TourStep[];
}> = {
  'updates': { 
    userSteps: UPDATES_USER_STEPS, 
    adminSteps: UPDATES_ADMIN_STEPS 
  },
  'leave-request': { 
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
