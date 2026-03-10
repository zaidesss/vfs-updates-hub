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
          Complete guide to using the Agent Portal, organized by navigation menu.
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
