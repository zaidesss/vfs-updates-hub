

# Fix: Zendesk API rejects `created:today` — requires `YYYY-MM-DD` format

## Root Cause
The Zendesk Search API does **not** support `created:today` as a date value. It returns:
```
422 - "Invalid search: Illegal date value (yyyy-mm-dd expected): created:today"
```

All ticket counts are returning 0 because every search query fails.

## Fix

### 1. `fetch-zendesk-realtime` (lines 129-136)
Add an EST date helper at the top of the handler, then replace `created:today` with `created>={todayEST}`:

```typescript
// Compute today's date in EST
const estNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
const todayEST = `${estNow.getFullYear()}-${String(estNow.getMonth()+1).padStart(2,'0')}-${String(estNow.getDate()).padStart(2,'0')}`;
```

Queries become:
- `type:ticket status:new created>=${todayEST}`
- `type:ticket created>=${todayEST}`

### 2. `fetch-sla-responsiveness`
Same fix — replace any `created:today` or `created:yesterday` with computed EST dates:
- `created>=${todayEST}` for today queries
- `created>=${yesterdayEST} created<${todayEST}` for yesterday queries

### 3. No frontend changes needed
The UI is correct; it's just receiving zeros from the broken API queries.

