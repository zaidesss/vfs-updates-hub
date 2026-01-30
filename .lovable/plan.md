

# Fix Security Issue & Enhance Team Status Board Categorization

## Problem Summary

### Security Issue
The `agent_profiles` table contains highly sensitive PII (bank account numbers, home addresses, hourly rates, emergency contacts) and is currently readable by ALL authenticated users due to the policy:
```sql
"Authenticated users can view all agent_profiles for team status" 
USING (true)
```

### Feature Gap
The Team Status Board currently shows only two categories (Agents vs Leads/Tech). You want it categorized by support type:
- **Phone Support**
- **Chat Support**
- **Email Support**
- **Hybrid Support** (handles multiple types)
- **Team Leads**
- **Technical Support**

---

## Solution Overview

### Part 1: Security Fix

**Step 1: Create a restricted view** that only exposes fields needed for Team Status Board:

| Field | Purpose |
|-------|---------|
| `id` | Profile ID for linking |
| `email` | Lookup key |
| `full_name` | Display name |
| `position` | Categorization |

**Step 2: Remove the overly permissive RLS policy** from `agent_profiles`:
```sql
DROP POLICY "Authenticated users can view all agent_profiles for team status" ON agent_profiles;
```

**Step 3: Create secure RLS policy** on the new view for all authenticated users.

### Part 2: Team Status Board Enhancement

Update the UI to categorize team members into 6 groups using the `position` field:
- Email Support
- Chat Support  
- Phone Support
- Hybrid Support
- Team Leads
- Technical Support

---

## Implementation Details

### Database Migration

Create a restricted view and update RLS:

```sql
-- Create view with only non-sensitive fields for team status
CREATE VIEW public.agent_profiles_team_status
WITH (security_invoker = on) AS
SELECT 
  id,
  email,
  full_name,
  position
FROM public.agent_profiles;

-- Grant access to authenticated users
GRANT SELECT ON public.agent_profiles_team_status TO authenticated;

-- Remove the overly permissive policy (THE KEY SECURITY FIX)
DROP POLICY IF EXISTS "Authenticated users can view all agent_profiles for team status" ON public.agent_profiles;
```

### File Changes

**File 1: `src/lib/teamStatusApi.ts`**

Update the data fetching to:
1. Query the new `agent_profiles_team_status` view instead of `agent_profiles`
2. Return data categorized into 6 groups based on `position` field:
   - `emailSupport` (position = 'Email Support')
   - `chatSupport` (position = 'Chat Support')
   - `phoneSupport` (position = 'Phone Support')
   - `hybridSupport` (position = 'Hybrid Support')
   - `teamLeads` (position = 'Team Lead')
   - `techSupport` (position = 'Technical Support')
3. Handle unknown positions (Logistics, etc.) in an "Other" category

**File 2: `src/pages/TeamStatusBoard.tsx`**

Update the UI layout to:
1. Display 6 categorized sections instead of 2
2. Use a grid layout with support type sections on the left (Phone, Chat, Email, Hybrid)
3. Keep Team Leads and Technical Support in a sidebar on the right
4. Show online counts per category
5. Hide empty sections gracefully

**File 3: `src/components/team-status/StatusCard.tsx`**

Minor update to:
1. Display the support type badge with appropriate color coding
2. Keep existing fields (name, status, shift schedule, break schedule)

---

## Before vs After Comparison

### RLS Policy Changes

| Aspect | Before | After |
|--------|--------|-------|
| Regular users can see ALL agent_profiles columns | Yes (full PII exposure) | No |
| Regular users can see their OWN profile | Yes | Yes (unchanged) |
| Regular users can see team status info | Yes (via full table) | Yes (via restricted view with 4 fields only) |
| Admins/HR/Super Admin see all profiles | Yes | Yes (unchanged) |
| Bank account numbers visible to regular users | Yes | No |
| Home addresses visible to regular users | Yes | No |
| Hourly rates visible to regular users | Yes | No |
| Emergency contacts visible to regular users | Yes | No |

### Data Access Summary

**Before (Current):**
```
All authenticated users can SELECT * FROM agent_profiles
→ Exposes: bank_account_number, home_address, hourly_rate, phone_number, 
   emergency_contact_name, emergency_contact_phone, rate_history, etc.
```

**After (Fixed):**
```
All authenticated users can SELECT * FROM agent_profiles_team_status
→ Exposes ONLY: id, email, full_name, position

All authenticated users can SELECT * FROM agent_profiles
→ DENIED (unless they have admin/HR/super_admin role or it's their own row)
```

---

## UI Layout

```text
+--------------------------------------------------+
| Team Status Board          [By Login] [By Name]  |
| 24 team members online                  [Refresh]|
+--------------------------------------------------+
|                           |                      |
| PHONE SUPPORT (4)         | TEAM LEADS (2)       |
| [Card] [Card]             | [Card]               |
| [Card] [Card]             | [Card]               |
|                           |                      |
| CHAT SUPPORT (6)          | TECH SUPPORT (1)     |
| [Card] [Card] [Card]      | [Card]               |
| [Card] [Card] [Card]      |                      |
|                           |                      |
| EMAIL SUPPORT (8)         |                      |
| [Card] [Card] [Card]      |                      |
| [Card] [Card] [Card]      |                      |
| [Card] [Card]             |                      |
|                           |                      |
| HYBRID SUPPORT (3)        |                      |
| [Card] [Card] [Card]      |                      |
|                           |                      |
+--------------------------------------------------+
```

---

## Files to Modify

| File | Changes |
|------|---------|
| Database Migration | Create `agent_profiles_team_status` view, drop permissive RLS policy |
| `src/lib/teamStatusApi.ts` | Query new view, return categorized data |
| `src/pages/TeamStatusBoard.tsx` | Display 6 category sections with counts |
| `src/components/team-status/StatusCard.tsx` | Add support type badge |
| `src/integrations/supabase/types.ts` | Auto-updated with new view type |

---

## Security Impact

**Sensitive fields now protected from regular users:**
- `bank_account_number`
- `bank_account_holder`
- `bank_name`
- `hourly_rate`
- `rate_history`
- `home_address`
- `phone_number`
- `emergency_contact_name`
- `emergency_contact_phone`
- `birthday`
- `payment_frequency`
- `employment_status`
- All work configuration fields

**Still accessible to regular users (via view):**
- `id` - needed for profile linking
- `email` - needed for directory lookup
- `full_name` - display name
- `position` - categorization

