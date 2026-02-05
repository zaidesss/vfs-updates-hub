

# Fix Agent Reports Incident Details - Field Name & Format Mismatch

## Problem

All incident details in the Agent Reports dialog are showing as `-` or empty because of **two issues**:

1. **Property Name Mismatch**: The backend stores data with different field names than the UI expects
2. **Time Format Issue**: The backend stores times as integers (minutes from midnight, e.g., `720` = 12:00 PM) but the UI renders them directly without conversion

## Root Cause Analysis

| Incident Type | Backend Stores | UI Expects |
|--------------|----------------|------------|
| `LATE_LOGIN` | `scheduledStart`, `actualLogin`, `lateByMinutes` | `scheduleStart`, `loginTime`, `minutesLate` |
| `EARLY_OUT` | `scheduledEnd`, `actualLogout`, `earlyByMinutes` | `scheduleEnd`, `logoutTime`, `minutesEarly` |
| `QUOTA_NOT_MET` | `expectedQuota`, `actualTotal`, `shortfall`, `breakdown` | `quota`, `actual`, `breakdown` |
| `TIME_NOT_MET` | `requiredHours`, `loggedHours`, `shortfallMinutes` | `expected`, `actual`, `source` |
| `NO_LOGOUT` | `loginTime` (ISO string), `scheduledEnd` (minutes) | `loginTime`, `scheduleEnd` |
| `BIO_OVERUSE` | `totalBioSeconds`, `bioAllowance`, `overageSeconds` | `timeUsedSeconds`, `allowanceSeconds`, `exceededSeconds` |

**Example**: Database has `{ scheduledStart: 720, actualLogin: 742, lateByMinutes: 22 }` but UI looks for `details.scheduleStart` which doesn't exist, so it shows `-`.

## Solution

Update the `ReportDetailDialog.tsx` to:

1. Use the correct backend field names
2. Add a helper function to convert minutes to HH:MM format
3. Update the escalation time calculation to use correct field names

## Implementation

### Step 1: Add Time Formatting Helper

Create a helper function to convert minutes from midnight to HH:MM format:

```typescript
// Convert minutes from midnight to HH:MM format
function formatMinutesToTime(minutes: number | undefined | null): string {
  if (minutes === undefined || minutes === null) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}
```

### Step 2: Update renderDetails() for Each Incident Type

**LATE_LOGIN (lines 323-338)**:
```typescript
case 'LATE_LOGIN':
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Schedule Start</span>
        <span className="font-medium">{formatMinutesToTime(details.scheduledStart)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Actual Login</span>
        <span className="font-medium">{formatMinutesToTime(details.actualLogin)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Minutes Late</span>
        <span className="font-medium text-amber-600">{details.lateByMinutes ?? '-'}</span>
      </div>
    </div>
  );
```

**EARLY_OUT (lines 341-357)**:
```typescript
case 'EARLY_OUT':
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Schedule End</span>
        <span className="font-medium">{formatMinutesToTime(details.scheduledEnd)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Actual Logout</span>
        <span className="font-medium">{formatMinutesToTime(details.actualLogout)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Minutes Early</span>
        <span className="font-medium text-orange-600">{details.earlyByMinutes ?? '-'}</span>
      </div>
    </div>
  );
```

**QUOTA_NOT_MET (lines 229-246)**:
```typescript
case 'QUOTA_NOT_MET':
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Expected Quota</span>
        <span className="font-medium">{details.expectedQuota ?? '-'} tickets</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Actual Count</span>
        <span className="font-medium">{details.actualTotal ?? '-'} tickets</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Shortfall</span>
        <span className="font-medium text-red-600">{details.shortfall ?? '-'} tickets</span>
      </div>
      {details.breakdown && (
        <div className="mt-2 p-3 bg-muted/50 rounded-lg text-sm">
          <p>Breakdown: Email: {details.breakdown.email || 0}, Chat: {details.breakdown.chat || 0}, Call: {details.breakdown.call || 0}</p>
        </div>
      )}
    </div>
  );
```

**TIME_NOT_MET (lines 359-378)**:
```typescript
case 'TIME_NOT_MET':
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Required Hours</span>
        <span className="font-medium">{details.requiredHours?.toFixed(1) ?? '-'} hrs</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Logged Hours</span>
        <span className="font-medium">{details.loggedHours?.toFixed(1) ?? '-'} hrs</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Shortfall</span>
        <span className="font-medium text-red-600">{details.shortfallMinutes ?? '-'} mins</span>
      </div>
      {details.source && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Source</span>
          <span className="font-medium capitalize">{details.source}</span>
        </div>
      )}
    </div>
  );
```

