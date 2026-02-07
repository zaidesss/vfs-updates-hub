
# Update Gmail Sender Email Configuration

## Summary
Update the default sender email address from `noreply@virtualfreelancesolutions.com` to `hr@virtualfreelancesolutions.com` in the shared Gmail sender utility. This will resolve the "Invalid email or User ID" error since `hr@` is the authorized email for Domain-Wide Delegation.

## Change Required

**File:** `supabase/functions/_shared/gmail-sender.ts`

| Line | Current Value | New Value |
|------|--------------|-----------|
| 25 | Comment: `// Defaults to noreply@virtualfreelancesolutions.com` | `// Defaults to hr@virtualfreelancesolutions.com` |
| 36 | `const DEFAULT_SENDER_EMAIL = 'noreply@virtualfreelancesolutions.com';` | `const DEFAULT_SENDER_EMAIL = 'hr@virtualfreelancesolutions.com';` |

## After Implementation
Once updated, I will:
1. Deploy the updated shared utility
2. Re-test the `send-password-reset-notification` function to `malcom@persistbrands.com`
3. Verify the email is delivered successfully

## Technical Notes
- The `sub` claim in the JWT must match a real Google Workspace user with Domain-Wide Delegation enabled
- All 23 edge functions will automatically use the new default since they import from this shared module
- No changes needed to individual edge functions
