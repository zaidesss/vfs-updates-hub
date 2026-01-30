# Upwork API Migration: REST to GraphQL

## Status: BLOCKED - API Key Scope Required

### Current Issue

The GraphQL migration is implemented and working, but the Upwork API key lacks the required **"Offer - Read-Only Access"** scope.

**Error from Upwork API:**
```
The client or authentication token doesn't have enough oauth2 permissions/scopes to access: 
[Contract.workDiaryTimeCells, DateTime.rawValue, Query.contract]
```

### Action Required

1. Go to [Upwork API Keys](https://www.upwork.com/developer/keys/)
2. Edit the existing API key
3. Add the **"Offer - Read-Only Access"** scope
4. Re-authorize the OAuth flow if needed after scope changes

### Implementation Complete

The edge function has been updated to use the GraphQL API:
- ✅ GraphQL query: `contract(id: $id) { workDiaryTimeCells(date: $date) { ... } }`
- ✅ Date filtering via the `date` argument
- ✅ Each time cell = 10 minutes of tracked time
- ✅ Token refresh logic preserved

### Testing

Once the scope is added, test with:
```
POST /fetch-upwork-time
{"contractId": "40482492", "date": "2026-01-29"}
```

Expected: `{"hours": 7, "error": null}`

