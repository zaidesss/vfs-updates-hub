

# Disable Self-Copy Emails & Migrate All Notifications to Gmail API

## Summary
Two changes are required:
1. **Disable self-copy**: Remove the behavior where `hr@virtualfreelancesolutions.com` receives a copy of every email it sends
2. **Migrate to Gmail API**: Update all edge functions still using Resend directly to use the `gmail-sender.ts` utility instead, with Resend as fallback

## Current State Analysis

### Self-Copy Behavior
The Gmail API inherently stores a copy of sent emails in the sender's "Sent" folder. There's no explicit "self-copy" code in `gmail-sender.ts`, but when emails are sent via Gmail API from `hr@virtualfreelancesolutions.com`, they automatically appear in that account's Sent folder. **This is standard Gmail behavior and cannot be disabled** without changing the sender address entirely.

However, if you're seeing HR in the recipient list explicitly, that would be from functions that include HR as a recipient.

### Functions Still Using Resend Directly (5 functions)

| Function | Current Sender | Status |
|----------|---------------|--------|
| `generate-agent-reports` | `noreply@vfsoperations.online` | Uses Resend API directly |
| `generate-eod-analytics` | `noreply@updates.virtualfreelancesolutions.com` | Uses Resend API directly |
| `check-user-profile-mismatch` | `noreply@updates.virtualfreelancesolutions.com` | Uses Resend SDK |
| `change-user-email` | `onboarding@resend.dev` | Uses Resend SDK |
| `check-full-approval` | Uses Resend API | Uses Resend API directly |

### Functions Already Using Gmail Sender
All other notification functions (20+) already use `sendEmail()` from `gmail-sender.ts` with `hr@virtualfreelancesolutions.com` as sender.

## Implementation Plan

### 1. Update `generate-agent-reports` (Line 773-788)
**Current:** Direct Resend API with `noreply@vfsoperations.online`
**Change:** Import and use `sendEmail()` from `gmail-sender.ts`

```typescript
// BEFORE
await fetch('https://api.resend.com/emails', {
  body: JSON.stringify({
    from: 'VFS Updates Hub <noreply@vfsoperations.online>',
    to: adminEmails,
    subject: title,
    html: htmlBody,
  }),
});

// AFTER
import { sendEmail } from '../_shared/gmail-sender.ts';
// ...
await sendEmail({
  to: adminEmails,
  subject: title,
  html: htmlBody,
});
```

### 2. Update `generate-eod-analytics` (Line 177)
**Current:** Direct Resend API with `noreply@updates.virtualfreelancesolutions.com`
**Change:** Use `sendEmail()` from `gmail-sender.ts`

### 3. Update `check-user-profile-mismatch` (Lines 222-229)
**Current:** Resend SDK with `noreply@updates.virtualfreelancesolutions.com`
**Change:** Use `sendEmail()` from `gmail-sender.ts`

### 4. Update `change-user-email` (Lines 149-165)
**Current:** Resend SDK with `onboarding@resend.dev`
**Change:** Use `sendEmail()` from `gmail-sender.ts`

### 5. Update `check-full-approval` (Lines 167-175)
**Current:** Direct Resend API
**Change:** Use `sendEmail()` from `gmail-sender.ts`

## Fallback to Resend

The `gmail-sender.ts` utility returns `{ success: false, error }` if Gmail fails. We can optionally add Resend as a fallback by updating the utility or handling failures in each function.

**Recommendation:** Add fallback logic to `gmail-sender.ts` itself:

```typescript
export async function sendEmail(options): Promise<SendResult> {
  // Try Gmail first
  const gmailResult = await sendGmailEmail({ ... });
  
  if (gmailResult.success) {
    return gmailResult;
  }
  
  // Fallback to Resend if Gmail fails
  console.log('Gmail failed, attempting Resend fallback...');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: `Agent Portal <${options.from || DEFAULT_SENDER_EMAIL}>`,
          to: options.to,
          cc: options.cc,
          subject: options.subject,
          html: options.html,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return { success: true, messageId: data.id };
      }
    } catch (resendError) {
      console.error('Resend fallback also failed:', resendError);
    }
  }
  
  return gmailResult; // Return original Gmail error
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/_shared/gmail-sender.ts` | Add Resend fallback logic |
| `supabase/functions/generate-agent-reports/index.ts` | Import `sendEmail`, replace direct Resend call |
| `supabase/functions/generate-eod-analytics/index.ts` | Import `sendEmail`, replace direct Resend call |
| `supabase/functions/check-user-profile-mismatch/index.ts` | Import `sendEmail`, remove Resend SDK |
| `supabase/functions/change-user-email/index.ts` | Import `sendEmail`, remove Resend SDK |
| `supabase/functions/check-full-approval/index.ts` | Import `sendEmail`, replace direct Resend call |

## About the "Self-Copy" Issue

Gmail automatically keeps copies of sent emails in the sender's Sent folder. This is not something we can disable. If you're seeing HR explicitly in email recipients, that would be from code that adds HR to the TO/CC/BCC fields.

After migrating all functions to use `gmail-sender.ts`, all emails will:
- Come FROM `hr@virtualfreelancesolutions.com`
- Appear in HR's Sent folder (automatic Gmail behavior)
- NOT include HR in the recipient list unless explicitly coded

**Note:** The QA notification change (limiting to agent + team lead) is a separate task from the previous message.

