

# QA Evaluation System Enhancement - Implementation Plan

## Overview

This plan implements 17 confirmed requirements for the QA Evaluation system, organized into logical phases for step-by-step implementation.

---

## Phase 1: Database Schema Updates

### New Columns for `qa_evaluations` Table

| Column | Type | Purpose |
|--------|------|---------|
| `work_week_start` | DATE | Start date of the work week (e.g., Jan 26, 2026) |
| `work_week_end` | DATE | End date of the work week (e.g., Feb 1, 2026) |
| `coaching_date` | DATE | Required date for coaching session |
| `agent_remarks` | TEXT | Agent's written response/reaction to violations |
| `agent_reviewed` | BOOLEAN | Whether agent clicked "Reviewed" button |
| `agent_reviewed_at` | TIMESTAMPTZ | When agent clicked "Reviewed" |

### New Table: `qa_action_plan_occurrences`

Track repeat violations of the same action plan:

```text
+---------------------------+
| qa_action_plan_occurrences|
+---------------------------+
| id: UUID (PK)             |
| agent_email: TEXT         |
| action_plan_id: UUID (FK) |
| evaluation_id: UUID (FK)  |
| occurrence_number: INT    |
| created_at: TIMESTAMPTZ   |
+---------------------------+
```

---

## Phase 2: Scoring Logic Changes

### 2.1 Update SCORING_CATEGORIES

Based on the provided scoring sheet, update `src/lib/qaEvaluationsApi.ts`:

```text
Category: Communication and Professionalism
+---------------------------------------+------------+
| Subcategory                           | Max Points |
+---------------------------------------+------------+
| Critical Error: Sharing Internal Info | Yes/No     |
| Tone and Empathy                      | 5          |
| Clarity & Structure                   | 2          |
| Uses correct spelling and grammar     | 3          |
+---------------------------------------+------------+
| Accuracy Feedback (grouped here)      | Textarea   |
| Accuracy Action Plans (grouped here)  | Selection  |
+---------------------------------------+------------+

Category: Issue Resolution and Deliverables
+---------------------------------------+------------+
| Subcategory                           | Max Points |
+---------------------------------------+------------+
| Critical Error: Incorrect Critical    | Yes/No     |
| Probes to identify root cause         | 5          |
| Offers appropriate solution           | 3          |
| Shows ownership                       | 2          |
| Follows proper ticket handling        | 2          |
| Applies FCR principle                 | 5          |
+---------------------------------------+------------+
| Compliance Feedback (grouped here)    | Textarea   |
| Compliance Action Plans (grouped)     | Selection  |
+---------------------------------------+------------+

Category: Process and Policy Adherence
+---------------------------------------+------------+
| Subcategory                           | Max Points |
+---------------------------------------+------------+
| Critical Error: Policy Breach         | Yes/No     |
| Follows established processes         | 3          |
| Accurately identifies & escalates     | 3          |
+---------------------------------------+------------+
| Customer Exp Feedback (grouped here)  | Textarea   |
| Process Action Plans (grouped here)   | Selection  |
+---------------------------------------+------------+

TOTAL MAX: 33 points
```

### 2.2 Critical Error Behavior

When agent commits a critical error:
- Total Score = 0 (automatic fail)
- Category scores in the **affected category** = 0
- **Other category scores are RETAINED** for visibility
- Rating = "Fail"
- Percentage = 0%

### 2.3 Passing Score Threshold

Update from 80% to **96%**:
- Pass: >= 96% AND no critical errors
- Fail: < 96% OR has critical error

### 2.4 All-or-Nothing Scoring

Each subcategory score is binary:
- Example: "Clarity & Structure" (max 2) → score is either **0** or **2**
- Example: "Tone and Empathy" (max 5) → score is either **0** or **5**

---

## Phase 3: AI Scoring Updates

### Update Edge Function: `analyze-qa-ticket`

Modify the AI prompt to suggest only binary scores:

```text
Current: "Score 2-6"
Updated: "Score 0 (did not meet) or MAX_POINTS (met requirement)"
```

The AI will suggest:
- For max 5: either 0 or 5
- For max 3: either 0 or 3
- For max 2: either 0 or 2

---

## Phase 4: Form UI Reorganization

### 4.1 Category Section Structure

Reorder each category section to show:

```text
+------------------------------------------+
| Category: Communication and Professional |
+------------------------------------------+
| 1. Critical Error: Sharing Internal Info | ← Critical FIRST
| 2. Tone and Empathy (0 or 5)             |
| 3. Clarity & Structure (0 or 2)          |
| 4. Uses correct spelling/grammar (0 or 3)|
+------------------------------------------+
| Accuracy Feedback: [textarea]            | ← Feedback within category
+------------------------------------------+
| Action Needed: [action plan select]      | ← Actions within category
+------------------------------------------+
```

### 4.2 QAScoreRow Component Update

Update to show only valid score options (0 or max):

```text
Current dropdown: 2, 3, 4, 5, 6
New dropdown: 0, [MAX_POINTS]
```

---

## Phase 5: New Form Fields

### 5.1 Work Week Field

Add date range picker for work week selection:

```text
Work Week: [Jan 26, 2026] to [Feb 1, 2026]
```

- Two date pickers: start date and end date
- Displayed as "January 26 - February 1, 2026"

### 5.2 Coaching Date Field (Footer)

Add required date picker before "Send to Agent" button:

```text
+------------------------------------------+
| Coaching Date: [Date Picker] *Required   |
+------------------------------------------+
| [Cancel] [Save Draft] [Send to Agent]    |
+------------------------------------------+
```

