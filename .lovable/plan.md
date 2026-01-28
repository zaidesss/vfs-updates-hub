
# Team Status Board - Implementation Plan

## Summary

Create a new page at `/team-status` showing all currently logged-in agents grouped into two sections:
1. **Agents** - Regular support agents (left/center columns)
2. **Team Leads & Tech Support** - Users with "Team Lead" or "Technical Support" positions (right column)

Each agent is displayed in an individual card showing their status, shift schedule, and break schedule. Logged-out users are automatically excluded from the board.

---

## Visual Design (Based on Reference Image)

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                         Team Status Board                                 │
├─────────────────────────────────────────────────────────────────────────┤
│       Agents                    │                │  Team Leads & Tech    │
│ ┌────────────────┐ ┌────────────────┐          │       Support         │
│ │ Malcom Salmero │ │ Malcom Salmero │          │ ┌────────────────┐    │
│ │ Status: Active │ │ Status: Active │          │ │ Malcom Salmero │    │
│ │ Shift Schedule │ │ Shift Schedule │          │ │ Status: Active │    │
│ │ 8:00 AM-5:00PM │ │ 8:00 AM-5:00PM │          │ │ Shift Schedule │    │
│ │ Break Schedule │ │ Break Schedule │          │ │ 8:00 AM-5:00PM │    │
│ │ 12:00-12:30 PM │ │ 12:00-12:30 PM │          │ │ Break Schedule │    │
│ │          [↗]   │ │                │          │ │ 12:00-12:30 PM │    │
│ └────────────────┘ └────────────────┘          │ └────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

| Data | Source Table | Join Key |
|------|--------------|----------|
| Name, Position | `agent_profiles` | `profile_id` |
| Current Status | `profile_status` | `profile_id` |
| Shift Schedule, Break Schedule | `agent_directory` | `email` |

### Query Logic

1. Fetch all `profile_status` records where `current_status != 'LOGGED_OUT'`
2. Join with `agent_profiles` to get name, email, and position
3. Join with `agent_directory` using email to get schedules
4. Filter into two groups based on position:
   - **Team Leads & Tech Support**: `position IN ('Team Lead', 'Technical Support')`
   - **Agents**: All other positions

---

## Features

### Access Control
- **ALL users** can access the Team Status Board (no admin restriction)
- Visible under **People** menu, below "Dashboard"

### Status Display
| Status | Label | Color |
|--------|-------|-------|
| `LOGGED_IN` | Active | Green |
| `ON_BREAK` | Break | Amber/Yellow |
| `COACHING` | Coaching | Blue |

### Dashboard Link (Admin Only)
- **Admin/HR/Super Admin**: Shows external link icon (↗) to open `/people/{profile_id}/dashboard`
- **Regular Agents**: No link shown (they can only view their own dashboard)

### Sorting
- Default: Sort by login time (most recent first)
- Toggle: Sort by logout time (if applicable) or alphabetical

### Realtime (Optional Enhancement)
- Auto-refresh the board when status changes occur

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/TeamStatusBoard.tsx` | **Create** | Main page component with two-column layout |
| `src/components/team-status/StatusCard.tsx` | **Create** | Individual agent status card component |
| `src/lib/teamStatusApi.ts` | **Create** | API functions to fetch logged-in agents with their data |
| `src/App.tsx` | **Modify** | Add route for `/team-status` |
| `src/components/Layout.tsx` | **Modify** | Add navigation link under People menu |

---

## Implementation Steps

### Step 1: Create API Layer (`src/lib/teamStatusApi.ts`)

```typescript
export interface TeamMemberStatus {
  profileId: string;
  email: string;
  fullName: string;
  position: string | null;
  currentStatus: ProfileStatus;
  statusSince: string;
  shiftSchedule: string | null;
  breakSchedule: string | null;
}

export async function fetchLoggedInTeamMembers(): Promise<{
  agents: TeamMemberStatus[];
  leadsAndTech: TeamMemberStatus[];
  error: string | null;
}>
```

### Step 2: Create Status Card Component (`src/components/team-status/StatusCard.tsx`)

Card displays:
- Agent name (bold)
- Status badge (Active/Break/Coaching with color)
- Shift Schedule label + value
- Break Schedule label + value
- Optional: Dashboard link icon for admins

### Step 3: Create Page Component (`src/pages/TeamStatusBoard.tsx`)

- Page header: "Team Status Board"
- Two sections side by side:
  - Left: "Agents" (grid of cards)
  - Right: "Team Leads & Tech Support" (grid of cards)
- Sort controls at top

### Step 4: Add Route and Navigation

- Add `/team-status` route in `App.tsx`
- Add "Team Status" link in `Layout.tsx` under People menu, below Dashboard

---

## Technical Details

### Determining Position Category

```typescript
const LEAD_TECH_POSITIONS = ['Team Lead', 'Technical Support'];

function isLeadOrTech(position: string | null): boolean {
  if (!position) return false;
  return LEAD_TECH_POSITIONS.includes(position);
}
```

### Status Badge Mapping

```typescript
const STATUS_DISPLAY: Record<ProfileStatus, { label: string; className: string }> = {
  LOGGED_IN: { label: 'Active', className: 'text-green-600' },
  ON_BREAK: { label: 'Break', className: 'text-amber-600' },
  COACHING: { label: 'Coaching', className: 'text-blue-600' },
  LOGGED_OUT: { label: 'Offline', className: 'text-gray-400' }, // Not shown on board
};
```

### Admin Check for Dashboard Link

```typescript
const { isAdmin, isHR, isSuperAdmin } = useAuth();
const canViewOtherDashboards = isAdmin || isHR || isSuperAdmin;
```

---

## Considerations

1. **RLS Policies**: Users need SELECT access to `profile_status` to see who is logged in. Currently, users can only see their own status. We may need to add a public SELECT policy or use a database function.

2. **Real-time Updates**: Consider adding Supabase realtime subscription to auto-refresh when statuses change.

3. **Performance**: If team is large, consider pagination or virtualization.

4. **Mobile Responsiveness**: Stack the two columns vertically on mobile.

---

## Database Changes Required

A new RLS policy may be needed to allow all authenticated users to read `profile_status`:

```sql
CREATE POLICY "Authenticated users can view all profile_status"
ON profile_status
FOR SELECT TO authenticated
USING (true);
```

This is safe because:
- `profile_status` only contains status info (no sensitive data)
- All team members should be able to see who is online

---

## Summary

| Item | Details |
|------|---------|
| **Route** | `/team-status` |
| **Access** | All authenticated users |
| **Data Sources** | `profile_status`, `agent_profiles`, `agent_directory` |
| **Grouping** | Agents vs Team Leads/Tech Support (by position) |
| **Admin Feature** | Dashboard link on each card |
| **New Files** | 3 (page, component, API) |
| **Modified Files** | 2 (App.tsx, Layout.tsx) |
