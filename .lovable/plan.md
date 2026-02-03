
# Next Step: Integrate Bio Data + Create Status Alert Edge Function

## Current Status
The database schema and core UI components are in place. The remaining work is:
1. Pass bio allowance/remaining data from AgentDashboard to StatusButtons
2. Create the `send-status-alert-notification` edge function for real-time alerts
3. Implement auto-logout logic on LOGIN attempt

This step focuses on **#1 and #2** to enable the timer functionality with notifications.

---

## Step 1: Update AgentDashboard to Pass Bio Data

The `StatusButtons` component already accepts `bioTimeRemaining`, `bioAllowance`, and callback props, but `AgentDashboard` doesn't pass them yet.

**Changes to `src/pages/AgentDashboard.tsx`:**

### A. Add state for bio data
```typescript
const [bioTimeRemaining, setBioTimeRemaining] = useState<number | null>(null);
const [bioAllowance, setBioAllowance] = useState<number | null>(null);
```

### B. Extract bio data from status fetch
When fetching `getProfileStatus`, extract the bio fields:
```typescript
if (statusResult.data) {
  setStatus(statusResult.data.current_status);
  setStatusSince(statusResult.data.status_since);
  setBioTimeRemaining(statusResult.data.bio_time_remaining_seconds);
  setBioAllowance(statusResult.data.bio_allowance_seconds);
}
```

### C. Calculate bio allowance from schedule (if not set)
Add a helper function to calculate allowance based on shift duration:
```typescript
function calculateBioAllowanceFromSchedule(profile: DashboardProfile): number {
  // Get today's schedule
  const dayMap: Record<number, keyof DashboardProfile> = {
    1: 'mon_schedule', 2: 'tue_schedule', 3: 'wed_schedule',
    4: 'thu_schedule', 5: 'fri_schedule', 6: 'sat_schedule', 0: 'sun_schedule'
  };
  const today = new Date().getDay();
  const scheduleKey = dayMap[today];
  const schedule = profile[scheduleKey] as string | null;
  
  if (!schedule) return 2 * 60; // Default 2 mins
  
  // Parse schedule and calculate duration
  const parsed = parseScheduleRange(schedule);
  if (!parsed) return 2 * 60;
  
  let durationMinutes = parsed.endMinutes - parsed.startMinutes;
  if (durationMinutes < 0) durationMinutes += 24 * 60;
  
  // 8+ hours = 4 mins, less = 2 mins
  return durationMinutes >= 480 ? 4 * 60 : 2 * 60;
}
```

### D. Pass props to StatusButtons
```tsx
<StatusButtons
  currentStatus={status}
  isLoading={isUpdating}
  onStatusChange={handleStatusChange}
  statusSince={statusSince}
  bioTimeRemaining={bioTimeRemaining}
  bioAllowance={bioAllowance ?? calculateBioAllowanceFromSchedule(profile)}
  onRestartExceeded={handleRestartExceeded}
  onBioExceeded={handleBioExceeded}
/>
```

### E. Add callback handlers for exceeded events
```typescript
const handleRestartExceeded = async () => {
  // Invoke edge function to notify team leads
  try {
    await supabase.functions.invoke('send-status-alert-notification', {
      body: {
        agentEmail: profile?.email,
        agentName: profile?.full_name || profile?.agent_name,
        alertType: 'EXCESSIVE_RESTART',
        details: { elapsedSeconds: 300 } // 5 min exceeded
      }
    });
  } catch (err) {
    console.error('Failed to send restart alert:', err);
  }
};

const handleBioExceeded = async () => {
  // Invoke edge function to notify team leads
  try {
    await supabase.functions.invoke('send-status-alert-notification', {
      body: {
        agentEmail: profile?.email,
        agentName: profile?.full_name || profile?.agent_name,
        alertType: 'BIO_OVERUSE',
        details: { allowance: bioAllowance }
      }
    });
  } catch (err) {
    console.error('Failed to send bio alert:', err);
  }
};
```

---

## Step 2: Create send-status-alert-notification Edge Function

