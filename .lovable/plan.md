
# Fix Late Status Detection in Shift Schedule

## Problem Identified

The "Late" status detection is failing because of a **schedule format parsing mismatch**:

| Expected Format | Actual Format in Database |
|----------------|--------------------------|
| `9:00` (24-hour) | `9:00 AM-5:00 PM` (12-hour range) |

### What's Happening

The current parsing logic:
```typescript
const [scheduleHours, scheduleMinutes] = scheduleTime.split(':').map(Number);
```

When parsing `"9:00 AM-5:00 PM"`:
1. Split by `:` → `["9", "00 AM-5", "00 PM"]`
2. `scheduleHours = 9` ✓ (works by accident)
3. `scheduleMinutes = NaN` ✗ (because `"00 AM-5"` is not a number)
4. Check `!isNaN(scheduleMinutes)` → **fails**
5. Late detection **skipped entirely** → defaults to "Present"

---

## Solution

Update the schedule parsing logic to correctly extract the **start time** from the range format (`HH:MM AM/PM-HH:MM AM/PM`).

### Parsing Steps

1. Extract start time by splitting on `-` to get `"9:00 AM"` from `"9:00 AM-5:00 PM"`
2. Parse the 12-hour time to extract hours, minutes, and AM/PM
3. Convert to 24-hour format for comparison with login time

### Updated Logic

```typescript
// Parse schedule start time from range format (e.g., "9:00 AM-5:00 PM")
if (scheduleTime) {
  // Extract start time (before the dash)
  const startTimePart = scheduleTime.split('-')[0].trim();
  
  // Parse 12-hour format: "9:00 AM" or "12:30 PM"
  const timeMatch = startTimePart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const period = timeMatch[3].toUpperCase();
    
    // Convert to 24-hour format
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    const scheduledStart = new Date(date);
    scheduledStart.setHours(hours, minutes, 0, 0);
    const lateThreshold = addMinutes(scheduledStart, 10);
    
    if (isAfter(loginTime, lateThreshold)) {
      return { status: 'late', ... };
    }
  }
}
```

---

## Additional Consideration: Timezone Handling

The current comparison creates `scheduledStart` using **local browser time**, but `loginTime` comes from `profile_events.created_at` which is in **UTC**. Since the project standardizes on EST, we should ensure both times are compared in the same timezone.

### Recommended Approach

Convert the login time to EST before comparison to ensure accurate late detection regardless of user's browser timezone.

---

## Files to Modify

| File | Changes |
|------|--------|
| `src/lib/agentDashboardApi.ts` | Update schedule parsing in `calculateAttendanceForWeek` to handle `HH:MM AM/PM-HH:MM AM/PM` format and ensure EST timezone consistency |

---

## Expected Behavior After Fix

| Scenario | Current (Wrong) | After Fix (Correct) |
|----------|-----------------|---------------------|
| Schedule: 9:00 AM, Login: 9:05 AM | Present | Present (within 10 min) |
| Schedule: 9:00 AM, Login: 9:15 AM | Present | **Late (9:15 AM)** |
| Schedule: 9:00 AM, Login: 12:00 PM | Present | **Late (12:00 PM)** |

---

## Summary

| Action | Purpose |
|--------|---------|
| Fix schedule parsing | Extract start time from `"9:00 AM-5:00 PM"` range format |
| Convert 12h to 24h | Handle AM/PM correctly for time comparison |
| Optional: EST alignment | Ensure timezone-consistent late detection |
