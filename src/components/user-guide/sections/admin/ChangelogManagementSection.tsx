import { GuideSection, CalloutBox, Checklist, QuickTable } from '../../GuideComponents';

export function ChangelogManagementSection() {
  return (
    <GuideSection letter="L" color="bg-emerald-500" title="Changelog Management (Super Admin)">
      <p className="text-muted-foreground mb-4">
        Super Admins can manage the "What's New" page to keep users informed about portal changes.
      </p>

      <h3 className="font-semibold mb-2">Accessing Changelog Management</h3>
      <Checklist items={[
        "Go to Admin Panel.",
        "Scroll down to find the 'Changelog Management' card.",
        "Click 'Add Entry' to create a new changelog entry.",
      ]} />

      <h3 className="font-semibold mb-2 mt-4">Creating a Changelog Entry</h3>
      <QuickTable 
        headers={['Field', 'Required', 'Description']}
        rows={[
          ['Title', 'Yes', 'Brief title of the change (e.g., "New Profile Fields").'],
          ['Category', 'Yes', 'Type: Profile, Updates, Leave, Admin, Security, etc.'],
          ['Description', 'Yes', 'Detailed explanation of the change or feature.'],
          ['Feature Link', 'No', 'Path to the feature (e.g., /profile, /admin).'],
          ['Visible To', 'Yes', 'Select which roles can see this entry.'],
        ]}
      />

      <h3 className="font-semibold mb-2 mt-4">Role Visibility Options</h3>
      <p className="text-sm text-muted-foreground mb-2">
        Select which roles should see each changelog entry:
      </p>
      <Checklist items={[
        "User - Standard agents.",
        "HR - HR team members.",
        "Admin - Administrators.",
        "Super Admin - Super administrators.",
      ]} />

      <h3 className="font-semibold mb-2 mt-4">Best Practices</h3>
      <Checklist items={[
        "Add entries when new features are deployed.",
        "Be specific about what changed and why.",
        "Only show admin-only changes to Admin/Super Admin roles.",
        "Include feature links for easy navigation.",
        "Keep descriptions concise but informative.",
      ]} />

      <CalloutBox variant="tip">
        Add changelog entries whenever you deploy new features or make significant changes. This keeps all users informed and reduces support questions.
      </CalloutBox>
    </GuideSection>
  );
}
