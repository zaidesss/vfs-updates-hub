import { GuideSection, CalloutBox, Checklist, QuickTable } from '../GuideComponents';

export function ChangelogSection() {
  return (
    <GuideSection letter="W" color="bg-emerald-500" title="What's New (Changelog)">
      <p className="text-muted-foreground mb-4">
        The "What's New" page shows recent portal updates and improvements, filtered by your role.
      </p>

      <h3 className="font-semibold mb-2">Accessing the Changelog</h3>
      <Checklist items={[
        "Go to Updates menu in the navigation.",
        "Click on 'What's New' option.",
        "View recent portal changes and improvements.",
        "Only changes relevant to your role are shown.",
      ]} />

      <h3 className="font-semibold mb-2 mt-4">Changelog Entry Information</h3>
      <QuickTable 
        headers={['Element', 'Description']}
        rows={[
          ['Reference Number', 'Unique ID (e.g., CL-0001).'],
          ['Category', 'Type of change (Profile, Updates, Admin, etc.).'],
          ['Title', 'Brief description of the change.'],
          ['Description', 'Detailed explanation of the feature or fix.'],
          ['Date', 'When the change was added.'],
          ['Feature Link', 'Click to navigate to the feature (if available).'],
        ]}
      />

      <h3 className="font-semibold mb-2 mt-4">Role-Based Visibility</h3>
      <p className="text-sm text-muted-foreground mb-2">
        Each changelog entry is tagged with roles. You only see entries relevant to your role:
      </p>
      <QuickTable 
        headers={['Your Role', 'What You See']}
        rows={[
          ['User', 'General portal features affecting all users.'],
          ['HR', 'User features + HR-specific changes.'],
          ['Admin', 'User features + Admin-specific changes.'],
          ['Super Admin', 'All changes including admin-only features.'],
        ]}
      />

      <CalloutBox variant="tip">
        Check "What's New" regularly to stay informed about portal improvements. Use the feature links to quickly navigate to new functionality.
      </CalloutBox>
    </GuideSection>
  );
}
