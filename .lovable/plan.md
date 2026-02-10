

# Add Save Scorecard Confirmation Dialog

## What Changes
Add a confirmation warning dialog when an admin clicks "Save Scorecard". The dialog will warn that saving is permanent and values must be verified before proceeding.

## Warning Message
- **Title**: "Save Scorecard?"
- **Body**: "Please make sure that all values are 100% accurate and updated before saving. Any changes made after saving will not be reflected in the saved scorecard."
- **Actions**: "Cancel" and "Yes, Save Scorecard"

## Technical Details

### File: `src/pages/TeamScorecard.tsx`
- Import `AlertDialog` components from `@/components/ui/alert-dialog`
- Add a `showSaveConfirm` boolean state
- Change the existing "Save Scorecard" button's `onClick` to open the confirmation dialog (`setShowSaveConfirm(true)`) instead of directly calling the save function
- Add the `AlertDialog` component with the warning message
- On confirm ("Yes, Save Scorecard"), call the existing save handler and close the dialog

This is a single-file change with no database or API modifications needed.

