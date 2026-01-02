import { useState, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Printer, Download, User, Shield, CheckCircle, Info, AlertTriangle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

// Section marker component
function SectionMarker({ letter, color }: { letter: string; color: string }) {
  return (
    <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-white font-bold text-sm', color)}>
      {letter}
    </div>
  );
}

// Callout box component
function CalloutBox({ 
  variant, 
  title, 
  children 
}: { 
  variant: 'info' | 'tip' | 'warning' | 'success';
  title?: string;
  children: React.ReactNode;
}) {
  const styles = {
    info: { bg: 'bg-blue-50 border-blue-200', icon: Info, iconColor: 'text-blue-600' },
    tip: { bg: 'bg-purple-50 border-purple-200', icon: Lightbulb, iconColor: 'text-purple-600' },
    warning: { bg: 'bg-amber-50 border-amber-200', icon: AlertTriangle, iconColor: 'text-amber-600' },
    success: { bg: 'bg-green-50 border-green-200', icon: CheckCircle, iconColor: 'text-green-600' },
  };

  const style = styles[variant];
  const Icon = style.icon;

  return (
    <div className={cn('rounded-lg border p-4 my-4', style.bg)}>
      <div className="flex gap-3">
        <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', style.iconColor)} />
        <div>
          {title && <p className="font-semibold mb-1">{title}</p>}
          <div className="text-sm text-muted-foreground">{children}</div>
        </div>
      </div>
    </div>
  );
}

// Checklist component
function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 my-4">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{item}</span>
        </li>
      ))}
    </ul>
  );
}

// Section component
function GuideSection({ 
  letter, 
  color, 
  title, 
  children 
}: { 
  letter: string; 
  color: string; 
  title: string; 
  children: React.ReactNode;
}) {
  return (
    <section id={`section-${letter.toLowerCase()}`} className="mb-8 scroll-mt-24">
      <div className="flex items-center gap-3 mb-4">
        <SectionMarker letter={letter} color={color} />
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      <div className="pl-11">{children}</div>
    </section>
  );
}

