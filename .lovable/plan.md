
# Fix: Remove Richelle's Accidental Logout on Thursday Feb 12

## What Happened
On Thursday, February 12, Richelle accidentally clicked "Log Out" at 3:00 PM EST instead of "Break." She immediately logged back in within 1 minute and then properly went on break. Her actual session was continuous from 8:57 AM to 6:31 PM EST.

## What Needs to Be Done

### Step 1: Delete the Two Accidental Profile Events
Remove the following two records from the `profile_events` table:

1. **Accidental LOGOUT** at 3:00 PM EST (ID: `41122073-b060-4432-b483-94baaf9a4e85`) — this is the mistaken logout
2. **Re-LOGIN** at 3:00 PM EST (ID: `bf1f8f32-08d7-41dc-ad10-ab8152aa9a98`) — the immediate re-login after the mistake

After deletion, Richelle's Thursday timeline will cleanly show:
- Login at 8:57 AM
- Bio Break 11:46 AM - 11:47 AM
- Break 3:01 PM - 3:29 PM
- Logout at 6:31 PM
- OT session 6:57 PM - 9:01 PM

### What Was Already Verified (No Action Needed)
- No EARLY_OUT incident exists in `agent_reports` for this date
- No auto-generated leave request exists for this date
- No attendance snapshot exists for this date
- The dashboard will automatically recalculate the correct hours once the events are removed

### Step 2: Verify
After the deletion, the Agent Dashboard for the week of Feb 9-15 should display Thursday correctly without any early out flag.
