

## Weekly Team Coverage Board

### Overview
A new page at `/people/coverage-board` under the People navigation group that visually displays weekly team coverage as a horizontal timeline grid. Rows are agents grouped by ZD instance and support type, columns represent hours 1:00-24:00, and shift blocks are draggable/resizable colored bars. Admins/TLs can create per-date overrides without modifying the source-of-truth agent profile schedules.

**Phase 1 (this build):** Visual board + database table + drag/resize + override CRUD
**Phase 2 (future):** Integration with automations (login compliance, agent reports, ticket quota, Slack, BCP)

---

### Step 1: Database Table

Create `coverage_overrides` table:

```text
coverage_overrides
  id               uuid (PK, default gen_random_uuid())
  agent_id         uuid (FK -> agent_profiles.id, NOT NULL)
  date             date (NOT NULL)
  override_start   text (e.g. "9:00 AM", NOT NULL)
  override_end     text (e.g. "5:30 PM", NOT NULL)
  reason           text (default 'manual') -- 'manual' | 'outage'
  created_by       text (email of admin who made change)
  created_at       timestamptz (default now())
  UNIQUE(agent_id, date)  -- one override per agent per day
```

RLS: Authenticated users can SELECT. Only admin/HR/super_admin can INSERT/UPDATE/DELETE (using existing `has_role` function with email-based check).

---

### Step 2: New Page + Route

**File:** `src/pages/CoverageBoard.tsx`
**Route:** `/people/coverage-board`
**Nav:** Added to the People group in Layout.tsx (after Team Status, visible to all but editing restricted to admin/TL)

---

### Step 3: Core Components

All new files under `src/components/coverage-board/`:

**A. `CoverageBoardPage.tsx`** - Main container
- Week selector (reuses `DashboardWeekSelector` pattern with shared ANCHOR_DATE)
- Day tabs (Mon-Sun) to switch the visible day
- Toggle: "Scheduled" vs "Effective" (with overrides)
- Filter by Support Type and ZD Group
- Renders the timeline grid

**B. `CoverageTimeline.tsx`** - The 24-hour grid
- Fixed left column: agent names grouped by section headers
- Horizontal axis: hours 1:00 to 24:00 (24 columns)
- Each agent row contains a `ShiftBlock` component
- Current time indicator (vertical red line)
- Uses CSS Grid for layout (no virtualization needed for ~30 agents; can add later if needed)

**C. `ShiftBlock.tsx`** - Individual draggable/resizable shift bar
- Renders as a colored horizontal bar positioned by start/end time
- Shows: agent name, start time, end time, support type on hover tooltip
- Regular shift = blue, OT = violet, Day Off = gray dashed, Outage = red striped
- Drag handles on left/right edges for resizing
- Entire block draggable for repositioning
- On drag/resize end: creates or updates a `coverage_override` record
- Read-only for non-admin users (no drag handles shown)

**D. `GroupHeader.tsx`** - Section divider rows
- Groups: "ZD1 - Email Support", "ZD1 - Hybrid Support", "ZD1 - Phone Support", "ZD2 - Chat Support", "ZD2 - Hybrid Support", "Logistics", "Team Lead", "Technical Support"
- Each group title displayed as a sticky header row

**E. `CoverageFilters.tsx`** - Filter bar
- Support Type multi-select
- ZD Group filter
- View toggle (Scheduled / Effective)

---

### Step 4: Data Flow

**Fetching:** Single query joining `agent_profiles` (schedules, position, zendesk_instance, day_off) with `coverage_overrides` for the selected date.

**Effective schedule logic (client-side for Phase 1):**
```text
For each agent on selected date:
  1. Check coverage_overrides for (agent_id, date)
  2. If override exists -> use override_start / override_end
  3. Else -> use agent_profile day schedule (e.g. mon_schedule)
```

**Override creation:** When a block is dragged/resized:
- Upsert into `coverage_overrides` (agent_id, date, new start, new end, reason='manual', created_by=current user email)
- Optimistic UI update

**Support type validation:** When comparing agents for coverage compatibility, check `position` field. If mismatch on a swap operation, show toast error: "Coverage not allowed -- Support Type mismatch."

---

### Step 5: Outage Integration (Visual Only in Phase 1)

- Query approved `leave_requests` for the selected date
- If an agent has an approved full-day outage: render their shift block as red/striped "OUTAGE"
- If partial-day outage: overlay a red section on the affected hours
- No automatic override creation yet (Phase 2)

---

### Step 6: Drag Implementation

Using native pointer events (mousedown/mousemove/mouseup + touch equivalents):
- No external library needed for this use case
- Track drag state in React state/refs
- Convert pixel offset to time using grid column width
- Snap to 15-minute increments for precision
- Show ghost preview during drag
- Commit on pointer up

---

### Step 7: Permissions

- **View:** All authenticated users
- **Edit (drag/resize):** Admin, HR, Super Admin, Team Lead (checked via `useAuth()`)
- **Agents:** See the board as read-only (no drag handles, no resize cursors)

---

### Step 8: UI Details

- **Hover tooltip:** Agent name, exact start/end time, support type, "Overridden" badge if applicable, outage reason if on leave
- **Day Off agents:** Shown with an empty/gray dashed row; can be dragged to create an override (assigning coverage on an off day)
- **OT blocks:** Separate violet block adjacent to regular shift block
- **Current time line:** Vertical red dashed line at current EST time (updates every minute)

---

### Files to Create/Modify

| Action | File |
|--------|------|
| Create | `src/pages/CoverageBoard.tsx` |
| Create | `src/components/coverage-board/CoverageTimeline.tsx` |
| Create | `src/components/coverage-board/ShiftBlock.tsx` |
| Create | `src/components/coverage-board/GroupHeader.tsx` |
| Create | `src/components/coverage-board/CoverageFilters.tsx` |
| Create | `src/lib/coverageBoardApi.ts` |
| Modify | `src/App.tsx` (add route) |
| Modify | `src/components/Layout.tsx` (add nav item) |
| Migration | Create `coverage_overrides` table + RLS policies |

---

### Implementation Order (Step by Step)

1. Database migration (coverage_overrides table + RLS)
2. API layer (`coverageBoardApi.ts`) -- fetch agents + overrides, upsert override
3. Page shell + route + nav link
4. Timeline grid with static shift blocks (no drag yet)
5. Grouping logic (ZD instance x position)
6. Day selector + week selector
7. Drag and resize functionality
8. Override CRUD (save on drag end)
9. Filters + view toggle (Scheduled vs Effective)
10. Outage overlay (visual only)
11. Tooltip + polish

We will build this one step at a time, starting with the database table.
