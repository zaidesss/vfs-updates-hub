

# Fix: Add Delete Button for Deactivated Batches in Revalida 2.0

## Problem
The delete button is missing for **deactivated** batches (Inactive status with time remaining). Currently only Draft and Expired batches can be deleted.

## Root Cause
In `BatchManagementV2.tsx` (line 215), delete button shows only for:
```typescript
{(isDraftBatch(batch) || isExpired(batch)) && (...)}
```

But `isDraftBatch` checks `!batch.is_active && !batch.start_at` - which excludes batches that were published then deactivated (they have `start_at` set).

## Solution
Update the delete condition to include **all inactive batches** (not just drafts):

| Batch State | Should Show Delete? |
|-------------|---------------------|
| Draft (never published) | ✅ Yes |
| Active (live) | ❌ No (must deactivate first) |
| Deactivated (was active, now stopped) | ✅ Yes |
| Expired (deadline passed) | ✅ Yes |

## File to Change

**`src/components/revalida-v2/BatchManagementV2.tsx`**

Change line 215 from:
```typescript
{(isDraftBatch(batch) || isExpired(batch)) && (
```

To:
```typescript
{(!isActive(batch)) && (
```

This covers:
- Draft batches (not active, never started)
- Deactivated batches (not active, was started)
- Expired batches (not active due to deadline)

Only **currently active** batches require deactivation first.

---

## Additional Fix: Exclude Internal Operations from AI Question Generation

**`supabase/functions/generate-revalida-v2/index.ts`**

Add filter to exclude `internal_operations` category:
```typescript
.not("category", "eq", "internal_operations")
```

This ensures HR/operational articles don't get used for question generation.

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/revalida-v2/BatchManagementV2.tsx` | Show delete for all non-active batches |
| `supabase/functions/generate-revalida-v2/index.ts` | Exclude internal_operations from KB query |

