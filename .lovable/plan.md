
# Fix Ticket Logs Dashboard to Display Full EST-Correct Date Range

## Problem Identified

Looking at your screenshot and the code, I found **two issues**:

1. **Badge shows correct range (1/19 - 2/1)** - The `getRollingTwoWeekRange()` function now correctly calculates the EST-based range
2. **Table shows wrong dates (1/18 - 1/31)** - The column headers are shifted by one day due to timezone parsing in `TicketDashboard.tsx`

The root cause: In `TicketDashboard.tsx` line 122, the date is displayed using:
```typescript
{format(new Date(date), 'M/d')}
```

When parsing a string like `'2026-01-19'`, JavaScript's `new Date()` interprets it as UTC midnight, which in EST (UTC-5) becomes **January 18th at 7:00 PM**. The `format()` function then outputs `1/18` instead of `1/19`.

Additionally, I need to ensure **full EST consistency** across:
- Dashboard column headers
- Ticket bucketing by day
- Search date filters

---

## Solution

### 1. Create a Shared EST Date Parsing Utility

Add a reusable helper function to `ticketLogsApi.ts` that parses date strings in a timezone-safe way:

```typescript
// Parse a YYYY-MM-DD string without timezone shift
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}
```

### 2. Fix TicketDashboard.tsx Column Headers

Update the date display in `TicketDashboard.tsx` to use the new helper:

**Line 122** - Change from:
```typescript
{format(new Date(date), 'M/d')}
```

To:
```typescript
{format(parseLocalDate(date), 'M/d')}
```

### 3. Fix Ticket Bucketing in fetchDashboardData

The log timestamps are in UTC but need to be bucketed by EST day. Update line 269:

**From:**
```typescript
const logDate = format(new Date(log.timestamp), 'yyyy-MM-dd');
```

**To:**
```typescript
// Format timestamp in EST to bucket correctly
const logDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date(log.timestamp));
```

### 4. Make TicketSearch Date Filters EST-Correct

Update `TicketSearch.tsx` lines 58-59 to use EST day boundaries:

**From:**
```typescript
startDate: startDate ? `${startDate}T00:00:00.000Z` : undefined,
endDate: endDate ? `${endDate}T23:59:59.999Z` : undefined,
```

**To:**
```typescript
startDate: startDate ? `${startDate}T05:00:00.000Z` : undefined,  // EST midnight = UTC 05:00
endDate: endDate ? `${endDate}T04:59:59.999Z` : undefined,        // EST 11:59pm next day boundary
```

Or better, create a helper function that handles DST correctly:

```typescript
// Convert EST date string to UTC range
function getESTDayBoundariesUTC(dateStr: string): { start: string; end: string } {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Create date at midnight EST
  const startEST = new Date(`${dateStr}T00:00:00-05:00`);
  const endEST = new Date(`${dateStr}T23:59:59.999-05:00`);
  return {
    start: startEST.toISOString(),
    end: endEST.toISOString()
  };
}
```

---

## Files to Change

| File | Changes |
|------|---------|
| `src/lib/ticketLogsApi.ts` | Add `parseLocalDate()` helper; fix ticket bucketing to use EST timezone |
| `src/components/ticket-logs/TicketDashboard.tsx` | Import `parseLocalDate`; fix column header date parsing |
| `src/components/ticket-logs/TicketSearch.tsx` | Fix date filter boundaries to use EST day ranges |

---

## Expected Result

After these fixes:
- **Badge**: 1/19 - 2/1 (already correct)
- **Column headers**: 1/19, 1/20, 1/21, ... 1/30, 1/31, 2/1 (14 columns)
- **Ticket counts**: Bucketed by EST day, not UTC
- **Search filters**: Date ranges aligned to EST day boundaries

---

## Technical Details

### Why the Shift Happens

| Input | `new Date()` interpretation | EST display |
|-------|----------------------------|-------------|
| `'2026-01-19'` | Jan 19 00:00 **UTC** | Jan 18 19:00 EST → shows **1/18** |
| `'2026-02-01'` | Feb 1 00:00 **UTC** | Jan 31 19:00 EST → shows **1/31** |

### The Fix

By manually parsing with `new Date(year, month-1, day)`, JavaScript creates the date in **local time**, avoiding the UTC shift. For timestamps, we use `Intl.DateTimeFormat` with `timeZone: 'America/New_York'` to format in EST.
