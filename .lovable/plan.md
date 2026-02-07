

# Fix OT Login and BIO Events in Today's Activity

## Problem Summary

OT Login and Bio Break events are not appearing in the "Today's Activity" section of the Agent Dashboard. Investigation confirms the database constraints are rejecting these events.

## Root Cause

The `profile_events` table has three CHECK constraints:
- `valid_event_type` - Correctly includes `BIO_START`, `BIO_END`, `OT_LOGIN`, `OT_LOGOUT`
- `valid_prev_status` - Only allows: `LOGGED_OUT`, `LOGGED_IN`, `ON_BREAK`, `COACHING`, `RESTARTING`
- `valid_new_status` - Only allows: `LOGGED_OUT`, `LOGGED_IN`, `ON_BREAK`, `COACHING`, `RESTARTING`

When an agent triggers a BIO or OT event:
1. The `profile_status` table updates correctly (agent status changes to `ON_BIO` or `ON_OT`)
2. The `profile_events` insert fails silently because `ON_BIO` and `ON_OT` are not in the allowed status values
3. Since no event record is created, Today's Activity shows nothing

Evidence: Your agent has used 102 seconds of bio time (18 remaining out of 120), but zero BIO_START or BIO_END events exist in the database.

---

## Solution

### Database Migration

Update the status constraints to include `ON_BIO` and `ON_OT`:

```sql
-- Drop existing status constraints
ALTER TABLE profile_events DROP CONSTRAINT IF EXISTS valid_prev_status;
ALTER TABLE profile_events DROP CONSTRAINT IF EXISTS valid_new_status;

-- Recreate with all statuses including ON_BIO and ON_OT
ALTER TABLE profile_events ADD CONSTRAINT valid_prev_status 
CHECK (prev_status = ANY (ARRAY[
  'LOGGED_OUT'::text, 
  'LOGGED_IN'::text, 
  'ON_BREAK'::text, 
  'COACHING'::text, 
  'RESTARTING'::text,
  'ON_BIO'::text,
  'ON_OT'::text
]));

ALTER TABLE profile_events ADD CONSTRAINT valid_new_status 
CHECK (new_status = ANY (ARRAY[
  'LOGGED_OUT'::text, 
  'LOGGED_IN'::text, 
  'ON_BREAK'::text, 
  'COACHING'::text, 
  'RESTARTING'::text,
  'ON_BIO'::text,
  'ON_OT'::text
]));
```

---

## Technical Details

| Aspect | Current State | After Fix |
|--------|---------------|-----------|
| `valid_event_type` constraint | Already correct (includes OT/BIO events) | No change needed |
| `valid_prev_status` constraint | Missing `ON_BIO`, `ON_OT` | Updated to include both |
| `valid_new_status` constraint | Missing `ON_BIO`, `ON_OT` | Updated to include both |
| UI Components | Already configured correctly | Will display events once recorded |

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/[new].sql` | Add migration to update status constraints |

No frontend changes required - the `DailyEventSummary.tsx` and `LiveActivityFeed.tsx` components already have proper configuration for BIO and OT event types.

---

## Verification Steps

After the fix:
1. Login to dashboard and trigger "Bio Break"
2. Confirm event appears in Today's Activity with cyan "Bio Break" label
3. Login to OT and confirm "OT Started" appears with purple label
4. Verify events also appear in Team Status Board's Live Activity Feed

