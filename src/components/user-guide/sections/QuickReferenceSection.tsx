import { GuideSection, QuickTable } from '../GuideComponents';

export function QuickReferenceSection() {
  return (
    <>
      <GuideSection letter="AB" color="bg-gray-500" title="Quick Reference - Status Colors">
        <p className="text-muted-foreground mb-4">
          Status badges use consistent colors throughout the portal. Use this reference to quickly understand status meanings.
        </p>

        <h3 className="font-semibold mb-2">Leave Request Statuses</h3>
        <QuickTable 
          headers={['Status', 'Color', 'Visual']}
          rows={[
            ['Pending', 'Yellow', '🟡'],
            ['Pending Override', 'Orange', '🟠'],
            ['Approved', 'Green', '🟢'],
            ['Declined', 'Red', '🔴'],
            ['Canceled', 'Gray', '⚫'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Update Statuses</h3>
        <QuickTable 
          headers={['Status', 'Color', 'Visual']}
          rows={[
            ['Draft', 'Gray outline', '⬜'],
            ['Published', 'Blue', '🔵'],
            ['Obsolete', 'Red', '🔴'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Question Statuses</h3>
        <QuickTable 
          headers={['Status', 'Color', 'Visual']}
          rows={[
            ['Pending', 'Yellow', '🟡'],
            ['On-Going', 'Blue', '🔵'],
            ['Answered', 'Green', '🟢'],
            ['Closed', 'Gray', '⚫'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Article Request Statuses</h3>
        <QuickTable 
          headers={['Status', 'Color', 'Visual']}
          rows={[
            ['Pending', 'Yellow', '🟡'],
            ['Pending Final Review', 'Blue', '🔵'],
            ['Approved', 'Green', '🟢'],
            ['Rejected', 'Red', '🔴'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Priority Levels</h3>
        <QuickTable 
          headers={['Priority', 'Color', 'Visual']}
          rows={[
            ['Low', 'Gray', '⚫'],
            ['Normal', 'Blue', '🔵'],
            ['High', 'Orange', '🟠'],
            ['Urgent', 'Red', '🔴'],
          ]}
        />
      </GuideSection>

      <GuideSection letter="AC" color="bg-gray-400" title="Quick Reference - Keyboard Shortcuts">
        <p className="text-muted-foreground mb-4">
          Use these keyboard shortcuts to navigate the portal more efficiently.
        </p>

        <QuickTable 
          headers={['Shortcut', 'Where It Works', 'Action']}
          rows={[
            ['Enter', 'Question thread reply box', 'Send reply message.'],
            ['Shift + Enter', 'Question thread reply box', 'Add a new line.'],
            ['Escape', 'Any open dialog', 'Close the dialog.'],
          ]}
        />
      </GuideSection>

      <GuideSection letter="AD" color="bg-gray-300" title="Quick Reference - Time Zones">
        <p className="text-muted-foreground mb-4">
          All times in the portal are displayed and entered in Eastern Standard Time (EST).
        </p>

        <QuickTable 
          headers={['Feature', 'Time Zone', 'Notes']}
          rows={[
            ['Leave Request Times', 'EST', 'Start and end times are in EST.'],
            ['Posted At Timestamps', 'EST', 'All timestamps show EST.'],
            ['Notification Times', 'EST', 'Notification times are in EST.'],
            ['Deadline Dates', 'EST', 'Deadlines are based on EST midnight.'],
            ['Daily Digest Email', '9 AM EST', 'Sent at 9 AM Eastern time.'],
          ]}
        />
      </GuideSection>
    </>
  );
}
