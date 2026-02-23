

## Add "Operations" Menu with Reports and AI Sub-menus

### What Changes

A new top-level dropdown menu called **Operations** will be added to the navbar, positioned between **Team Performance** and **Admin**. It will contain two sub-groups mirroring the Eazey Portal:

**Reports sub-items:**
- Volume and Demand
- Responsiveness
- Workload
- Contact Reasons
- 4-Week Comparison
- Capacity Planning

**AI sub-items:**
- AI Recommendations

All 7 items will link to placeholder pages for now (simple "Coming Soon" style pages).

### Possible Considerations

Before we proceed, here are things to think about:
- **Access control**: Should Operations be visible to all users, or only admins/team leads? The current plan makes it visible to all (like Team Performance). We can restrict later.
- **Route prefix**: All new routes will use `/operations/reports/...` and `/operations/ai/...` to keep them organized and separate from existing `/team-performance/` routes.
- **The dropdown will show Reports and AI as labeled sections** within a single "Operations" dropdown (using separators/labels), matching the visual style of the screenshot where they appear as two distinct groups.

### Implementation Steps

**Step 1**: Create 7 placeholder page components in `src/pages/operations/`

**Step 2**: Add routes in `src/App.tsx` for all 7 pages

**Step 3**: Add the "Operations" nav group in `src/components/Layout.tsx` between Team Performance and Admin, with two visual sections (Reports and AI) using dropdown menu labels/separators

### Technical Details

**New files (7 placeholder pages):**
- `src/pages/operations/VolumeDemand.tsx`
- `src/pages/operations/Responsiveness.tsx`
- `src/pages/operations/Workload.tsx`
- `src/pages/operations/ContactReasons.tsx`
- `src/pages/operations/FourWeekComparison.tsx`
- `src/pages/operations/CapacityPlanning.tsx`
- `src/pages/operations/AIRecommendations.tsx`

Each placeholder page follows the existing pattern with `Layout` wrapper, title, and a "Coming Soon" message.

**`src/App.tsx`** -- Add 7 new protected routes:
```
/operations/reports/volume
/operations/reports/responsiveness
/operations/reports/workload
/operations/reports/contact-reasons
/operations/reports/comparison
/operations/reports/capacity
/operations/ai/recommendations
```

**`src/components/Layout.tsx`** -- Add Operations group between Team Performance and Admin:
- Uses `BarChart3` icon for the group (matching the screenshot's chart icon for Reports)
- Uses `DropdownMenuLabel` and `DropdownMenuSeparator` to visually separate "Reports" and "AI" sections within one dropdown
- Import `Sparkles` icon from lucide-react for the AI section label

