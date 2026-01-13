import { AuthenticationSection } from './sections/AuthenticationSection';
import { NavigationSection } from './sections/NavigationSection';
import { UpdatesSection } from './sections/UpdatesSection';
import { QuestionsSection } from './sections/QuestionsSection';
import { LeaveRequestSection } from './sections/LeaveRequestSection';
import { CalendarSection } from './sections/CalendarSection';
import { OutageStatsSection } from './sections/OutageStatsSection';
import { KnowledgeBaseSection } from './sections/KnowledgeBaseSection';
import { ActivitySection } from './sections/ActivitySection';
import { ProfileSection } from './sections/ProfileSection';
import { NotificationsSection } from './sections/NotificationsSection';
import { RolesSection } from './sections/RolesSection';
import { EmailNotificationsSection } from './sections/EmailNotificationsSection';
import { QuickReferenceSection } from './sections/QuickReferenceSection';
import { ChangelogSection } from './sections/ChangelogSection';

export function UserGuideContent() {
  return (
    <div className="space-y-6">
      {/* Authentication */}
      <AuthenticationSection />
      
      {/* Navigation */}
      <NavigationSection />
      
      {/* Updates */}
      <UpdatesSection />
      
      {/* Questions */}
      <QuestionsSection />
      
      {/* Leave Requests */}
      <LeaveRequestSection />
      
      {/* Calendar */}
      <CalendarSection />
      
      {/* Outage Stats */}
      <OutageStatsSection />
      
      {/* Knowledge Base */}
      <KnowledgeBaseSection />
      
      {/* Activity */}
      <ActivitySection />
      
      {/* Profile */}
      <ProfileSection />
      
      {/* Changelog / What's New */}
      <ChangelogSection />
      
      {/* Notifications */}
      <NotificationsSection />
      
      {/* Roles and Permissions */}
      <RolesSection />
      
      {/* Email Notifications */}
      <EmailNotificationsSection />
      
      {/* Quick Reference */}
      <QuickReferenceSection />
    </div>
  );
}
