

## Plan: Make Outage Statistics Visible to All Users (Read-Only, Own Data)

### Current State
- **Navigation**: Only admins see "Outage Statistics" link; non-admins see "My Outage Report" instead
- **Page**: `OutageStats.tsx` line 419-422 redirects non-admins to `/outage-report`
- **RLS**: Non-admins can SELECT their own leave requests + all pending/approved ones (calendar policy). This means `fetchAllLeaveRequests` will return enough data for their own stats.

### What We'll Do

#### Step 1: Update navigation in `Layout.tsx`
- Add "Outage Statistics" link for **all users** (remove the `isAdmin` check on line 117-118)
- Keep "My Outage Report" for non-admins as well (they keep both links)

#### Step 2: Update `OutageStats.tsx` — remove redirect, filter for non-admins
- Remove the admin redirect (lines 419-422)
- For non-admin users: filter all fetched leave requests to only their own `agent_email` so they see their personal outage stats, trends, and patterns
- Hide admin-only UI elements (e.g., team lead filter, repeat offender section, export controls) from non-admins — they just get a read-only view of their own data
- The page title/description can remain the same

