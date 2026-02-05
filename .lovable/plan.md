

# Create Comprehensive User Guides by Navigation Menu

## Overview

This plan restructures the existing Help Center user guides to be organized by Navigation Menu, with clear sections for both Users and Admins. The guides will highlight automated triggers, escalation workflows, and status transitions for admin users.

## Current State

The Help Center currently has:
- **User Guide** tab - 15 sections covering authentication, navigation, updates, leave requests, etc.
- **Admin Guide** tab - 12 sections covering admin panel, user management, dashboards, etc.

## New Structure

Keep the current **User Guide** and **Admin Guide** tabs but reorganize content into collapsible accordion sections grouped by navigation menu:

```
User Guide Tab:
  [Accordion] Updates Menu
    - Updates Page
    - Knowledge Base
    - Update Requests
    - Help Center
  [Accordion] Outages Menu
    - Outage Requests
    - Calendar
    - My Outage Report
  [Accordion] People Menu
    - My Bio (Profile)
    - Team Status Board
    - Dashboard
  [Accordion] Team Performance Menu
    - Ticket Logs
    - QA Evaluations
    - Agent Reports
    - Scorecard
    - Revalida
  [Accordion] General
    - Authentication & Password
    - Notifications
    - Roles & Permissions

Admin Guide Tab:
  [Accordion] Updates Menu (Admin Features)
    - Create/Edit Updates
    - Manage Questions
    - Team Acknowledgement Dashboard
  [Accordion] Outages Menu (Admin Features)
    - Review Outage Requests
    - Outage Statistics & Analytics
    - Automated Triggers & Escalations
  [Accordion] People Menu (Admin Features)
    - All Bios (Profile Management)
    - Master Directory
    - Profile Change Requests
  [Accordion] Team Performance Menu (Admin Features)
    - QA Evaluation Management
    - Agent Reports Workflow
    - Revalida Batch Management
  [Accordion] Admin Panel
    - User Management
    - Role Management
    - Changelog Management
    - Improvements Tracker
```

---

## Implementation Details

### Step 1: Create Navigation Menu Accordion Components

Create new section components organized by menu:

**File: `src/components/user-guide/sections/menus/UpdatesMenuSection.tsx`**
- Combines: Updates, Knowledge Base, Update Requests, Help Center
- User flow: View updates, acknowledge, ask questions, search knowledge base

**File: `src/components/user-guide/sections/menus/OutagesMenuSection.tsx`**
- Combines: Outage Requests, Calendar, My Outage Report
- User flow: Submit request, check conflicts, view calendar, track history

**File: `src/components/user-guide/sections/menus/PeopleMenuSection.tsx`**
- Combines: My Bio, Team Status Board, Dashboard
- User flow: Update profile, view team activity, personal dashboard

**File: `src/components/user-guide/sections/menus/TeamPerformanceMenuSection.tsx`**
- Combines: Ticket Logs, QA Evaluations, Agent Reports, Scorecard, Revalida
- User flow: View metrics, acknowledge QA evals, take assessments

**File: `src/components/user-guide/sections/menus/GeneralSection.tsx`**
- Combines: Authentication, Notifications, Roles & Permissions
- Foundational concepts applicable across menus

---

### Step 2: Create Admin Menu Accordion Components

**File: `src/components/user-guide/sections/admin-menus/UpdatesAdminSection.tsx`**
Contents:
- Creating and editing updates (draft, published, obsolete statuses)
- Question management workflow
- Team acknowledgement tracking

Status Transitions:
```
Update Lifecycle:
Draft --> Published --> Obsolete
```

---

**File: `src/components/user-guide/sections/admin-menus/OutagesAdminSection.tsx`**
Contents:
- Reviewing and approving outage requests
- Override request handling
- Outage statistics and analytics
- Repeat offender identification

Automated Triggers:
| Trigger | Condition | Action |
|---------|-----------|--------|
| Late Login Auto-Request | Agent logs in >10 min after scheduled start | Creates 'for_review' outage request |
| Grace Period Calculation | Start time = schedule + 5 min grace | End time = 1 min before actual login |
| Duplicate Prevention | Same agent, date, reason exists | Skip creation |

Escalation Workflows:
| Source | Trigger | Result |
|--------|---------|--------|
| Agent Report: LATE_LOGIN | Admin clicks "Escalate as Outage" | Creates 'Late Login' outage (for_review) |
| Agent Report: EARLY_OUT/TIME_NOT_MET | Admin clicks "Escalate as Outage" | Creates 'Undertime' outage (for_review) |

Status Transitions:
```
Outage Request Lifecycle:
pending --> approved/declined/canceled
pending_override --> approved/declined
for_review --> approved/declined (auto-generated)
```

