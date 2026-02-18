

# Fix: Create Clean Tuesday Session for Juno

## What Happened
On Tuesday (Feb 17), Juno logged in at 1:58 AM EST but her logout at 1:00 PM EST did not go through due to a slow internet connection. A stale logout then appeared at 12:43 AM EST on Wednesday (Feb 18), which is orphaned (no corresponding login for Wednesday).

## Current State
- **Login**: Feb 17, 1:58 AM EST (06:58:18 UTC) -- correct
- **No Tuesday logout recorded** -- needs to be added
- **Orphaned logout**: Feb 18, 12:43 AM EST (05:43:56 UTC) -- needs to be removed
- **No NO_LOGOUT incident** found in agent_reports (audit may not have generated one yet)
- **Profile status**: Currently LOGGED_OUT (from the orphaned logout)

## Steps

### Step 1: Insert the Missing Tuesday Logout Event
Add a LOGOUT event at 1:00 PM EST on Tuesday, Feb 17 (= 18:00:00 UTC on Feb 17).

This creates a clean Tuesday session: Login 1:58 AM EST to Logout 1:00 PM EST.

### Step 2: Remove the Orphaned Wednesday Logout
Delete the stale logout event at Feb 18, 12:43 AM EST (ID: `6c53e70c-4609-4091-ac34-7f10e3bbd7e1`). This logout has no corresponding login on Wednesday and would pollute that day's data.

### Step 3: Reset Profile Status
After removing the orphaned logout, reset Juno's `profile_status` to LOGGED_OUT with the correct Tuesday logout timestamp, so the dashboard displays accurately.

### Step 4: Verify
Confirm the Tuesday timeline is clean and no NO_LOGOUT incidents exist.

## Technical Details

**Insert (profile_events)**:
```sql
INSERT INTO profile_events (profile_id, event_type, prev_status, new_status, created_at)
VALUES ('e5dd639c-d1c0-4f34-af50-014f58fd3220', 'LOGOUT', 'LOGGED_IN', 'LOGGED_OUT', '2026-02-17 18:00:00+00');
```

**Delete orphaned logout**:
```sql
DELETE FROM profile_events WHERE id = '6c53e70c-4609-4091-ac34-7f10e3bbd7e1';
```

**Update profile_status** (set status_since to the correct Tuesday logout time):
```sql
UPDATE profile_status SET status_since = '2026-02-17 18:00:00+00' WHERE profile_id = 'e5dd639c-d1c0-4f34-af50-014f58fd3220';
```

