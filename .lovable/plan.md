
# Fix: Add Missing Batch Management Features to Revalida 2.0

## Summary
Revalida 2.0 is missing core batch management functionality that exists in the original Revalida:
1. **Pause/Deactivate published batches** - No way to stop an active batch
2. **Delete batches** - No way to remove generated batches
3. **Batch list not updating** - Query cache not invalidating after batch creation

---

## Current vs Expected Features

| Feature | Original Revalida | Revalida 2.0 |
|---------|------------------|--------------|
| View batch details | ✅ Eye icon | ✅ Click card |
| Edit batch | ✅ Pencil icon | ❌ Missing |
| Publish draft | ✅ Play icon | ✅ In QuestionPreview |
| Pause/Deactivate | ✅ Pause icon | ❌ Missing |
| Delete batch | ✅ Trash icon | ❌ Missing |
| Query refresh | ✅ Works | ❌ Not refreshing |

---

## Implementation Plan

### Step 1: Add Missing API Functions to `revalidaV2Api.ts`

Add `deactivateBatch` and `deleteBatch` functions:

```typescript
export const deactivateBatch = async (batchId: string) => {
  const { data, error } = await supabase
    .from('revalida_v2_batches')
    .update({ is_active: false })
    .eq('id', batchId)
    .select()
    .single();

  if (error) throw error;
  return data as RevalidaV2Batch;
};

export const deleteBatch = async (batchId: string) => {
  // Delete cascade: answers → attempts → questions → batch
  const { error } = await supabase
    .from('revalida_v2_batches')
    .delete()
    .eq('id', batchId);

  if (error) throw error;
};
```

---

### Step 2: Create Batch Management Component for V2

Create `src/components/revalida-v2/BatchManagementV2.tsx` that mirrors the original `BatchManagement.tsx`:

**Actions per batch status:**
| Status | View | Edit | Publish | Pause | Delete |
|--------|------|------|---------|-------|--------|
| Draft (pending generation) | ✅ | ✅ | ❌ | ❌ | ✅ |
| Draft (generation complete) | ✅ | ✅ | ✅ | ❌ | ✅ |
| Active | ✅ | ✅ | ❌ | ✅ | ❌ |
| Expired | ✅ | ❌ | ❌ | ❌ | ✅ |

---

### Step 3: Update `RevalidaV2.tsx` to Use New Component

Replace the simple card-based list in the "Manage Batches" tab with the proper `BatchManagementV2` component that includes:
- Table layout matching original Revalida
- Action buttons for pause/delete
- Proper status badges (Draft, Active, Expired)

---

### Step 4: Fix Query Invalidation in `BatchConfigForm.tsx`

After batch creation succeeds, ensure `queryClient.invalidateQueries` is called:

```typescript
// After successful batch creation:
queryClient.invalidateQueries({ queryKey: ['revalida-v2-batches'] });
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/revalidaV2Api.ts` | Add `deactivateBatch`, `deleteBatch` functions |
| `src/components/revalida-v2/BatchManagementV2.tsx` | New component with pause/delete UI |
| `src/pages/RevalidaV2.tsx` | Use new BatchManagementV2, add handlers |
| `src/components/revalida-v2/BatchConfigForm.tsx` | Trigger query invalidation |

---

## Technical Details

### Database Cascade
The `revalida_v2_batches` table should have `ON DELETE CASCADE` for related tables. If not, delete order must be:
1. `revalida_v2_answers` (by attempt_id)
2. `revalida_v2_attempts` (by batch_id)
3. `revalida_v2_questions` (by batch_id)
4. `revalida_v2_batches`

### Draft Detection for V2
Unlike original Revalida, V2 has a `generation_status` field:
- **Draft (pending)**: `generation_status = 'pending'` 
- **Draft (complete)**: `generation_status = 'completed'` AND `is_active = false` AND no `start_at`
- **Active**: `is_active = true` AND not expired
- **Expired**: `end_at` is in the past

---

## Testing After Fix
1. Create a new batch → verify it appears in "Manage Batches" immediately
2. Generate questions → verify status updates
3. Publish batch → verify Pause button appears
4. Pause batch → verify it deactivates
5. Delete expired/draft batch → verify removal
