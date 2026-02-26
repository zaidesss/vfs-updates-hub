

## Problem

Multiple places in `src/lib/agentDashboardApi.ts` and `src/lib/ticketLogsApi.ts` use UTC boundaries (`T00:00:00.000Z` / `T23:59:59.999Z`) instead of EST boundaries when querying the database. This causes ticket counts and event queries to be off by 5 hours, leading to wrong totals (e.g., 120 OT tickets instead of 89).

## Affected Locations (4 spots)

All in `src/lib/agentDashboardApi.ts`:
1. **Line 1103-1104** — `break events` query uses UTC day boundaries
2. **Line 1954-1955** — `getWeekTicketCountByType` uses UTC week boundaries (the main OT ticket bug)
3. **Line 2155-2156** — `getDayPortalHours` uses UTC day boundaries

And `src/lib/ticketLogsApi.ts`:
4. **Line 150** — default rolling window filter uses `T00:00:00.000Z`

## Fix

Replace all 4 occurrences with `getESTDayBoundaries` from `src/lib/timezoneUtils.ts`:

- For single-day queries: `const { start, end } = getESTDayBoundaries(dateStr)`
- For week-range queries: use `getESTDayBoundaries(startDateStr).start` and `getESTDayBoundaries(endDateStr).end`

Import `getESTDayBoundaries` at the top of each file if not already imported.

### Specific changes:

**agentDashboardApi.ts line 1103-1104:**
```typescript
const { start: startOfDay, end: endOfDay } = getESTDayBoundaries(todayStr);
```

**agentDashboardApi.ts line 1954-1955:**
```typescript
const startStr = getESTDayBoundaries(format(startDate, 'yyyy-MM-dd')).start;
const endStr = getESTDayBoundaries(format(endDate, 'yyyy-MM-dd')).end;
```

**agentDashboardApi.ts line 2155-2156:**
```typescript
const { start: startOfDay, end: endOfDay } = getESTDayBoundaries(dateStr);
```

**ticketLogsApi.ts line 150:**
```typescript
const { start: rangeStart } = getESTDayBoundaries(dateRange.startDate);
query = query.gte('timestamp', rangeStart);
```

