

## Plan: Update Request Approval Flow

### Summary
Remove Patrick as the sole final approver. After all 4 team leads pre-approve, any Super Admin or HR user can do the final review. Add a new "Escalate to Improvements" decision option that auto-creates an entry in the Improvements Tracker.

---

### Files to Change

**1. `src/lib/approvers.ts`**
- Remove `FINAL_APPROVER` constant and all references to Patrick
- Remove `isFinalApprover` logic (make it return false or remove)
- Keep pre-approvers unchanged

**2. `src/lib/requestApi.ts`**
- Remove `FINAL_APPROVER` import
- Update `finalizeRequestReview` to accept the new `escalate_to_improvements` decision
- Add `FinalDecision` type update to include `'escalate_to_improvements'`

**3. `src/types/request.ts`**
- Add `'escalate_to_improvements'` to the `FinalDecision` type union

**4. `src/pages/Requests.tsx`**
- Remove `isFinalApprover` usage; instead check if user is Super Admin, Admin, or HR
- Show final review controls to any Super Admin/Admin/HR user (using existing `isAdmin` and `isHR` from AuthContext)
- Add "Escalate to Improvements" button alongside Create New, Update Existing, Reject
- Update the "Final Review" section header from showing Patrick's name to "Super Admin / HR"
- Update status messages ("Awaiting Super Admin/HR review" instead of "Awaiting Patrick's decision")

**5. `supabase/functions/check-full-approval/index.ts`**
- Remove hardcoded `FINAL_APPROVER` (Patrick)
- When all pre-approvers approve, fetch all Super Admins, Admins, and HR from `user_roles`
- Send notification email to all of them (de-duplicated) instead of just Patrick
- Still update request status to `pending_final_review`
- Do NOT create a stage-2 approval record for a specific person (final review is done by any authorized user via the `finalize-request-review` function)

**6. `supabase/functions/finalize-request-review/index.ts`**
- Remove the hardcoded Patrick email check
- Instead, verify the approver has a Super Admin, Admin, or HR role in `user_roles`
- Add `'escalate_to_improvements'` as a valid decision
- When decision is `escalate_to_improvements`:
  - Insert a new row into the `improvements` table with:
    - `category`: Map from the request's category or default to "Other"
    - `task`: Request description (truncated)
    - `description`: Full request description
    - `priority`: Map request priority to improvement priority (low/medium/high)
    - `status`: `not_started`
    - `requested_by_email`: The original submitter
    - `notes`: Include the request reference number for traceability
  - Mark the request as `approved` with `final_decision = 'escalate_to_improvements'`
- Continue sending notifications to HR and the submitter as before

### No Database Schema Changes Needed
The `improvements` table and `article_requests` table already have all the necessary columns. The `final_decision` column is stored as text, so `'escalate_to_improvements'` will work without a schema migration.

