

# Implementation: Add @channel Mentions to Status Events

## Overview
Add `<!channel>` mentions to all profile status notifications **except** LOGIN and LOGOUT, so only messages posted to `a_cyrus_cs-all` will include the @channel ping.

---

## Change Details

**File:** `supabase/functions/send-profile-status-notification/index.ts`

### Current Code (line ~54):
```typescript
const message = `${agentName} ${label} at ${formattedTime} EST`;
```

### Updated Code:
```typescript
// Add @channel for non-login/logout events (only a_cyrus_cs-all channel)
const isLoginLogout = eventType === 'LOGIN' || eventType === 'LOGOUT';
const channelMention = isLoginLogout ? '' : '<!channel> ';
const message = `${channelMention}${agentName} ${label} at ${formattedTime} EST`;
```

---

## Expected Results

### Login/Logout (a_cyrus_li-lo) - No @channel:
- `John Doe logged in at 9:15 AM EST`
- `John Doe logged out at 5:30 PM EST`

### Other Events (a_cyrus_cs-all) - With @channel:
- `@channel John Doe started a break at 2:00 PM EST`
- `@channel John Doe ended their break at 2:30 PM EST`
- `@channel John Doe started coaching at 10:00 AM EST`
- `@channel John Doe ended coaching at 11:00 AM EST`
- `@channel John Doe is restarting device at 1:00 PM EST`
- `@channel John Doe device restored at 1:03 PM EST`
- `@channel John Doe started bio break at 3:15 PM EST`
- `@channel John Doe ended bio break at 3:17 PM EST`

### Agent Report Violations (a_pb_mgt) - Already configured:
- `🚿 *Bio Break Overuse* • John Doe has exceeded their bio break allowance (low severity). Review in Agent Reports`
- `🔄 *Excessive Restart* • John Doe has exceeded the 5-min restart limit (medium severity). Review in Agent Reports`

---

## Testing Plan
After deployment, I'll use the browser tool to test each profile event on your dashboard:
1. Toggle Device Restart (start/end)
2. Toggle Bio Break (start/end)
3. Toggle Break (start/end)
4. Toggle Coaching (start/end)
5. Login/Logout

This will verify both the Today's Activity display and Slack notifications.

---

## Files to Modify
1. `supabase/functions/send-profile-status-notification/index.ts` - Add conditional @channel mention

