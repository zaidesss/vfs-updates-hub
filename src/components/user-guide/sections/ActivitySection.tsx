import { GuideSection, CalloutBox, Checklist, QuickTable } from '../GuideComponents';

export function ActivitySection() {
  return (
    <GuideSection letter="T" color="bg-cyan-500" title="My Activity Page">
      <p className="text-muted-foreground mb-4">
        The My Activity page has two tabs: <strong>Activity Log</strong> (your portal-wide audit trail) and <strong>Acknowledgements</strong> (your update completion progress).
      </p>

      <h3 className="font-semibold mb-2">Activity Log Tab</h3>
      <Checklist items={[
        "Shows all portal actions that involve you — changes you made or actions taken on your profile.",
        "Entries show who performed the action, what changed, and when.",
        "Click any entry to expand and see field-level diffs (old → new values).",
        "Covers Profile edits, Leave Requests, QA Evaluations, Schedule changes, and more.",
      ]} />

      <h3 className="font-semibold mb-2 mt-4">Acknowledgements Tab</h3>
      <QuickTable 
        headers={['Card', 'What It Shows', 'Color']}
        rows={[
          ['Total Updates', 'Count of all published updates.', 'Blue'],
          ['Acknowledged', 'Count of updates you have acknowledged.', 'Green'],
          ['Pending', 'Count of updates you have NOT acknowledged.', 'Amber'],
          ['Completion', 'Percentage of updates acknowledged.', 'Purple'],
        ]}
      />

      <h3 className="font-semibold mb-2 mt-4">Progress Bar</h3>
      <p className="text-sm text-muted-foreground mb-2">
        A visual progress bar shows your completion percentage. The bar fills up as you acknowledge more updates.
      </p>

      <h3 className="font-semibold mb-2 mt-4">Acknowledgement History</h3>
      <Checklist items={[
        "List of all updates you have acknowledged.",
        "Sorted by most recent acknowledgement first.",
        "Each entry shows update title.",
        "Each entry shows acknowledgement date/time.",
        "Click on any entry to view the update detail.",
      ]} />

      <CalloutBox variant="tip">
        Check the Activity Log tab regularly to see changes made to your profile, schedule, or evaluations. Use the Acknowledgements tab to track your update completion progress.
      </CalloutBox>
    </GuideSection>
  );
}
