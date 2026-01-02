import { GuideSection, CalloutBox, Checklist, QuickTable } from '../GuideComponents';

export function LeaveRequestSection() {
  return (
    <>
      <GuideSection letter="K" color="bg-orange-500" title="Leave Requests - Form Fields">
        <p className="text-muted-foreground mb-4">
          Leave/outage requests are submitted through a form. Some fields are auto-populated based on your profile.
        </p>

        <h3 className="font-semibold mb-2">Form Fields</h3>
        <QuickTable 
          headers={['Field', 'Required', 'Auto-Populated?', 'Notes']}
          rows={[
            ['Agent Name', 'Yes', 'Yes (for directory users)', 'Dropdown for admins to select any agent.'],
            ['Client Name', 'Yes', 'Yes (if agent has 1 client)', 'Limited to the agent\'s assigned clients.'],
            ['Team Lead Name', 'Yes', 'Yes (for directory users)', 'Dropdown for admins to select any team lead.'],
            ['Role', 'Yes', 'Yes (for directory users)', 'Dropdown for admins.'],
            ['Start Date', 'Yes', 'No', 'Date picker. Cannot be in the past.'],
            ['End Date', 'Yes', 'No', 'Must be on or after start date.'],
            ['Start Time (EST)', 'Yes', 'Defaults to 09:00', 'Time picker in 30-minute intervals.'],
            ['End Time (EST)', 'Yes', 'Defaults to 17:00', 'Time picker in 30-minute intervals.'],
            ['Outage Reason', 'Yes', 'No', 'Dropdown selection (see list below).'],
            ['Attachment', 'No', 'No', 'File upload for proof documents.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Outage Reasons Available</h3>
        <QuickTable 
          headers={['Reason', 'Typical Use Case']}
          rows={[
            ['Power Outage', 'Electricity issues preventing work.'],
            ['Wi-Fi Issue', 'Internet connectivity problems.'],
            ['Medical Leave', 'Health-related absence.'],
            ['Planned Leave', 'Pre-scheduled time off (vacation, etc.).'],
            ['Equipment Issue', 'Computer or equipment failure.'],
            ['Late Login', 'Starting work later than scheduled.'],
            ['Undertime', 'Leaving work earlier than scheduled.'],
            ['Unplanned', 'Emergency or unexpected absence.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Validation Rules</h3>
        <Checklist items={[
          "All fields marked with asterisk (*) are required.",
          "End date must be on or after the start date.",
          "Start time must be before end time (if same day).",
          "Agent must have at least one assigned client.",
          "Form shows error messages for each validation failure.",
        ]} />

        <CalloutBox variant="info" title="All Times in EST">
          All times are entered and displayed in Eastern Standard Time (EST). Make sure to account for this when scheduling.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="L" color="bg-orange-400" title="Leave Requests - Conflict Detection & Override">
        <p className="text-muted-foreground mb-4">
          The system automatically checks for scheduling conflicts when a request is submitted.
        </p>

        <h3 className="font-semibold mb-2">Conflict Detection</h3>
        <Checklist items={[
          "System checks for overlapping APPROVED requests for the same client.",
          "If conflict found: Warning message displayed with conflicting agent names.",
          "User can still submit with an override reason.",
          "Override requests go to 'Pending Override' status.",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Override Request Process</h3>
        <QuickTable 
          headers={['Step', 'Action', 'Who Does It']}
          rows={[
            ['1', 'Conflict detected and warning shown.', 'System'],
            ['2', 'User enters override reason explaining the conflict.', 'User'],
            ['3', 'Request submitted with "Pending Override" status.', 'User'],
            ['4', 'Admin/HR receives email notification about override.', 'System'],
            ['5', 'Admin/HR reviews and approves or declines.', 'Admin/HR'],
          ]}
        />

        <CalloutBox variant="warning" title="Override Approval">
          Override requests require special attention from administrators. Include a clear explanation of why the overlapping schedule is necessary or acceptable.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="M" color="bg-orange-300" title="Leave Requests - Statuses">
        <p className="text-muted-foreground mb-4">
          Each leave request has a status indicating its current state in the approval process.
        </p>

        <h3 className="font-semibold mb-2">Request Statuses</h3>
        <QuickTable 
          headers={['Status', 'Meaning', 'Color', 'Next Steps']}
          rows={[
            ['Pending', 'Request is waiting for approval.', 'Yellow', 'Wait for Admin/HR review.'],
            ['Pending Override', 'Conflict exists, awaiting admin override approval.', 'Orange', 'Admin must review override reason.'],
            ['Approved', 'Request has been approved.', 'Green', 'Outage is confirmed.'],
            ['Declined', 'Request has been rejected.', 'Red', 'Check remarks for reason.'],
            ['Canceled', 'User canceled their own request.', 'Gray', 'No action needed.'],
          ]}
        />

        <CalloutBox variant="tip">
          You can cancel your own pending requests by clicking the Cancel button. Approved requests cannot be canceled by users.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="N" color="bg-amber-500" title="Leave Requests - My Requests Table">
        <p className="text-muted-foreground mb-4">
          The My Requests table shows all leave requests you have submitted.
        </p>

        <h3 className="font-semibold mb-2">Table Columns</h3>
        <QuickTable 
          headers={['Column', 'Description']}
          rows={[
            ['Checkbox', 'For bulk selection (Admin/HR only).'],
            ['Reference Number', 'Unique identifier (e.g., LR-0001).'],
            ['Start Date', 'When the outage begins.'],
            ['End Date', 'When the outage ends.'],
            ['Client', 'The client affected by the outage.'],
            ['Reason', 'The type of outage (Power, Medical, etc.).'],
            ['Status', 'Current status badge.'],
            ['Hours', 'Total outage hours calculated.'],
            ['Days', 'Total outage days calculated.'],
            ['Actions', 'Available action buttons.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Action Buttons</h3>
        <QuickTable 
          headers={['Button', 'Icon', 'Who Can Use', 'When Available']}
          rows={[
            ['Edit', 'Pencil', 'Request owner OR Admin', 'When status is Pending.'],
            ['Cancel', 'X', 'Request owner', 'When status is Pending.'],
            ['Approve', 'Check', 'Admin/HR', 'When status is Pending or Pending Override.'],
            ['Decline', 'X', 'Admin/HR', 'When status is Pending or Pending Override.'],
            ['History', 'Clock', 'Everyone', 'Always available.'],
            ['Delete', 'Trash', 'Admin/HR', 'Always available.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Admin View - Override Tab</h3>
        <p className="text-sm text-muted-foreground">
          Admin and HR users see an additional "Override" tab that shows only Pending Override requests. A badge indicates the count of override requests needing attention.
        </p>
      </GuideSection>
    </>
  );
}