**NO_LOGOUT (lines 288-304)**:
```typescript
case 'NO_LOGOUT':
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Last Login</span>
        <span className="font-medium">
          {details.loginTime 
            ? format(new Date(details.loginTime), 'h:mm a')
            : '-'}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Expected Logout</span>
        <span className="font-medium">{formatMinutesToTime(details.scheduledEnd)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Auto-Logged Out</span>
        <span className="font-medium">{details.autoLoggedOut ? 'Yes' : 'No'}</span>
      </div>
    </div>
  );
```

**BIO_OVERUSE (lines 268-286)**:
```typescript
case 'BIO_OVERUSE':
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Bio Time Used</span>
        <span className="font-medium">{details.totalBioSeconds ? Math.ceil(details.totalBioSeconds / 60) : '-'} mins</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Allowance</span>
        <span className="font-medium">{details.bioAllowance ? Math.ceil(details.bioAllowance / 60) : '-'} mins</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Exceeded By</span>
        <span className="font-medium text-red-600">
          {details.overageSeconds ? Math.ceil(details.overageSeconds / 60) : 0} mins
        </span>
      </div>
    </div>
  );
```

### Step 3: Update getEscalationTimeRange()

The escalation logic also needs to use the correct field names:

```typescript
const getEscalationTimeRange = (): { startTime: string; endTime: string } => {
  const details = report.details || {};
  
  switch (report.incident_type) {
    case 'LATE_LOGIN': {
      // Backend stores: scheduledStart (minutes), actualLogin (minutes), lateByMinutes
      const scheduleStartMins = details.scheduledStart;
      const loginMins = details.actualLogin;
      
      if (scheduleStartMins !== undefined && loginMins !== undefined) {
        // Start time: schedule + 5min grace
        const graceMinutes = scheduleStartMins + 5;
        const startTime = formatMinutesToTime(graceMinutes);
        
        // End time: 1 min before actual login
        const endTime = formatMinutesToTime(Math.max(0, loginMins - 1));
        
        return { startTime, endTime };
      }
      return { startTime: '09:00', endTime: '10:00' }; // Fallback
    }
    case 'EARLY_OUT': {
      // Backend stores: actualLogout (minutes), scheduledEnd (minutes)
      const logoutMins = details.actualLogout;
      const scheduleEndMins = details.scheduledEnd;
      
      if (logoutMins !== undefined && scheduleEndMins !== undefined) {
        return { 
          startTime: formatMinutesToTime(logoutMins), 
          endTime: formatMinutesToTime(scheduleEndMins) 
        };
      }
      return { startTime: '17:00', endTime: '18:00' };
    }
    case 'TIME_NOT_MET': {
      // Use shortfallMinutes to calculate gap
      const shortfallMins = details.shortfallMinutes || 0;
      const scheduleEndMins = details.scheduledEnd || 18 * 60; // Default 6PM
      
      const startMins = Math.max(0, scheduleEndMins - shortfallMins);
      return { 
        startTime: formatMinutesToTime(startMins), 
        endTime: formatMinutesToTime(scheduleEndMins) 
      };
    }
    default:
      return { startTime: '09:00', endTime: '10:00' };
  }
};
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/agent-reports/ReportDetailDialog.tsx` | Add `formatMinutesToTime` helper, update all field names in `renderDetails()`, fix `getEscalationTimeRange()` |

## Field Name Mapping Summary

| UI Field Name | Correct Backend Field Name | Type |
|--------------|---------------------------|------|
| `scheduleStart` | `scheduledStart` | number (minutes) |
| `loginTime` | `actualLogin` | number (minutes) |
| `minutesLate` | `lateByMinutes` | number |
| `scheduleEnd` | `scheduledEnd` | number (minutes) |
| `logoutTime` | `actualLogout` | number (minutes) |
| `minutesEarly` | `earlyByMinutes` | number |
| `quota` | `expectedQuota` | number |
| `actual` | `actualTotal` | number |
| `expected` | `requiredHours` | number |
| `actual` (TIME_NOT_MET) | `loggedHours` | number |
| `timeUsedSeconds` | `totalBioSeconds` | number |
| `allowanceSeconds` | `bioAllowance` | number |
| `exceededSeconds` | `overageSeconds` | number |

## Visual Result

After the fix:
- LATE_LOGIN will show: "Schedule Start: 12:00", "Actual Login: 12:22", "Minutes Late: 22"
- QUOTA_NOT_MET will show: "Expected Quota: 90 tickets", "Actual Count: 0 tickets", "Shortfall: 90 tickets"
- All incident types will display their correct details instead of `-`

