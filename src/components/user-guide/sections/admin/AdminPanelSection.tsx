import { GuideSection, CalloutBox, Checklist, QuickTable } from '../../GuideComponents';

export function AdminPanelSection() {
  return (
    <>
      <GuideSection letter="A" color="bg-blue-500" title="Admin Panel - Overview">
        <p className="text-muted-foreground mb-4">
          The Admin Panel is the central hub for managing updates, questions, and users.
        </p>

        <h3 className="font-semibold mb-2">Admin Panel Tabs</h3>
        <QuickTable 
          headers={['Tab', 'Content', 'Who Can Access']}
          rows={[
            ['Updates', 'Create, edit, delete, and manage all updates.', 'Admin/HR'],
            ['Questions', 'View and respond to user questions.', 'Admin/HR'],
            ['Admins', 'Add or remove admin users.', 'Admin only'],
            ['Users', 'Manage all user accounts.', 'Admin only'],
          ]}
        />
      </GuideSection>

      <GuideSection letter="B" color="bg-blue-400" title="Admin Panel - Updates Tab">
        <p className="text-muted-foreground mb-4">
          The Updates tab allows administrators to create, edit, and manage all updates in the system.
        </p>

        <h3 className="font-semibold mb-2">Updates Tab Features</h3>
        <Checklist items={[
          "Create Update button to add new updates.",
          "Status filter dropdown (All, Published, Draft, Obsolete).",
          "Updates table with sortable columns.",
          "Acknowledgement progress for each update.",
          "Action buttons for each update.",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Updates Table Columns</h3>
        <QuickTable 
          headers={['Column', 'Description']}
          rows={[
            ['Title', 'The update headline.'],
            ['Status', 'Badge showing Draft/Published/Obsolete.'],
            ['Category', 'Category badge.'],
            ['Posted By', 'Email of the creator.'],
            ['Posted At', 'Publication date.'],
            ['Acknowledgements', 'Count acknowledged / total users.'],
            ['Progress', 'Visual progress bar.'],
            ['Actions', 'View, Edit, Delete, Export buttons.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Action Buttons</h3>
        <QuickTable 
          headers={['Button', 'Icon', 'What It Does']}
          rows={[
            ['View', 'Eye', 'Opens the update detail page.'],
            ['Edit', 'Pencil', 'Opens the edit dialog.'],
            ['Delete', 'Trash', 'Permanently removes the update.'],
            ['Export', 'Download', 'Downloads CSV of who acknowledged.'],
          ]}
        />

        <CalloutBox variant="warning" title="Deleting Updates">
          Deleting an update is permanent and cannot be undone. All acknowledgements and questions for that update will also be deleted.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="C" color="bg-teal-500" title="Admin Panel - Create/Edit Update">
        <p className="text-muted-foreground mb-4">
          The Create/Edit Update dialog allows you to compose and publish updates.
        </p>

        <h3 className="font-semibold mb-2">Form Fields</h3>
        <QuickTable 
          headers={['Field', 'Required', 'Notes']}
          rows={[
            ['Article Title', 'Yes', 'The main headline.'],
            ['Article Status', 'Yes', '"Created New Article" or "Updated Existing Article"'],
            ['Body', 'Yes', 'Markdown editor for content.'],
            ['Category', 'No', 'Dropdown selection.'],
            ['Help Center URL', 'No', 'External link to help center article.'],
            ['Posted By', 'Auto-filled', 'Current user\'s email.'],
            ['Deadline', 'Auto-filled', '14 days from today by default.'],
            ['Status', 'Yes', 'Draft or Published.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Update Statuses</h3>
        <QuickTable 
          headers={['Status', 'Meaning', 'Visibility']}
          rows={[
            ['Draft', 'Work in progress.', 'Only visible to admins.'],
            ['Published', 'Live and active.', 'Visible to all users.'],
            ['Obsolete', 'Outdated information.', 'Visible but marked as old.'],
          ]}
        />

        <CalloutBox variant="info" title="Publishing Notification">
          When an update is published, email notifications are automatically sent to all users. Make sure the content is finalized before publishing.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="D" color="bg-teal-400" title="Admin Panel - Similar Updates Check">
        <p className="text-muted-foreground mb-4">
          Before creating an update, you can check if similar updates already exist in the system.
        </p>

        <h3 className="font-semibold mb-2">How It Works</h3>
        <Checklist items={[
          "Click 'Check for Similar Updates' button in the create dialog.",
          "AI analyzes the title, summary, and body content.",
          "Matching updates are displayed with similarity scores.",
          "Review existing updates before creating a duplicate.",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Similarity Levels</h3>
        <QuickTable 
          headers={['Level', 'Badge Color', 'Meaning']}
          rows={[
            ['High', 'Red', 'Very similar content, likely a duplicate.'],
            ['Medium', 'Yellow', 'Related content, may overlap.'],
            ['Low', 'Green', 'Some similarity, probably different topic.'],
          ]}
        />

        <CalloutBox variant="tip">
          Use the Similar Updates check to avoid creating duplicate content. If a similar update exists, consider editing the existing one instead.
        </CalloutBox>
      </GuideSection>
    </>
  );
}
