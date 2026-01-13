import { GuideSection, CalloutBox, Checklist, QuickTable } from '../../GuideComponents';

export function ProfileChangeRequestsSection() {
  return (
    <GuideSection letter="M" color="bg-orange-500" title="Profile Change Requests (Super Admin)">
      <p className="text-muted-foreground mb-4">
        Super Admins review and approve/reject profile change requests for protected fields.
      </p>

      <h3 className="font-semibold mb-2">Protected Profile Fields</h3>
      <p className="text-sm text-muted-foreground mb-2">
        These fields require Super Admin approval to change:
      </p>
      <Checklist items={[
        "Current Hourly Rate",
        "Rate History / Rate Progression",
        "Start Date",
        "Position / Role",
        "Banking Information (Bank Name, Account Number, Holder)",
      ]} />

      <h3 className="font-semibold mb-2 mt-4">Viewing Change Requests</h3>
      <Checklist items={[
        "Requests appear in the Admin Panel.",
        "Each request shows: Reference Number (PCR-XXXX), Requester, Target Agent, Field, Current Value, Requested Value, Reason.",
        "Filter by status: Pending, Approved, Rejected.",
      ]} />

      <h3 className="font-semibold mb-2 mt-4">Processing Requests</h3>
      <QuickTable 
        headers={['Action', 'What Happens']}
        rows={[
          ['Approve', 'The profile field is updated to the requested value. User is notified.'],
          ['Reject', 'Request is marked rejected with your notes. User is notified.'],
        ]}
      />

      <h3 className="font-semibold mb-2 mt-4">Rate Progression Reminders</h3>
      <p className="text-sm text-muted-foreground mb-2">
        The system automatically sends email reminders to Admins and Super Admins 7 days before an agent's rate progression is due (based on rate_history dates).
      </p>

      <CalloutBox variant="info">
        Always review the reason provided for change requests. Communicate with the requester if additional information is needed before approving or rejecting.
      </CalloutBox>
    </GuideSection>
  );
}
