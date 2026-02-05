
# Plan: Enforce Update Acknowledgment on Login/Logout

## Summary
Implement a system that:
1. **On Login**: Shows a warning toast informing agents of unacknowledged updates (non-blocking)
2. **On Logout**: Blocks the action and redirects to Updates page if any published updates are unacknowledged

---

## Technical Approach

### New Component: `PendingUpdatesModal.tsx`
A modal component that displays when logout is attempted with unacknowledged updates:
- Lists the pending updates with titles
- Provides "Go to Updates" button to redirect
- Cannot be dismissed until updates are acknowledged

### Modifications

#### 1. `src/context/UpdatesContext.tsx`
Add a helper function to calculate pending updates for a user:

```typescript
// New function to get unacknowledged published updates for a user
getPendingUpdates: (agentEmail: string) => Update[];
getPendingUpdateCount: (agentEmail: string) => number;
```

**Logic**:
- Filter `updates` where `status === 'published'`
- Exclude updates where `acknowledgements` contains the agent's email

#### 2. `src/pages/Login.tsx` (Lines 31-36)
After successful login, check for pending updates and show a warning toast:

```typescript
// After successful login
const pendingCount = getPendingUpdateCount(email);
if (pendingCount > 0) {
  toast({
    title: 'Updates Pending',
    description: `You have ${pendingCount} update(s) to acknowledge.`,
    variant: 'default',
    action: <Link to="/updates">View Updates</Link>
  });
}
// Continue with navigation
```

#### 3. `src/components/Layout.tsx` (Lines 250-257)
Wrap the logout button click to check for pending updates:

```typescript
const [showPendingModal, setShowPendingModal] = useState(false);
const [pendingUpdatesForLogout, setPendingUpdatesForLogout] = useState<Update[]>([]);

const handleLogoutClick = () => {
  const pending = getPendingUpdates(user.email);
  if (pending.length > 0) {
    setPendingUpdatesForLogout(pending);
    setShowPendingModal(true);
  } else {
    logout();
  }
};
```

Replace the logout button's `onClick={logout}` with `onClick={handleLogoutClick}`.

#### 4. New: `src/components/PendingUpdatesModal.tsx`
Create a blocking modal that:
- Shows when `showPendingModal` is true
- Displays list of unacknowledged update titles
- Has a "View Updates" button that navigates to `/updates`
- Has a "Close" button (but user still cannot logout until updates are acknowledged)
- Uses the same pattern as `ProfileCompletionModal` (cannot be dismissed by clicking outside)

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/PendingUpdatesModal.tsx` | Modal blocking logout until updates acknowledged |

## Files to Modify

| File | Changes |
|------|---------|
| `src/context/UpdatesContext.tsx` | Add `getPendingUpdates()` and `getPendingUpdateCount()` functions |
| `src/pages/Login.tsx` | Show warning toast after login if pending updates exist |
| `src/components/Layout.tsx` | Intercept logout to check for pending updates |

---

## User Experience Flow

### Login Flow
```text
User logs in
  ↓
System checks for unacknowledged published updates
  ↓
If pending > 0: Show toast "You have X update(s) to acknowledge"
  ↓
User proceeds to /updates (normal flow, not blocked)
```

### Logout Flow
```text
User clicks Logout
  ↓
System checks for unacknowledged published updates
  ↓
If pending > 0:
  ├── Show PendingUpdatesModal
  ├── List all pending update titles
  └── "Go to Updates" button redirects to /updates
      ↓
If pending = 0:
  └── Normal logout proceeds
```

---

## Technical Details

### Query for Pending Updates
```typescript
const getPendingUpdates = (agentEmail: string): Update[] => {
  const email = agentEmail.toLowerCase();
  return updates.filter(u => 
    u.status === 'published' &&
    !acknowledgements.some(a => 
      a.update_id === u.id && 
      a.agent_email.toLowerCase() === email
    )
  );
};
```

### Modal Behavior
- Uses Radix Dialog with `onPointerDownOutside` and `onEscapeKeyDown` prevented
- Shows update count and list of titles
- Primary action: Navigate to Updates page
- Secondary action: Close modal (user must acknowledge updates to logout)
