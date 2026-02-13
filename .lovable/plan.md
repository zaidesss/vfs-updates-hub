

## Move Schedule Warning Banner and Add Save Confirmation Dialog

### What we're doing

Two changes to the Agent Profile editing experience:

1. **Relocate the schedule warning banner** from the very top of Work Configuration to between the Productivity (Quota) section and the Day Off section -- making it more contextually relevant and harder to miss.

2. **Add a confirmation popup** that appears when saving a profile with schedule changes, explicitly showing the effective date and requiring acknowledgment before proceeding.

---

### Technical Details

#### 1. Move the Warning Banner (WorkConfigurationSection.tsx)

- **Remove** the `<Alert>` block currently at lines 238-245 (top of the component's return)
- **Re-insert** the same banner between the Productivity section (ends at line 475) and the Day Off section (starts at line 477)
- Only show the banner when the user has edit permissions (`canEdit`)

#### 2. Add Schedule Change Confirmation Dialog

**File: `src/components/profile/ScheduleChangeConfirmDialog.tsx`** (new file)
- An `AlertDialog` component that:
  - Shows the effective week start date (next Monday)
  - Warns: "Schedule changes will take effect starting [date]. Current week schedules are not affected."
  - Has "Cancel" and "Confirm & Save" buttons
  - Props: `open`, `onOpenChange`, `onConfirm`, `effectiveDate`

**File: `src/pages/ManageProfiles.tsx`**
- In `handleSave`: Before calling `upsertProfile`, detect if any schedule fields changed
- If schedule fields changed, show the confirmation dialog instead of saving immediately
- On confirm, proceed with the existing save logic
- If no schedule fields changed, save directly without the popup

**File: `src/pages/AgentProfile.tsx`**
- Same logic as ManageProfiles: intercept save when schedule fields are modified, show confirmation dialog, then proceed on confirm

#### Schedule fields to detect:
`mon_schedule` through `sun_schedule`, `mon_ot_schedule` through `sun_ot_schedule`, `break_schedule`, `day_off`, `ot_enabled`, `quota_email`, `quota_chat`, `quota_phone`

