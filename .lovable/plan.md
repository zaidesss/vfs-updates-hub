

# Interactive Page-Specific Demo Guides

## Overview

Create an interactive popup demo guide system that provides page-specific tutorials. Each page will have its own contextual demo guide with separate content for Users and Admins. The guide will be accessible via a help button on each page, explaining the specific functions and features of that page.

## Current State

The existing demo tour system:
- Shows a one-time portal-wide tour on first login
- Uses `DemoTour.tsx` component with spotlight highlighting
- Tracks completion in `demo_guide_views` table
- Has role-based step configurations in `demoTourSteps.ts`

## New System

Create a **page-specific demo guide** system that:
- Is accessible on-demand from each page (not just first-time)
- Shows content relevant ONLY to the current page
- Has separate User and Admin versions where applicable
- Uses the same spotlight/popup UI as the existing tour (consistent UX)

---

## Architecture

```text
PageDemoGuide System
+-----------------------------------------------------------+
|  PageDemoContext                                          |
|  - currentPage: string                                    |
|  - showGuide: boolean                                     |
|  - openPageGuide()                                        |
|  - closePageGuide()                                       |
+-----------------------------------------------------------+
          |
          v
+-----------------------------------------------------------+
|  PageDemoGuide Component                                  |
|  - Gets steps based on currentPage + userRole             |
|  - Renders spotlight/popup UI                             |
|  - Keyboard navigation                                    |
+-----------------------------------------------------------+
          |
          v
+-----------------------------------------------------------+
|  Page Demo Step Configurations                            |
|  - pageDemoSteps/updatesSteps.ts                          |
|  - pageDemoSteps/leaveRequestSteps.ts                     |
|  - pageDemoSteps/agentReportsSteps.ts                     |
|  - etc.                                                   |
+-----------------------------------------------------------+
```

---

## Implementation Details

### Step 1: Create Page Demo Context

**File: `src/context/PageDemoContext.tsx`**

```typescript
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PageDemoContextType {
  showGuide: boolean;
  currentPageId: string;
  openPageGuide: (pageId: string) => void;
  closePageGuide: () => void;
}

export function PageDemoProvider({ children }: { children: ReactNode }) {
  const [showGuide, setShowGuide] = useState(false);
  const [currentPageId, setCurrentPageId] = useState('');

  const openPageGuide = (pageId: string) => {
    setCurrentPageId(pageId);
    setShowGuide(true);
  };

  const closePageGuide = () => {
    setShowGuide(false);
  };

  return (
    <PageDemoContext.Provider value={{ showGuide, currentPageId, openPageGuide, closePageGuide }}>
      {children}
    </PageDemoContext.Provider>
  );
}
```

---

### Step 2: Create Page Demo Guide Component

**File: `src/components/PageDemoGuide.tsx`**

Reuses the existing `DemoTour` UI pattern but:
- Gets steps from page-specific configuration
- Supports role filtering (User vs Admin)
- Does not track completion in database (on-demand access)

```typescript
interface PageDemoGuideProps {
  pageId: string;
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  isHR: boolean;
}

export function PageDemoGuide({ pageId, isOpen, onClose, isAdmin, isHR }: PageDemoGuideProps) {
  const steps = getPageSteps(pageId, isAdmin, isHR);
  // Render same UI as DemoTour but without DB tracking
}
```

---

### Step 3: Create Page-Specific Step Configurations

**File: `src/lib/pageDemoSteps/index.ts`**

Central registry mapping page IDs to step configurations:

```typescript
export const PAGE_DEMO_REGISTRY: Record<string, {
  userSteps: TourStep[];
  adminSteps: TourStep[];
}> = {
  'updates': { userSteps: UPDATES_USER_STEPS, adminSteps: UPDATES_ADMIN_STEPS },
  'leave-request': { userSteps: LEAVE_USER_STEPS, adminSteps: LEAVE_ADMIN_STEPS },
  'master-directory': { userSteps: [], adminSteps: MASTER_DIR_ADMIN_STEPS },
  'agent-reports': { userSteps: REPORTS_USER_STEPS, adminSteps: REPORTS_ADMIN_STEPS },
  // ... all pages
};
```

---

### Step 4: Create Step Files for Each Page Group

**File: `src/lib/pageDemoSteps/updatesSteps.ts`**