// Quick reference table component
function QuickTable({ 
  headers, 
  rows 
}: { 
  headers: string[]; 
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted">
            {headers.map((header, i) => (
              <th key={i} className="border border-border px-3 py-2 text-left font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
              {row.map((cell, j) => (
                <td key={j} className="border border-border px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// User Guide Content for Regular Users
function UserGuideContent() {
  return (
    <div className="space-y-6">
      <GuideSection letter="A" color="bg-blue-500" title="Getting Started">
        <p className="text-muted-foreground mb-4">
          The VFS Agent Portal is designed to keep all team members informed about important updates, 
          outage schedules, and company knowledge. Here is how the portal is accessed and navigated.
        </p>
        
        <h3 className="font-semibold mb-2">Logging In</h3>
        <Checklist items={[
          "The login page is accessed by visiting the portal URL.",
          "Your email address and password are entered in the form.",
          "The 'Sign In' button is clicked to access the portal.",
          "If a password is forgotten, the 'Forgot Password' link is used to reset it.",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Changing Your Password</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Passwords can be changed at any time by clicking the key icon in the header. 
          A new password is entered and confirmed.
        </p>

        <CalloutBox variant="tip" title="First-Time Users">
          If this is your first login, you may be asked to change your password. 
          A strong password with at least 8 characters is recommended.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="B" color="bg-teal-500" title="Viewing Updates">
        <p className="text-muted-foreground mb-4">
          Updates are posted by administrators to share important information with the team. 
          All updates are displayed on the Updates page.
        </p>

        <h3 className="font-semibold mb-2">How Updates Are Viewed</h3>
        <Checklist items={[
          "The 'Updates' option is selected from the navigation menu.",
          "Updates are displayed as cards with titles and summaries.",
          "An update card is clicked to view the full details.",
          "Categories can be used to filter updates by topic.",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Acknowledging Updates</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Some updates require acknowledgment. When an update is read and understood, 
          the 'Acknowledge' button is clicked. This confirms that the information has been received.
        </p>

        <CalloutBox variant="info">
          Acknowledgments are tracked, and reminders may be sent if an update is not acknowledged 
          before its deadline.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="C" color="bg-purple-500" title="Asking Questions">
        <p className="text-muted-foreground mb-4">
          Questions can be asked on any update if clarification is needed. 
          All questions are visible to administrators and HR.
        </p>

        <h3 className="font-semibold mb-2">Submitting a Question</h3>
        <Checklist items={[
          "The update is opened by clicking on it.",
          "The 'Ask a Question' section is found at the bottom.",
          "The question is typed in the text box.",
          "The 'Submit' button is clicked to send the question.",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Question Status Guide</h3>
        <QuickTable 
          headers={['Status', 'What It Means', 'Your Action']}
          rows={[
            ['Pending', 'Your question is waiting for a response', 'Wait for an admin to reply'],
            ['On-Going', 'A conversation is in progress', 'Check for new replies and respond if needed'],
            ['Answered', 'The question has been resolved', 'No action needed'],
          ]}
        />

        <CalloutBox variant="tip" title="Marking as Answered">
          When your question is resolved, click the 'Mark as Answered' button. 
          This helps administrators know that no further response is needed.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="D" color="bg-orange-500" title="Outage Requests">
        <p className="text-muted-foreground mb-4">
          Outage requests are used to notify the team about planned absences. 
          All requests are reviewed by HR and administrators.
        </p>

        <h3 className="font-semibold mb-2">Submitting an Outage Request</h3>
        <Checklist items={[
          "The 'Outage Requests' option is selected from the Outages menu.",
          "The 'Submit Outage' button is clicked.",
          "All required fields are filled in: dates, times, and reason.",
          "Supporting documents are attached if required.",
          "The request is submitted and awaits approval.",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Tracking Request Status</h3>
        <QuickTable 
          headers={['Status', 'What It Means']}
          rows={[
            ['Pending', 'Your request is being reviewed'],
            ['Approved', 'Your outage has been approved'],
            ['Declined', 'Your request was not approved (see notes)'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Viewing the Outage Calendar</h3>
        <p className="text-sm text-muted-foreground">
          All approved outages are displayed on the Outage Calendar. 
          This calendar is accessed by selecting 'Outage Calendar' from the Outages menu.
        </p>
      </GuideSection>

      <GuideSection letter="E" color="bg-green-500" title="Notifications">
        <p className="text-muted-foreground mb-4">
          Notifications are used to alert you about important events. 
          The notification bell in the header shows unread notifications.
        </p>

        <h3 className="font-semibold mb-2">Types of Notifications</h3>
        <QuickTable 
          headers={['Notification', 'When It Is Sent']}
          rows={[
            ['New Update', 'When a new update is published'],
            ['Question Reply', 'When an admin responds to your question'],
            ['Outage Decision', 'When your outage request is approved or declined'],
            ['Reminder', 'When an update deadline is approaching'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Managing Notification Preferences</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Notification preferences can be managed by clicking the settings icon in the notification panel. 
          Email and in-app notifications can be turned on or off.
        </p>

        <CalloutBox variant="warning">
          Important system notifications cannot be disabled. These are used for critical updates 
          and security alerts.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="F" color="bg-rose-500" title="Knowledge Base">
        <p className="text-muted-foreground mb-4">
          The Knowledge Base contains articles and guides organized by category. 
          These resources are available for reference at any time.
        </p>

        <h3 className="font-semibold mb-2">Using the Knowledge Base</h3>
        <Checklist items={[
          "The 'Knowledge Base' option is selected from the Updates menu.",
          "Categories are browsed to find relevant articles.",
          "A category is clicked to view all articles within it.",
          "An article is opened by clicking on its title.",
        ]} />
      </GuideSection>
    </div>
  );
}

// Admin Guide Content
function AdminGuideContent() {
  return (
    <div className="space-y-6">
      <GuideSection letter="A" color="bg-blue-500" title="Managing Updates">
        <p className="text-muted-foreground mb-4">
          Updates are created and managed through the Admin Panel. 
          New updates can be published, and existing updates can be edited.
        </p>

        <h3 className="font-semibold mb-2">Creating a New Update</h3>
        <Checklist items={[
          "The 'Admin Panel' is opened from the Admin menu.",
          "The 'Create Update' button is clicked.",
          "A title and summary are entered for the update.",
          "The body content is written using the editor.",
          "A category is selected for the update.",
          "An optional deadline is set if acknowledgment is required.",
          "The update is saved as a draft or published immediately.",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Update Statuses</h3>
        <QuickTable 
          headers={['Status', 'What It Means', 'Visibility']}
          rows={[
            ['Draft', 'The update is being prepared', 'Only visible to admins'],
            ['Published', 'The update is live', 'Visible to all users'],
            ['Obsolete', 'The update is no longer relevant', 'Hidden from main list'],
          ]}
        />

        <CalloutBox variant="info">
          When an update is published, notifications are automatically sent to all users. 
          Ensure the content is finalized before publishing.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="B" color="bg-teal-500" title="Responding to Questions">
        <p className="text-muted-foreground mb-4">
          User questions are reviewed and answered through the question thread system. 
          All pending questions are displayed in the Admin Panel.
        </p>

        <h3 className="font-semibold mb-2">Answering a Question</h3>
        <Checklist items={[
          "The question thread is opened by clicking on it.",
          "The question and any previous replies are reviewed.",
          "A response is typed in the reply box.",
          "The 'Send Reply' button is clicked to post the response.",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Managing Question Status</h3>
        <QuickTable 
          headers={['Action', 'When To Use It']}
          rows={[
            ['Mark as Answered', 'When the question has been fully resolved'],
            ['Mark as Closed', 'When the thread should be permanently closed'],
            ['Keep On-Going', 'When further discussion may be needed'],
          ]}
        />

        <CalloutBox variant="warning" title="Closing a Thread">
          When a thread is marked as 'Closed', no further replies can be added by anyone. 
          This action should only be used when the conversation is complete.
        </CalloutBox>

        <CalloutBox variant="tip">
          Users are notified when their question status is changed. 
          Clear communication helps users understand when their questions are resolved.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="C" color="bg-purple-500" title="Processing Outage Requests">
        <p className="text-muted-foreground mb-4">
          Outage requests are reviewed and approved or declined through the Outage Requests page. 
          All pending requests are displayed for review.
        </p>

        <h3 className="font-semibold mb-2">Reviewing a Request</h3>
        <Checklist items={[
          "The 'Outage Requests' page is opened from the Outages menu.",
          "Pending requests are reviewed one by one.",
          "The request details are examined (dates, reason, attachments).",
          "The 'Approve' or 'Decline' button is clicked.",
          "Notes are added if declining to explain the reason.",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Multi-Stage Approvals</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Some requests may require multiple approvals. The approval process is tracked, 
          and the next approver is notified automatically.
        </p>

        <h3 className="font-semibold mb-2 mt-4">Viewing Outage Statistics</h3>
        <p className="text-sm text-muted-foreground">
          Outage statistics are available through the 'Outage Statistics' page. 
          Reports can be filtered by date range, client, and agent.
        </p>
      </GuideSection>

      <GuideSection letter="D" color="bg-orange-500" title="Update Requests">
        <p className="text-muted-foreground mb-4">
          Users can submit requests for new articles or updates to existing content. 
          These requests are reviewed and processed by administrators.
        </p>

        <h3 className="font-semibold mb-2">Processing a Request</h3>
        <Checklist items={[
          "The 'Update Requests' page is opened from the Updates menu.",
          "Pending requests are reviewed.",
          "The request details and sample tickets are examined.",
          "The request is approved or rejected with notes.",
          "If approved, the corresponding update or article is created.",
        ]} />

        <CalloutBox variant="info">
          Request approvals may require multiple stages depending on the configuration. 
          Each approver is notified when it is their turn to review.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="E" color="bg-green-500" title="Agent Profile Management">
        <p className="text-muted-foreground mb-4">
          Agent profiles contain personal and work information. 
          These profiles can be viewed and managed through the People menu.
        </p>

        <h3 className="font-semibold mb-2">Viewing All Profiles</h3>
        <Checklist items={[
          "The 'All Bios' option is selected from the People menu.",
          "Agent profiles are displayed in a list.",
          "A profile is clicked to view full details.",
          "Profile information can be updated if needed.",
        ]} />
      </GuideSection>

      <GuideSection letter="F" color="bg-rose-500" title="Admin Tools">
        <p className="text-muted-foreground mb-4">
          The Admin Panel provides access to various administrative tools and settings.
        </p>

        <h3 className="font-semibold mb-2">Available Admin Functions</h3>
        <QuickTable 
          headers={['Tool', 'Purpose']}
          rows={[
            ['User Management', 'Create and manage user accounts'],
            ['Update Dashboard', 'View acknowledgment statistics'],
            ['Failed Emails', 'Review failed email notifications'],
            ['Activity Log', 'Track user activity and changes'],
          ]}
        />

        <CalloutBox variant="warning" title="Failed Email Digest">
          A daily digest of failed email notifications is sent to HR at 9 AM EST. 
          This report helps identify email delivery issues.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="G" color="bg-amber-500" title="Quick Reference">
        <h3 className="font-semibold mb-2">Notification Types Sent by System</h3>
        <QuickTable 
          headers={['Notification', 'Recipients', 'Trigger']}
          rows={[
            ['New Update Published', 'All users', 'Update is published'],
            ['Question Submitted', 'HR and Admins', 'User asks a question'],
            ['Question Reply', 'Original asker', 'Admin responds'],
            ['Question Status Changed', 'Original asker', 'Status is updated'],
            ['Outage Request Submitted', 'HR and Admins', 'Request is submitted'],
            ['Outage Decision', 'Submitter', 'Request is approved/declined'],
            ['Approval Stage', 'Next approver', 'Multi-stage approval progresses'],
          ]}
        />
      </GuideSection>
    </div>
  );
}

export default function UserGuide() {
  const [activeTab, setActiveTab] = useState('users');
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Layout>
      {/* Print styles */}
      <style>{`
        @media print {
          header, nav, .print-hide, button {
            display: none !important;
          }
          main {
            padding: 0 !important;
          }
          .print-show {
            display: block !important;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">User Guide</h1>
            <p className="text-muted-foreground mt-1">
              A complete guide to using the VFS Agent Portal
            </p>
          </div>
          <div className="flex gap-2 print-hide">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Download className="h-4 w-4 mr-2" />
              Save as PDF
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 print-hide">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              For Users
            </TabsTrigger>
            <TabsTrigger value="admins" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              For Admins
            </TabsTrigger>
          </TabsList>

          {/* Print header showing which tab */}
          <div className="hidden print-show mb-4">
            <Badge variant="outline" className="text-lg px-4 py-2">
              {activeTab === 'users' ? 'User Guide' : 'Admin Guide'}
            </Badge>
          </div>

          <Card>
            <CardContent className="pt-6" ref={contentRef}>
              <TabsContent value="users" className="mt-0">
                <UserGuideContent />
              </TabsContent>
              <TabsContent value="admins" className="mt-0">
                <AdminGuideContent />
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>

        {/* Footer note */}
        <p className="text-center text-sm text-muted-foreground mt-6 print-hide">
          Last updated: January 2026
        </p>
      </div>
    </Layout>
  );
}