- Must be selected before "Send to Agent" is enabled
- Not required for "Save Draft"

### 5.3 Agent Selection - Searchable Combobox

Replace dropdown with searchable combobox:
- User can type to filter agents by name
- Autocomplete suggestions appear as user types

---

## Phase 6: Agent View Enhancements

### 6.1 Reviewed Button & Remarks Section

Add to `QAEvaluationDetail.tsx`:

```text
+------------------------------------------+
| Your Response                            |
+------------------------------------------+
| Remarks (optional):                      |
| [textarea for agent's reaction]          |
|                                          |
| [Reviewed] button                        |
+------------------------------------------+
| Acknowledgement Required                 |
| [checkbox] I acknowledge that I have...  |
| [Acknowledge] button                     |
+------------------------------------------+
```

- "Reviewed" = soft confirmation, allows adding remarks
- "Acknowledge" = final mandatory confirmation

---

## Phase 7: Email Notification Fix

### Bug Identified

The `saveMutation` in `QAEvaluationForm.tsx` does not call `sendQANotification()` after saving with status `'sent'`.

**Evidence:**
- Database shows `notification_sent: false` for evaluation QA-0002
- Edge function logs show no invocations
- Email to `merfmartinez15@gmail.com` never triggered

### Fix

Add notification call in `saveMutation.onSuccess`:

```typescript
onSuccess: async (evaluation, status) => {
  if (status === 'sent') {
    try {
      await sendQANotification(evaluation.id, 'new_evaluation');
    } catch (notifError) {
      console.error('Failed to send notification:', notifError);
    }
  }
  // ... rest of success handler
}
```

---

## Phase 8: Weekly/Monthly Averaging

### 8.1 Weekly Average (5 Tickets per Week)

Display average score for 5 tickets in a work week:
- Group evaluations by `work_week_start` and `work_week_end`
- Calculate: `SUM(percentage) / COUNT(evaluations)`

### 8.2 Monthly Average (4-5 Weeks per Month)

Display monthly average:
- Support months with 4 or 5 weeks
- Show breakdown by work week within the month
- Calculate: `SUM(weekly_averages) / COUNT(weeks)`

### UI Location

Add new summary section in QAEvaluations dashboard:
- "Weekly Summary" card showing current week average
- "Monthly Summary" card showing month-to-date average

---

## Phase 9: Repeat Action Plan Tracking

### Logic

When assigning an action plan:
1. Check `qa_action_plan_occurrences` for existing records with same `agent_email` and `action_plan_id`
2. Count total occurrences
3. Insert new occurrence record with incremented `occurrence_number`
4. Display warning in UI: "This is occurrence #X for this action plan"

### Display

In the form, show badge next to repeated action plans:
```text
[Action Plan Text] (2nd occurrence)
```

---

## Phase 10: Super Admin Delete Capability

### Add Delete Button

In `QAEvaluations.tsx` table row actions:
- Only visible to super admins
- Confirmation dialog before deletion
- Uses existing `deleteQAEvaluation()` function

### UI

```text
Actions: [View] [Delete] ← Delete only for super_admin
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/qaEvaluationsApi.ts` | Update SCORING_CATEGORIES, calculateRating (96%), add new types |
| `src/pages/QAEvaluationForm.tsx` | Work week field, coaching date, searchable agent, reorganized categories, fix notification |
| `src/pages/QAEvaluationDetail.tsx` | Reviewed button, remarks section |
| `src/pages/QAEvaluations.tsx` | Super admin delete, weekly/monthly averages display |
| `src/components/qa/QAScoreRow.tsx` | Binary score options (0 or max) |
| `src/components/qa/QAActionPlanSelect.tsx` | Show occurrence count badge |
| `supabase/functions/analyze-qa-ticket/index.ts` | Binary AI suggestions |
| `supabase/functions/send-qa-notification/index.ts` | No changes needed (already working) |

### New Files to Create

| File | Purpose |
|------|---------|
| `src/components/qa/AgentSearchCombobox.tsx` | Searchable agent selector |
| `src/components/qa/CategorySection.tsx` | Reorganized category with feedback + actions |
| `src/components/qa/WorkWeekPicker.tsx` | Date range picker for work week |

### Database Migration

New columns and table as described in Phase 1.

---

## Implementation Order

We will implement step-by-step:

1. **Email Fix** (#11) - Quick win, unblocks testing
2. **Database Schema** - Foundation for new features
3. **Scoring Categories Update** (#3) - Core logic change
4. **Passing Score 96%** (#10) - Simple config change
5. **Binary AI Scoring** (#4) - Edge function update
6. **Form Reorganization** (#5, #6, #7) - UI restructure
7. **Work Week Field** (#8) - New form field
8. **Weekly/Monthly Averaging** (#1, #9) - Reporting feature
9. **Coaching Date** (#12) - Form footer addition
10. **Agent Reviewed + Remarks** (#13) - Agent view enhancement
11. **Searchable Agent** (#17) - Combobox component
12. **Repeat Action Plan Tracking** (#14) - Occurrence counting
13. **Super Admin Delete** (#15) - Admin capability

---

## Notes

- **Critical Error Scoring**: When critical error detected in one category, that category's scores become 0, but other categories retain actual scores. Total is still 0.
- **Work Week**: Uses actual date range, not "Week 1/2/3/4" labels
- **Action Plan Occurrences**: Only tracks count, no auto-escalation
- **Combined Performance Form (#16)**: Deferred to future phase