```typescript
// User steps for Updates page
export const UPDATES_USER_STEPS: TourStep[] = [
  {
    title: 'Updates Overview',
    content: 'This page shows all published updates that require your attention. Updates are organized by read/unread status.',
    position: 'center',
  },
  {
    title: 'Tab Navigation',
    content: 'Use these tabs to filter updates:\n- Unread: Updates you need to acknowledge\n- Read: Previously acknowledged updates\n- All: Complete list',
    target: '[data-tour="updates-tabs"]',
    position: 'bottom',
  },
  // ... more steps
];

// Admin steps (includes user steps + admin features)
export const UPDATES_ADMIN_STEPS: TourStep[] = [
  ...UPDATES_USER_STEPS,
  {
    title: 'Create New Update',
    content: 'As an admin, you can create new updates by clicking this button. Updates go through a lifecycle: Draft -> Published -> Obsolete.',
    target: '[data-tour="create-update"]',
    position: 'bottom',
  },
  // ... more admin steps
];
```

**File: `src/lib/pageDemoSteps/leaveRequestSteps.ts`**

```typescript
export const LEAVE_USER_STEPS: TourStep[] = [
  {
    title: 'Outage Requests',
    content: 'Submit and track your time-off and outage requests here. Your requests are organized by status.',
    position: 'center',
  },
  {
    title: 'New Request',
    content: 'Click here to submit a new outage request. Select dates, times, and reason for your absence.',
    target: '[data-tour="new-request"]',
    position: 'bottom',
  },
  // ... more steps
];

export const LEAVE_ADMIN_STEPS: TourStep[] = [
  ...LEAVE_USER_STEPS.slice(0, 1),
  {
    title: 'All Team Requests',
    content: 'As admin, you see all team requests. You can approve, decline, or investigate each request.',
    position: 'center',
  },
  {
    title: 'Review Pending Requests',
    content: 'Pending requests require your action. Click to review details, check for conflicts, then approve or decline.',
    target: '[data-tour="pending-tab"]',
    position: 'bottom',
  },
  {
    title: 'Auto-Generated Requests',
    content: 'Requests marked "For Review" were automatically generated from late login detection. Review and validate these.',
    position: 'center',
  },
  // ... more steps
];
```

**File: `src/lib/pageDemoSteps/agentReportsSteps.ts`**

```typescript
export const REPORTS_USER_STEPS: TourStep[] = [
  {
    title: 'Agent Reports',
    content: 'This page shows behavioral and compliance incident reports. Reports are generated automatically by the system.',
    position: 'center',
  },
  {
    title: 'Your Reports',
    content: 'You can view reports related to your account. Each report shows the incident type, date, and status.',
    position: 'center',
  },
];

export const REPORTS_ADMIN_STEPS: TourStep[] = [
  {
    title: 'Agent Reports Hub',
    content: 'Review and investigate compliance incidents for all team members. Reports are generated automatically by the daily audit.',
    position: 'center',
  },
  {
    title: 'Summary Cards',
    content: 'Quick overview of report statistics:\n- Total reports in the period\n- Open (needs investigation)\n- Escalated to outage\n- Validated (coaching completed)',
    target: '[data-tour="summary-cards"]',
    position: 'bottom',
  },
  {
    title: 'Filter Reports',
    content: 'Filter by month, agent, incident type, or status. Use these to focus on specific issues.',
    target: '[data-tour="report-filters"]',
    position: 'bottom',
  },
  {
    title: 'Investigation Actions',
    content: 'For each open report, you can:\n- Escalate as Outage: Creates an outage request\n- Validate: Mark for coaching\n- Dismiss: Invalid/excused incident',
    position: 'center',
  },
  {
    title: 'Automated Triggers',
    content: 'Reports are generated automatically:\n- Daily audit runs at 5:00 AM UTC\n- Detects: Late login, early out, quota issues, etc.\n- Email notifications sent to leadership',
    position: 'center',
  },
];
```

**File: `src/lib/pageDemoSteps/masterDirectorySteps.ts`**

```typescript
// Admin only page
export const MASTER_DIR_ADMIN_STEPS: TourStep[] = [
  {
    title: 'Master Directory',
    content: 'Centralized view of all agent configurations. Data syncs from individual Bio profiles.',
    position: 'center',
  },
  {
    title: 'Sync from Bios',
    content: 'Click to sync latest profile data from All Bios. This updates schedules, team assignments, and work configurations.',
    target: '[data-tour="sync-button"]',
    position: 'bottom',
  },
  {
    title: 'Filter & Search',
    content: 'Filter by Team Lead, Zendesk Instance, or Support Type. Use search to find specific agents.',
    target: '[data-tour="filter-bar"]',
    position: 'bottom',
  },
  {
    title: 'Editable Fields',
    content: 'Most fields are read-only (synced from Bios). You can toggle:\n- Ticket Assignment: Enable/disable for ticket routing\n- Schedule fields: Edit directly in this view',
    position: 'center',
  },
  {
    title: 'Save Changes',
    content: 'After editing, click Save All to persist changes. The button lights up when there are unsaved changes.',
    target: '[data-tour="save-button"]',
    position: 'bottom',
  },
  {
    title: 'Agent Dashboard Link',
    content: 'Click the link icon to open an agent\'s performance dashboard directly.',
    position: 'center',
  },
];
```

