

## Admin/HR Edit Access for QA Evaluations + Re-acknowledgement Flow

### Summary
Allow Admin, HR, and Super Admin to edit QA evaluations at any status (draft, sent, acknowledged). Add an "Edit" option on the list page dropdown. When editing a sent/acknowledged evaluation, show a "Save Draft" button (as requested). After saving changes on an already-acknowledged evaluation, prompt the editor to decide if re-acknowledgement is needed. Log all edits in the Activity History. Only Super Admins can delete.

### Step-by-step Implementation

**Step 1 -- Update QA Evaluations List Page (`QAEvaluations.tsx`)**
- Add an "Edit" dropdown menu item for Admin/HR/Super Admin on every evaluation (all statuses)
- The Edit option navigates to `/team-performance/qa-evaluations/edit/{id}`
- Import `Pencil` icon from lucide-react
- Keep delete restricted to Super Admin only (already done)

**Step 2 -- Update QA Evaluation Detail Page (`QAEvaluationDetail.tsx`)**
- Change the "Edit Draft" button condition from `evaluation.status === 'draft'` to always show for Admin/HR/Super Admin
- Rename button label from "Edit Draft" to "Edit" (since it applies to all statuses)
- Remove the "Send to Agent" button for non-draft evaluations (only show it for drafts)

**Step 3 -- Update QA Evaluation Form Save Logic (`QAEvaluationForm.tsx`)**
- When editing a non-draft evaluation (sent or acknowledged), show only "Save Draft" button (no "Send to Agent" button)
- After saving changes on an already-acknowledged evaluation, show a confirmation dialog:
  - Title: "Does the agent need to review this again?"
  - Body: "You made changes to this evaluation. Would you like the agent to re-acknowledge it?"
  - "Yes" button: resets `agent_acknowledged` to false, `acknowledged_at` to null, sets status back to `sent`, sends email + in-app notification to agent
  - "No" button: saves changes silently, keeps acknowledgement intact
- After saving changes on a sent (not acknowledged) evaluation, send email + in-app notification to agent that the evaluation was updated
- Log an `evaluation_edited` event in activity history (already done)

**Step 4 -- Create Re-acknowledgement Confirmation Dialog**
- New component or inline AlertDialog in `QAEvaluationForm.tsx`
- Simple wording at Flesch-Kincaid grade 7: "You made changes to this evaluation. Does the agent need to review it again?"
- Two buttons: "Yes, send it back" and "No, just save"

**Step 5 -- Add notification for evaluation updates**
- Reuse the existing `send-qa-notification` edge function with a new notification type `evaluation_updated`
- When admin/HR edits a sent or acknowledged evaluation and saves, invoke this notification
- When re-acknowledgement is required, also reset the acknowledgement fields and notify

**Step 6 -- Activity History entries**
- When an already-sent or acknowledged evaluation is edited, log `evaluation_edited` with details about who made the edit
- When acknowledgement is reset, log `acknowledgement_reset` event: "Acknowledgement was reset -- agent needs to review again"
- These events appear in the existing Activity History section at the bottom of the detail page

### Technical Details

**QAEvaluations.tsx (List Page) -- Dropdown changes:**
- Add `Pencil` import
- Inside `DropdownMenuContent`, add an "Edit" item for `canCreate` (Admin/HR/Super Admin) that navigates to the edit route
- This item shows for all statuses (draft, sent, acknowledged)

**QAEvaluationDetail.tsx (Detail Page) -- Edit button changes:**
- Line 275: Change `canViewAll && evaluation.status === 'draft'` to just `canViewAll`
- Change "Edit Draft" label to "Edit"
- Only show "Send to Agent" button when `evaluation.status === 'draft'`

**QAEvaluationForm.tsx (Form Page) -- Save flow changes:**
- Track the original status of the evaluation being edited (`existingEvalData?.evaluation.status`)
- When editing a non-draft evaluation:
  - Show only "Save Draft" button (hide "Send to Agent")
  - After save succeeds, check if original status was acknowledged (`agent_acknowledged === true`)
    - If yes: show re-acknowledgement confirmation dialog
    - If no (just sent): send update notification silently
- Re-acknowledgement dialog "Yes" path:
  - Call `updateQAEvaluation(id, { agent_acknowledged: false, acknowledged_at: null, status: 'sent' })`
  - Call `createEvaluationEvent(id, 'acknowledgement_reset', ...)`
  - Invoke `sendQANotification(id, 'evaluation_updated')`
- Re-acknowledgement dialog "No" path:
  - Just navigate away (changes already saved)

**send-qa-notification edge function:**
- Add handling for `evaluation_updated` notification type
- Email subject: "Your QA Evaluation has been updated"
- Email body includes reference number and a note to log in and review

