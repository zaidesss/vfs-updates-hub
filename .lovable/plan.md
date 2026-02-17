

## Fix: Profile Completion Modal Stuck / Unclickable UI

### Problem Summary
User `mkcm060104@gmail.com` gets stuck on the "Complete Your Profile" modal after login, unable to interact with the portal. The profile already has all required fields filled, but the modal appears anyway and becomes inescapable when the save fails.

### Root Causes (3 bugs)

1. **Race condition in profile check timing** -- `checkProfileCompletion` does not reset `isLoading = true` on subsequent runs, so the "show modal" effect fires prematurely before the async DB check finishes.

2. **INSERT instead of UPDATE** -- When `handleSubmit` runs and the SELECT returns an error (logged but not handled as a blocker), the code falls through to INSERT. Since the row already exists, the INSERT fails with an RLS error.

3. **Modal never auto-closes when profile is complete** -- The useEffect that controls the modal only opens it (`setShowProfileModal(true)`) when profile is incomplete. There is no corresponding logic to close it when `isProfileComplete` becomes `true`. Combined with `onOpenChange={() => {}}` and prevented escape/click-outside, the user is permanently stuck.

### Fix Plan (Step-by-step)

#### Step 1: Fix the race condition in ProfileCompletionContext
In `src/context/ProfileCompletionContext.tsx`:
- Add `setIsLoading(true)` at the start of `checkProfileCompletion` (before the email check early return)
- Add a new useEffect that **closes** the modal when `isProfileComplete` becomes `true`:
  ```
  useEffect(() => {
    if (isProfileComplete && showProfileModal) {
      setShowProfileModal(false);
    }
  }, [isProfileComplete]);
  ```

#### Step 2: Fix the error handling in ProfileCompletionModal save
In `src/components/ProfileCompletionModal.tsx`:
- When the SELECT returns an error, abort the save (return early) instead of falling through to INSERT
- After `refreshProfileStatus()` in the error handler, use the freshly fetched state by calling `markProfileComplete()` directly if the DB data is confirmed complete, rather than relying on the stale closure value

#### Step 3: Make the error handler resilient
- After any save error, re-check profile status and if complete, call `markProfileComplete()` to force-close the modal regardless of stale state

### Technical Details

**File: `src/context/ProfileCompletionContext.tsx`**
- Line 29: Add `setIsLoading(true)` as first line of `checkProfileCompletion`
- After line 75: Add new useEffect to auto-close modal when profile becomes complete

**File: `src/components/ProfileCompletionModal.tsx`**  
- Lines 112-117: If `selectError` is truthy, call `refreshProfileStatus()` and return early instead of falling through to INSERT/UPDATE logic
- Lines 130-140: After `refreshProfileStatus()` completes on save error, directly call `markProfileComplete()` since the profile IS complete in the DB (the check will confirm it)

### What This Fixes
- User will no longer see the modal when their profile is already complete
- If the modal does appear and save fails, it will auto-close once the refresh confirms completeness
- The UI will never become permanently stuck/frozen

