import { AdminPanelSection } from './sections/admin/AdminPanelSection';
import { QuestionsManagementSection } from './sections/admin/QuestionsManagementSection';
import { UserManagementSection } from './sections/admin/UserManagementSection';
import { ArticleRequestsSection } from './sections/admin/ArticleRequestsSection';
import { DashboardSection } from './sections/admin/DashboardSection';
import { ChangelogManagementSection } from './sections/admin/ChangelogManagementSection';
import { ProfileChangeRequestsSection } from './sections/admin/ProfileChangeRequestsSection';
import { OutageStatsSection } from './sections/OutageStatsSection';
import { RolesSection } from './sections/RolesSection';
import { EmailNotificationsSection } from './sections/EmailNotificationsSection';
import { QuickReferenceSection } from './sections/QuickReferenceSection';

export function AdminGuideContent() {
  return (
    <div className="space-y-6">
      {/* Admin Panel */}
      <AdminPanelSection />
      
      {/* Questions Management */}
      <QuestionsManagementSection />
      
      {/* User Management */}
      <UserManagementSection />
      
      {/* Article Requests */}
      <ArticleRequestsSection />
      
      {/* Dashboard */}
      <DashboardSection />
      
      {/* Changelog Management (Super Admin) */}
      <ChangelogManagementSection />
      
      {/* Profile Change Requests (Super Admin) */}
      <ProfileChangeRequestsSection />
      
      {/* Outage Stats (shared with user guide but relevant for admins) */}
      <OutageStatsSection />
      
      {/* Roles and Permissions */}
      <RolesSection />
      
      {/* Email Notifications */}
      <EmailNotificationsSection />
      
      {/* Quick Reference */}
      <QuickReferenceSection />
    </div>
  );
}
