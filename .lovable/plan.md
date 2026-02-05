

# Plan: Fix and Test Edge Function Deployments

## Issues Found

| Function | Status | Problem |
|----------|--------|---------|
| `send-upwork-limit-request` | 404 Not Found | Missing from `config.toml`, not deployed |
| `generate-eod-analytics` | Not deployed | Missing from `config.toml`, not deployed |

Both functions exist in `supabase/functions/` but are **not registered** in the config file, which prevents them from being deployed.

---

## Fix Required

### File: `supabase/config.toml`

Add the missing function entries:

```toml
[functions.send-upwork-limit-request]
verify_jwt = false

[functions.generate-eod-analytics]
verify_jwt = false
```

---

## Implementation Steps

1. **Update `config.toml`** - Add both missing function entries
2. **Deploy both functions** - Trigger deployment for both edge functions
3. **Test `send-upwork-limit-request`** - Call with test payload and verify success response
4. **Test `generate-eod-analytics`** - Call with today's date and verify metrics calculation

---

## Test Payloads

### send-upwork-limit-request
```json
{
  "agentName": "Test Agent",
  "agentEmail": "test@example.com",
  "currentTotalHours": 40.0,
  "requestedLimit": 45,
  "teamLead": "Test Lead",
  "reason": "Testing function",
  "requestedBy": "Admin User"
}
```

### generate-eod-analytics
```json
{
  "date": "2026-02-04"
}
```

---

## Files to Modify

| File | Action |
|------|--------|
| `supabase/config.toml` | Add 2 missing function entries |

