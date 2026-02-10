import { MenuAccordion } from './MenuAccordion';
import { Shield, User, LayoutDashboard, Users } from 'lucide-react';
import { UpdatedRolesSection } from './sections/updated/RolesSection';
import { UpdatedMyBioSection } from './sections/updated/MyBioSection';
import { UpdatedDashboardSection } from './sections/updated/DashboardSection';
import { TeamStatusSection } from './sections/updated/TeamStatusSection';

export function UpdatedUserGuideContent() {
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Updated User Guide</h2>
        <p className="text-muted-foreground">
          Extremely detailed, step-by-step documentation for every portal feature. Each section includes image placeholders where screenshots will be added.
        </p>
      </div>

      <MenuAccordion
        id="roles"
        icon={Shield}
        title="User Roles & Permissions"
        description="Role definitions, feature access matrix, restrictions, and escalation rules"
      >
        <UpdatedRolesSection />
      </MenuAccordion>

      <MenuAccordion
        id="my-bio"
        icon={User}
        title="My Bio (Profile)"
        description="Personal info, locked work configuration fields, compensation, and how values feed automations"
      >
        <UpdatedMyBioSection />
      </MenuAccordion>

      <MenuAccordion
        id="dashboard"
        icon={LayoutDashboard}
        title="Agent Dashboard"
        description="Status buttons, profile events timeline, shift schedule, weekly summary, violations, and day selector"
      >
        <UpdatedDashboardSection />
      </MenuAccordion>

      <MenuAccordion
        id="team-status"
        icon={Users}
        title="Team Status Board"
        description="Real-time schedule-based visibility, category groupings, status cards, sorting, and Live Activity Feed"
      >
        <TeamStatusSection />
      </MenuAccordion>

      {/* Future sections will be added here one at a time */}
    </div>
  );
}
