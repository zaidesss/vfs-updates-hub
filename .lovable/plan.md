
# Restrict EOD & EOW Email Notifications to Admin Roles

## Current State Analysis

| Function | In-App Notifications | Email Recipients | Fix Needed |
|----------|---------------------|------------------|------------|
| `generate-eod-analytics` | Admins only | ALL users | Yes |
| `generate-weekly-analytics` | Admins only | ALL users | Yes |
| `send-status-alert-notification` | Admins only | Admins only | No (already correct) |

**Code Evidence:**
- EOD (Line 182-187): `const allEmailRecipients = Array.from(allEmails);` includes all profiles
- EOW (Line 250-284): Same pattern - sends to `allEmailRecipients` which includes everyone
- Status Alert (Line 181-220): Already uses `recipientEmails` from admin roles query only

## Solution

Change email recipients from `allEmailRecipients` (everyone) to `adminEmails` (admin/HR/super_admin only) in both EOD and EOW functions.

### Changes Required

**File 1: `supabase/functions/generate-eod-analytics/index.ts`**

**Lines 182-187** - Replace `allEmailRecipients` with `adminEmails`:
```typescript
// BEFORE (Line 182-183):
// Email to ALL users
const allEmailRecipients = Array.from(allEmails);
if (resendApiKey && allEmailRecipients.length > 0) {

// AFTER:
// Email to admin/HR/super_admin only
if (resendApiKey && adminEmails.length > 0) {
```

Also update the `to:` field in the Resend payload (Line 187):
```typescript
// Change: to: allEmailRecipients
// To: to: adminEmails
```

**File 2: `supabase/functions/generate-weekly-analytics/index.ts`**

**Lines 250-252** - Replace `allEmailRecipients` with `adminEmails`:
```typescript
// BEFORE (Line 250-251):
// Email to ALL users
const allEmailRecipients = Array.from(allEmails);
if (resendApiKey && allEmailRecipients.length > 0) {

// AFTER:
// Email to admin/HR/super_admin only
if (resendApiKey && adminEmails.length > 0) {
```

Also update the `to:` field in the Resend payload (Line 284):
```typescript
// Change: to: allEmailRecipients
// To: to: adminEmails
```

### Cleanup (Optional)

Since `allEmails` and `allEmailRecipients` are no longer used, the following code can be removed from both functions:

**EOD (Lines 159-171):**
```typescript
// Can remove:
const { data: allProfiles } = await supabase
  .from("agent_profiles")
  .select("email")
  .neq("employment_status", "Terminated");

const allEmails = new Set<string>();
allProfiles?.forEach(p => allEmails.add(p.email.toLowerCase()));
admins?.forEach(a => allEmails.add(a.email.toLowerCase()));
```

**EOW (Lines 226-239):**
```typescript
// Can remove:
const { data: allProfiles } = await supabase
  .from("agent_profiles")
  .select("email")
  .neq("employment_status", "Terminated");

const allEmails = new Set<string>();
allProfiles?.forEach(p => allEmails.add(p.email.toLowerCase()));
admins?.forEach(a => allEmails.add(a.email.toLowerCase()));
```

## Implementation Summary

| File | Change |
|------|--------|
| `generate-eod-analytics/index.ts` | Replace `allEmailRecipients` with `adminEmails` for email sending |
| `generate-weekly-analytics/index.ts` | Replace `allEmailRecipients` with `adminEmails` for email sending |
| `send-status-alert-notification/index.ts` | No changes needed (already correct) |

## Expected Outcome

After implementation:
- EOD Analytics emails → Admin/HR/Super Admin only
- EOW Analytics emails → Admin/HR/Super Admin only  
- Incident Report emails → Admin/HR/Super Admin only (unchanged)
- Slack notifications → `a_agent_reports` channel (unchanged)
- In-app notifications → Admin/HR/Super Admin only (unchanged)

## Verification

After deployment, trigger test calls to confirm emails are only sent to admin role users.
