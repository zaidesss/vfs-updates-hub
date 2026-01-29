

# Split Dashboards by Zendesk Instance + Add ZD1 Secret

## Summary of Changes

This plan covers three main items:

1. **Two separate dashboards** - ZD1 (customerserviceadvocates) and ZD2 (customerserviceadvocateshelp)
2. **ZD Instance filter** - Add filter to Search & Filter Tickets section
3. **ZD1 secret** - Add a second secret for ZD1 authentication

---

## Current State

- Single unified dashboard showing all Zendesk data
- One secret `ZENDESK_WEBHOOK_SECRET` (used for ZD2)
- No zd_instance filter in the search section

---

## Implementation Details

### 1. Add ZD1 Secret

I will add a new secret called `ZENDESK_WEBHOOK_SECRET_ZD1` for the ZD1 instance.

You'll enter the Bearer token value that you've configured in ZD1's webhook settings.

---

### 2. Update Webhook to Support Both Secrets

The edge function will check both secrets and accept the request if either matches:

```
Received token matches ZENDESK_WEBHOOK_SECRET → Accept (ZD2)
Received token matches ZENDESK_WEBHOOK_SECRET_ZD1 → Accept (ZD1)
Neither matches → Reject with 401
```

---

### 3. Create Separate Dashboard Components

**File changes:**

| File | Change |
|------|--------|
| `src/components/ticket-logs/TicketDashboard.tsx` | Refactor to accept `zdInstance` prop |
| `src/pages/TicketLogs.tsx` | Render two separate dashboard cards |

**New layout:**

```text
┌─────────────────────────────────────────────────┐
│ Ticket Logs                                     │
│ View ticket counts per agent from Zendesk data  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ ZD1 - Customer Service Advocates                │
│ Badge: Last 14 Days                             │
├─────────────────────────────────────────────────┤
│ [Agent grid with Email/Chat/Call by date]       │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ ZD2 - Customer Service Advocates Help           │
│ Badge: Last 14 Days                             │
├─────────────────────────────────────────────────┤
│ [Agent grid with Email/Chat/Call by date]       │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Search & Filter Tickets                         │
│ [Search bar] [Agent] [Type] [ZD Instance] [Date]│
└─────────────────────────────────────────────────┘
```

---

### 4. Update API to Support Instance Filtering

**File: `src/lib/ticketLogsApi.ts`**

Add `zdInstance` parameter to:
- `fetchDashboardData(zdInstance?: string)`
- `fetchTicketLogs({ ..., zdInstance?: string })`

Query filter:
```typescript
if (zdInstance) {
  query = query.eq('zd_instance', zdInstance);
}
```

---

### 5. Add ZD Instance Filter to Search

**File: `src/components/ticket-logs/TicketSearch.tsx`**

Add new dropdown:

| Label | Options |
|-------|---------|
| ZD Instance | All Instances, ZD1 (customerserviceadvocates), ZD2 (customerserviceadvocateshelp) |

This filter will apply to the search results table.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/zendesk-ticket-webhook/index.ts` | Support both `ZENDESK_WEBHOOK_SECRET` and `ZENDESK_WEBHOOK_SECRET_ZD1` |
| `src/lib/ticketLogsApi.ts` | Add `zdInstance` filter to all fetch functions |
| `src/components/ticket-logs/TicketDashboard.tsx` | Accept `zdInstance` and `title` props |
| `src/components/ticket-logs/TicketSearch.tsx` | Add ZD Instance dropdown filter |
| `src/pages/TicketLogs.tsx` | Render two dashboard instances |

---

## ZD Instance Values

| Label | Value in Database |
|-------|-------------------|
| ZD1 | `customerserviceadvocates` |
| ZD2 | `customerserviceadvocateshelp` |

---

## Steps

| Step | Action |
|------|--------|
| 1 | Add new secret `ZENDESK_WEBHOOK_SECRET_ZD1` |
| 2 | Update webhook to accept both secrets |
| 3 | Update API functions to filter by zd_instance |
| 4 | Modify dashboard component to accept instance prop |
| 5 | Update TicketLogs page to show two dashboards |
| 6 | Add ZD Instance filter to search section |
| 7 | Test both dashboards work correctly |

