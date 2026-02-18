

## Show Detailed Changes in Activity History

### Goal
When a QA evaluation is edited, show exactly what was changed in the Activity History -- with highlighted differences -- so everyone can quickly see what was modified.

### How It Works

**When saving edits** (in `QAEvaluationForm.tsx`):
- Before saving, compute a diff between the old evaluation data (`existingEvalData`) and the new form values
- Track changes to key fields: agent, audit date, ticket ID, ZD instance, interaction type, feedback text (accuracy, compliance, customer experience), coaching date/time, work week, scores, and action plans
- Store the list of changes in the `metadata` JSONB field of the `evaluation_edited` event, like:
  ```json
  {
    "changes": [
      { "field": "Ticket ID", "from": "12345", "to": "67890" },
      { "field": "Accuracy Feedback", "from": "Old text...", "to": "New text..." },
      { "field": "Accuracy Score", "from": "18/21", "to": "21/21" }
    ]
  }
  ```

**When displaying the Activity History** (in `QAEvaluationDetail.tsx`):
- For `evaluation_edited` events that have `metadata.changes`, render an expandable section below the event showing each change
- Each change shows the field name, old value (with a light red/strikethrough style), and new value (with a light green/highlight style)
- If no changes metadata exists (for older events logged before this update), just show "Evaluation was edited" as before

### Visual Design
- Below the "Evaluation was edited" line, show a collapsible list of changes
- Each change row: **Field Name** -- ~~old value~~ (red tint) -> **new value** (green tint)
- Uses existing Tailwind utility classes for red/green backgrounds (`bg-red-50`/`bg-green-50` in light mode, `dark:bg-red-950`/`dark:bg-green-950` in dark mode)
- Long text values (like feedback) will be truncated with "..." to keep the timeline clean

### Technical Steps

**Step 1 -- Compute and store diffs in `QAEvaluationForm.tsx`**
- Before the `updateQAEvaluation` call, build an array of `{ field, from, to }` objects by comparing `existingEvalData` values with current form state
- Fields to diff: Agent, Audit Date, ZD Instance, Ticket ID, Interaction Type, Accuracy Feedback, Compliance Feedback, Customer Experience Feedback, Coaching Date, Coaching Time, Work Week, and per-category total scores
- Pass the changes array as `metadata: { changes }` to `createEvaluationEvent`
- Update the event description to say "Evaluation was edited (X fields changed)" for quick scanning

**Step 2 -- Render change details in `QAEvaluationDetail.tsx`**
- For `evaluation_edited` events, check if `event.metadata?.changes` exists and is non-empty
- Render a collapsible section (using Collapsible from radix) showing each change with highlighted old/new values
- Old values: light red background with strikethrough text
- New values: light green background with bold text
- Feedback text truncated to ~80 characters in the summary view

