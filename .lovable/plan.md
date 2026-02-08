
# Fix: Radio Button Selection & Exclude Revalida Schedules

## Summary
Two bugs identified:
1. **Radio buttons don't work** - Clicking MCQ/T-F options doesn't register the selection
2. **Invalid content in tests** - Revalida schedule announcements are being used as source material for questions

---

## Issue 1: Radio Button Not Working

### Root Cause
In `TestInterface.tsx`, there's a mismatch between which question ID is used:

```typescript
// Line 23 - Gets question at current index (not shuffled)
const currentQuestion = questions[currentIndex];

// Line 25 - Gets question using shuffled order (correct for display)
const orderedQuestion = questions.find(q => q.id === questionOrder[currentIndex]);

// Line 28-32 - Uses currentQuestion.id to save answer (WRONG!)
const handleAnswer = (value: string) => {
  setAnswers(prev => ({
    ...prev,
    [currentQuestion?.id]: value,  // ← Saves to wrong ID
  }));
};

// Line 128 - Checks orderedQuestion.id for current answer (different ID!)
<RadioGroup value={answers[orderedQuestion.id] || ''} onValueChange={handleAnswer}>
```

The component displays `orderedQuestion` but saves answers using `currentQuestion.id`. When question order is shuffled, these are different questions, causing:
- The saved answer goes to the wrong question
- The RadioGroup sees no matching value, so nothing appears selected

### Fix
Replace all uses of `currentQuestion` with `orderedQuestion`:

| Line | Current Code | Fixed Code |
|------|--------------|------------|
| 28-32 | `[currentQuestion?.id]: value` | `[orderedQuestion?.id]: value` |
| Delete line 23 | `const currentQuestion = questions[currentIndex];` | Remove entirely |

---

## Issue 2: Revalida Schedules in Questions

### Root Cause
The edge function `generate-revalida-v2` fetches all published updates from the previous week without filtering:

```typescript
// Line 63-69 - No filter for Revalida announcements
const { data: updates, error: updatesError } = await supabase
  .from("updates")
  .select("id, title, summary, body, category, posted_at")
  .eq("status", "published")  // Only filters by published status
  // Missing: .not('title', 'ilike', 'Revalida%')
```

### Data Found
Articles being incorrectly included:
- "Revalida — Jan 19-25" (category: internal_operations)
- "Revalida — Jan 26-Feb 1" (category: internal_operations)  
- "Revalida — Feb 2-8" (category: internal_operations)

These are announcements about test schedules, not actual knowledge content.

### Fix Options

| Option | Filter Logic | Pros | Cons |
|--------|--------------|------|------|
| **A. Title filter** | `.not('title', 'ilike', 'Revalida%')` | Simple, catches current pattern | May miss future variations |
| **B. Title + body filter** | Filter out titles AND body containing "Revalida schedule" | More thorough | May over-filter |
| **C. Exclude category** | Don't use `internal_operations` category | Removes all ops announcements | May exclude valid content |

**Recommended: Option A** - Filter by title pattern since all Revalida schedule posts follow "Revalida —" naming convention

---

## Implementation Steps

### Step 1: Fix TestInterface.tsx
```typescript
// Remove line 23 entirely:
// const currentQuestion = questions[currentIndex];

// Update handleAnswer function (line 28-32):
const handleAnswer = (value: string) => {
  if (!orderedQuestion) return;
  setAnswers(prev => ({
    ...prev,
    [orderedQuestion.id]: value,
  }));
};
```

### Step 2: Fix generate-revalida-v2/index.ts
```typescript
// Add filter to exclude Revalida schedule announcements (around line 63-69)
const { data: updates, error: updatesError } = await supabase
  .from("updates")
  .select("id, title, summary, body, category, posted_at")
  .eq("status", "published")
  .not('title', 'ilike', 'Revalida%')  // Exclude Revalida schedules
  .gte("posted_at", previousMonday.toISOString())
  .lte("posted_at", previousSunday.toISOString())
  .order("posted_at", { ascending: false });
```

Also add filter in the AI prompt to reinforce this:
```typescript
// In the AI prompt, add note:
"IMPORTANT: Do not generate questions about Revalida test schedules or deadlines."
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/revalida-v2/TestInterface.tsx` | Fix answer state to use `orderedQuestion.id` |
| `supabase/functions/generate-revalida-v2/index.ts` | Add `.not('title', 'ilike', 'Revalida%')` filter |

---

## Testing After Fix
1. Create a new batch to verify Revalida schedules are excluded from sources
2. Take test and verify radio button selection works
3. Verify answers are correctly saved and auto-graded
