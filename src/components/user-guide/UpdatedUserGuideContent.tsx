import { MenuAccordion } from './MenuAccordion';
import { Shield, User, LayoutDashboard, Users, BarChart3, Trophy, FileWarning, FileText, AlertTriangle, PieChart, BookOpen } from 'lucide-react';
import { UpdatedRolesSection } from './sections/updated/RolesSection';
import { UpdatedMyBioSection } from './sections/updated/MyBioSection';
import { UpdatedDashboardSection } from './sections/updated/DashboardSection';
import { TeamStatusSection } from './sections/updated/TeamStatusSection';
import { TicketLogsSection } from './sections/updated/TicketLogsSection';
import { TeamScorecardSection } from './sections/updated/TeamScorecardSection';
import { AgentReportsSection } from './sections/updated/AgentReportsSection';
import { RevalidaSection } from './sections/updated/RevalidaSection';
import { OutageRequestsSection } from './sections/updated/OutageRequestsSection';
import { OutageStatsSection } from './sections/updated/OutageStatsSection';
import { UpdatesSection as UpdatedUpdatesSection } from './sections/updated/UpdatesSection';

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

      <MenuAccordion
        id="ticket-logs"
        icon={BarChart3}
        title="Ticket Logs"
        description="Zendesk ticket tracking, average gap analysis, OT productivity, and dashboard UI"
      >
        <TicketLogsSection />
      </MenuAccordion>

      <MenuAccordion
        id="team-scorecard"
        icon={Trophy}
        title="Team Scorecard"
        description="Weekly weighted performance scores, metric goals, admin controls, and save/freeze workflow"
      >
        <TeamScorecardSection />
      </MenuAccordion>

      <MenuAccordion
        id="agent-reports"
        icon={FileWarning}
        title="Agent Reports"
        description="Compliance incident tracking, EOD/EOW analytics, escalation to outage requests, and notification alerts"
      >
        <AgentReportsSection />
      </MenuAccordion>

      <MenuAccordion
        id="revalida"
        icon={FileText}
        title="Revalida"
        description="Weekly knowledge assessments — V1 manual builder, V2 AI-powered generation, grading, and scorecard integration"
      >
        <RevalidaSection />
      </MenuAccordion>

      <MenuAccordion
        id="outage-requests"
        icon={AlertTriangle}
        title="Outage Requests"
        description="Request form, auto-generated requests, conflict detection, override workflow, statuses, audit log, and statistics"
      >
        <OutageRequestsSection />
      </MenuAccordion>

      <MenuAccordion
        id="outage-stats"
        icon={PieChart}
        title="Outage Statistics"
        description="Admin analytics — summary cards, trend charts, reason breakdown, repeat offender tracking with HR policy thresholds, and CSV export"
      >
        <OutageStatsSection />
      </MenuAccordion>

      <MenuAccordion
        id="updates"
        icon={BookOpen}
        title="Updates"
        description="Process updates hub — cards, acknowledgement, categories, questions & threads, create/edit workflow, and admin compliance dashboard"
      >
        <UpdatedUpdatesSection />
      </MenuAccordion>

      {/* Future sections will be added here one at a time */}
    </div>
  );
}
