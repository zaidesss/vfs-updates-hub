# Plan: Question Builder Implementation

## Status: ✅ COMPLETED

The in-app question builder (Google Forms style) has been fully implemented.

## What Was Done

### New Components Created
- `QuestionCard.tsx` - Reusable card for editing individual questions with type-specific fields
- `QuestionBuilder.tsx` - Full-page builder with batch title, question list, and save options

### Components Modified
- `BatchManagement.tsx` - Replaced "Import New Batch" with "Create New Batch", added Edit button for drafts
- `Revalida.tsx` - Added state for question builder view, handles create/edit flows

### API Updated
- `revalidaApi.ts` - Added `updateBatch()` function for editing draft batches

### Removed
- `ImportDialog.tsx` - Deleted (no longer needed)
- `xlsx` dependency - Removed from package.json

## Features
- Create questions directly in the UI (MCQ, True/False, Situational)
- Edit prompt text, choices, correct answers, and points
- Reorder questions with up/down arrows
- Delete questions
- Live preview of question count and total points
- Save as Draft or Save & Publish options
- Edit existing draft batches
