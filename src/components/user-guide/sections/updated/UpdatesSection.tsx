import { GuideSection, CalloutBox, Checklist, QuickTable } from '../../GuideComponents';
import { GuideImagePlaceholder } from '../../GuideImagePlaceholder';

export function UpdatesSection() {
  return (
    <>
      {/* ── Part 1: Overview ── */}
      <GuideSection letter="A" color="bg-purple-500" title="Updates — Overview">
        <p className="text-muted-foreground mb-4">
          The Updates page is the central hub for all process updates, policy changes, and announcements that agents must read and acknowledge. Only <strong>published</strong> updates appear for regular users; admins can also see drafts.
        </p>

        <h3 className="font-semibold mb-2">Page Header Actions</h3>
        <QuickTable
          headers={['Element', 'Who Sees It', 'What It Does']}
          rows={[
            ['Refresh Button', 'Everyone', 'Re-fetches all updates and questions from the database.'],
            ['Page Guide (?) Button', 'Everyone', 'Opens an interactive step-by-step demo of the page.'],
            ['Create Update Button', 'Admin / HR only', 'Opens the Create Update dialog to draft a new update.'],
          ]}
        />
        <GuideImagePlaceholder description="Updates page header showing Refresh, Guide, and Create Update buttons" />
      </GuideSection>

      {/* ── Part 2: Tabs & Filters ── */}
      <GuideSection letter="B" color="bg-purple-400" title="Updates — Tabs & Filters">
        <h3 className="font-semibold mb-2">Tab Navigation</h3>
        <QuickTable
          headers={['Tab', 'What It Shows', 'Badge']}
          rows={[
            ['Unread', 'Published updates the current user has NOT acknowledged.', 'Shows count of unread updates.'],
            ['Read', 'Published updates the current user HAS acknowledged.', 'Shows count in parentheses.'],
            ['All', 'All published updates regardless of acknowledgement status.', 'No badge.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Filter Controls</h3>
        <QuickTable
          headers={['Control', 'Type', 'Behavior']}
          rows={[
            ['Search Box', 'Text input with search icon', 'Filters updates by title or summary text in real-time.'],
            ['Category Dropdown', 'Select menu with filter icon', 'Filters updates by one of the 10 predefined categories.'],
          ]}
        />

        <CalloutBox variant="info">
          Filters and tabs work together. For example, selecting "Unread" tab + "Shipping & Tracking" category shows only unread shipping updates.
        </CalloutBox>

        <GuideImagePlaceholder description="Tab bar with Unread (badge), Read, All tabs and search/category filters" />
      </GuideSection>

      {/* ── Part 3: Update Cards ── */}
      <GuideSection letter="C" color="bg-purple-300" title="Updates — Card Display">
        <p className="text-muted-foreground mb-4">
          Each update is displayed as a clickable card. Cards are sorted by posted date (newest first).
        </p>

        <h3 className="font-semibold mb-2">Card Elements</h3>
        <Checklist items={[
          "Status Icon — ✓ (green) for acknowledged, ○ (gray) for pending, ⚠ (red) for obsolete",
          "Title — Main headline of the update, truncated to one line",
          "Summary — Article status ('Created New Article' or 'Updated Existing Article')",
          "Category Badge — Color-coded label (e.g., blue for Orders & Transactions)",
          "Read/Unread Badge — Shows current acknowledgement state",
          "Reference Number — Unique identifier (e.g., UPD-0001) with hash icon",
          "Posted Date — When the update was published",
          "Deadline Date — When acknowledgement is due (if set)",
          "Overdue Badge — Red 'Overdue' badge if past deadline and unacknowledged",
          "Obsolete Badge — Red 'Obsolete' badge if the update has been marked obsolete",
          "Help Center Icon — Shows if the update has a linked external article",
        ]} />

        <CalloutBox variant="warning" title="Visual Indicators">
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Acknowledged cards have a subtle tinted background (<code>bg-accent/30</code>).</li>
            <li>Overdue cards have a red border (<code>border-destructive/50</code>).</li>
            <li>Obsolete cards are dimmed (75% opacity) with red border and background tint.</li>
          </ul>
        </CalloutBox>

        <GuideImagePlaceholder description="Example update cards showing unread, read, overdue, and obsolete states" />
      </GuideSection>

      {/* ── Part 4: Available Categories ── */}
      <GuideSection letter="D" color="bg-indigo-500" title="Updates — Categories">
        <p className="text-muted-foreground mb-4">
          Every update must be assigned one of the following categories. Categories determine the color-coded badge shown on cards and in the detail view.
        </p>

        <QuickTable
          headers={['Category', 'Badge Color', 'Use Case']}
          rows={[
            ['Orders & Transactions', 'Blue', 'Order processing, transaction issues, order workflows'],
            ['Payments & Billing', 'Green', 'Payment methods, billing issues, refunds'],
            ['Shipping & Tracking', 'Orange', 'Shipment status, tracking updates, carrier changes'],
            ['Delivery Issues', 'Red', 'Delivery problems, failed deliveries, delays'],
            ['International & Customs', 'Purple', 'International shipping, customs, duties'],
            ['Product Issues', 'Rose', 'Product defects, quality issues, returns'],
            ['Product Information', 'Cyan', 'Product details, specifications, availability'],
            ['Subscriptions', 'Indigo', 'Subscription management, renewals, cancellations'],
            ['Warehouse & Fulfillment', 'Amber', 'Inventory, fulfillment, warehouse operations'],
            ['Internal Operations', 'Slate', 'Internal processes, policies, announcements'],
          ]}
        />
      </GuideSection>

      {/* ── Part 5: Detail Page ── */}
      <GuideSection letter="E" color="bg-indigo-400" title="Updates — Detail Page">
        <p className="text-muted-foreground mb-4">
          Clicking on any update card navigates to the full detail page (<code>/updates/:id</code>).
        </p>

        <h3 className="font-semibold mb-2">Detail Page Sections</h3>
        <QuickTable
          headers={['Section', 'Content', 'Location']}
          rows={[
            ['Back Button', '"Back to Updates" ghost button for navigation.', 'Top of page'],
            ['Obsolete Banner', 'Red banner: "THIS IS AN OBSOLETE UPDATE — Do not use this information."', 'Top (if status = obsolete)'],
            ['Header', 'Category badge, status badge (Acknowledged/Pending/Obsolete), reference number.', 'Card header'],
            ['Title & Summary', 'Full title and article status text.', 'Below badges'],
            ['Metadata', 'Posted by (resolved to name), posted date, deadline (if set).', 'Below title'],
            ['Edit Button', 'Header edit button + floating action button (FAB) in bottom-right corner.', 'Top-right + bottom-right (admin/HR only)'],
            ['Body Content', 'Full article content rendered as Markdown OR Playbook format (auto-detected).', 'Main content area'],
            ['Help Center Link', '"Open Article" button linking to external URL.', 'Below body (if URL provided)'],
            ['Acknowledgement', 'Acknowledge button or confirmation with timestamp.', 'Below content separator'],
            ['Question Form', 'Text area + Submit button to ask questions about the update.', 'Below acknowledgement'],
            ['Change History', 'Collapsible section showing all edit history entries.', 'Bottom of page'],
          ]}
        />

        <GuideImagePlaceholder description="Update detail page showing header, body content, acknowledgement section, and question form" />
      </GuideSection>

      {/* ── Part 6: Content Formats ── */}
      <GuideSection letter="F" color="bg-violet-500" title="Updates — Content Formats">
        <p className="text-muted-foreground mb-4">
          Update body content supports two rendering formats, automatically detected:
        </p>

        <QuickTable
          headers={['Format', 'Detection', 'Features']}
          rows={[
            ['Markdown', 'Default — body is plain text or Markdown syntax.', 'Headings, bold, lists, links, tables, code blocks.'],
            ['Playbook (Structured JSON)', 'Body is valid JSON with "title" and "sections" array.', 'Lettered sections, steps, callouts, checklists, message templates, image galleries.'],
          ]}
        />

        <CalloutBox variant="info">
          The Playbook format is used for complex, multi-section articles. It supports rich components like callout boxes, numbered steps, document links, and role cards. The system auto-detects the format — no manual selection is needed.
        </CalloutBox>
      </GuideSection>

      {/* ── Part 7: Acknowledging Updates ── */}
      <GuideSection letter="G" color="bg-violet-400" title="Updates — Acknowledgement">
        <h3 className="font-semibold mb-2">How to Acknowledge</h3>
        <Checklist items={[
          "Navigate to the update detail page by clicking the card.",
          "Read the full update content and any linked Help Center article.",
          "Click the 'Acknowledge Update' button at the bottom of the content.",
          "The button is replaced by a green confirmation showing the acknowledgement date/time.",
          "The update moves from the 'Unread' tab to the 'Read' tab.",
        ]} />

        <CalloutBox variant="warning" title="Acknowledgement Is Permanent">
          Once you acknowledge an update, the action cannot be undone. Make sure you have read and understood the content before acknowledging.
        </CalloutBox>

        <h3 className="font-semibold mb-2 mt-4">Obsolete Updates</h3>
        <p className="text-sm text-muted-foreground mb-2">
          If an update is marked <strong>Obsolete</strong>, the acknowledge button is hidden. The information is outdated and acknowledgement is not required.
        </p>

        <GuideImagePlaceholder description="Acknowledgement section showing button state before and after acknowledging" />
      </GuideSection>

      {/* ── Part 8: Questions & Threads ── */}
      <GuideSection letter="H" color="bg-fuchsia-500" title="Updates — Questions & Threads">
        <p className="text-muted-foreground mb-4">
          Any user can submit a question about an update from the detail page. Questions use a threaded conversation system.
        </p>

        <h3 className="font-semibold mb-2">Submitting a Question</h3>
        <Checklist items={[
          "Scroll to the 'Got any questions?' section on the detail page.",
          "Type your question in the text area.",
          "Click 'Submit Question' — your question is sent to HR and a notification email is triggered.",
          "A reference number (e.g., QUE-0001) is assigned automatically.",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Question Thread Dialog</h3>
        <p className="text-sm text-muted-foreground mb-2">
          The Updates main page shows an "Agent Questions" table at the bottom (visible to all users). Clicking "View Thread" opens the conversation dialog.
        </p>

        <QuickTable
          headers={['Column', 'Content']}
          rows={[
            ['Ref #', 'Auto-generated reference number (QUE-XXXX).'],
            ['Update', 'Title of the related update (truncated).'],
            ['Asked By', 'Agent name and email.'],
            ['Question', 'Question text (truncated).'],
            ['Status', 'Current status badge (see below).'],
            ['Date', 'When the question was submitted.'],
            ['Action', '"View Thread" button to open the conversation.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Question Statuses</h3>
        <QuickTable
          headers={['Status', 'Badge Color', 'Meaning']}
          rows={[
            ['Pending', 'Yellow', 'Question submitted, no reply yet.'],
            ['On-Going', 'Blue', 'At least one reply has been sent; conversation is active.'],
            ['Answered', 'Green', 'The question asker has marked it as answered.'],
            ['Closed', 'Gray (with lock icon)', 'Thread is locked — no new replies allowed.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Who Can Do What</h3>
        <QuickTable
          headers={['Action', 'Who Can Do It']}
          rows={[
            ['Submit a question', 'Any logged-in user (from the detail page).'],
            ['Reply to a thread', 'Admin, HR, or the original question asker.'],
            ['Mark as Answered', 'The question asker only.'],
            ['Reopen (back to Pending)', 'The question asker only (from Answered status).'],
            ['Close Thread', 'Admin or HR only.'],
          ]}
        />

        <CalloutBox variant="info">
          When an admin/HR replies, the question asker receives an email notification. Status changes (Answered, Closed, Reopened) also trigger email notifications to the question asker. Replies auto-update the status from "Pending" to "On-Going".
        </CalloutBox>

        <GuideImagePlaceholder description="Question thread dialog showing chat-style conversation with status badges and reply input" />
      </GuideSection>

      {/* ── Part 9: Creating Updates (Admin/HR) ── */}
      <GuideSection letter="I" color="bg-fuchsia-400" title="Updates — Creating Updates (Admin / HR)">
        <p className="text-muted-foreground mb-4">
          Only <strong>Admin</strong> and <strong>HR</strong> roles can create new updates using the "Create Update" button on the main page.
        </p>

        <h3 className="font-semibold mb-2">Create Update Form Fields</h3>
        <QuickTable
          headers={['Field', 'Type', 'Required', 'Notes']}
          rows={[
            ['Article Title', 'Text input', 'Yes', 'The main headline of the update.'],
            ['Article Status', 'Dropdown', 'Yes', '"Created New Article" or "Updated Existing Article".'],
            ['Body', 'Markdown Editor', 'Yes', 'Full content. Supports AI formatting, preview toggle, and file attachments.'],
            ['Check for Similar Updates', 'Button', 'No', 'AI-powered check to find duplicate/similar existing updates (red accent button).'],
            ['URL', 'Text input', 'No', 'Optional link to an external Help Center article.'],
            ['Posted By', 'Dropdown', 'Yes', 'Defaults to current user. Shows list of all admins.'],
            ['Posted Date', 'Date-time picker', 'Yes', 'Defaults to 24 hours from now (NY EST timezone).'],
            ['Category', 'Dropdown', 'Yes', 'One of the 10 predefined categories.'],
            ['Status', 'Dropdown', 'Yes', '"Draft" (default) or "Published". Drafts are not visible to agents.'],
          ]}
        />

        <CalloutBox variant="warning" title="Similar Updates Check">
          Before creating a new update, use the "Check for Similar Updates" button. This AI-powered feature compares your title, summary, and body against existing updates to prevent duplicates. The button is disabled until you enter some content.
        </CalloutBox>

        <GuideImagePlaceholder description="Create Update dialog showing all form fields including Markdown editor and category dropdown" />
      </GuideSection>

      {/* ── Part 10: Editing Updates (Admin/HR) ── */}
      <GuideSection letter="J" color="bg-pink-500" title="Updates — Editing Updates (Admin / HR)">
        <p className="text-muted-foreground mb-4">
          Only <strong>Super Admin</strong>, <strong>Admin</strong>, and <strong>HR</strong> roles can edit updates. The original poster does NOT get special edit access — role-based access is enforced.
        </p>

        <h3 className="font-semibold mb-2">How to Edit</h3>
        <Checklist items={[
          "Navigate to the update detail page.",
          "Click the 'Edit' button in the header OR the floating pencil button (FAB) in the bottom-right corner.",
          "The Edit Update dialog opens with all fields pre-populated.",
          "Modify any fields — all fields from creation are editable.",
          "Click 'Save Changes' to submit the edit.",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Additional Edit Options</h3>
        <QuickTable
          headers={['Field', 'Edit-Only Options', 'Notes']}
          rows={[
            ['Status', 'Draft, Published, Archived, Obsolete', 'Edit dialog has 4 status options (vs. 2 in Create).'],
            ['All other fields', 'Same as creation', 'Title, summary, body, URL, posted by, date, category.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Change History & Notifications</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Every edit is logged in the Change History section at the bottom of the detail page. Each entry records:
        </p>
        <Checklist items={[
          "Who made the change (resolved to display name if available)",
          "When the change was made (date and time)",
          "Which fields were changed (field-by-field comparison)",
          "Old value vs. new value for each changed field",
          "For structured (Playbook) body content: section-level diff showing specific text changes within sections",
        ]} />

        <CalloutBox variant="info">
          When an update is edited and saved, email notifications are automatically sent to relevant parties. The change history uses intelligent diffing for Playbook-format content — it identifies which sections changed and highlights the specific text differences rather than showing raw JSON.
        </CalloutBox>

        <GuideImagePlaceholder description="Change History section showing field-level diffs with old (strikethrough red) and new (green) values" />
      </GuideSection>

      {/* ── Part 11: Acknowledgement Dashboard (Admin) ── */}
      <GuideSection letter="K" color="bg-pink-400" title="Updates — Acknowledgement Dashboard (Admin)">
        <p className="text-muted-foreground mb-4">
          Below the updates list, <strong>Admin</strong> users see a "Team Acknowledgement Overview" dashboard that tracks acknowledgement compliance across all team members.
        </p>

        <h3 className="font-semibold mb-2">Dashboard Display</h3>
        <QuickTable
          headers={['Element', 'Description']}
          rows={[
            ['Total Published', 'Header shows the total number of published updates being tracked.'],
            ['User Row', 'Each user is shown with their name, email, progress bar, and fraction (e.g., 12/15).'],
            ['Progress Bar', 'Visual bar showing percentage of published updates acknowledged.'],
            ['Percentage Badge', 'Color-coded: default (100%), secondary (≥50%), outline (<50%).'],
            ['Status Icon', 'Green ✓ for 100%, red ✗ for 0%, blue user icon for in-between.'],
          ]}
        />

        <CalloutBox variant="info">
          Users are sorted by acknowledgement percentage (highest first). The dashboard scrolls vertically if there are many users (max height ~400px).
        </CalloutBox>

        <GuideImagePlaceholder description="Team Acknowledgement Overview dashboard showing user progress bars and percentage badges" />
      </GuideSection>

      {/* ── Part 12: Update Lifecycle ── */}
      <GuideSection letter="L" color="bg-rose-500" title="Updates — Lifecycle & Statuses">
        <p className="text-muted-foreground mb-4">
          Updates follow a defined lifecycle with four possible statuses:
        </p>

        <QuickTable
          headers={['Status', 'Visible to Agents', 'Can Acknowledge', 'Description']}
          rows={[
            ['Draft', 'No', 'No', 'Work in progress. Only admins can see it.'],
            ['Published', 'Yes', 'Yes', 'Live and visible to all users. Acknowledgement required.'],
            ['Archived', 'Depends', 'No', 'Removed from active view. May still appear in filters.'],
            ['Obsolete', 'Yes (dimmed)', 'No', 'Outdated information. Red warning banner displayed. Acknowledge button hidden.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Typical Lifecycle Flow</h3>
        <Checklist items={[
          "Draft → Published: Admin creates update as draft, reviews, then publishes.",
          "Published → Obsolete: When information is superseded, admin marks as obsolete.",
          "Published → Archived: When update is no longer relevant but not incorrect.",
          "Any status can be changed via the Edit dialog by Admin/HR.",
        ]} />

        <CalloutBox variant="warning" title="Obsolete vs. Archived">
          <strong>Obsolete</strong> updates remain visible but with a prominent red warning banner — agents can still see them but are warned the info is outdated. <strong>Archived</strong> updates are effectively hidden from the main view.
        </CalloutBox>
      </GuideSection>
    </>
  );
}
