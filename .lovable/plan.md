

# Updated User Guide — New Help Center Tab (Step-by-Step Build)

## Overview

Create a new "Updated User Guide" tab in the Help Center with extremely detailed, step-by-step documentation for each portal feature. Each section will include image placeholders where you can upload screenshots later. We will build this **one section at a time** so you can review each before moving on.

## Storage Setup (for guide images)

Create a new public storage bucket called `guide-images` so you can upload screenshots for the guide. Images will be referenced by URL in the guide components.

## New Tab Setup

Add a new tab titled **"Updated User Guide"** to the Help Center page (between "User Guide" and "Admin Guide"), with its own icon and content component.

## Build Order (one at a time)

We will build each section in this order, pausing after each for your review:

1. **Step 1: Tab structure + Roles section** (detailed role definitions, feature access matrix with checkmarks, restrictions, limitations, escalation rules)
2. **Step 2: My Bio (Profile)** section (locked fields for users, which values feed automations like quotas/schedules/views, admin-only fields, change request flow)
3. **Step 3: Dashboard** section (all status buttons: Login/Logout, Break, Coaching, Device Restart, Bio Break, OT; profile events timeline; weekly summary violations like Late Login, Early Out, No Logout, Break Overuse)
4. **Step 4: Team Status Board** section (real-time status categories, support type groupings, what each card shows)
5. **Step 5: Ticket Logs** section (ZD1 vs ZD2 instances, daily ticket counts, gap analysis, quota comparison)
6. **Step 6: Agent Reports** section (automated incident types, severity levels, status flow, escalation process)
7. **Step 7: Scorecard** section (weekly metrics, components, how scores are calculated, week selector behavior)
8. **Step 8: Revalida** section (batches, question types, time limits, grading flow, attempt results)

## Technical Details

### Database Migration
- Create a `guide-images` storage bucket (public) with RLS policies allowing authenticated users to read and admins to upload.

### New Files
- `src/components/user-guide/UpdatedUserGuideContent.tsx` — Main wrapper with accordion sections
- `src/components/user-guide/sections/updated/*.tsx` — Individual section files (one per step)
- `src/components/user-guide/GuideImagePlaceholder.tsx` — Reusable placeholder component showing where a screenshot should go, with a description of the expected image

### Modified Files
- `src/pages/HelpCenter.tsx` — Add the new "Updated User Guide" tab

### GuideImagePlaceholder Component
A styled placeholder box that shows:
- A camera/image icon
- A description of what screenshot goes there (e.g., "Screenshot: Login page with email and password fields")
- Later, when you upload images to the `guide-images` bucket, these can be swapped to actual `<img>` tags

### Section Content Style
Each section will follow this pattern:
- Section title with icon
- Brief description of what the feature does
- Step-by-step numbered instructions (extremely specific)
- Tables for reference data (role access, field descriptions)
- Callout boxes for warnings, tips, and important notes
- Image placeholders at key steps