---

**File: `src/components/user-guide/sections/admin-menus/PeopleAdminSection.tsx`**
Contents:
- All Bios management
- Master Directory (schedule management)
- Profile change request workflow
- Work configuration editing

Permission Matrix:
| Field Type | Super Admin | Admin | HR |
|------------|-------------|-------|----|
| Personal Info | Edit | View | View |
| Work Configuration | Edit | Edit | View |
| Compensation | Edit | No Access | No Access |

---

**File: `src/components/user-guide/sections/admin-menus/TeamPerformanceAdminSection.tsx`**
Contents:
- QA Evaluation creation and management
- Agent Reports investigation workflow
- Revalida batch creation and grading

Automated Triggers:
| Trigger | Schedule | Action |
|---------|----------|--------|
| Daily Compliance Audit | 5:00 AM UTC (12:00 AM EST) | Scans for violations, generates reports |
| Email Notifications | On report creation | Notifies leadership |
| In-App Notifications | On report creation | Populates Agent Reports hub |

Violation Types:
| Type | Description | Severity |
|------|-------------|----------|
| NO_LOGOUT | Logged in 3+ hours past shift end | High |
| LATE_LOGIN | Logged in >5 min after scheduled start | Medium |
| EARLY_OUT | Logged out before shift end | Medium |
| TIME_NOT_MET | Logged hours < required hours | Medium |
| BIO_OVERUSE | Bio break exceeded allowance | Low |
| EXCESSIVE_RESTARTS | Device restart exceeded 5 min | Low |
| QUOTA_NOT_MET | Daily ticket quota not met | Medium |
| HIGH_GAP | High average gap between tickets | Low |

Agent Report Workflow:
```
Agent Report Actions:
Open --> Escalate as Outage --> Escalated (creates outage request)
Open --> Validate (Coaching) --> Validated
Open --> Dismiss (Invalid) --> Dismissed
```

---

**File: `src/components/user-guide/sections/admin-menus/AdminPanelSection.tsx`**
Contents:
- User creation (single and bulk)
- Role assignment
- Password reset
- Email change
- Deleted user restoration
- Changelog management
- Improvements tracker

Role Hierarchy:
| Role | Can Manage Users | Can Delete Users | Can Edit All Profiles |
|------|-----------------|-----------------|----------------------|
| Super Admin | Yes | Yes | Yes (including compensation) |
| Admin | No | No | Yes (except compensation) |
| HR | No | No | View only |

---

### Step 3: Create Accordion Wrapper Component

**File: `src/components/user-guide/MenuAccordion.tsx`**

```tsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { LucideIcon } from 'lucide-react';

interface MenuAccordionProps {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function MenuAccordion({ id, icon: Icon, title, description, children, defaultOpen }: MenuAccordionProps) {
  return (
    <Accordion type="single" collapsible defaultValue={defaultOpen ? id : undefined}>
      <AccordionItem value={id} className="border rounded-lg mb-4">
        <AccordionTrigger className="px-4 hover:no-underline">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground font-normal">{description}</p>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          {children}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
```

---

### Step 4: Update UserGuideContent.tsx

Replace current linear sections with menu-organized accordions:

```tsx
import { MenuAccordion } from './MenuAccordion';
import { UpdatesMenuSection } from './sections/menus/UpdatesMenuSection';
import { OutagesMenuSection } from './sections/menus/OutagesMenuSection';
import { PeopleMenuSection } from './sections/menus/PeopleMenuSection';
import { TeamPerformanceMenuSection } from './sections/menus/TeamPerformanceMenuSection';
import { GeneralSection } from './sections/menus/GeneralSection';
import { FileText, Clock, Users, BarChart3, Settings } from 'lucide-react';

export function UserGuideContent() {
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">User Guide</h2>
        <p className="text-muted-foreground">
          Complete guide to using the VFS Agent Portal, organized by navigation menu.
        </p>
      </div>

      <MenuAccordion
        id="updates"
        icon={FileText}
        title="Updates Menu"
        description="Updates, Knowledge Base, Update Requests, Help Center"
        defaultOpen
      >
        <UpdatesMenuSection />
      </MenuAccordion>

      <MenuAccordion
        id="outages"
        icon={Clock}
        title="Outages Menu"
        description="Outage Requests, Calendar, My Outage Report"
      >
        <OutagesMenuSection />
      </MenuAccordion>

      <MenuAccordion
        id="people"
        icon={Users}
        title="People Menu"
        description="My Bio, Team Status Board, Dashboard"
      >
        <PeopleMenuSection />
      </MenuAccordion>

      <MenuAccordion
        id="performance"
        icon={BarChart3}
        title="Team Performance Menu"
        description="Ticket Logs, QA Evaluations, Agent Reports, Scorecard, Revalida"
      >
        <TeamPerformanceMenuSection />
      </MenuAccordion>

      <MenuAccordion
        id="general"
        icon={Settings}
        title="General"
        description="Authentication, Notifications, Roles & Permissions"
      >
        <GeneralSection />
      </MenuAccordion>
    </div>
  );
}
```