---

### Step 5: Add Page Guide Button Component

**File: `src/components/PageGuideButton.tsx`**

A consistent button to trigger the page demo, placed on each page:

```typescript
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { usePageDemo } from '@/context/PageDemoContext';

interface PageGuideButtonProps {
  pageId: string;
  className?: string;
}

export function PageGuideButton({ pageId, className }: PageGuideButtonProps) {
  const { openPageGuide } = usePageDemo();
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => openPageGuide(pageId)}
      className={className}
      title="Page Guide"
    >
      <HelpCircle className="h-4 w-4 mr-2" />
      Guide
    </Button>
  );
}
```

---

### Step 6: Update Pages to Include Guide Button

Add the `PageGuideButton` to each page header. Example for Master Directory:

```typescript
// In MasterDirectory.tsx header section
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold">Master Directory</h1>
    <p className="text-muted-foreground text-sm">...</p>
  </div>
  <div className="flex gap-2">
    <PageGuideButton pageId="master-directory" />
    {/* existing buttons */}
  </div>
</div>
```

---

### Step 7: Add data-tour Attributes to Key Elements

Add `data-tour` attributes to elements that should be highlighted:

```typescript
// MasterDirectory.tsx
<Button data-tour="sync-button" onClick={handleSyncAll}>
  Sync from Bios
</Button>

<Button data-tour="save-button" onClick={handleSave}>
  Save All
</Button>

<div data-tour="filter-bar" className="flex flex-wrap items-center gap-3">
  {/* filters */}
</div>
```

---

## Page Coverage

| Page | User Guide | Admin Guide | Key Features Covered |
|------|------------|-------------|---------------------|
| Updates | Yes | Yes | Tabs, filters, acknowledgement |
| Update Detail | Yes | Yes | Reading, acknowledging, questions |
| Knowledge Base | Yes | Yes | Search, categories, article viewing |
| Update Requests | Yes | Yes | Submitting requests, tracking |
| Help Center | Yes | Yes | Tabs, quick sheets, changelog |
| Leave Request | Yes | Yes | Submission, conflicts, approval workflow |
| Calendar | Yes | Yes | Viewing outages, color coding |
| My Outage Report | Yes | - | Personal statistics |
| Outage Stats | - | Yes | Analytics, repeat offenders |
| My Bio | Yes | - | Profile sections, change requests |
| All Bios | - | Yes | Search, editing, permissions |
| Master Directory | - | Yes | Sync, filters, scheduling |
| Team Status | Yes | Yes | Real-time status, filters |
| Dashboard | Yes | Yes | Metrics, date ranges |
| Ticket Logs | Yes | Yes | Log viewing, export |
| QA Evaluations | Yes | Yes | Viewing, acknowledging, creating |
| Agent Reports | Yes | Yes | Investigation, escalation workflow |
| Scorecard | Yes | Yes | Metrics, team comparisons |
| Revalida | Yes | Yes | Taking assessments, grading |
| Admin Panel | - | Yes | User mgmt, updates, changelog |

---

## Files to Create/Modify

| Action | File Path |
|--------|-----------|
| Create | `src/context/PageDemoContext.tsx` |
| Create | `src/components/PageDemoGuide.tsx` |
| Create | `src/components/PageGuideButton.tsx` |
| Create | `src/lib/pageDemoSteps/index.ts` |
| Create | `src/lib/pageDemoSteps/updatesSteps.ts` |
| Create | `src/lib/pageDemoSteps/leaveRequestSteps.ts` |
| Create | `src/lib/pageDemoSteps/agentReportsSteps.ts` |
| Create | `src/lib/pageDemoSteps/masterDirectorySteps.ts` |
| Create | `src/lib/pageDemoSteps/qaSteps.ts` |
| Create | `src/lib/pageDemoSteps/revalidaSteps.ts` |
| Create | `src/lib/pageDemoSteps/profileSteps.ts` |
| Create | `src/lib/pageDemoSteps/adminPanelSteps.ts` |
| Modify | `src/App.tsx` - Add PageDemoProvider |
| Modify | Each page file - Add PageGuideButton + data-tour attributes |

---

## Implementation Approach

Due to the number of pages, implement in phases:

**Phase 1**: Core infrastructure
- Create PageDemoContext
- Create PageDemoGuide component
- Create PageGuideButton

**Phase 2**: High-priority pages
- Master Directory (Admin)
- Agent Reports (Admin focus)
- Leave Request (Both)
- Updates (Both)

**Phase 3**: Remaining pages
- Team Performance pages
- People pages
- Admin Panel

**Phase 4**: Polish
- Add data-tour attributes to all targeted elements
- Review and refine step content
- Test keyboard navigation

This phased approach allows verification at each stage.

