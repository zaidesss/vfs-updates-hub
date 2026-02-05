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
        description="Review requests, statistics, automated triggers, escalations"
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
        description="QA management, agent reports, Revalida batches"
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
