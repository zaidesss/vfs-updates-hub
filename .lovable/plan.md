
## Add Agent Filter to All Outage Requests

### What we'll do
Add a dropdown filter that lets admins filter the outage requests table by agent name. The filter will appear between the tabs and the table, only visible to admins.

### Behavior
- A "Filter by Agent" select dropdown with all unique agent names from the current requests list
- An "All Agents" option to clear the filter (default)
- The filter works in combination with the existing tab filters (Pending, For Review, Override, All)
- Clearing a tab resets to show all agents unless filtered

### Technical Details

**File: `src/pages/LeaveRequest.tsx`**

1. Add new state variable:
   - `agentFilter` (string, default `'all'`)

2. Derive unique agent names from `requests` array for the dropdown options

3. Update `filteredRequests` logic (around line 699) to also filter by `agentFilter` when it's not `'all'`

4. Add a Select dropdown between the Tabs and the table (after line 1104 for admin, after line 1113 for non-admin), showing:
   - "All Agents" as default
   - Sorted list of unique agent names from the requests

5. Reset `agentFilter` to `'all'` when requests reload (optional, keeps UX clean)
