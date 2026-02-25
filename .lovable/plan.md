

## Plan: Add Voice/Call Ticket Counts to Brain Calendar

### What will change
A new row labeled "Voice" will appear below the date headers in the weekly calendar table. Each cell will show the count of `ticket_type = 'Call'` tickets from `ticket_logs` for that day, filtered to `zd_instance = 'ZD1'` only.

### Technical approach

**Single file change: `src/pages/operations/Brain.tsx`**

1. Import `supabase` client and `useQuery` from TanStack React Query
2. For the displayed week, query `ticket_logs` where:
   - `ticket_type = 'Call'` (case-insensitive via `ilike`)
   - `zd_instance = 'ZD1'`
   - `timestamp` falls within the week's EST day boundaries
3. Group results by EST date and count per day
4. Add a label column as the first cell in the header row (empty) and data row ("Voice")
5. Display the count in each day's cell, or "0" if none

### Considerations for future steps
- **Adding Email and Chat rows later**: The query structure will support adding more ticket_type filters as additional rows
- **ZD2 toggle**: Could add a ZD instance filter later if needed
- **Loading/error states**: Will show a spinner or skeleton while data loads
- **EST timezone handling**: Will use the same `getESTDayBoundariesUTC` helper from `ticketLogsApi.ts` to ensure correct day bucketing

