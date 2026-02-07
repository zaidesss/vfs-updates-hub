

# Replace Resend with Gmail API (Google Workspace)

## Overview
Migrate all email notifications from Resend to Gmail API using a Google Workspace Service Account with Domain-Wide Delegation. This eliminates the 100 emails/day limit and uses your existing Google Workspace account.

## Benefits
- **No daily limits**: 2,000+ emails/day (vs 100 with Resend free tier)
- **Professional branding**: Emails from `noreply@virtualfreelancesolutions.com`
- **No third-party dependency**: Uses your existing Google Workspace
- **Cost savings**: No need to upgrade Resend plan

---

## Phase 1: Google Cloud Setup (Manual Steps - You Do This)

### Step 1.1: Create Service Account
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select or create a project
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > Service Account**
5. Name it (e.g., "VFS Email Service")
6. Skip optional steps, click **Done**

### Step 1.2: Enable Gmail API
1. Go to **APIs & Services > Library**
2. Search for "Gmail API"
3. Click **Enable**

### Step 1.3: Create Service Account Key
1. Go to **IAM & Admin > Service Accounts**
2. Click on your service account
3. Go to **Keys** tab
4. Click **Add Key > Create new key > JSON**
5. Download the JSON file (keep it safe!)

### Step 1.4: Enable Domain-Wide Delegation
1. On the service account page, click **Edit**
2. Check **Enable Google Workspace Domain-wide Delegation**
3. Save
4. Copy the **Client ID** (numeric value)

### Step 1.5: Grant Gmail Permissions in Google Admin
1. Go to [Google Admin Console](https://admin.google.com)
2. Navigate to **Security > Access and data control > API controls**
3. Click **Manage Domain Wide Delegation**
4. Click **Add new**
5. Enter the **Client ID** from Step 1.4
6. Add scope: `https://www.googleapis.com/auth/gmail.send`
7. Click **Authorize**

---

## Phase 2: Create Shared Gmail Utility (I Do This)

### Step 2.1: Create Gmail Email Sender Module

Create a new shared utility file that all edge functions can import:

```text
File: supabase/functions/_shared/gmail-sender.ts
```

This module will:
- Parse the service account JSON from secrets
- Generate JWT tokens for authentication
- Exchange JWT for access tokens
- Send emails via Gmail API
- Handle errors gracefully

### Technical Implementation

```typescript
// Key components:

// 1. Generate JWT for service account authentication
function createJWT(serviceAccount: ServiceAccount, userEmail: string): string {
  // Creates signed JWT with gmail.send scope
  // Includes "sub" claim to impersonate userEmail
}

// 2. Exchange JWT for access token
async function getAccessToken(jwt: string): Promise<string> {
  // POST to https://oauth2.googleapis.com/token
  // Returns bearer access token
}

// 3. Send email via Gmail API
async function sendEmail(options: EmailOptions): Promise<void> {
  // Create MIME message (base64url encoded)
  // POST to https://gmail.googleapis.com/gmail/v1/users/me/messages/send
}

// 4. Export simple interface
export async function sendGmailEmail(options: {
  to: string[];
  cc?: string[];
  subject: string;
  html: string;
  from?: string; // defaults to noreply@virtualfreelancesolutions.com
}): Promise<{ success: boolean; error?: string }>
```

---

## Phase 3: Update Edge Functions (I Do This)

### Functions to Update (28 total)

| Priority | Function | Purpose |
|----------|----------|---------|
| High | send-qa-notification | QA evaluation emails |
| High | send-custom-action-notification | Custom action alerts |
| High | send-notifications | Update announcements |
| High | create-user-with-password | Welcome emails |
| High | send-leave-request-notification | Leave request alerts |
| High | send-leave-decision-notification | Leave decision emails |
| High | send-password-reset-notification | Password reset |
| Medium | send-question | Question submission |
| Medium | send-question-reply-notification | Question replies |
| Medium | send-request-notification | Request alerts |
| Medium | send-request-stage-notification | Request stage updates |
| Medium | send-override-request-notification | Override requests |
| Medium | send-approval-reminders | Approval reminders |
| Medium | send-reminders | General reminders |
| Medium | send-profile-change-notification | Profile changes |
| Medium | send-profile-status-notification | Profile status |
| Medium | send-status-change-notification | Status changes |
| Medium | send-status-alert-notification | Status alerts |
| Medium | send-upwork-limit-request | Upwork limit requests |
| Medium | send-rate-progression-reminders | Rate progression |
| Medium | send-failed-emails-digest | Failed email digest |
| Low | assign-tickets-on-login | Ticket assignment alerts |
| Low | generate-agent-reports | Agent report emails |
| Low | generate-eod-analytics | EOD analytics |
| Low | generate-weekly-analytics | Weekly analytics |
| Low | check-full-approval | Approval notifications |
| Low | finalize-request-review | Review finalization |

### Change Pattern for Each Function

```typescript
// BEFORE (Resend)
import { Resend } from "https://esm.sh/resend@2.0.0";
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
await resend.emails.send({
  from: 'VFS Updates Hub <noreply@updates.virtualfreelancesolutions.com>',
  to: recipients,
  subject: 'Subject here',
  html: '<p>Email content</p>',
});

// AFTER (Gmail API)
import { sendGmailEmail } from "../_shared/gmail-sender.ts";
await sendGmailEmail({
  to: recipients,
  subject: 'Subject here',
  html: '<p>Email content</p>',
  // from defaults to noreply@virtualfreelancesolutions.com
});
```

---

## Phase 4: Configure Secrets (You Provide, I Configure)

### Required Secret
| Secret Name | Description |
|-------------|-------------|
| GOOGLE_SERVICE_ACCOUNT_JSON | The entire JSON file content from Step 1.3 |

### Optional Configuration
| Secret Name | Default | Description |
|-------------|---------|-------------|
| GMAIL_SENDER_EMAIL | noreply@virtualfreelancesolutions.com | The email to send from |

---

## Phase 5: Register Missing Edge Function

Currently `send-custom-action-notification` is not registered in `supabase/config.toml`. This needs to be added:

```toml
[functions.send-custom-action-notification]
verify_jwt = false
```

---

## Implementation Order

1. **You complete Phase 1** (Google Cloud setup) - ~15 minutes
2. **You provide** the service account JSON content
3. **I create** the shared Gmail sender module
4. **I update** high-priority functions first (QA, notifications, user creation)
5. **We test** with a single function
6. **I update** remaining functions
7. **Cleanup**: Remove RESEND_API_KEY references (optional - can keep as backup)

---

## Rollback Plan

If Gmail API has issues, we can:
1. Keep Resend code as fallback (behind a feature flag)
2. Revert to Resend by changing import statements
3. The RESEND_API_KEY can remain configured as backup

---

## Questions Before Starting

Once you complete the Google Cloud setup (Phase 1), let me know and provide:
1. The service account JSON file contents (I'll securely store it)
2. Confirm the sender email should be `noreply@virtualfreelancesolutions.com`

