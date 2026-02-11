import { MenuAccordion } from './MenuAccordion';
import { Shield, User, LayoutDashboard, Users, BarChart3, Trophy, FileWarning, FileText, AlertTriangle, PieChart, BookOpen, Library } from 'lucide-react';
import { MyBioAdminSection } from './sections/updated-admin/MyBioAdminSection';
import { DashboardAdminSection } from './sections/updated-admin/DashboardAdminSection';

export function UpdatedAdminGuideContent() {
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Updated Admin Guide</h2>
        <p className="text-muted-foreground">
          Admin-specific instructions for managing portal features. Each section covers workflows, configurations, and best practices for Admin, HR, and Super Admin roles.
        </p>
      </div>

      <MenuAccordion
        id="admin-roles"
        icon={Shield}
        title="User Roles & Permissions (Admin)"
        description="Role assignment, permission changes, and escalation management"
      >
        <p className="text-sm text-muted-foreground italic">Coming soon — admin role management instructions.</p>
      </MenuAccordion>

      <MenuAccordion
        id="admin-my-bio"
        icon={User}
        title="My Bio / Profile Management (Admin)"
        description="Upwork Contract ID, Zendesk User ID, quotas, breaks, OT configuration, and schedule auto-fill"
        defaultOpen
      >
        <MyBioAdminSection />
      </MenuAccordion>

      <MenuAccordion
        id="admin-dashboard"
        icon={LayoutDashboard}
        title="Agent Dashboard (Admin)"
        description="Monitoring agent dashboards, violation alerts, and compliance incident triggers"
      >
        <DashboardAdminSection />
      </MenuAccordion>

      <MenuAccordion
        id="admin-team-status"
        icon={Users}
        title="Team Status Board (Admin)"
        description="Admin view of the board, overnight shift visibility, and status management"
      >
        <p className="text-sm text-muted-foreground italic">Coming soon — team status admin instructions.</p>
      </MenuAccordion>

      <MenuAccordion
        id="admin-ticket-logs"
        icon={BarChart3}
        title="Ticket Logs (Admin)"
        description="Admin analytics, gap analysis interpretation, and data management"
      >
        <p className="text-sm text-muted-foreground italic">Coming soon — ticket logs admin instructions.</p>
      </MenuAccordion>

      <MenuAccordion
        id="admin-team-scorecard"
        icon={Trophy}
        title="Team Scorecard (Admin)"
        description="Save/freeze workflow, manual metric overrides, refresh cache, and configuration"
      >
        <p className="text-sm text-muted-foreground italic">Coming soon — scorecard admin instructions.</p>
      </MenuAccordion>

      <MenuAccordion
        id="admin-agent-reports"
        icon={FileWarning}
        title="Agent Reports (Admin)"
        description="EOD/EOW analytics, escalation to outage requests, validation vs dismissal"
      >
        <p className="text-sm text-muted-foreground italic">Coming soon — agent reports admin instructions.</p>
      </MenuAccordion>

      <MenuAccordion
        id="admin-revalida"
        icon={FileText}
        title="Revalida (Admin)"
        description="Batch management, V2 AI-powered generation, grading queue, and scorecard integration"
      >
        <p className="text-sm text-muted-foreground italic">Coming soon — revalida admin instructions.</p>
      </MenuAccordion>

      <MenuAccordion
        id="admin-outage-requests"
        icon={AlertTriangle}
        title="Outage Requests (Admin)"
        description="Review workflow, override process, automated triggers, and conflict detection"
      >
        <p className="text-sm text-muted-foreground italic">Coming soon — outage requests admin instructions.</p>
      </MenuAccordion>

      <MenuAccordion
        id="admin-outage-stats"
        icon={PieChart}
        title="Outage Statistics (Admin)"
        description="Analytics interpretation, repeat offender thresholds, and HR policy enforcement"
      >
        <p className="text-sm text-muted-foreground italic">Coming soon — outage stats admin instructions.</p>
      </MenuAccordion>

      <MenuAccordion
        id="admin-updates"
        icon={BookOpen}
        title="Updates (Admin)"
        description="Create/edit updates, compliance dashboard, acknowledgement tracking"
      >
        <p className="text-sm text-muted-foreground italic">Coming soon — updates admin instructions.</p>
      </MenuAccordion>

      <MenuAccordion
        id="admin-knowledge-base"
        icon={Library}
        title="Knowledge Base (Admin)"
        description="Article management, playbook creation, and category organization"
      >
        <p className="text-sm text-muted-foreground italic">Coming soon — knowledge base admin instructions.</p>
      </MenuAccordion>
    </div>
  );
}
