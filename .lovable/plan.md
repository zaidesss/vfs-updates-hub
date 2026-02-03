
# Plan: Split Daily Work Tracker by Ticket Type and Quotas

## Summary

This plan enhances the Daily Work Tracker to display ticket counts broken down by type (Email, Chat, Call) with individual progress bars based on the agent's support type and position-specific quotas (`quota_email`, `quota_chat`, `quota_phone`).

---

## Current State

- **DailyWorkTracker** shows a single "Tickets Handled" bar with an aggregate count against a single `quota` value
- **DashboardProfile** only fetches aggregate `quota` from `agent_directory`
- **getTodayTicketCount()** returns a single total count (no type breakdown)
- **agent_profiles** table already has `quota_email`, `quota_chat`, `quota_phone` fields
- **ticket_logs** table has a `ticket_type` column with values: `Email`, `Chat`, `Call`

---

## Proposed Changes

### 1. Update DashboardProfile Interface

Add individual quota fields and position to the interface:

```text
DashboardProfile {
  ...existing fields...
  position: string | null;      // NEW: agent's position
  quota_email: number | null;   // NEW: Email quota
  quota_chat: number | null;    // NEW: Chat quota  
  quota_phone: number | null;   // NEW: Phone quota
  // Keep quota for backward compatibility (will be deprecated)
}
```

### 2. Update fetchDashboardProfile()

Fetch `quota_email`, `quota_chat`, `quota_phone`, and `position` from `agent_profiles` (source of truth):

```text
Changes to agentDashboardApi.ts:
- Add quota_email, quota_chat, quota_phone, position to SELECT from agent_profiles
- Map these to DashboardProfile
```

### 3. Create New API Function: getTodayTicketCountByType()

Replace the aggregate count function with one that returns a breakdown:

```text
New function signature:
getTodayTicketCountByType(agentTag: string): Promise<{
  data: { email: number; chat: number; call: number; total: number };
  error: string | null;
}>
```

This uses SQL like:
```sql
SELECT 
  COUNT(*) FILTER (WHERE LOWER(ticket_type) = 'email') as email_count,
  COUNT(*) FILTER (WHERE LOWER(ticket_type) = 'chat') as chat_count,
  COUNT(*) FILTER (WHERE LOWER(ticket_type) = 'call') as call_count
FROM ticket_logs
WHERE agent_name ILIKE $1 
  AND timestamp >= today_start 
  AND timestamp <= today_end
```

### 4. Update DailyWorkTracker Component

Redesign the "Tickets Handled" section to show:

| Support Type | Display |
|-------------|---------|
| Email Support | Single bar: "Email: X/Y" |
| Chat Support | Two rows: "Email: X/Y" + "Chat: X/Y" (if quota_chat set) |
| Phone Support | Two rows: "Email: X/Y" + "Calls: X/Y" (if quota_phone set) |
| Hybrid Support | Up to three rows: "Email", "Chat", "Calls" (only show quotas that are set) |

**Logic:**
- Always show Email count (label: "Email")
- Show Chat count only if `quota_chat > 0` OR agent is Chat/Hybrid Support
- Show Call count only if `quota_phone > 0` OR agent is Phone/Hybrid Support
- If no quota is set for a type, show count without progress bar (just "X tickets")

### 5. Update AgentDashboard.tsx

Pass the new quota and ticket data to DailyWorkTracker:

```text
Changes:
- Fetch ticket counts by type instead of aggregate
- Pass individual quotas: quota_email, quota_chat, quota_phone
- Pass position to determine which bars to show
```

---

## UI Mockups

### Email Support Agent (quota_email: 50)
```text
┌─────────────────────────────────────────────────────────┐
│ ✉ Email                                         35/50   │
│ [████████████████████░░░░░░░░░] 70% of quota            │
└─────────────────────────────────────────────────────────┘
```

### Chat Support Agent (quota_email: 30, quota_chat: 20)
```text
┌─────────────────────────────────────────────────────────┐
│ ✉ Email                                         25/30   │
│ [████████████████████████░░░░░] 83% of quota            │
├─────────────────────────────────────────────────────────┤
│ 💬 Chat                                         15/20   │
│ [███████████████████░░░░░░░░░░] 75% of quota            │
└─────────────────────────────────────────────────────────┘
```

### Chat Support Agent (quota_email: 30, quota_chat: null)
```text
┌─────────────────────────────────────────────────────────┐
│ ✉ Email                                         25/30   │
│ [████████████████████████░░░░░] 83% of quota            │
├─────────────────────────────────────────────────────────┤
│ 💬 Chat                                         15      │
│ (no quota set)                                          │
└─────────────────────────────────────────────────────────┘
```

### Hybrid Support Agent (all quotas set)
```text
┌─────────────────────────────────────────────────────────┐
│ ✉ Email                                         40/50   │
│ [████████████████░░░░░░░░░░░░░] 80% of quota            │
├─────────────────────────────────────────────────────────┤
│ 💬 Chat                                         18/20   │
│ [█████████████████████████████] 90% of quota            │
├─────────────────────────────────────────────────────────┤
│ 📞 Calls                                        12/15   │
│ [████████████████████░░░░░░░░░] 80% of quota            │
└─────────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/agentDashboardApi.ts` | Add quota fields to DashboardProfile, update fetchDashboardProfile(), add getTodayTicketCountByType() |
| `src/components/dashboard/DailyWorkTracker.tsx` | Redesign Tickets Handled section with multiple progress bars |
| `src/pages/AgentDashboard.tsx` | Use new ticket count function, pass quota fields to DailyWorkTracker |

---

## Technical Details

### DailyWorkTrackerProps Changes

```typescript
interface DailyWorkTrackerProps {
  // OLD: quota: number | null;
  // OLD: ticketsHandled: number;
  
  // NEW: Individual quotas and counts
  position: string | null;
  quotaEmail: number | null;
  quotaChat: number | null;
  quotaPhone: number | null;
  ticketCounts: {
    email: number;
    chat: number;
    call: number;
  };
  
  // ... rest unchanged
}
```

### Visibility Logic

```typescript
function shouldShowTicketType(
  type: 'email' | 'chat' | 'call',
  position: string | null,
  quota: number | null
): boolean {
  const pos = position?.toLowerCase() || '';
  
  if (type === 'email') {
    // Always show email for support roles
    return pos.includes('support') || pos.includes('hybrid');
  }
  
  if (type === 'chat') {
    return pos.includes('chat') || pos.includes('hybrid') || (quota && quota > 0);
  }
  
  if (type === 'call') {
    return pos.includes('phone') || pos.includes('hybrid') || (quota && quota > 0);
  }
  
  return false;
}
```

---

## Backward Compatibility

- The aggregate `quota` field will remain in DashboardProfile for any legacy usage
- If an agent has no individual quotas set but has aggregate quota, fall back to showing single aggregate bar
- Non-support roles (Team Lead, Logistics, Technical Support) will continue showing no quota bars

---

## Implementation Steps

1. **Step 1**: Update `DashboardProfile` interface and `fetchDashboardProfile()` in `agentDashboardApi.ts`
2. **Step 2**: Add `getTodayTicketCountByType()` function in `agentDashboardApi.ts`
3. **Step 3**: Update `DailyWorkTrackerProps` interface in `DailyWorkTracker.tsx`
4. **Step 4**: Redesign the Tickets Handled section with conditional multi-bar layout
5. **Step 5**: Update `AgentDashboard.tsx` to use new functions and pass new props
6. **Step 6**: Test across different support types (Email, Chat, Phone, Hybrid)
