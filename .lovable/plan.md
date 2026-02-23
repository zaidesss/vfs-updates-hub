

## Volume & Demand - New Implementation Plan

### Overview

Completely rework the Volume & Demand page to query the **Zendesk Search API** directly (live) instead of using the `ticket_logs` database table. The page will show two side-by-side instance cards (ZD1 and ZD2), each displaying the count of currently unresolved tickets broken down by channel tags.

### What It Will Look Like

Two cards side by side (similar to Zendesk Insights layout):

```text
+---------------------------+    +---------------------------+
|  ZD1                      |    |  ZD2                      |
|  Total: 245               |    |  Total: 189               |
|                           |    |                           |
|  Email: 120  (avg: 17/d)  |    |  Email: 95   (avg: 14/d)  |
|  Chat:  80   (avg: 11/d)  |    |  Chat:  64   (avg: 9/d)   |
|  Call:  45   (avg: 6/d)   |    |  Call:  30   (avg: 4/d)   |
+---------------------------+    +---------------------------+
```

### Data Source & Logic

- **Total Tickets**: Zendesk Search API query for tickets with `status:new OR status:open OR status:pending OR status:hold` (excludes Solved and Closed), created within the selected date range
- **Email**: Tickets with tag `emails`
- **Chat**: Tickets with tag `chat`
- **Call**: Tickets with tag `voice`
- **Daily Average**: Total count divided by the number of days in the selected date range (e.g., if range is Feb 23-Mar 1 but today is Feb 23, average = total / 1)

### Default Date Range

Current work week (Monday to Sunday), using the portal clock for consistency.

### Daily Average Calculation

Divide by the **actual number of days in the selected range**, capped at today. For example:
- Range Feb 23 to Mar 1, today is Feb 23 --> divide by 1
- Range Feb 16 to Feb 22 (past week) --> divide by 7
- Range Feb 16 to Feb 20 --> divide by 5

---

### Technical Details

**Step 1: Create new edge function `fetch-volume-demand`**

This edge function will:
- Accept `zdInstance` ("ZD1" or "ZD2"), `startDate`, and `endDate`
- Run 4 Zendesk Search API queries (paginated, no limit):
  1. Total unresolved: `type:ticket status<solved created>={startDate} created<={endDate}`
  2. Email: same + `tags:emails`
  3. Chat: same + `tags:chat`
  4. Call: same + `tags:voice`
- Return `{ total, email, chat, call }` counts
- Uses existing secrets `ZENDESK_API_TOKEN_ZD1`, `ZENDESK_API_TOKEN_ZD2`, and `ZENDESK_ADMIN_EMAIL`
- Reuses the same paginated search pattern from `fetch-zendesk-insights`

**Step 2: Rewrite `src/pages/operations/VolumeDemand.tsx`**

- Remove all `ticket_logs` / `call_count_daily` queries, bar charts, pie charts, and daily breakdown table
- Add two side-by-side instance cards (ZD1 and ZD2) using `useQuery` to call the edge function
- Each card shows: Total, Email (+ daily avg), Chat (+ daily avg), Call (+ daily avg)
- Default date range: current week (Mon-Sun) with a date range picker
- Daily average = count / number of days in range (capped at today)
- Loading skeletons and error handling consistent with ZendeskInsights page
- Refresh button per card to force re-fetch

**Files changed:**
- `supabase/functions/fetch-volume-demand/index.ts` (new edge function)
- `src/pages/operations/VolumeDemand.tsx` (complete rewrite)

