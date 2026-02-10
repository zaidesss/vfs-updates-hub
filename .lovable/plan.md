

# Fix Outage Requests Tab Filters

## Problems Found

1. **"All Requests" is the first/default tab** -- page loads showing everything including approved/declined requests
2. **Only "Override Requests" tab actually filters** -- "Pending" and "For Review" tabs show the same data as "All Requests" (no filtering applied)
3. **Tab order** -- "All Requests" should be last, not first

## Changes

### File: `src/pages/LeaveRequest.tsx`

**1. Change default tab from `'all'` to `'pending'`**

Line 106: Change `useState('all')` to `useState('pending')` so the page loads showing only pending requests.

**2. Fix the filtering logic**

Lines 678-680: The current filter only handles `override`. Update to also filter for `pending` and `for_review`:

```typescript
const filteredRequests = 
  activeTab === 'override' ? requests.filter(r => r.status === 'pending_override')
  : activeTab === 'pending' ? requests.filter(r => r.status === 'pending')
  : activeTab === 'for_review' ? requests.filter(r => r.status === 'for_review')
  : requests; // 'all' shows everything
```

**3. Reorder tabs (admin view)**

Move "All Requests" to the end:

- Pending | For Review | Override Requests | All Requests

**4. Reorder tabs (regular user view)**

Move "All Requests" to the end:

- Pending | All Requests

## Result

- Page loads on "Pending" tab showing only pending requests
- "For Review" tab shows only for_review requests
- "Override Requests" tab continues to work as before
- "All Requests" is now the last tab for viewing complete history

| File | Change |
|------|--------|
| `src/pages/LeaveRequest.tsx` | Fix default tab, add filtering for pending/for_review, reorder tabs |

