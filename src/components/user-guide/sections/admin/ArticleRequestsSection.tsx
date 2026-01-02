import { GuideSection, CalloutBox, Checklist, QuickTable } from '../../GuideComponents';

export function ArticleRequestsSection() {
  return (
    <>
      <GuideSection letter="H" color="bg-green-500" title="Article Requests - Submitting">
        <p className="text-muted-foreground mb-4">
          Users can submit requests for new articles or updates to existing content through the Manage Requests page.
        </p>

        <h3 className="font-semibold mb-2">Request Form Fields</h3>
        <QuickTable 
          headers={['Field', 'Required', 'Options/Notes']}
          rows={[
            ['Submitted By', 'Auto-filled', 'Current user email.'],
            ['Timestamp', 'Auto-filled', 'Current date/time.'],
            ['Request Type', 'Yes', 'New Article, Update Existing, General.'],
            ['Category', 'No', 'Same 10 categories as updates.'],
            ['Sample Ticket #', 'No', 'Reference ticket number for context.'],
            ['Priority', 'Yes', 'Low, Normal, High, Urgent.'],
            ['Description', 'Yes', 'Detailed explanation of what is needed.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Request Types</h3>
        <QuickTable 
          headers={['Type', 'Use Case']}
          rows={[
            ['New Article', 'Request a brand new article to be created.'],
            ['Update Existing', 'Request changes to an existing article.'],
            ['General', 'General feedback or suggestions.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Priority Levels</h3>
        <QuickTable 
          headers={['Priority', 'When To Use', 'Badge Color']}
          rows={[
            ['Low', 'Nice to have, not urgent.', 'Gray'],
            ['Normal', 'Standard request, regular timeline.', 'Blue'],
            ['High', 'Important, needed soon.', 'Orange'],
            ['Urgent', 'Critical, needed immediately.', 'Red'],
          ]}
        />

        <CalloutBox variant="info" title="Similar Updates Check Required">
          Before submitting a request, you must click "Check for Similar Updates" to verify no duplicate content exists.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="I" color="bg-green-400" title="Article Requests - Multi-Stage Approval">
        <p className="text-muted-foreground mb-4">
          Article requests go through a multi-stage approval process before being completed.
        </p>

        <h3 className="font-semibold mb-2">Approval Flow</h3>
        <QuickTable 
          headers={['Stage', 'Who Approves', 'Requirement']}
          rows={[
            ['Pre-Approval', '4 designated pre-approvers', 'ALL 4 must approve.'],
            ['Final Review', 'Final approver (Patrick)', 'Makes final decision.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Approval Process</h3>
        <Checklist items={[
          "Request submitted → Status: Pending",
          "Pre-approvers receive notification.",
          "Each pre-approver reviews and approves.",
          "Progress shown as X/4 on request card.",
          "When 4/4 approved → Status: Pending Final Review.",
          "Final approver receives notification.",
          "Final approver approves or rejects.",
          "Submitter and HR notified of result.",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Request Statuses</h3>
        <QuickTable 
          headers={['Status', 'Meaning', 'Badge Color']}
          rows={[
            ['Pending', 'Waiting for pre-approvers.', 'Yellow'],
            ['Pending Final Review', 'All pre-approvers approved, awaiting final decision.', 'Blue'],
            ['Approved', 'Final approver approved the request.', 'Green'],
            ['Rejected', 'Final approver rejected the request.', 'Red'],
          ]}
        />

        <CalloutBox variant="tip">
          Pre-approvers can view and approve in any order. The final approver only sees the request after all 4 pre-approvals are complete.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="J" color="bg-emerald-500" title="Article Requests - Processing (Admin)">
        <p className="text-muted-foreground mb-4">
          Administrators review and process article requests through the Manage Requests page.
        </p>

        <h3 className="font-semibold mb-2">Request Card Display</h3>
        <Checklist items={[
          "Reference number (e.g., REQ-0001).",
          "Priority badge (color-coded).",
          "Status badge.",
          "Request type and category.",
          "Description of what is needed.",
          "Submitted by and date.",
          "Pre-approval progress (X/4).",
          "Approval/rejection buttons (for approvers).",
          "Delete button (Admin/HR only).",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Approving a Request</h3>
        <Checklist items={[
          "Review the request description and sample ticket.",
          "Check if similar updates already exist.",
          "Click 'Approve' to approve the request.",
          "Add optional notes explaining the decision.",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Rejecting a Request</h3>
        <Checklist items={[
          "Review the request details.",
          "Click 'Reject' to reject the request.",
          "Add notes explaining why the request was rejected (required).",
          "Submitter receives notification with rejection reason.",
        ]} />

        <CalloutBox variant="warning">
          When rejecting a request, always provide a clear explanation. This helps the submitter understand and potentially submit a better request.
        </CalloutBox>
      </GuideSection>
    </>
  );
}
