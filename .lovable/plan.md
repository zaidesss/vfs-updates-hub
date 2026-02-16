

## Fix: Profile Completion Modal Error and Stuck State

### Root Cause

The `ProfileCompletionModal` uses a Supabase `upsert` with `onConflict: 'email'` to save the profile. When the profile row already exists (pre-created by an admin), the PostgREST upsert can fail due to RLS policy evaluation order -- the INSERT path is attempted first, and the conflict resolution with RLS can be unreliable in some configurations.

When the upsert fails:
1. The error toast shows ("Failed to save your profile")
2. `markProfileComplete()` is never called
3. The modal has no close button, blocks Escape, and blocks outside clicks
4. The user is permanently stuck

### The Fix (3 changes)

**Change 1: Replace `upsert` with select-then-update/insert pattern**

In `ProfileCompletionModal.tsx`, replace the single `upsert` call with:
1. First SELECT to check if the profile row exists
2. If it exists: UPDATE the row
3. If it doesn't exist: INSERT a new row

This avoids the upsert+RLS edge case entirely.

```text
// Instead of:
supabase.from('agent_profiles').upsert({...}, { onConflict: 'email' })

// Do:
const { data: existing } = await supabase
  .from('agent_profiles')
  .select('id')
  .eq('email', userEmail)
  .maybeSingle();

if (existing) {
  // UPDATE existing row
  await supabase.from('agent_profiles')
    .update({ full_name, phone_number, birthday, home_address, updated_at })
    .eq('email', userEmail);
} else {
  // INSERT new row
  await supabase.from('agent_profiles')
    .insert({ email: userEmail, full_name, phone_number, birthday, home_address, updated_at });
}
```

**Change 2: Add error recovery -- re-check profile after failure**

If the save operation fails, re-run the profile completion check. If the profile is actually complete (e.g., data was saved despite the error, or an admin filled it), dismiss the modal anyway.

```text
// In the catch/error block of handleSubmit:
if (error) {
  // Re-check if profile is actually complete despite the error
  await refreshProfileStatus();
  // If still incomplete, show the error toast
}
```

**Change 3: Add console logging for the actual error**

Log the full error object so that if this happens again, the error details are visible in console logs for debugging.

### Files to Change

1. `src/components/ProfileCompletionModal.tsx` -- replace upsert, add error recovery, add logging
2. `src/context/ProfileCompletionContext.tsx` -- no changes needed (already has `refreshProfileStatus`)

### Impact

- Users with pre-created profiles will no longer get stuck on the modal
- If the save fails for any reason, the system re-checks and dismisses the modal if data is actually there
- No impact on users whose profiles don't exist yet (INSERT path still works)

