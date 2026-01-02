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

        <h3 className="font-semibold mb-2 mt-4">Compensation Section</h3>
        <QuickTable 
          headers={['Field', 'Type', 'Notes']}
          rows={[
            ['Current Hourly Rate', 'Number', 'In US dollars.'],
            ['Rate History', 'Table', '6 rows for Date + Rate pairs showing progressions.'],
          ]}
        />

        <CalloutBox variant="info">
          Click the "Save Changes" button after updating any information. A success message confirms when changes are saved.
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
          "Same fields as My Profile page.",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Admin Capabilities</h3>
        <QuickTable 
          headers={['Capability', 'Description']}
          rows={[
            ['View any profile', 'Click on any agent in the list to see their profile.'],
            ['Edit any field', 'All profile fields can be modified.'],
            ['Save changes', 'Save updates on behalf of any agent.'],
          ]}
        />

        <CalloutBox variant="warning">
          Changes made to agent profiles are logged. Make sure to only update information that is accurate and authorized.
        </CalloutBox>
      </GuideSection>
    </>
  );
}