**New file: `supabase/functions/send-status-alert-notification/index.ts`**

This function will:
1. Receive alert type and agent info
2. Fetch all admins/HR/super_admins
3. Create in-app notifications
4. Send email via Resend
5. Send Slack notification via webhook

**Key implementation details:**
- Uses existing `RESEND_API_KEY` and `SLACK_WEBHOOK_URL` secrets (already configured)
- Follows the same pattern as `send-notifications` edge function
- Creates an `agent_report` record for the violation
- De-duplicates recipients

**Payload structure:**
```typescript
interface AlertRequest {
  agentEmail: string;
  agentName: string;
  alertType: 'EXCESSIVE_RESTART' | 'BIO_OVERUSE';
  details: Record<string, any>;
}
```

---

## Step 3: Update agentDashboardApi for Bio Handling

**Changes to `src/lib/agentDashboardApi.ts`:**

### A. Update updateProfileStatus for bio events
When `BIO_START` is triggered, record the current bio_time_remaining.
When `BIO_END` is triggered, calculate consumed time and update remaining.

```typescript
// In updateProfileStatus, handle bio events:
if (eventType === 'BIO_START') {
  // Bio starts - status_since marks when bio began
  // No need to modify bio_time_remaining yet
}

if (eventType === 'BIO_END') {
  // Calculate how much bio time was consumed
  const bioStartTime = new Date(currentStatusData?.status_since || now);
  const bioEndTime = new Date(now);
  const consumedSeconds = Math.floor((bioEndTime.getTime() - bioStartTime.getTime()) / 1000);
  
  const currentRemaining = currentStatusData?.bio_time_remaining_seconds ?? 0;
  const newRemaining = Math.max(0, currentRemaining - consumedSeconds);
  
  // Update profile_status with new bio_time_remaining_seconds
  await supabase.from('profile_status').update({
    bio_time_remaining_seconds: newRemaining
  }).eq('profile_id', profileId);
}
```

### B. Initialize bio allowance on LOGIN
When an agent logs in, reset bio allowance based on their schedule:
```typescript
if (eventType === 'LOGIN') {
  // Calculate bio allowance from schedule
  const bioAllowance = await calculateBioAllowanceForProfile(profileId);
  
  // Set bio_time_remaining_seconds = bio_allowance_seconds on login
  await supabase.from('profile_status').update({
    bio_time_remaining_seconds: bioAllowance,
    bio_allowance_seconds: bioAllowance
  }).eq('profile_id', profileId);
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/AgentDashboard.tsx` | Add bio state, pass props to StatusButtons, add exceeded handlers |
| `src/lib/agentDashboardApi.ts` | Add bio handling in updateProfileStatus, add helper functions |
| `supabase/functions/send-status-alert-notification/index.ts` | **NEW** - Edge function for alerts |
| `supabase/config.toml` | Add config for new edge function |

---

## Technical Considerations

### 1. Timer Accuracy
The timer runs client-side with 1-second intervals. The actual violation time is verified server-side based on `status_since` timestamp to prevent manipulation.

### 2. Notification De-duplication
The `onRestartExceeded` and `onBioExceeded` callbacks use refs (`restartExceededNotified`, `bioExceededNotified`) to ensure the alert is only sent once per session.

### 3. Bio Allowance Initialization
Bio allowance is initialized on each LOGIN event, so the timer resets daily. If an agent logs out and back in on the same day, the allowance resets (which may be intentional or can be adjusted).

### 4. Edge Function Security
The edge function will have `verify_jwt = false` (like other notification functions) since it may be called from client or scheduled jobs.

---

## Implementation Order

1. Create the edge function first (so callbacks work)
2. Update agentDashboardApi with bio handling
3. Update AgentDashboard to pass props and handlers
4. Test end-to-end

---

## What's After This Step

After this step is complete, the remaining tasks are:
1. Implement auto-logout logic on LOGIN attempt
2. Create `generate-agent-reports` edge function for daily automated report generation
3. End-to-end testing
