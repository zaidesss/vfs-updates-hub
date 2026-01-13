import { GuideSection, CalloutBox, Checklist, QuickTable } from '../GuideComponents';

export function ProfileSection() {
  return (
    <>
      <GuideSection letter="U" color="bg-violet-500" title="My Profile Page">
        <p className="text-muted-foreground mb-4">
          The My Profile page allows you to view and edit your personal information.
        </p>

        <h3 className="font-semibold mb-2">Personal Information Section</h3>
        <QuickTable 
          headers={['Field', 'Type', 'Format/Notes']}
          rows={[
            ['Full Name', 'Text', 'Your complete name.'],
            ['Phone Number', 'Text', 'Format: +63 9XX XXX XXXX'],
            ['Birthday', 'Date', 'Date picker selection.'],
            ['Start Date', 'Date', 'Your employment start date.'],
            ['Home Address', 'Text area', 'Complete home address.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Emergency Contact Section</h3>
        <QuickTable 
          headers={['Field', 'Type', 'Purpose']}
          rows={[
            ['Contact Name', 'Text', 'Emergency contact person name.'],
            ['Contact Phone', 'Text', 'Emergency contact phone number.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Work Information Section</h3>
        <QuickTable 
          headers={['Field', 'Type', 'Notes']}
          rows={[
            ['Position/Role', 'Text', 'e.g., Customer Service Agent'],
            ['Team Lead', 'Text', 'Name of your team lead.'],
            ['Client(s)', 'Text', 'Comma-separated if multiple.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Freelance & Upwork Section</h3>
        <QuickTable 
          headers={['Field', 'Type', 'Notes']}
          rows={[
            ['Upwork Username', 'Text', 'Your Upwork account name.'],
            ['Upwork Profile URL', 'Text', 'Link to your Upwork profile.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Equipment Section</h3>
        <QuickTable 
          headers={['Field', 'Type', 'Notes']}
          rows={[
            ['Headset Model', 'Text', 'Brand and model of your headset.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Connectivity Section</h3>
        <QuickTable 
          headers={['Field', 'Type', 'Notes']}
          rows={[
            ['Primary Internet Provider', 'Text', 'e.g., PLDT, Globe, Converge'],
            ['Primary Internet Speed', 'Text', 'e.g., 100 Mbps'],
            ['Backup Internet Provider', 'Text', 'Secondary provider if available.'],
            ['Backup Internet Speed', 'Text', 'Speed of backup connection.'],
            ['Backup Internet Type', 'Text', 'e.g., Mobile Data, DSL, Fiber'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Compensation Section</h3>
        <QuickTable 
          headers={['Field', 'Type', 'Notes']}
          rows={[
            ['Current Hourly Rate', 'Number', 'In US dollars (protected field).'],
            ['Rate History', 'Table', '6 rows for Date + Rate pairs showing progressions.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Banking Information Section</h3>
        <QuickTable 
          headers={['Field', 'Type', 'Notes']}
          rows={[
            ['Bank Name', 'Text', 'Your bank for payment.'],
            ['Account Number', 'Text', 'Your bank account number.'],
            ['Account Holder Name', 'Text', 'Name on the bank account.'],
          ]}
        />

        <CalloutBox variant="info">
          Click the "Save Changes" button after updating any information. A success message confirms when changes are saved.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="U2" color="bg-violet-400" title="Profile Change Requests">
        <p className="text-muted-foreground mb-4">
          Some profile fields are protected and require Super Admin approval to change.
        </p>

        <h3 className="font-semibold mb-2">Protected Fields</h3>
        <Checklist items={[
          "Current Hourly Rate",
          "Rate History / Rate Progression",
          "Start Date",
          "Position / Role",
          "Banking Information",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">How to Request a Change</h3>
        <Checklist items={[
          "Click the 'Request Change' button next to the protected field.",
          "Enter the new value you want.",
          "Provide a reason for the change request.",
          "Submit the request.",
          "Wait for Super Admin review.",
          "You'll receive a notification when approved or rejected.",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Request Statuses</h3>
        <QuickTable 
          headers={['Status', 'Description']}
          rows={[
            ['Pending', 'Request is awaiting Super Admin review.'],
            ['Approved', 'Request was approved and field updated.'],
            ['Rejected', 'Request was rejected with explanation.'],
          ]}
        />

        <CalloutBox variant="tip">
          Always provide a clear reason for your change request. This helps Super Admins understand the context and approve faster.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="V" color="bg-violet-400" title="Manage Profiles (Admin Only)">
        <p className="text-muted-foreground mb-4">
          The Manage Profiles page allows administrators to view and edit all agent profiles in the system.
        </p>

        <h3 className="font-semibold mb-2">Page Layout</h3>
        <Checklist items={[
          "Left panel: Searchable list of all agents.",
          "Search box to filter agents by name or email.",
          "Right panel: Profile editor for selected agent.",
          "Same fields as My Profile page plus admin-only fields.",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Admin Capabilities</h3>
        <QuickTable 
          headers={['Capability', 'Description']}
          rows={[
            ['View any profile', 'Click on any agent in the list to see their profile.'],
            ['Edit most fields', 'Most profile fields can be directly modified.'],
            ['Request protected changes', 'Use "Request Change" for rate, position, banking fields.'],
            ['Save changes', 'Save updates on behalf of any agent.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">New Profile Fields (Admin View)</h3>
        <QuickTable 
          headers={['Section', 'Fields']}
          rows={[
            ['Freelance', 'Upwork Username, Upwork Profile URL'],
            ['Equipment', 'Headset Model'],
            ['Connectivity', 'Primary/Backup Internet Provider, Speed, Type'],
            ['Banking', 'Bank Name, Account Number, Account Holder'],
          ]}
        />

        <CalloutBox variant="warning">
          Changes made to agent profiles are logged. Make sure to only update information that is accurate and authorized. Super Admins receive notifications for profile change requests.
        </CalloutBox>
      </GuideSection>
    </>
  );
}
