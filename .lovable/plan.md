

# Fix: Live Activity Feed - 24h Filter and Fixed Height

## Problem Summary

The Live Activity Feed has two issues:
1. **Scroll broken** - The `max-h-[calc(100vh-300px)]` calculation doesn't work properly with the Radix ScrollArea component, causing content to be cropped without a scrollbar
2. **Shows old events** - Currently shows any 15 events regardless of age (some are 2+ days old)

---

## Solution

### 1. Filter Events to "Today Only"

Add a database filter to only fetch events from today (midnight EST to now).

**File: `src/components/team/LiveActivityFeed.tsx`**

**Query modification (around line 78-89):**

```typescript
// Before:
const { data: events, error } = await supabase
  .from('profile_events')
  .select(`
    id,
    profile_id,
    event_type,
    prev_status,
    new_status,
    created_at
  `)
  .order('created_at', { ascending: false })
  .limit(maxItems);

// After:
// Calculate start of today in EST timezone
const today = new Date();
today.setHours(0, 0, 0, 0);
const todayISO = today.toISOString();

const { data: events, error } = await supabase
  .from('profile_events')
  .select(`
    id,
    profile_id,
    event_type,
    prev_status,
    new_status,
    created_at
  `)
  .gte('created_at', todayISO)  // Only events from today
  .order('created_at', { ascending: false })
  .limit(maxItems);
```

Also filter new realtime events (around line 149-170):

```typescript
// Add check before adding to state:
const eventDate = new Date(event.created_at);
const todayStart = new Date();
todayStart.setHours(0, 0, 0, 0);

if (eventDate >= todayStart) {
  setActivities(prev => [newActivity, ...prev.slice(0, maxItems - 1)]);
}
```

### 2. Fix Scroll Height - Use Fixed Panel

The issue is that Radix ScrollArea requires a fixed height ancestor to work properly. The `calc()` approach doesn't give it a definite height.

**File: `src/components/team/LiveActivityFeed.tsx`**

**Change ScrollArea (line 189):**

```typescript
// Before:
<ScrollArea className="min-h-[200px] max-h-[calc(100vh-300px)] px-4 pb-4">

// After:
<ScrollArea className="h-[400px] px-4 pb-4">
```

**Why this works:** A fixed `400px` height gives the ScrollArea a definite container to scroll within. The Radix Viewport inside will then properly enable scrolling for overflow content.

**Why the `calc()` didn't work:** Radix ScrollArea's Viewport uses `h-full` which requires its parent to have a computed height. When using `max-h-[calc(...)]` without a min-height constraint that matches, the container can collapse or not trigger the overflow detection correctly.

---

## Summary of Changes

| Location | Change |
|----------|--------|
| Line 75-89 | Add `todayISO` calculation and `.gte('created_at', todayISO)` filter |
| Line 149-170 | Add date check before adding realtime events |
| Line 189 | Change `min-h-[200px] max-h-[calc(100vh-300px)]` back to `h-[400px]` |

---

## Expected Result

- Live Activity shows only events from today (midnight to now)
- Panel has a fixed 400px height with internal scrolling
- All events within the panel are visible and scrollable
- Old events (yesterday, 2 days ago, etc.) are filtered out

