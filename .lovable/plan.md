

## Notify Admins/Super Admins/HR on Update Request Submission

### What Changes

**1. `supabase/functions/send-request-notification/index.ts`**
- Add Supabase client initialization to query `user_roles` for all Super Admin, Admin, and HR emails
- Merge those emails with the pre-approver emails (de-duplicated)
- Send the notification to all of them — the email already says "A new request requires your approval" which works for both audiences
- Slightly adjust the email wording for non-approvers: "A new update request has been submitted and requires review"

**2. `src/lib/requestApi.ts`** (line ~108)
- Remove hardcoded `PRE_APPROVERS.map(a => a.email)` from the `approverEmails` payload
- Instead, let the edge function handle fetching the full recipient list (pass a flag or just let the function query roles internally)
- Alternatively, keep the client-side call simple and let the edge function expand the recipient list

### Approach
The cleanest approach: modify `send-request-notification` to accept the pre-approver emails AND internally query `user_roles` for Super Admins, Admins, and HR, then de-duplicate and send to all. This keeps the client code simple.

### Already Done (Notification #2)
The `check-full-approval` edge function was already updated in the previous change to notify all Super Admins, Admins, and HR when all pre-approvers approve. No additional work needed for that part.

### No Database Changes
No schema changes required.

