

## Volume & Demand Enhancement: Per-Status Breakdown with Oldest Ticket

### What's Changing

Inside each ZD1/ZD2 instance card, a new **Status Breakdown** section will appear below the existing Email/Chat/Call channel breakdown. It will show:

- Ticket counts for each status: **New**, **Open**, **Pending**, **Hold**
- For each status, the **oldest ticket** displayed as:
  - Zendesk Ticket ID (clickable link)
  - Created date
  - Age in days (e.g., "45 days ago")

The existing channel breakdown (Email/Chat/Call with daily averages) remains unchanged.

### Visual Layout (per instance card)

```text
+----------------------------------+
|  ZD1                         [R] |
|  customerserviceadvocates        |
|                                  |
|  Total Unresolved: 245           |
|                                  |
|  --- Channel Breakdown ---       |
|  Email: 120  (17/d)              |
|  Chat:  80   (11/d)              |
|  Call:  45   (6/d)               |
|                                  |
|  --- Status Breakdown ---        |
|  New:     12  | Oldest: #48201   |
|               | Jan 9 (45d ago)  |
|  Open:    98  | Oldest: #41003   |
|               | Dec 2 (83d ago)  |
|  Pending: 85  | Oldest: #39877   |
|               | Nov 15 (100d ago)|
|  Hold:    50  | Oldest: #44120   |
|               | Dec 28 (57d ago) |
+----------------------------------+
```

---

### Technical Details

**Step 1: Update edge function `fetch-volume-demand`**

Add per-status queries to the existing function. For each status (new, open, pending, hold):
- Count query: `type:ticket status:new created>={startDate} created<={endDate}`
- Oldest ticket query: `type:ticket status:new` sorted by `created` ascending, fetching only 1 result to get the ticket ID, created date

The response shape will expand to include:
```json
{
  "zdInstance": "ZD1",
  "total": 245,
  "email": 120, "chat": 80, "call": 45,
  "statuses": {
    "new":     { "count": 12, "oldest": { "id": 48201, "created_at": "2026-01-09T..." } },
    "open":    { "count": 98, "oldest": { "id": 41003, "created_at": "2025-12-02T..." } },
    "pending": { "count": 85, "oldest": { "id": 39877, "created_at": "2025-11-15T..." } },
    "hold":    { "count": 50, "oldest": { "id": 44120, "created_at": "2025-12-28T..." } }
  }
}
```

This adds 8 additional API calls (4 counts + 4 oldest lookups) per instance, run in parallel.

**Step 2: Update `VolumeDemand.tsx` UI**

- Add a "Status Breakdown" section below the channel rows in each `InstanceCard`
- Each status row shows: status name, count, and oldest ticket info (ID as link to Zendesk, date, days ago)
- Uses `differenceInCalendarDays` from date-fns for the "days ago" calculation
- Ticket ID links to `https://{subdomain}.zendesk.com/agent/tickets/{id}`

**Files modified:**
- `supabase/functions/fetch-volume-demand/index.ts` (add status count + oldest ticket queries)
- `src/pages/operations/VolumeDemand.tsx` (add status breakdown UI section)

