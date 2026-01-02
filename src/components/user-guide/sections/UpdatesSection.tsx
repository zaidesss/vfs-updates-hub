import { GuideSection, CalloutBox, Checklist, QuickTable } from '../GuideComponents';
import { Badge } from '@/components/ui/badge';

export function UpdatesSection() {
  return (
    <>
      <GuideSection letter="F" color="bg-purple-500" title="Updates - Main Page">
        <p className="text-muted-foreground mb-4">
          The Updates page is the main hub for viewing company updates. All published updates are displayed here as cards.
        </p>

        <h3 className="font-semibold mb-2">Update Tabs</h3>
        <QuickTable 
          headers={['Tab', 'What It Shows', 'Use Case']}
          rows={[
            ['Unread', 'Updates you have NOT yet acknowledged.', 'Focus on pending acknowledgements.'],
            ['Read', 'Updates you have already acknowledged.', 'Review previously read updates.'],
            ['All', 'All published updates regardless of status.', 'Browse all available updates.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Filter Controls</h3>
        <QuickTable 
          headers={['Control', 'What It Does', 'How To Use']}
          rows={[
            ['Search Box', 'Filters updates by title or summary text.', 'Type keywords to filter in real-time.'],
            ['Category Dropdown', 'Filters updates by category.', 'Select a category to show only matching updates.'],
            ['Refresh Button', 'Reloads all update data.', 'Click to fetch the latest updates.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Update Card Display</h3>
        <p className="text-sm text-muted-foreground mb-2">Each update card shows the following information:</p>
        <Checklist items={[
          "Title - The main headline of the update",
          "Summary - Brief description (shows 'Created New Article' or 'Updated Existing Article')",
          "Reference Number - Unique identifier (e.g., UPD-0001)",
          "Category Badge - Color-coded category label",
          "Posted Date - When the update was published",
          "Deadline Date - When acknowledgement is due (if set)",
          "Read/Unread Badge - Shows acknowledgement status",
          "Overdue Indicator - Red warning if past deadline and unacknowledged",
          "Obsolete Banner - Red banner if the update is marked obsolete",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Available Categories</h3>
        <QuickTable 
          headers={['Category', 'Color', 'Description']}
          rows={[
            ['Orders and Transactions', 'Blue', 'Order processing, transactions, order issues'],
            ['Payments and Billing', 'Green', 'Payment methods, billing issues, refunds'],
            ['Shipping and Tracking', 'Orange', 'Shipment status, tracking updates, carriers'],
            ['Delivery Issues', 'Red', 'Delivery problems, failed deliveries, delays'],
            ['International and Customs', 'Purple', 'International shipping, customs, duties'],
            ['Product Issues', 'Rose', 'Product defects, quality issues, returns'],
            ['Product Information', 'Cyan', 'Product details, specifications, availability'],
            ['Subscriptions', 'Indigo', 'Subscription management, renewals, cancellations'],
            ['Warehouse and Fulfillment', 'Amber', 'Inventory, fulfillment, warehouse operations'],
            ['Internal Operations', 'Slate', 'Internal processes, policies, announcements'],
          ]}
        />

        <CalloutBox variant="warning" title="Obsolete Updates">
          Updates marked as "Obsolete" have a red banner at the top. The information in these updates is outdated and should not be used for current processes.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="G" color="bg-purple-400" title="Updates - Detail Page">
        <p className="text-muted-foreground mb-4">
          Clicking on an update card opens the detail page where the full content is displayed.
        </p>

        <h3 className="font-semibold mb-2">Detail Page Sections</h3>
        <QuickTable 
          headers={['Section', 'Content', 'Location']}
          rows={[
            ['Header', 'Back button, category badge, status badge, reference number', 'Top of page'],
            ['Title & Summary', 'Update title and article status', 'Below header'],
            ['Metadata', 'Posted by, posted date, deadline (if set)', 'Below title'],
            ['Obsolete Warning', 'Red banner warning not to use outdated information', 'Top (if applicable)'],
            ['Body Content', 'Full update content in Markdown or Playbook format', 'Main content area'],
            ['Help Center Link', 'External link to related help center article', 'Below body (if URL provided)'],
            ['Acknowledgement', 'Button to acknowledge or confirmation of acknowledgement', 'Below content'],
            ['Questions', 'Text area to submit questions to HR', 'Below acknowledgement'],
            ['Change History', 'Collapsible section showing all edits', 'Bottom of page'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Acknowledging an Update</h3>
        <Checklist items={[
          "Read the full update content carefully.",
          "Click the 'Acknowledge Update' button at the bottom.",
          "The button changes to show the acknowledgement date/time.",
          "The update moves from 'Unread' to 'Read' tab.",
        ]} />

        <CalloutBox variant="info">
          Once acknowledged, the action cannot be undone. Make sure you have read and understood the update before acknowledging.
        </CalloutBox>

        <h3 className="font-semibold mb-2 mt-4">Change History</h3>
        <p className="text-sm text-muted-foreground mb-2">
          The Change History section is collapsible and shows all edits made to the update. Each entry displays:
        </p>
        <Checklist items={[
          "Who made the change (email address)",
          "When the change was made (date and time)",
          "What fields were changed",
          "Old value vs new value for each field",
        ]} />
      </GuideSection>
    </>
  );
}
