

## Team Status Board: Pending Outages + Logistics Category Fix

### Issue 1: Logistics agents showing under Email Support
In `src/lib/teamStatusApi.ts` line 64, the `categorizeByPosition()` function explicitly maps `'logistics'` to `'emailSupport'`. This is why Lauro, Jesse, and Louela appear under Email Support instead of the Logistics category (which is the `'other'` bucket rendered as "Logistics" in the UI).

**Fix:** Change `return 'emailSupport'` to `return 'other'` for the logistics position.

### Issue 2: Only approved outages are shown
The outage query on line 142 filters with `.eq('status', 'approved')`. Pending and for_review outages are excluded entirely.

**Fix:** Change the filter to `.in('status', ['approved', 'pending', 'for_review'])`, then display the outage reason with a "(Pending)" suffix for non-approved statuses.

### Related considerations
- The "On Leave" badge text on the StatusCard should also differentiate: show "On Leave" for approved, "Pending Leave" for pending/for_review
- The `hasApprovedOutage` field name becomes slightly misleading since it now includes pending -- we can add an `outageStatus` field to the `TeamMemberStatus` interface to track whether it's approved or pending
- The online count logic currently excludes agents with approved outages from the count; pending outages should still count as online since the leave isn't confirmed yet

### Steps (one at a time)

**Step 1 -- Fix Logistics categorization (`src/lib/teamStatusApi.ts`)**
- Change line 64 from `return 'emailSupport'` to `return 'other'`

**Step 2 -- Include pending/for_review outages (`src/lib/teamStatusApi.ts`)**
- Change outage query filter from `.eq('status', 'approved')` to `.in('status', ['approved', 'pending', 'for_review'])`
- Add `status` to the select fields
- Add `outageStatus` field to `TeamMemberStatus` interface
- Only exclude from online count if outage is approved (not pending)
- Set `outageStatus` on the member object

**Step 3 -- Update StatusCard display (`src/components/team-status/StatusCard.tsx`)**
- Show "(Pending)" suffix on outage reason when status is not approved
- Change "On Leave" badge to "Pending Leave" for non-approved outages

### Technical Details

**teamStatusApi.ts changes:**
- `categorizeByPosition`: `'logistics' -> return 'other'`
- Outage query: `.eq('status', 'approved')` becomes `.in('status', ['approved', 'pending', 'for_review'])`
- Add `status` to outage select and outageMap
- New field `outageStatus: 'approved' | 'pending' | 'for_review' | null` on `TeamMemberStatus`
- Online count: only subtract when `outageStatus === 'approved'`

**StatusCard.tsx changes:**
- When `outageStatus !== 'approved'`, append ` (Pending)` to the outage reason label
- Change "On Leave" badge to "Pending Leave" for pending outages

