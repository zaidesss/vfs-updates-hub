
# Revalida 2.0 Restrictions Update

## Summary
Apply the same restrictions from the original Revalida page to Revalida 2.0:
1. **48-hour batch window** - Batches are active for exactly 48 hours after publishing
2. **Score-only display for agents** - Agents see only their percentage score, not correct answers
3. **One attempt per batch** - Agents can only take each test once
4. **Deadline enforcement** - Block test taking after batch ends
5. **Proper status badges** - Show expired/pending/graded states

---

## Current Issues Identified

| Issue | Current State | Expected State |
|-------|--------------|----------------|
| Publish function | No 48-hour window set | Auto-set `start_at=now`, `end_at=now+48h` |
| Attempt creation | Auto-creates on page load via query | Only create when agent clicks "Start Test" |
| Agent view | Directly shows test interface | Show BatchCard with status, only test if started |
| Score display | Shows raw score | Show percentage only, hide correct answers |
| Deadline check | Not enforced | Block test start/submit after `end_at` |
| Unique attempt | No constraint | Add unique constraint on `(batch_id, agent_email)` |

---

## Implementation Steps

### Step 1: Database Migration
Add unique constraint to prevent multiple attempts per agent per batch:
```sql
ALTER TABLE public.revalida_v2_attempts 
ADD CONSTRAINT unique_agent_batch_attempt UNIQUE (batch_id, agent_email);
```

### Step 2: API Layer Updates (`src/lib/revalidaV2Api.ts`)
- **Add `publishBatch` function**: Sets `is_active=true`, `start_at=now`, `end_at=now+48h`
- **Add `fetchMyAttempt` function**: Query existing attempt without auto-creating
- **Add helper functions**: `isDeadlinePassed()` and `getTimeRemaining()`
- **Update `getOrCreateAttempt`**: Check deadline before creating

### Step 3: Frontend - Agent View Updates (`src/pages/RevalidaV2.tsx`)
- Replace auto-create query with `fetchMyAttempt` (check only)
- Show `BatchCardV2` component with:
  - Time remaining countdown
  - Status badge (Not Started / In Progress / Pending Review / Graded / Expired)
  - Score display (percentage only, no correct answers)
  - Start/Continue Test button
- Block test interface if deadline passed

### Step 4: Create `BatchCardV2` Component
Modeled after original `BatchCard.tsx`:
- Display batch title and total points
- Show time remaining with countdown
- Status badges based on attempt state
- Score result card (percentage only, hide correct answers)
- Start/Continue test button with loading state

### Step 5: Create `AttemptResultV2` Component
Modeled after original `AttemptResult.tsx`:
- Graded state: Show percentage score only
- Pending state: Show "Pending AI Review" message
- Note: "Correct answers are not shown"

---

## Technical Details

### New/Modified Files

| File | Action | Changes |
|------|--------|---------|
| `src/lib/revalidaV2Api.ts` | Modify | Add `publishBatch`, `fetchMyAttempt`, `isDeadlinePassed`, `getTimeRemaining` |
| `src/pages/RevalidaV2.tsx` | Modify | Refactor agent view with BatchCard pattern, check deadline |
| `src/components/revalida-v2/BatchCardV2.tsx` | Create | Agent batch card with time remaining, score display |
| `src/components/revalida-v2/AttemptResultV2.tsx` | Create | Score-only result display |
| Database migration | Create | Add unique constraint on attempts |

### Publish Batch Logic
```typescript
export async function publishBatch(batchId: string) {
  const now = new Date();
  const endAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // +48 hours
  
  // Deactivate any currently active batch first
  await supabase
    .from('revalida_v2_batches')
    .update({ is_active: false })
    .eq('is_active', true)
    .neq('id', batchId);
  
  return await updateBatch(batchId, {
    is_active: true,
    start_at: now.toISOString(),
    end_at: endAt.toISOString(),
  });
}
```

### Deadline Helper Functions
```typescript
export function isDeadlinePassed(endAt: string | null): boolean {
  if (!endAt) return false;
  return new Date() > new Date(endAt);
}

export function getTimeRemaining(endAt: string | null): string {
  if (!endAt) return '';
  const now = new Date();
  const end = new Date(endAt);
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return 'Expired';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h remaining`;
  }
  return `${hours}h ${minutes}m remaining`;
}
```

### Agent View Flow
```text
1. Agent visits /team-performance/revalida-v2
2. Fetch active batches (is_active = true)
3. For each batch, fetch their existing attempt (if any)
4. Display BatchCardV2:
   - No attempt + deadline not passed → "Start Test" button
   - In-progress attempt + deadline not passed → "Continue Test" button
   - Submitted/graded attempt → Show score result
   - Deadline passed + no attempt → "Expired" badge, no button
5. Agent clicks "Start Test":
   - Check deadline again
   - Create attempt with shuffled question order
   - Navigate to test interface
6. Agent completes test:
   - MCQ/T-F auto-graded
   - Situational marked as "pending" for AI grading
   - Show result card with percentage only
```

---

## What This Does NOT Change
- Question generation (AI-powered, not manual)
- Situational grading (AI-suggested + admin override)
- Admin dashboard functionality
- Contract management
- Source tracking

---

## Testing Checklist
After implementation, verify:
- [ ] Publishing a batch sets 48-hour window correctly
- [ ] Agent cannot start test after deadline
- [ ] Agent sees only percentage score, not correct answers
- [ ] Agent cannot take same batch twice (unique constraint)
- [ ] Time remaining displays correctly
- [ ] Status badges show correct states
- [ ] Continue test works for in-progress attempts
- [ ] Pending review shows for situational questions
