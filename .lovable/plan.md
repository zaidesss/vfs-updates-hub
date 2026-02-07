

# OT Productivity Implementation - Conflict Analysis & Revised Plan

## Conflicts & Considerations Identified

### ✅ No Critical Conflicts Found
The proposed implementation is compatible with the existing architecture. However, I've identified several **technical refinements** and **potential issues** that should be addressed:

---

## 1. Database Schema Considerations

### `ticket_logs` Table
**Current columns**: `id, zd_instance, ticket_id, status, timestamp, ticket_type, agent_name, agent_email, created_at`

**Proposed change**: Add `is_ot` boolean column (default `false`)

**Consideration**: 
- Existing ticket records will have `is_ot = false` by default, which is correct (historical tickets were not during OT)
- Index on `is_ot` will improve query performance for OT filtering

### `agent_profiles` Table
**Existing OT columns**: `ot_enabled`, `mon_ot_schedule` through `sun_ot_schedule`, `weekday_ot_schedule`, `weekend_ot_schedule`

**Missing**: `quota_ot_email` - needs to be added

### `agent_directory` Table  
**Consideration**: The `syncProfileToDirectory` function in `agentProfileApi.ts` syncs profile data to directory. We need to decide if `quota_ot_email` should be synced.
- **Recommendation**: Do NOT sync `quota_ot_email` to `agent_directory` since it's only used for scorecard/dashboard calculations, not for Master Directory display.

---

## 2. Zendesk Webhook - Agent Lookup Improvement

**Current code** (Lines 61-65 in `zendesk-ticket-webhook/index.ts`):
```typescript
const { data: agentData } = await supabase
  .from('agent_directory')
  .select('email')
  .eq('agent_tag', payload.agent_name)  // Exact match
  .maybeSingle()
```

**Issue**: Uses exact match (`.eq`) which may fail due to case sensitivity issues with agent tags.

**Fix**: Change to `.ilike()` for case-insensitive matching:
```typescript
.ilike('agent_tag', payload.agent_name)
```

---

## 3. Timezone Consideration in `getTodayTicketCountByType`

**Current code** (Lines 1658-1663):
```typescript
const today = new Date();
const startOfDay = new Date(today);
startOfDay.setHours(0, 0, 0, 0);  // UTC midnight
```

**Issue**: Uses UTC midnight boundaries, not EST. This will cause tickets logged late evening EST (after 7 PM in winter / 8 PM in summer) to appear on the "next day".

**Fix**: Use existing `getESTDayBoundaries` from `timezoneUtils.ts`:
```typescript
import { getESTDayBoundaries, getTodayEST } from '@/lib/timezoneUtils';
const { start, end } = getESTDayBoundaries(getTodayEST());
```

---

## 4. Dual Interface Definition

**Issue**: `TicketCountByType` is defined in TWO places:
1. `src/lib/agentDashboardApi.ts` (lines 1646-1651) - includes `total`
2. `src/components/dashboard/DailyWorkTracker.tsx` (lines 8-12) - missing `total`

**Fix**: Remove local definition in `DailyWorkTracker.tsx` and import from API:
```typescript
import { TicketCountByType } from '@/lib/agentDashboardApi';
```

---

## 5. Scorecard RPC Update Requirement

**Current RPC** (`get_weekly_scorecard_data`):
- Counts all tickets without checking `is_ot` flag
- Does not return OT email count separately

**Required changes**:
```sql
-- Add to ticket_counts CTE:
COUNT(*) FILTER (WHERE LOWER(tl.ticket_type) = 'email' AND COALESCE(tl.is_ot, false) = false) as email_count,
COUNT(*) FILTER (WHERE LOWER(tl.ticket_type) = 'email' AND tl.is_ot = true) as ot_email_count,
```

**Also needed**: 
- Add `quota_ot_email` to the `eligible_agents` CTE select
- Add `ot_email_count` to the return values

---

## 6. OT Bar Visibility Logic

**Proposed logic**: Show OT Email bar when `isOnOT === true` OR `otEmailCount > 0`

**Consideration**: This is correct because:
- If agent is currently on OT, they should see the bar (even if 0 tickets yet)
- If agent was on OT earlier today but isn't now, they should still see their OT tickets

---

## Revised Implementation Plan

### Phase 1: Database Migration
1. Add `quota_ot_email INTEGER DEFAULT NULL` to `agent_profiles`
2. Add `is_ot BOOLEAN DEFAULT FALSE` to `ticket_logs`
3. Add index on `ticket_logs(is_ot)` for query performance

### Phase 2: Zendesk Webhook Update
1. Fix agent tag matching to use case-insensitive lookup
2. Add profile status check before insert
3. Set `is_ot: true` when agent status is `ON_OT`

### Phase 3: Profile Configuration UI
1. Add "OT Email Quota" input in `WorkConfigurationSection.tsx`
2. Only show when `ot_enabled = true`
3. Update `AgentProfile` and `AgentProfileInput` interfaces

### Phase 4: Dashboard API Updates
1. Update `TicketCountByType` interface to include `otEmail: number`
2. Update `getTodayTicketCountByType` to:
   - Use EST boundaries (fix timezone issue)
   - Query `is_ot` column
   - Separate OT email count from regular email count
3. Update `DashboardProfile` interface to include `quota_ot_email`

### Phase 5: Daily Work Tracker UI
1. Remove duplicate `TicketCountByType` interface
2. Add OT Email progress bar with violet color scheme
3. Only show when `isOnOT || otEmailCount > 0`
4. Update grid layout calculation for proper responsive behavior

### Phase 6: Scorecard RPC & API
1. Update `get_weekly_scorecard_data` RPC to:
   - Select `quota_ot_email` 
   - Count OT emails separately
   - Return `ot_email_count`
2. Update `scorecardApi.ts` to calculate OT productivity:
   - OT Productivity = (OT Email Count / (quota_ot_email × OT Days Worked)) × 100

---

## Files to Modify (Complete List)

| File | Changes |
|------|---------|
| **Database** | |
| `supabase/migrations/[new].sql` | Add columns and index |
| **Edge Functions** | |
| `supabase/functions/zendesk-ticket-webhook/index.ts` | Check OT status, set `is_ot` flag, fix case sensitivity |
| **API Layer** | |
| `src/lib/agentDashboardApi.ts` | Update interfaces, fix timezone, separate OT counts |
| `src/lib/agentProfileApi.ts` | Add `quota_ot_email` to interfaces |
| `src/lib/scorecardApi.ts` | Handle OT productivity calculation |
| **UI Components** | |
| `src/components/profile/WorkConfigurationSection.tsx` | Add OT Email Quota field |
| `src/components/dashboard/DailyWorkTracker.tsx` | Add OT Email bar, fix interface import |
| **Pages** | |
| `src/pages/AgentDashboard.tsx` | Pass `quotaOtEmail`, `otEmailCount`, `isOnOT` props |
| **Database RPC** | |
| `get_weekly_scorecard_data` (PostgreSQL function) | Add OT email counting |

---

## Summary

- **No breaking conflicts** with the existing system
- **4 technical improvements** identified that should be bundled with this implementation:
  1. Fix timezone handling in `getTodayTicketCountByType`
  2. Fix case-sensitive agent tag matching in webhook
  3. Remove duplicate `TicketCountByType` interface
  4. Improve Scorecard RPC for OT tracking
- Implementation can proceed step-by-step as outlined above

