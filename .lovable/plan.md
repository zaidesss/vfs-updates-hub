
# Plan: Fix RLS Policy for Revalida Attempts INSERT

## Problem Identified
The RLS (Row Level Security) policy for `revalida_attempts` table is missing INSERT permissions for Admin and Super Admin users. Currently, only "regular" agents can insert their own attempts, but Admins (who are also agents) cannot start a test.

The error "new row violates row-level security policy for table 'revalida_attempts'" occurs because:
- User `malcom@persistbrands.com` is an **Admin**
- The only INSERT policy checks: `agent_email = lower(jwt.email)`
- But this policy name is "Agents can insert own attempts" and admins don't match this pattern properly

## Root Cause
Missing INSERT policies for Admin and Super Admin roles on `revalida_attempts` table.

---

## Solution

Add INSERT policies for Admins and Super Admins that allow them to insert their own attempts (matching their email):

```sql
-- Admins can insert their own attempts
CREATE POLICY "Admins can insert own attempts"
  ON public.revalida_attempts FOR INSERT
  WITH CHECK (
    has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role)
    AND agent_email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text))
  );

-- Super admins can insert their own attempts  
CREATE POLICY "Super admins can insert own attempts"
  ON public.revalida_attempts FOR INSERT
  WITH CHECK (
    has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role)
    AND agent_email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text))
  );

-- HR can insert their own attempts
CREATE POLICY "HR can insert own attempts"
  ON public.revalida_attempts FOR INSERT
  WITH CHECK (
    has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role)
    AND agent_email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text))
  );
```

---

## Implementation Steps

1. **Create database migration** to add the missing INSERT policies
2. **Test** by starting a test as an admin user
3. **Verify** the attempt is created successfully

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| Database Migration | Create | Add INSERT policies for Admin, Super Admin, and HR roles |

---

## Testing After Fix

1. Navigate to `/team-performance/revalida`
2. Click "Start Test" on the active batch
3. Verify no RLS error occurs
4. Verify test form opens with shuffled questions
