
# Fix Plan: Severity Values + Bio Button Constraint

## Issues Identified

### Issue 1: Edge Function Severity Mismatch
Both `send-status-alert-notification` and `generate-agent-reports` use incorrect severity values:
- **Current**: `'warning'`, `'info'`
- **Required by DB**: `'low'`, `'medium'`, `'high'`

### Issue 2: Edge Function Status Mismatch
Both edge functions use `'pending'` for report status:
- **Current**: `'pending'`
- **Required by DB**: `'open'`, `'reviewed'`, `'validated'`, `'dismissed'`

### Issue 3: Incident Type Typo
Using `'EXCESSIVE_RESTART'` (singular) but DB constraint requires `'EXCESSIVE_RESTARTS'` (plural).

### Issue 4: Bio Button Constraint (The Error Screenshot)
The `profile_status` table has a check constraint that doesn't include `'ON_BIO'`:
- **Current allowed**: `['LOGGED_OUT', 'LOGGED_IN', 'ON_BREAK', 'COACHING', 'RESTARTING']`
- **Missing**: `'ON_BIO'`

---

## Fix Steps

### Step 1: Update Database Constraint
Add `'ON_BIO'` to the `valid_status` check constraint on `profile_status` table.

```sql
-- Drop old constraint and create new one with ON_BIO
ALTER TABLE profile_status DROP CONSTRAINT valid_status;
ALTER TABLE profile_status ADD CONSTRAINT valid_status 
  CHECK (current_status = ANY (ARRAY['LOGGED_OUT', 'LOGGED_IN', 'ON_BREAK', 'COACHING', 'RESTARTING', 'ON_BIO']));
```

### Step 2: Fix `send-status-alert-notification` Edge Function
Update severity and status values:

| Current Value | New Value |
|---------------|-----------|
| `severity: 'warning'` | `severity: 'medium'` |
| `status: 'pending'` | `status: 'open'` |
| `incidentType: 'EXCESSIVE_RESTART'` | `incidentType: 'EXCESSIVE_RESTARTS'` |

### Step 3: Fix `generate-agent-reports` Edge Function
Update all severity mappings and status:

| Incident Type | Current Severity | New Severity |
|---------------|------------------|--------------|
| NO_LOGOUT | `'warning'` | `'medium'` |
| LATE_LOGIN | `'info'` | `'low'` |
| EXCESSIVE_RESTART | `'warning'` | `'medium'` |
| BIO_OVERUSE | `'warning'` | `'low'` |

Also fix:
- All `incident_type: 'EXCESSIVE_RESTART'` → `'EXCESSIVE_RESTARTS'`
- All `status: 'pending'` → `'open'`

---

## Files to Modify

| File | Changes |
|------|---------|
| Database migration | Add `'ON_BIO'` to valid_status constraint |
| `supabase/functions/send-status-alert-notification/index.ts` | Fix severity, status, incident_type values |
| `supabase/functions/generate-agent-reports/index.ts` | Fix all severity, status, incident_type values |

---

## Severity Mapping Logic
- **`'high'`**: Critical violations requiring immediate attention
- **`'medium'`**: Standard violations (NO_LOGOUT, EXCESSIVE_RESTARTS)
- **`'low'`**: Minor issues (LATE_LOGIN, BIO_OVERUSE)

