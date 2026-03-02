

## Plan: Color-Code Revalida Scores in Submission Table

### What changes
In `src/components/revalida/SubmissionTable.tsx`, the Score column currently shows plain text. We'll color it based on the scorecard passing threshold of **95%**:

- **Green** (≥95%): Passing
- **Red** (<95%): Failing
- Keep "Pending" in yellow and "—" as muted

### Implementation (1 step)

#### Update `SubmissionTable.tsx` Score cell
In the `final_percent` display (around line 88-95), add conditional color classes:
- `text-green-600` if `final_percent >= 95`
- `text-red-600` if `final_percent < 95`

This is a simple className change on the existing `<span>` element — no new components or API calls needed.

