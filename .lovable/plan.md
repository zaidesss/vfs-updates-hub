

# Enhance Daily Work Tracker with Ticket Data & Fix Gap Pause/Resume Logic

## Overview

This plan has two parts:
1. **Wire Daily Work Tracker** to show real-time ticket count and gap average from the database
2. **Update gap calculation logic** to pause during breaks and exclude break duration from gaps

---

## Part 1: Daily Work Tracker Enhancement

### What Changes

The Daily Work Tracker will display:
- **Tickets Handled**: Count of today's tickets from `ticket_logs` for this agent
- **Avg Gap**: Today's `avg_gap_seconds` from `ticket_gap_daily`
- **Manual Refresh Button**: User can click to reload data

### Data Flow

```text
Agent Dashboard
       ↓
agent_profiles.email → agent_directory.agent_tag
       ↓
ticket_logs WHERE agent_name = agent_tag AND DATE(timestamp) = today
       ↓
COUNT(*) = tickets handled today

ticket_gap_daily WHERE agent_name = agent_tag AND date = today
       ↓
avg_gap_seconds = average gap time
```

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/agentDashboardApi.ts` | Add functions to fetch today's ticket count and gap data |
| `src/components/dashboard/DailyWorkTracker.tsx` | Update UI to show gap average, add refresh button |
| `src/pages/AgentDashboard.tsx` | Fetch and pass ticket data to DailyWorkTracker |

---

## Part 2: Gap Pause/Resume Logic

### Current Problem

The `calculate-daily-gaps` function calculates gaps between ALL consecutive tickets for a day, ignoring when the agent was on break. This inflates gap averages incorrectly.

### New Logic

When calculating gaps, we need to:
1. Fetch `profile_events` for the agent on that day
2. Identify break/coaching/restart periods (BREAK_IN to BREAK_OUT, etc.)
3. When calculating gap between ticket A and ticket B:
   - Check if any break period falls between them
   - Subtract the break duration from the gap

### Example

| Event | Time |
|-------|------|
| Ticket A | 10:00 AM |
| BREAK_IN | 10:05 AM |
| BREAK_OUT | 10:35 AM |
| Ticket B | 10:40 AM |

**Current calculation**: Gap = 40 minutes (wrong)
**New calculation**: Gap = 40 - 30 = 10 minutes (correct)

### Logout Reset Behavior

When LOGOUT occurs:
- Gap calculation for tickets before logout is finalized
- Tickets after next LOGIN start fresh (no gap to previous day's tickets)

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/calculate-daily-gaps/index.ts` | Add break exclusion logic |

---

## Technical Implementation Details

### 1. New API Functions (agentDashboardApi.ts)

```typescript
// Fetch today's ticket count for an agent
export async function getTodayTicketCount(agentTag: string): Promise<number>

// Fetch today's gap data for an agent
export async function getTodayGapData(agentTag: string): Promise<{
  avgGapSeconds: number | null;
  ticketCount: number;
}>
```

### 2. Updated DailyWorkTracker Component

New props:
- `ticketsHandled`: number (from ticket_logs)
- `avgGapSeconds`: number | null (from ticket_gap_daily)
- `onRefresh`: () => void (callback for refresh button)
- `isRefreshing`: boolean (loading state)

UI Changes:
- Replace "Time Logged" section with "Avg Gap" display
- Add a refresh icon button in the header
- Show formatted gap time (e.g., "5m 30s")

### 3. Updated Gap Calculation Logic

The edge function will:
1. Fetch profile_events for the target date
2. Build a list of "inactive periods" (break start to break end)
3. For each gap between tickets, subtract overlapping inactive time
4. Treat LOGOUT as a session boundary (don't calculate gap across logout/login)

---

## Step-by-Step Implementation

| Step | Task |
|------|------|
| 1 | Add `getTodayTicketCount` and `getTodayGapData` functions to `agentDashboardApi.ts` |
| 2 | Update `DailyWorkTracker` component with new props and UI (refresh button, gap display) |
| 3 | Update `AgentDashboard` to fetch ticket/gap data and wire to DailyWorkTracker |
| 4 | Update `calculate-daily-gaps` edge function to exclude break durations |
| 5 | Deploy edge function |
| 6 | Test end-to-end |

---

## Expected Result

### Daily Work Tracker Display

```text
┌─────────────────────────────────────────────────────────┐
│ 📊 Daily Work Tracker                           🔄      │
├─────────────────────────────────────────────────────────┤
│  🎫 Tickets Handled          ⏱️ Avg Gap                 │
│     18/50                       5m 30s                  │
│  ████████████░░░░░░  36%                                │
└─────────────────────────────────────────────────────────┘
```

### Gap Calculation Behavior

| Status | Gap Tracking |
|--------|--------------|
| LOGGED_IN | Active - gaps calculated |
| ON_BREAK | Paused - duration excluded from gaps |
| COACHING | Paused - duration excluded from gaps |
| RESTARTING | Paused - duration excluded from gaps |
| LOGGED_OUT | Session ends - next session starts fresh |

