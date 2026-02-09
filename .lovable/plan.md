

# Fix: Resilient Ticket Assignment (Skip Poison Tickets)

## Problem

A single "poison" ticket (e.g., #1218081) that fails Zendesk validation causes the **entire batch to abort**, meaning the agent gets **zero tickets** assigned even though other tickets in the view are perfectly fine.

## Changes

### File: `supabase/functions/assign-tickets-on-login/index.ts`

**1. Fetch extra tickets as a buffer**

Instead of fetching exactly `ticketCount` tickets, fetch `ticketCount + 5` (buffer) so that if some fail, we still have enough to hit the target.

**2. Skip unassignable tickets instead of aborting**

Replace the current "abort on first failure" logic with a skip-and-continue approach:

```text
for each ticket in fetched tickets:
  if we already assigned enough (== ticketCount): break
  try to assign ticket (with 1 retry on failure)
  if success: add to assignedTicketIds
  if fail after retry: add to skippedTicketIds, continue to next
```

**3. Log skipped/poison tickets**

Update the `logAssignment` call to include skipped ticket IDs in the error_message field so they are traceable.

**4. Send notification email for skipped tickets**

After the loop, if any tickets were skipped, send a notification email to `malcom@persistbrands.com` listing the specific problematic ticket IDs, the view, and the agent -- so they can be investigated in Zendesk. This replaces the current "abort and notify" behavior.

**5. Return partial success**

The function returns success with the actual number of tickets assigned (which may be less than requested if the view ran out of assignable tickets).

## Result Summary

| Scenario | Before | After |
|----------|--------|-------|
| 1 poison ticket in batch of 10 | 0 tickets assigned, full abort | 9+ tickets assigned, poison ticket skipped and reported |
| All tickets fail | 0 assigned, single failure email | 0 assigned, email listing all failed ticket IDs |
| No failures | 10 assigned | 10 assigned (no change) |

## Notification Email

Sent to `malcom@persistbrands.com` when any tickets are skipped. Includes:
- Agent name and email
- Zendesk instance and view name
- List of skipped ticket IDs
- Number successfully assigned vs. requested

