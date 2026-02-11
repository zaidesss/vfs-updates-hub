import { GuideSection, CalloutBox, QuickTable } from '../../GuideComponents';

export function MyBioAdminSection() {
  return (
    <div className="space-y-6">
      <GuideSection letter="A" color="bg-blue-600" title="Overview — Admin Profile Editing">
        <p className="text-sm text-muted-foreground mb-4">
          Admins and Super Admins can edit all Work Configuration fields for any agent's profile. 
          Regular users see these fields as read-only with lock icons. The <strong>Compensation</strong> section 
          (hourly rate, payment frequency, rate history) is restricted to <strong>Super Admin only</strong>.
        </p>
        <CalloutBox variant="info" title="Source of Truth">
          The <strong>agent_profiles</strong> (Bios) table is the single source of truth. When you save a profile, 
          operational fields automatically sync to the Master Directory. Always edit profiles through 
          My Bio / Manage Profiles — never directly in the Master Directory.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="B" color="bg-indigo-600" title="Upwork Contract ID">
        <p className="text-sm text-muted-foreground mb-3">
          The Upwork Contract ID enables automatic Upwork hour tracking on the agent's Dashboard.
        </p>
        <CalloutBox variant="tip" title="How to Find the Contract ID">
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to <strong>Upwork → Contracts</strong> (or the agent's active contract page)</li>
            <li>Look at the URL in your browser's address bar</li>
            <li>The <strong>numeric ID at the end</strong> of the URL is the Contract ID</li>
            <li>Example: <code className="bg-muted px-1 rounded">https://www.upwork.com/ab/contracts/1234567</code> → Contract ID is <strong>1234567</strong></li>
          </ol>
        </CalloutBox>
        <CalloutBox variant="warning" title="Impact if Missing">
          Without a valid Upwork Contract ID, the Dashboard's Upwork Hours section will show no data. 
          The agent won't see their tracked hours or weekly totals.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="C" color="bg-violet-600" title="Zendesk User ID">
        <p className="text-sm text-muted-foreground mb-3">
          The Zendesk User ID links the agent to their Zendesk metrics, enabling AHT (Average Handle Time) 
          and FRT (First Response Time) calculations on the Team Scorecard.
        </p>
        <CalloutBox variant="tip" title="How to Find the Zendesk User ID">
          <ol className="list-decimal list-inside space-y-1">
            <li>Log in to <strong>Zendesk Admin Center</strong></li>
            <li>Navigate to <strong>People → Team members</strong></li>
            <li>Click on the agent's name to open their profile</li>
            <li>Look at the URL in your browser — the <strong>numeric ID</strong> in the URL is their User ID</li>
            <li>Example: <code className="bg-muted px-1 rounded">.../agent/12345678</code> → User ID is <strong>12345678</strong></li>
          </ol>
        </CalloutBox>
        <CalloutBox variant="warning" title="Impact if Missing">
          Without a Zendesk User ID, the Scorecard cannot fetch AHT/FRT metrics for this agent. 
          Their row will show blank or zero values for those columns.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="D" color="bg-purple-600" title="Quotas — Email, Chat, Phone">
        <p className="text-sm text-muted-foreground mb-3">
          Quotas define the expected ticket/interaction volume per shift and drive Work Tracker categorization on the Dashboard.
        </p>
        <CalloutBox variant="warning" title="Email Quota is Required for All Support Types">
          The <strong>Email Quota</strong> should <em>always</em> have a value, regardless of the agent's Support Type. 
          This is because the Work Tracker on the Dashboard uses the email quota to categorize and calculate 
          ticket productivity. Without it, the tracker cannot function properly.
        </CalloutBox>
        <QuickTable
          headers={['Quota Field', 'When to Fill In', 'Used By']}
          rows={[
            ['Email Quota', 'Always — required for all agents', 'Dashboard Work Tracker, Scorecard productivity %'],
            ['Chat Quota', 'Only if agent handles chat tickets', 'Scorecard (if applicable)'],
            ['Phone Quota', 'Only if agent handles phone calls', 'Scorecard (if applicable)'],
            ['OT Email Quota', 'Only if OT is enabled', 'OT productivity calculation (separate from regular)'],
          ]}
        />
        <CalloutBox variant="info">
          Chat and Phone quotas are optional — only fill them if the agent actually works those channels. 
          Leaving them empty won't break anything.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="E" color="bg-fuchsia-600" title="Break Schedule">
        <p className="text-sm text-muted-foreground mb-3">
          The break schedule defines the agent's daily break allowance. This value is critical because 
          it's <strong>auto-deducted from Total Hours</strong> for every working day.
        </p>
        <CalloutBox variant="warning" title="Breaks Must Cover the Full Shift">
          Make sure the break duration accounts for the <strong>entire shift</strong> — including lunch and 
          any paid/unpaid breaks. The system deducts this amount every working day (including weekends if 
          they're not marked as Day Off). An incorrect break value will skew all hour calculations.
        </CalloutBox>
        <CalloutBox variant="tip" title="Example">
          If an agent's shift is 9 hours and they have a 1-hour unpaid lunch, set the break to <strong>1 hour</strong>. 
          The system will calculate: 9h shift − 1h break = <strong>8h billable</strong> per day.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="F" color="bg-pink-600" title="Overtime (OT) Configuration">
        <p className="text-sm text-muted-foreground mb-3">
          The OT toggle controls whether an agent has overtime scheduling and productivity tracking.
        </p>
        <QuickTable
          headers={['Feature', 'Behavior']}
          rows={[
            ['OT Toggle ON', 'OT schedule fields appear for each day; OT Email Quota field becomes available'],
            ['OT Toggle OFF', 'All OT fields are hidden; no OT calculations are performed'],
            ['OT Productivity', 'Auto-calculated separately from regular productivity using quota_ot_email'],
            ['OT Ticket Flagging', 'The webhook automatically flags tickets worked during OT hours'],
            ['Schedule Auto-fill', 'Monday schedule auto-fills Tuesday–Friday; Saturday auto-fills Sunday'],
            ['OT Schedule Validation', 'OT start time must be at or after the regular shift end time for the same day'],
          ]}
        />
        <CalloutBox variant="warning" title="OT Schedule Validation Rule">
          If a regular shift ends at <strong>5:30 PM</strong>, the OT start time must be <strong>5:30 PM or later</strong>. 
          The system enforces this with real-time validation on field blur and a final check on save. 
          This prevents scheduling overlaps between regular and OT shifts.
        </CalloutBox>
        <CalloutBox variant="info" title="Day Off Interaction">
          If a day is marked as <strong>Day Off</strong>, both the regular and OT schedule fields for that day 
          are automatically disabled and display "Day Off." You don't need to clear them manually.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="G" color="bg-rose-600" title="Schedule Auto-Fill Rules">
        <QuickTable
          headers={['Action', 'Result']}
          rows={[
            ['Set Monday schedule', 'Automatically copies to Tuesday, Wednesday, Thursday, and Friday'],
            ['Set Saturday schedule', 'Automatically copies to Sunday'],
            ['Set Monday OT schedule', 'Automatically copies OT to Tuesday–Friday'],
            ['Set Saturday OT schedule', 'Automatically copies OT to Sunday'],
          ]}
        />
        <CalloutBox variant="tip">
          Auto-fill only runs when the target day is empty or matches the previous auto-filled value. 
          If you've manually set a different schedule for Wednesday, changing Monday won't overwrite it.
        </CalloutBox>
      </GuideSection>
    </div>
  );
}
