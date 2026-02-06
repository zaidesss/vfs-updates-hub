
# Fix NO_LOGOUT Auto-Logout to Use EST Timezone

## Overview
The NO_LOGOUT detection and auto-logout system currently uses UTC day boundaries, causing incorrect behavior for EST-based agents. This plan fixes all date boundary calculations to use EST (UTC-5).

---

## Current vs Expected Behavior

| Scenario | Current (UTC) | Expected (EST) |
|----------|---------------|----------------|
| Start of "Feb 5" | Feb 4 7:00 PM EST | Feb 5 12:00 AM EST |
| End of "Feb 5" | Feb 5 6:59 PM EST | Feb 5 11:59 PM EST |
| Auto-logout timestamp | 6:59 PM EST | 11:59 PM EST |

---

## Changes Required

### 1. Fix Edge Function Date Boundaries

**File**: `supabase/functions/generate-agent-reports/index.ts`

**Current (Lines 224-225)**:
```typescript
const startOfDay = `${targetDateStr}T00:00:00.000Z`;
const endOfDay = `${targetDateStr}T23:59:59.999Z`;
```

**Fixed**:
```typescript
// EST = UTC-5, so midnight EST = 5:00 AM UTC
// Start of EST day: targetDate at 5:00 AM UTC
// End of EST day: next day at 4:59:59 AM UTC
const startOfDayEST = `${targetDateStr}T05:00:00.000Z`;
const nextDay = new Date(targetDateStr);
nextDay.setDate(nextDay.getDate() + 1);
const nextDayStr = nextDay.toISOString().split('T')[0];
const endOfDayEST = `${nextDayStr}T04:59:59.999Z`;
```

This affects:
- Profile events query (lines 227-232)
- Ticket logs query (lines 235-239)
- All incident detection within this function

---

### 2. Fix Auto-Logout Timestamp in Dashboard API

**File**: `src/lib/agentDashboardApi.ts`

**Current (Line 410)**:
```typescript
const autoLogoutTime = new Date(statusDateStr + 'T23:59:59.000Z');
```

**Fixed**:
```typescript
// End of EST day is 4:59:59 AM UTC the next day
// But we want to record it as 11:59 PM EST of the target date
// 11:59 PM EST = 4:59:59 AM UTC next day
const nextDay = new Date(statusDateStr);
nextDay.setDate(nextDay.getDate() + 1);
const nextDayStr = nextDay.toISOString().split('T')[0];
const autoLogoutTime = new Date(`${nextDayStr}T04:59:59.000Z`);
```

---

### 3. Fix Individual Agent Analytics (UI Component)

**File**: `src/components/agent-reports/IndividualAgentAnalytics.tsx`

Update date boundaries in `loadDailyMetrics()` and `loadWeeklyMetrics()` to use EST:

**Current (lines 122-124)**:
```typescript
const startOfDay = `${dateStr}T00:00:00.000Z`;
const endOfDay = `${dateStr}T23:59:59.999Z`;
```

**Fixed**:
```typescript
// EST boundaries
const startOfDayEST = `${dateStr}T05:00:00.000Z`;
const nextDate = new Date(dateStr);
nextDate.setDate(nextDate.getDate() + 1);
const nextDateStr = nextDate.toISOString().split('T')[0];
const endOfDayEST = `${nextDateStr}T04:59:59.999Z`;
```

---

### 4. Create EST Helper Utility (Optional but Recommended)

**File**: `src/lib/timezoneUtils.ts` (new file)

```typescript
/**
 * Get EST day boundaries in UTC format
 * EST is UTC-5 (ignoring DST for simplicity)
 */
export function getESTDayBoundaries(dateStr: string): { start: string; end: string } {
  // Midnight EST = 5:00 AM UTC same day
  const startOfDayEST = `${dateStr}T05:00:00.000Z`;
  
  // 11:59:59 PM EST = 4:59:59 AM UTC next day
  const date = new Date(dateStr);
  date.setDate(date.getDate() + 1);
  const nextDayStr = date.toISOString().split('T')[0];
  const endOfDayEST = `${nextDayStr}T04:59:59.999Z`;
  
  return { start: startOfDayEST, end: endOfDayEST };
}

/**
 * Parse a date string safely without timezone shift
 */
export function parseDateStringLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/generate-agent-reports/index.ts` | Update startOfDay/endOfDay to EST boundaries |
| `src/lib/agentDashboardApi.ts` | Fix auto-logout timestamp to 11:59 PM EST |
| `src/components/agent-reports/IndividualAgentAnalytics.tsx` | Update daily/weekly queries to EST boundaries |
| `src/lib/timezoneUtils.ts` (new) | Create reusable EST helper functions |

---

## Additional Fixes (from previous investigation)

While implementing EST fixes, also address:

1. **Ticket query fallback to agent_tag** - Query tickets by `agent_email` OR `agent_name` (agent_tag)
2. **Show all 7 weekdays** - Display complete week grid even for inactive days

---

## Implementation Sequence

1. Create `timezoneUtils.ts` helper
2. Update edge function `generate-agent-reports/index.ts`
3. Update `agentDashboardApi.ts` auto-logout logic
4. Update `IndividualAgentAnalytics.tsx` with EST boundaries + ticket query fix + full week display
5. Deploy edge function
6. Test with agent login/logout scenarios

---

## Expected Results After Fix

- **NO_LOGOUT detection**: Will correctly identify agents who didn't logout by 11:59 PM EST
- **Auto-logout timestamp**: Will be recorded as 11:59:59 PM EST (4:59:59 AM UTC next day)
- **Daily analytics**: Will correctly pair LOGIN/LOGOUT events within EST day boundaries
- **Ticket counts**: Will appear for agents using agent_tag instead of email
