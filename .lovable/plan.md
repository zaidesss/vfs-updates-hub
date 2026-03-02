

## Plan: Fix Duplicate Auto-Logout Events & Add Idempotency

### Problem Summary
Precious Mae Gagarra has **10 duplicate SYSTEM_AUTO_LOGOUT events** (7 on Mar 1, 3 on Feb 27). No other agents are affected. The root cause is that both the cron job (`auto-logout-stale-sessions`) and the client-side function (`checkAndCleanupStaleSession`) insert LOGOUT events without checking if one already exists. The notification call on line 553 fires even when a duplicate report already exists.

### Step 1: Clean up Precious's duplicate events
- Delete all but the earliest `SYSTEM_AUTO_LOGOUT` event for each (profile_id, date) combination
- Affects 2 dates: Feb 27 (keep 1, delete 2) and Mar 1 (keep 1, delete 6)

### Step 2: Add idempotency to client-side `checkAndCleanupStaleSession`
**File:** `src/lib/agentDashboardApi.ts` (lines ~507-558)

Before inserting the LOGOUT event (line 508), query `profile_events` for an existing `SYSTEM_AUTO_LOGOUT` on the same profile and date. If found, skip the insert, report creation, and notification — just update `profile_status` and return.

Also move the `sendStatusAlertNotification` call (line 553) **inside** the `if (!existingReport)` block (after line 549) so it only fires when a new report is actually created.

### Step 3: Add idempotency to cron job `auto-logout-stale-sessions`
**File:** `supabase/functions/auto-logout-stale-sessions/index.ts`

Before inserting the LOGOUT event, check for an existing `SYSTEM_AUTO_LOGOUT` event for the same `profile_id` on the same date. If found, skip entirely and just ensure `profile_status` is set to `LOGGED_OUT`.

### Technical Detail

```text
Before (both functions):
  1. Insert LOGOUT event         ← no guard
  2. Check for duplicate report
  3. Insert report if new
  4. Send notification           ← always fires

After (both functions):
  1. Check for existing SYSTEM_AUTO_LOGOUT event on same date
  2. If exists → skip to step 6 (just ensure status is LOGGED_OUT)
  3. Insert LOGOUT event
  4. Check for duplicate report
  5. Insert report + send notification if new
  6. Update profile_status
```

