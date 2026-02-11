

## Updated Admin Guide - New Help Center Tab

### What We're Building
A new **"Updated Admin Guide"** tab in the Help Center (visible only to Admin/HR/Super Admin), mirroring the structure of the Updated User Guide but with admin-specific instructions for each section.

### New Files to Create

1. **`src/components/user-guide/UpdatedAdminGuideContent.tsx`** - Main wrapper with all 12 accordion sections
2. **12 admin section files** in `src/components/user-guide/sections/updated-admin/`:
   - `RolesAdminSection.tsx` - Admin perspective on role assignments, how to change roles
   - `MyBioAdminSection.tsx` - Profile editing instructions (your main callouts below)
   - `DashboardAdminSection.tsx` - Monitoring agent dashboards, interpreting violations
   - `TeamStatusAdminSection.tsx` - Admin view of the board, overnight visibility
   - `TicketLogsAdminSection.tsx` - Admin analytics, gap analysis interpretation
   - `TeamScorecardAdminSection.tsx` - Save/freeze workflow, metric overrides, refresh
   - `AgentReportsAdminSection.tsx` - EOD/EOW analytics, escalation workflow
   - `RevalidaAdminSection.tsx` - Batch management, V2 AI generation, grading
   - `OutageRequestsAdminSection.tsx` - Review workflow, override, automated triggers
   - `OutageStatsAdminSection.tsx` - Analytics interpretation, repeat offender thresholds
   - `UpdatesAdminSection.tsx` - Create/edit updates, compliance dashboard
   - `KnowledgeBaseAdminSection.tsx` - Article management, playbook creation

3. **Modify `src/pages/HelpCenter.tsx`** - Add the new tab (conditionally visible for admins)

### Key Admin Content Highlights

**My Bio (Admin) section will specifically cover:**
- **Upwork Contract ID**: Where to find it (Upwork contract URL, the numeric ID at the end), why it's needed (enables Upwork hour tracking on dashboard)
- **Zendesk User ID**: How to find it (Zendesk Admin > Users > click agent > ID in URL bar), why it's needed (enables AHT/FRT metrics on Scorecard)
- **Quota guidance**: Email quota should always have a value for all Support Types since it's used for Work Tracker categorization on Dashboard. Other quotas (Chat, Phone) only needed if the agent actually handles those channels
- **Break schedule**: Emphasize that breaks must cover the full shift duration — they are auto-deducted from Total Hours for every working day (including weekends if not Day Off)
- **OT toggle**: When enabled, OT schedule fields appear; OT productivity is auto-calculated separately using `quota_ot_email`; OT tickets are flagged automatically by the webhook
- **Schedule auto-fill**: Mon fills Tue-Fri, Sat fills Sun
- **OT schedule validation**: OT start must be at or after regular shift end time

**Other sections will include admin-specific workflows like:**
- Dashboard: How to read violation alerts, what triggers compliance incidents
- Scorecard: Save/freeze workflow, manual metric overrides, refresh cache
- Agent Reports: Escalation to outage requests, validation vs dismissal
- Revalida: Batch creation, AI generation, grading queue
- etc.

### Implementation Approach
Since this is a large content effort, we'll build it **one section at a time**:
1. Start with the tab wrapper + My Bio Admin section (your priority content)
2. Then add each remaining section one by one

### Technical Details

**HelpCenter.tsx changes:**
- Import `UpdatedAdminGuideContent`
- Add a new `TabsTrigger` with value `"updated-admin"` (icon: `ShieldCheck`), conditionally rendered for `showAdminGuide`
- Add corresponding `TabsContent`

**Section pattern:** Each admin section follows the same `GuideSection` / `CalloutBox` / `QuickTable` pattern used in the existing Updated User Guide sections.

