# Upwork Integration: Status Update

## Current Status: Blocked by API Access Restrictions

### Issue Summary

After extensive testing and schema discovery, the Upwork API integration is blocked by **two separate issues**:

1. **Scope Restrictions**: Fields like `workDiaryTimeCells` and `workDiary.cells` are blocked by OAuth scope restrictions, despite having "Fetch workdiary snapshots" and "Read time-sheet data" scopes enabled.

2. **Contract Authorization**: Even basic contract queries return `'getTermsListAuth', 'Authorization failed'` - meaning the OAuth account that authorized the tokens cannot access Malcom's contract (ID: 40482492).

### Root Cause Analysis

The Upwork API has two layers of access control:

1. **OAuth Scopes** - What types of data the app is allowed to access
2. **Contract Ownership** - You can only view contracts where you are either:
   - The freelancer on the contract
   - The client/company that hired the freelancer
   - An agency manager with visibility

The current OAuth tokens were authorized by someone who is **not a party to Malcom's contract**, so the API correctly denies access.

---

## Solutions

### Option A: Individual OAuth Authorization (Recommended)

Each agent authorizes their own Upwork account, granting the app access to their own contracts/time data.

**Pros:**
- Each person has full access to their own data
- Most secure approach
- Standard OAuth pattern

**Cons:**
- Requires each agent to complete OAuth flow
- Need to store tokens per agent

### Option B: Agency/Client Account Authorization

If there's a central agency or client account that manages all contracts, authorize that account.

**Pros:**
- Single authorization for all contracts
- Centralized management

**Cons:**
- Only works if such an account exists and has visibility to all contracts

### Option C: Upwork Reports API

Use Upwork's reporting endpoints (if available in your API tier) which may have different access patterns.

---

## Next Steps

1. **Identify whose Upwork account authorized the current tokens** - This person's contracts would work
2. **Determine if there's a central agency/client account** with visibility to all freelancer contracts
3. **Consider per-agent OAuth** if agents need to view their own Upwork time

---

## Technical Notes

### Working API Calls
- GraphQL introspection queries work
- Schema discovery was successful

### Blocked API Calls
- `contract(id: "40482492")` → Authorization failed
- `Contract.workDiaryTimeCells` → Scope restriction
- `Contract.workDays.workDiary.cells` → Scope restriction
- `Money.rawValue` → Scope restriction

### Discovered Schema
```
workDays(timeRange: DateTimeRange!) {
  date: String!
  workDiary: WorkDiary {
    cells: [WorkDiaryTimeCell!]
  }
}

DateTimeRange {
  rangeStart: String
  rangeEnd: String
}
```
