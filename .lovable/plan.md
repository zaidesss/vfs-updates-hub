

# Fix: Add Missing upwork_contract_id Column

## Problem

The error shows that the `upwork_contract_id` column was referenced in the code but the database migration to create it was not applied.

## Solution

Create a simple database migration to add the `upwork_contract_id` column to the `agent_profiles` table.

---

## Database Migration

```sql
ALTER TABLE public.agent_profiles
ADD COLUMN IF NOT EXISTS upwork_contract_id text;
```

---

## What This Fixes

After the migration:
- The Manage Profiles page will load without errors
- The Upwork Contract ID field will work in the Work Configuration section
- The sync to agent_directory will include the upwork_contract_id value

---

## Implementation

This is a single-step fix:
1. Run database migration to add the missing column

