

# Fix: Auto-Generated Late Login Request Database Constraint

## Problem Summary

The automatic late login outage request feature is failing because the database has a `CHECK` constraint that only allows 4 status values, but the code uses 6 status values.

**Error**: `new row for relation "leave_requests" violates check constraint "leave_requests_status_check"`

## Implementation Steps

### Step 1: Database Migration

Update the `leave_requests_status_check` constraint to include all 6 status values:

| Current Allowed | Missing Values |
|-----------------|----------------|
| pending | for_review |
| approved | pending_override |
| declined | |
| canceled | |

### Step 2: Testing

After the migration is applied:
1. Open browser and navigate to Agent Dashboard for `malcom@persistbrands.com`
2. Verify the late login detection triggers
3. Check the Leave Request page to confirm the auto-generated request appears
4. Verify the request has status "For Review" with appropriate badge styling

## Technical Details

| Item | Details |
|------|---------|
| **Change Type** | Database constraint update only |
| **Risk Level** | Low - adds new allowed values, existing data unaffected |
| **Files Modified** | None - database migration only |
| **Testing Method** | Browser automation to verify end-to-end flow |

