import { GuideSection, CalloutBox, Checklist, QuickTable } from '../GuideComponents';

export function ActivitySection() {
  return (
    <GuideSection letter="T" color="bg-cyan-500" title="My Activity Page">
      <p className="text-muted-foreground mb-4">
        The My Activity page is a personal progress tracker showing your acknowledgement history and completion rate.
      </p>

      <h3 className="font-semibold mb-2">Stats Cards</h3>
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
        Check this page regularly to monitor your progress. Aim for 100% completion to stay fully informed.
      </CalloutBox>
    </GuideSection>
  );
}
