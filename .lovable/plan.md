

## Step 4: Team Status Board Section

Add a new `TeamStatusSection.tsx` component inside `src/components/user-guide/sections/updated/` and register it in `UpdatedUserGuideContent.tsx`.

### Content to cover

**1. Overview**
- Real-time board showing all agents currently within their scheduled shift window (not just logged-in agents).
- Visibility is based on EST time falling within the agent's shift or OT schedule for the current day.
- Agents on their "Day Off" are excluded entirely.

**2. Who Can See It**
- All authenticated users can view the board.
- Admin/HR/Super Admin see a dashboard link icon on each card to jump to the agent's individual dashboard.
- Regular users see cards without the dashboard link.

**3. Category Groupings (with icons)**
| Category | Icon | Color | Mapped Positions |
|---|---|---|---|
| Phone Support | Phone | Purple | "Phone Support" |
| Chat Support | MessageSquare | Cyan | "Chat Support" |
| Email Support | Mail | Orange | "Email Support" |
| Hybrid Support | Shuffle | Pink | "Hybrid Support" |
| Logistics | Package | Amber | Any position not in the above or below |
| Team Leads | Shield | Indigo | "Team Lead" |
| Technical Support | Shield | Teal | "Technical Support" |

**4. Layout**
- Desktop: Two-column layout -- support agents on left (wider), Team Leads and Tech Support on right (narrower) with Live Activity Feed below them.
- Mobile: Single column, all stacked.

**5. Status Card Details**
Each card displays:
- Agent full name
- Status badge (color-coded): Active (green), Break (amber), Coaching (blue), Offline (gray), On OT (emerald), Restarting (yellow), Bio Break (purple)
- If agent has an approved outage/leave, the status badge shows the outage reason (e.g., "Medical Leave") in sky-blue, plus an "On Leave" outline badge
- Position badge (color matches category)
- Shift Schedule (with OT schedule appended if present)
- Break Schedule
- Dashboard link icon (Admin/HR/Super Admin only)

**6. Sorting Options**
- "By Login" (default): sorts by most recent status change timestamp
- "By Name": alphabetical by full name

**7. Schedule Logic (step-by-step)**
1. System reads current EST day of week
2. Checks each agent's day_off array -- if today is listed, agent is skipped
3. Checks agent's schedule for today (e.g., mon_schedule) -- if null, "Day Off", or "Off", agent is skipped
4. Checks if current EST time falls within the agent's regular shift range OR OT schedule range
5. Only agents passing all checks appear on the board

**8. Outage/Leave Handling**
- If an agent has an approved leave request covering today and the current time, the card shows the outage reason instead of their login status
- The agent still appears on the board (they are scheduled) but is marked with the leave badge

**9. Live Activity Feed**
- Located in the right column under Team Leads/Tech Support
- Shows the most recent 15 status changes from today only
- Fixed 400px scrollable container

**10. Header Stats**
- "X scheduled now (Y online)" -- X = total agents within schedule window, Y = agents not LOGGED_OUT and not on approved outage

**11. Image Placeholders**
- Full board view with multiple categories populated
- Single status card close-up showing all badge types
- Sort toggle buttons
- Outage/leave card example
- Live Activity Feed section

### Technical Details

**New file:** `src/components/user-guide/sections/updated/TeamStatusSection.tsx`

**Modified file:** `src/components/user-guide/UpdatedUserGuideContent.tsx` -- add the new accordion entry with `Users` icon and title "Team Status Board"

Uses existing `GuideImagePlaceholder`, `QuickTable`, `StepItem`, `InfoBlock` components from `GuideComponents.tsx`.