---

### Step 5: Update AdminGuideContent.tsx

Similar structure with admin-specific content and workflow highlights:

```tsx
import { MenuAccordion } from './MenuAccordion';
import { UpdatesAdminSection } from './sections/admin-menus/UpdatesAdminSection';
import { OutagesAdminSection } from './sections/admin-menus/OutagesAdminSection';
import { PeopleAdminSection } from './sections/admin-menus/PeopleAdminSection';
import { TeamPerformanceAdminSection } from './sections/admin-menus/TeamPerformanceAdminSection';
import { AdminPanelSection } from './sections/admin-menus/AdminPanelSection';
import { FileText, Clock, Users, BarChart3, Settings } from 'lucide-react';

export function AdminGuideContent() {
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Admin Guide</h2>
        <p className="text-muted-foreground">
          Administrative features, workflows, automated triggers, and escalation processes.
        </p>
      </div>

      <MenuAccordion
        id="updates-admin"
        icon={FileText}
        title="Updates Menu (Admin)"
        description="Create updates, manage questions, track acknowledgements"
        defaultOpen
      >
        <UpdatesAdminSection />
      </MenuAccordion>

      <MenuAccordion
        id="outages-admin"
        icon={Clock}
        title="Outages Menu (Admin)"
        description="Review requests, statistics, automated triggers"
      >
        <OutagesAdminSection />
      </MenuAccordion>

      <MenuAccordion
        id="people-admin"
        icon={Users}
        title="People Menu (Admin)"
        description="Profile management, directory, change requests"
      >
        <PeopleAdminSection />
      </MenuAccordion>

      <MenuAccordion
        id="performance-admin"
        icon={BarChart3}
        title="Team Performance (Admin)"
        description="QA management, agent reports, Revalida"
      >
        <TeamPerformanceAdminSection />
      </MenuAccordion>

      <MenuAccordion
        id="admin-panel"
        icon={Settings}
        title="Admin Panel"
        description="User management, roles, changelog, improvements"
      >
        <AdminPanelSection />
      </MenuAccordion>
    </div>
  );
}
```

---

## Visual Design Principles

### Easy on the Eyes
- Use collapsible accordions to reduce information overload
- Color-coded section markers (consistent with existing GuideComponents)
- Generous whitespace and spacing
- Clear visual hierarchy with headings and subheadings

### Comprehensive Yet Scannable
- Quick reference tables for workflows and permissions
- Callout boxes for important notes, tips, and warnings
- Checklists for step-by-step processes
- Status flow diagrams using simple arrows

### Admin-Specific Highlights
- Workflow diagrams showing status transitions
- Automated trigger tables (condition, timing, action)
- Escalation flow documentation
- Permission matrices by role

---

## Files to Create/Modify

| Action | File Path |
|--------|-----------|
| Create | `src/components/user-guide/MenuAccordion.tsx` |
| Create | `src/components/user-guide/sections/menus/UpdatesMenuSection.tsx` |
| Create | `src/components/user-guide/sections/menus/OutagesMenuSection.tsx` |
| Create | `src/components/user-guide/sections/menus/PeopleMenuSection.tsx` |
| Create | `src/components/user-guide/sections/menus/TeamPerformanceMenuSection.tsx` |
| Create | `src/components/user-guide/sections/menus/GeneralSection.tsx` |
| Create | `src/components/user-guide/sections/admin-menus/UpdatesAdminSection.tsx` |
| Create | `src/components/user-guide/sections/admin-menus/OutagesAdminSection.tsx` |
| Create | `src/components/user-guide/sections/admin-menus/PeopleAdminSection.tsx` |
| Create | `src/components/user-guide/sections/admin-menus/TeamPerformanceAdminSection.tsx` |
| Create | `src/components/user-guide/sections/admin-menus/AdminPanelSection.tsx` |
| Modify | `src/components/user-guide/UserGuideContent.tsx` |
| Modify | `src/components/user-guide/AdminGuideContent.tsx` |

---

## Implementation Approach

Due to the size of this feature, I recommend implementing in phases:

**Phase 1**: Create MenuAccordion component + restructure UserGuideContent
**Phase 2**: Create all User Guide menu sections
**Phase 3**: Create all Admin Guide menu sections with workflow documentation
**Phase 4**: Review and refine content, ensure consistency

This phased approach allows you to verify each section before moving forward.

