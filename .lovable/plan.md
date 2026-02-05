
# Plan: Fix Two Errors

## Issues Found

### Issue 1: Edge Function Deployment Failed
The `send-upwork-limit-request` edge function failed to deploy due to a timeout. The code is correct but needs redeployment.

**Fix**: Redeploy the edge function

---

### Issue 2: Missing 'ON_OT' Status in Database Constraint
The `profile_status` table has a CHECK constraint (`valid_status`) that restricts `current_status` to only 6 values:
- `LOGGED_OUT`, `LOGGED_IN`, `ON_BREAK`, `COACHING`, `RESTARTING`, `ON_BIO`

The `ON_OT` status was added to the application code but **not added to the database constraint**, causing the "violates check constraint" error when trying to OT Login.

**Fix**: Run a database migration to update the constraint to include `ON_OT`

---

## Implementation Steps

### Step 1: Database Migration
Add `ON_OT` to the valid_status constraint:

```sql
-- Drop the existing constraint
ALTER TABLE profile_status DROP CONSTRAINT valid_status;

-- Recreate with ON_OT included
ALTER TABLE profile_status ADD CONSTRAINT valid_status 
CHECK (current_status = ANY (ARRAY[
  'LOGGED_OUT'::text, 
  'LOGGED_IN'::text, 
  'ON_BREAK'::text, 
  'COACHING'::text, 
  'RESTARTING'::text, 
  'ON_BIO'::text,
  'ON_OT'::text
]));
```

### Step 2: Redeploy Edge Function
Trigger deployment of `send-upwork-limit-request` function

---

## Files Changed

| Action | Target |
|--------|--------|
| Database Migration | Add `ON_OT` to `valid_status` constraint on `profile_status` table |
| Redeploy | `send-upwork-limit-request` edge function |

---

## Expected Outcome
1. OT Login/Logout will work without constraint violation errors
2. Upwork Limit Adjustment requests will send emails and notifications successfully
