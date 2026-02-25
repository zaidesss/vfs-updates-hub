import { GuideSection, CalloutBox, QuickTable } from '../../GuideComponents';
import { GuideImagePlaceholder } from '../../GuideImagePlaceholder';

export function UpdatedMyBioSection() {
  return (
    <>
      {/* PART 1: OVERVIEW */}
      <GuideSection letter="1" color="bg-blue-600" title="My Bio (Profile) — Overview">
        <p className="text-muted-foreground mb-4">
          Your <strong>Bio</strong> (Profile) page is the central record for all your personal and work information. It is divided into sections, some of which you can edit freely and others that are <strong>locked</strong> and managed by Admins or Super Admins.
        </p>
        <p className="text-muted-foreground mb-4">
          <strong>Why it matters:</strong> Many values in your Bio directly feed into automated systems across the portal — your schedule determines when you appear on the Team Status Board, your quotas determine your Scorecard targets, and your Zendesk instance determines which ticket logs you see.
        </p>

        <GuideImagePlaceholder description="Screenshot: Full Bio page showing the profile card with name, email, and all sections collapsed" />

        <CalloutBox variant="warning" title="Important: Locked Fields">
          Fields marked with a 🔒 lock icon are <strong>read-only for regular users</strong>. Only Admins or Super Admins can edit them. If you need a locked field changed, use the <strong>"Request Change"</strong> button to submit a Profile Change Request.
        </CalloutBox>
      </GuideSection>

      {/* PART 2: USER-EDITABLE SECTIONS */}
      <GuideSection letter="2" color="bg-blue-600" title="Sections You CAN Edit (All Roles)">
        <p className="text-muted-foreground mb-4">
          The following sections are fully editable by all users, regardless of role. Fill these out as completely as possible.
        </p>

        <h3 className="font-semibold text-base mb-3">Section 1: Personal Information</h3>
        <QuickTable
          headers={['Field', 'Description', 'Required?']}
          rows={[
            ['Full Name', 'Your complete legal name. Displayed on your profile card and in various reports.', 'Yes'],
            ['Phone Number', 'Your mobile number. Used for emergency contact purposes.', 'Recommended'],
            ['Birthday', 'Your date of birth. Date picker format.', 'Optional'],
            ['Home Address', 'Your complete residential address. Textarea for multi-line input.', 'Recommended'],
          ]}
        />

        <h3 className="font-semibold text-base mb-3 mt-6">Section 2: Emergency Contact</h3>
        <QuickTable
          headers={['Field', 'Description', 'Required?']}
          rows={[
            ['Contact Name', 'Name of the person to contact in an emergency.', 'Recommended'],
            ['Contact Phone', 'Phone number of your emergency contact.', 'Recommended'],
          ]}
        />

        <h3 className="font-semibold text-base mb-3 mt-6">Section 3: Connectivity & Technical Setup</h3>
        <QuickTable
          headers={['Field', 'Description', 'Required?']}
          rows={[
            ['Primary Internet Provider', 'Your main ISP (e.g., PLDT, Globe, Converge).', 'Recommended'],
            ['Primary Internet Speed', 'Speed of your primary connection (e.g., 100 Mbps).', 'Recommended'],
            ['Backup Internet Provider', 'Your fallback ISP or mobile data provider.', 'Recommended'],
            ['Backup Internet Speed', 'Speed of your backup connection.', 'Optional'],
            ['Backup Internet Type', 'Type of backup: Mobile Data, Neighbor\'s WiFi, Backup Fiber, Pocket WiFi, Other.', 'Recommended'],
            ['Headset Model', 'Your headset model (especially important for hybrid/phone agents).', 'Optional'],
          ]}
        />

        <h3 className="font-semibold text-base mb-3 mt-6">Section 4: Banking Information</h3>
        <QuickTable
          headers={['Field', 'Description', 'Required?']}
          rows={[
            ['Bank Name', 'The bank where your payroll is deposited (e.g., BDO, BPI, Metrobank).', 'Required'],
            ['Account Holder Name', 'The name on your bank account — must match exactly.', 'Required'],
            ['Account Number', 'Your bank account number for payment deposits.', 'Required'],
          ]}
        />

        <h3 className="font-semibold text-base mb-3 mt-6">Section 5: Freelance Profiles</h3>
        <QuickTable
          headers={['Field', 'Description', 'Required?']}
          rows={[
            ['Upwork Username', 'Your Upwork login username.', 'If applicable'],
            ['Upwork Profile URL', 'Full URL to your Upwork profile page.', 'If applicable'],
          ]}
        />

        <GuideImagePlaceholder description="Screenshot: Personal Information section with all editable fields visible" />
      </GuideSection>

      {/* PART 3: LOCKED FIELDS — WORK CONFIGURATION */}
      <GuideSection letter="3" color="bg-blue-600" title="Locked Fields — Work Configuration (Admin/Super Admin Only)">
        <p className="text-muted-foreground mb-4">
          The <strong>Work Configuration</strong> section contains fields that directly control how the portal behaves for you. These are <strong>locked for regular users</strong> and can only be edited by Admins or Super Admins. Each field below explains <strong>what it controls</strong> in the system.
        </p>

        <CalloutBox variant="info" title="Why These Are Locked">
          These values feed into automated systems (schedules, ticket assignment, quotas, scorecard calculations). Incorrect values would break automations across the entire portal, so only authorized personnel can modify them.
        </CalloutBox>

        <h3 className="font-semibold text-base mb-3 mt-4">Identity & Assignment Fields</h3>
        <QuickTable
          headers={['Field', 'What It Controls', 'Who Can Edit']}
          rows={[
            ['Position / Role', 'Now a multi-select array. Determines your default Views, Support Type, Ticket Assignment View ID, and which Quota fields are shown. Options: Email, Chat, Phone, Team Lead, Logistics, Technical. Agents with multiple roles (e.g., Email + Chat) are automatically resolved.', 'Admin, Super Admin'],
            ['Agent Name', 'The display name used in reports, Team Status Board cards, and ticket matching. Auto-defaults from your first name.', 'Admin, Super Admin'],
            ['Agent Tag', 'Auto-computed lowercase of Agent Name. Used internally to match Zendesk ticket data to your profile. READ-ONLY — cannot be manually edited by anyone.', 'System (auto-computed)'],
            ['Zendesk Instance', 'Determines which Zendesk environment (ZD1 or ZD2) your tickets come from. Controls which Ticket Logs data you see.', 'Admin, Super Admin'],
            ['Support Account', 'Your assigned support account number (1–17). Used for grouping on Team Status Board.', 'Admin, Super Admin'],
            ['Support Type', 'Types of support you handle: Email, Chat, Phone. For Hybrid positions, multiple types can be selected. For other positions, it is auto-set and locked.', 'Admin, Super Admin (Hybrid only allows multi-select)'],
            ['Views', 'Auto-set based on Position. Determines which Zendesk views your tickets are pulled from. READ-ONLY badge display.', 'System (auto-set from Position)'],
            ['Upwork Contract ID', 'Links your profile to an Upwork contract for automatic hour tracking. When set, Dashboard shows "Time Logged (Upwork)" alongside portal hours.', 'Admin, Super Admin'],
            ['Zendesk User ID', 'Your numeric Zendesk user ID. Used for API calls to fetch your ticket metrics (AHT, FRT, etc.) for Scorecard.', 'Admin, Super Admin'],
          ]}
        />

        <GuideImagePlaceholder description="Screenshot: Work Configuration section showing Position dropdown, Agent Name, Zendesk Instance, and Support Type fields — all with lock icons for regular users" />

        <h3 className="font-semibold text-base mb-3 mt-6">Productivity (Quota) Fields</h3>
        <p className="text-muted-foreground mb-2">
          Quotas set your <strong>weekly ticket targets</strong>. These values appear directly on your Scorecard and determine whether you meet, exceed, or fall below expectations.
        </p>
        <QuickTable
          headers={['Field', 'What It Controls', 'Visible When']}
          rows={[
            ['Email Quota', 'Weekly email ticket target. Compared against your actual ticket count in Scorecard.', 'Position includes Email support'],
            ['Chat Quota', 'Weekly chat ticket target.', 'Position includes Chat support'],
            ['Phone Quota', 'Weekly phone call target.', 'Position includes Phone support'],
            ['OT Email Quota', 'Overtime email ticket target (separate from regular quota).', 'OT is enabled'],
          ]}
        />

        <CalloutBox variant="warning" title="Quota Impact on Scorecard">
          If your quota is set to <strong>0 or null</strong>, your Scorecard will show <strong>N/A</strong> for that metric. Make sure your Admin has set accurate quotas — they directly affect your performance score.
        </CalloutBox>

        <h3 className="font-semibold text-base mb-3 mt-6">Schedule Fields</h3>
        <p className="text-muted-foreground mb-2">
          Your daily schedules determine <strong>when you appear on the Team Status Board</strong>, <strong>when you're expected to log in</strong>, and <strong>what counts as Late Login or Early Logout</strong> on your Dashboard.
        </p>
        <QuickTable
          headers={['Field', 'What It Controls', 'Format']}
          rows={[
            ['Mon–Sun Schedule', 'Your regular shift for each day. If a day is marked as Day Off, schedule is auto-cleared.', 'H:MM AM-H:MM PM (e.g., 8:00 AM-5:00 PM)'],
            ['Break Schedule', 'Your daily break window. Deducted from total weekly hours and used in gap analysis to exclude break time.', 'Same format as shift'],
            ['Day Off', 'Checkbox for each day. When checked, that day\'s schedule field is locked and shows "Day Off". Affects Total Hours calculation.', 'Checkbox (Mon–Sun)'],
            ['OT Enabled', 'Toggle to enable overtime scheduling. When ON, OT schedule fields appear.', 'Toggle switch'],
            ['Mon–Sun OT Schedule', 'Overtime shift for each day. Must NOT overlap with regular shift (validated on save). OT hours are added to Total Hours.', 'Same format, must start after regular shift ends'],
          ]}
        />

        <CalloutBox variant="tip" title="Schedule Auto-Fill Behavior">
          When you change <strong>Monday's schedule</strong>, it automatically fills Tuesday through Friday (unless those days are marked as Day Off). Similarly, changing <strong>Saturday's schedule</strong> auto-fills Sunday. This saves time when most weekdays or weekends share the same shift.
        </CalloutBox>

        <h3 className="font-semibold text-base mb-3 mt-6">Total Hours Display (Read-Only)</h3>
        <p className="text-muted-foreground mb-2">
          At the top of the Work Configuration section, a summary card shows your calculated weekly hours:
        </p>
        <QuickTable
          headers={['Metric', 'How It\'s Calculated']}
          rows={[
            ['Weekday Total', 'Sum of Mon–Fri shift durations (excluding Day Off days).'],
            ['Weekend Total', 'Sum of Sat–Sun shift durations (excluding Day Off days).'],
            ['OT Total', 'Sum of all OT shift durations (only when OT is enabled).'],
            ['Break Deduction', 'Break schedule duration × number of working days. Subtracted from total.'],
            ['Overall Total', 'Weekday + Weekend + OT − Break Deduction. This value syncs to Master Directory and determines your Upwork weekly limit.'],
          ]}
        />

        <GuideImagePlaceholder description="Screenshot: Total Hours summary card showing Weekday, Weekend, OT, Break Deduction, and Overall Total" />

        <h3 className="font-semibold text-base mb-3 mt-6">Additional Locked Fields</h3>
        <QuickTable
          headers={['Field', 'What It Controls', 'Who Can Edit']}
          rows={[
            ['Team Lead', 'Your assigned team lead. Shown on your profile and used in leave request routing.', 'Admin, Super Admin'],
            ['Client(s)', 'The client account(s) you support (e.g., VFS Global).', 'Admin, Super Admin'],
            ['Employment Status', 'Options: Active, Probationary, Training, Terminated, Resigned. "Terminated" agents are excluded from Master Directory and all automated processes.', 'Admin, Super Admin'],
            ['Start Date', 'Your employment start date. Used to calculate "Days Employed" counter on your profile.', 'Admin, Super Admin'],
          ]}
        />

        <GuideImagePlaceholder description="Screenshot: Team Lead, Clients, Employment Status, and Start Date fields with lock icons, plus Days Employed counter" />
      </GuideSection>

      {/* PART 4: COMPENSATION (SUPER ADMIN ONLY) */}
      <GuideSection letter="4" color="bg-blue-600" title="Compensation Section (Super Admin Only)">
        <p className="text-muted-foreground mb-4">
          The Compensation section is the <strong>most restricted</strong> area of the Bio. Only <strong>Super Admins</strong> can view and edit these fields. Regular users and Admins see this section as locked with a "Request Change" button.
        </p>

        <QuickTable
          headers={['Field', 'Description', 'Who Can Edit']}
          rows={[
            ['Payment Frequency', 'How often you are paid: Weekly, Bi-weekly, or Monthly.', 'Super Admin only'],
            ['Current Hourly Rate ($)', 'Your current pay rate in USD. Displayed with a $ prefix.', 'Super Admin only'],
            ['Rate History (Progressions)', 'Up to 6 date/rate entries tracking your pay progression over time.', 'Super Admin only'],
          ]}
        />

        <CalloutBox variant="warning" title="Compensation Restriction">
          Even Admins <strong>cannot</strong> view or edit compensation data. This is exclusively available to Super Admins. If you need a change to your compensation details, use the "Request Change" button which submits a formal Profile Change Request.
        </CalloutBox>

        <GuideImagePlaceholder description="Screenshot: Compensation section showing Payment Frequency, Hourly Rate, and Rate History — all locked with grey backgrounds for non-Super-Admin users" />
      </GuideSection>

      {/* PART 5: PROFILE CHANGE REQUEST FLOW */}
      <GuideSection letter="5" color="bg-blue-600" title="How to Request a Profile Change">
        <p className="text-muted-foreground mb-4">
          If you need to change a locked field, follow these steps:
        </p>

        <ol className="list-decimal list-inside space-y-3 text-sm mb-4">
          <li><strong>Navigate to My Bio</strong> — Click your profile or go to the Bio page from the sidebar menu.</li>
          <li><strong>Find the locked section</strong> — Scroll to the section containing the field you want changed (e.g., Work Configuration or Compensation).</li>
          <li><strong>Click "Request Change"</strong> — A button labeled <em>"Request Change"</em> appears next to locked section headers.</li>
          <li><strong>Fill out the request form</strong> — Specify which field you want changed, the current value, the requested new value, and a reason for the change.</li>
          <li><strong>Submit</strong> — Your request is assigned a reference number (e.g., PCR-0001) and sent to Admin/Super Admin for review.</li>
          <li><strong>Wait for approval</strong> — You'll receive a notification when your request is approved or declined.</li>
        </ol>

        <GuideImagePlaceholder description="Screenshot: Profile Change Request dialog showing field selection, current value, requested value, and reason fields" />

        <CalloutBox variant="info" title="Tracking Your Requests">
          All your profile change requests can be tracked via the notification system. Each request gets a unique reference number (PCR-XXXX) for easy follow-up with your Admin.
        </CalloutBox>
      </GuideSection>

      {/* PART 6: DATA SYNC & AUTOMATIONS */}
      <GuideSection letter="6" color="bg-blue-600" title="How Bio Values Feed Portal Automations">
        <p className="text-muted-foreground mb-4">
          Your Bio is the <strong>single source of truth</strong> for all work configuration data. When an Admin saves your profile, changes automatically sync across the portal:
        </p>

        <QuickTable
          headers={['Bio Field', 'Feeds Into', 'Effect']}
          rows={[
            ['Position', 'Views, Support Type, Ticket View ID', 'Auto-sets which Zendesk views your tickets come from and what support types you handle.'],
            ['Schedule (Mon–Sun)', 'Team Status Board, Dashboard violations', 'Determines when you should be online. Late Login/Early Logout violations are calculated by comparing your login/logout times against your scheduled shift.'],
            ['Day Off', 'Team Status Board, Scorecard', 'You won\'t appear on the board on your day off. Scorecard adjusts expected working days accordingly.'],
            ['Quota (Email/Chat/Phone)', 'Scorecard', 'Your weekly ticket count is compared against these quotas to calculate performance percentage.'],
            ['Zendesk Instance', 'Ticket Logs', 'Determines which ZD1 or ZD2 data feeds into your ticket counts and gap analysis.'],
            ['Agent Tag', 'Ticket matching, Gap analysis', 'The lowercase identifier used to match incoming Zendesk tickets to your profile.'],
            ['OT Schedule', 'Team Status Board, Total Hours', 'When OT is enabled, you appear as "On OT" during OT windows on the Team Status Board.'],
            ['Break Schedule', 'Gap analysis, Total Hours', 'Break periods are excluded from ticket gap calculations so breaks don\'t count as idle time.'],
            ['Employment Status', 'Master Directory, All automations', 'Setting to "Terminated" removes you from the Master Directory and all automated processes.'],
            ['Upwork Contract ID', 'Dashboard (Upwork hours)', 'When set, your Dashboard shows both Portal-logged hours and Upwork-tracked hours side by side.'],
            ['Zendesk User ID', 'Scorecard (AHT, FRT metrics)', 'Used to fetch your Zendesk metrics like Average Handle Time and First Response Time.'],
          ]}
        />

        <CalloutBox variant="success" title="Key Takeaway">
          If something looks wrong on your Dashboard, Scorecard, or Team Status Board, the first thing to check is whether your Bio values are correct. Incorrect schedules, quotas, or Zendesk settings will cascade errors across all dependent features.
        </CalloutBox>
      </GuideSection>
    </>
  );
}
