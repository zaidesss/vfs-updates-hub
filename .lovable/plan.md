

# Scorecard Enhancements: AHT Fix, Force Refresh, and Zendesk User ID Field

## Summary
Implement three enhancements to the Team Scorecard and Agent Profile:
1. **Fix Call AHT calculation** - Divide by unique calls (not legs) to match Zendesk Explore
2. **Add "Refresh Metrics" button** per support type page (admin-only)
3. **Add Zendesk User ID field** to agent profiles (admin-editable only)

---

## Step 1: Fix Call AHT Calculation

### Problem
Current formula: `totalTalkTime / weekLegs.length` (divides by number of legs)

Zendesk Explore formula: `(Leg talk time hrs × 3600) / Accepted calls / 60`

Which translates to: **Total Talk Time (seconds) / Unique Calls = AHT (seconds)**

When an agent handles 40 calls but has 54 legs (due to transfers/consultations), the current method under-calculates AHT.

### Solution
Track unique `call_id` values and divide by that count instead of leg count.

**File**: `supabase/functions/fetch-zendesk-metrics/index.ts`

Update lines 182-196:
```typescript
if (weekLegs.length === 0) {
  return { ahtSeconds: null, totalCalls: 0 };
}

// Get unique call IDs to match Zendesk Explore calculation
// Formula: (Leg talk time hrs × 3600) / Accepted calls / 60
// = Total Talk Time (seconds) / Unique Calls
const uniqueCallIds = new Set(weekLegs.map(leg => String(leg.call_id)));
const uniqueCallCount = uniqueCallIds.size;

// Sum all talk time from agent legs
let totalTalkTime = 0;
for (const leg of weekLegs) {
  totalTalkTime += leg.talk_time || 0;
}

// AHT = Total Talk Time / Unique Calls (not legs)
const ahtSeconds = uniqueCallCount > 0 ? Math.round(totalTalkTime / uniqueCallCount) : null;
console.log(`Call AHT: ${ahtSeconds}s (${uniqueCallCount} unique calls, ${weekLegs.length} legs, talk: ${totalTalkTime}s)`);

return { ahtSeconds, totalCalls: uniqueCallCount };
```

---

## Step 2: Add Force Refresh Button (Per Support Type)

### Behavior
- Button appears beside the Support Type dropdown (for admins only)
- Clicking triggers a fresh Zendesk metrics fetch for agents of the **current support type only**
- Bypasses the 1-hour cache by passing `scheduled: true`
- Shows loading spinner and success/error toast
- Scheduled job still runs on **Tuesdays at 2:00 AM EST** for all agents

### Technical Changes

**File**: `src/lib/scorecardApi.ts`

Add new function:
```typescript
export async function triggerMetricsRefresh(
  weekStart: string,
  weekEnd: string,
  supportType: string
): Promise<{ success: boolean; processed?: number; error?: string }> {
  // Fetch agent emails for this support type
  const { data: agents, error: agentsError } = await supabase
    .from('agent_profiles')
    .select('email')
    .eq('position', supportType)
    .neq('employment_status', 'Terminated')
    .not('zendesk_instance', 'is', null);

  if (agentsError) {
    return { success: false, error: agentsError.message };
  }

  const agentEmails = (agents || []).map(a => a.email);
  if (agentEmails.length === 0) {
    return { success: true, processed: 0 };
  }

  // Call edge function with scheduled: true to bypass cache
  const response = await supabase.functions.invoke('fetch-zendesk-metrics', {
    body: {
      scheduled: true,
      weekStart,
      weekEnd,
      agentEmails,
    },
  });

  if (response.error) {
    return { success: false, error: response.error.message };
  }

  return { success: true, processed: response.data?.processed || 0 };
}
```

**File**: `src/pages/TeamScorecard.tsx`

Add refresh mutation (around line 130) and button beside the support type dropdown:

```tsx
// Add refresh mutation
const refreshMutation = useMutation({
  mutationFn: () => triggerMetricsRefresh(weekStartStr, weekEndStr, supportType),
  onSuccess: (result) => {
    if (result.success) {
      toast.success(`Refreshed metrics for ${result.processed} agents`);
      queryClient.invalidateQueries({ queryKey: ['scorecard', weekStartStr, supportType] });
    } else {
      toast.error(`Refresh failed: ${result.error}`);
    }
  },
  onError: (error) => {
    toast.error(`Error: ${error.message}`);
  },
});

// Add button after the Select component (line ~320)
{canSave && (
  <Button
    variant="outline"
    size="sm"
    onClick={() => refreshMutation.mutate()}
    disabled={refreshMutation.isPending}
    className="gap-2"
  >
    <RefreshCw className={cn("h-4 w-4", refreshMutation.isPending && "animate-spin")} />
    {refreshMutation.isPending ? 'Refreshing...' : 'Refresh Metrics'}
  </Button>
)}
```

---

## Step 3: Add Zendesk User ID Field to Agent Profile

### Behavior
- Field appears beside Upwork Contract ID in Work Configuration section
- Editable only by Admin or Super Admin
- Read-only for regular users (shows existing value if present)
- Already exists in database (`agent_profiles.zendesk_user_id`)

### Technical Changes

**File**: `src/components/profile/WorkConfigurationSection.tsx`

Add field after Upwork Contract ID (after line 292):
```tsx
{/* Zendesk User ID */}
<div className="space-y-2">
  <Label>Zendesk User ID</Label>
  <Input
    value={profile.zendesk_user_id || ''}
    onChange={(e) => onInputChange('zendesk_user_id', e.target.value)}
    placeholder="e.g., 11436740426393"
    disabled={!canEdit}
    className={!canEdit ? 'bg-muted' : ''}
  />
</div>
```

**File**: `src/pages/AgentProfile.tsx`

Ensure the field is loaded and saved in the profile object handling.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/fetch-zendesk-metrics/index.ts` | Fix AHT calculation to use unique calls |
| `src/lib/scorecardApi.ts` | Add `triggerMetricsRefresh` function |
| `src/pages/TeamScorecard.tsx` | Add Refresh Metrics button with mutation |
| `src/components/profile/WorkConfigurationSection.tsx` | Add Zendesk User ID input field |
| `src/pages/AgentProfile.tsx` | Ensure `zendesk_user_id` loads/saves |

---

## Expected Behavior After Implementation

1. **Call AHT** will now match Zendesk Explore by dividing total talk time by unique call count
   - Example: Desiree with 8,640s total talk time and 40 unique calls = 216s (3:36) AHT
2. **Refresh Metrics** button (admin only) appears beside the support type dropdown
   - Only fetches data for agents of the selected position
   - Shows loading state and success/error toast
3. **Zendesk User ID** appears beside Upwork Contract ID in Work Configuration
   - Admins can edit; regular users see it read-only
   - Existing values from database are displayed

---

## Verification Steps

1. Deploy the updated edge function
2. Navigate to Team Scorecard → Hybrid Support
3. Click "Refresh Metrics" and verify only Hybrid agents are processed
4. Check that Desiree's AHT is now ~3:00-3:30 (matching Zendesk Explore)
5. Navigate to an agent profile → Work Configuration
6. Verify Zendesk User ID field appears and is editable for admins

