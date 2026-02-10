import { GuideSection, CalloutBox, QuickTable, Checklist } from '../../GuideComponents';
import { GuideImagePlaceholder } from '../../GuideImagePlaceholder';

export function RevalidaSection() {
  return (
    <div className="space-y-6">
      {/* A. Overview */}
      <GuideSection letter="A" color="bg-blue-600" title="Overview">
        <p className="text-sm text-muted-foreground mb-3">
          Revalida is a <strong>weekly knowledge assessment system</strong> designed to test agent competency on support processes, policies, and client-specific content. Two versions coexist:
        </p>
        <QuickTable
          headers={['Version', 'Key Difference']}
          rows={[
            ['Revalida 1.0 (Classic)', 'Manually built tests using an in-app Question Builder. Admin creates each question individually.'],
            ['Revalida 2.0 (AI-Powered)', 'AI-generated questions from the Knowledge Base. Admin configures question counts and the system auto-generates from recent articles, QA actions, and contracts.'],
          ]}
        />
        <Checklist items={[
          'Both versions enforce a single attempt per agent per batch via a unique database constraint.',
          'Assessment windows are strictly 48 hours from the moment of publication.',
          'Scores integrate into the weekly Team Scorecard with a 95% target goal.',
          'Correct answers are hidden from agents while the batch is active to maintain integrity.',
        ]} />
        <GuideImagePlaceholder description="Revalida landing page showing active batch card with countdown timer and Start Test button" />
      </GuideSection>

      {/* B. Question Types */}
      <GuideSection letter="B" color="bg-purple-600" title="Question Types">
        <p className="text-sm text-muted-foreground mb-3">
          Both Revalida versions support three question types:
        </p>
        <QuickTable
          headers={['Type', 'Format', 'Grading']}
          rows={[
            ['Multiple Choice (MCQ)', '4 choices (A/B/C/D) with one correct answer', 'Auto-graded instantly on submission'],
            ['True / False', 'Binary choice (True or False)', 'Auto-graded instantly on submission'],
            ['Situational', 'Open-ended text response requiring judgment and reasoning', 'V1: Manual grading by admin. V2: AI suggests score + justification; admin can accept or override.'],
          ]}
        />
        <CalloutBox variant="info" title="Scoring">
          MCQ and True/False questions award full points (typically 1–2 pts) or zero. Situational questions have higher point values (typically 5 pts) and support partial credit through manual or AI grading.
        </CalloutBox>
      </GuideSection>

      {/* C. Batch Lifecycle */}
      <GuideSection letter="C" color="bg-teal-600" title="Batch Lifecycle">
        <p className="text-sm text-muted-foreground mb-3">
          Every Revalida test follows a defined lifecycle:
        </p>
        <QuickTable
          headers={['Status', 'Description', 'Agent Visibility']}
          rows={[
            ['Draft', 'Batch created but not published. Questions can be edited freely.', 'Not visible'],
            ['Active', 'Published and available for agents. 48-hour countdown starts.', 'Visible — can start/resume test'],
            ['Expired', 'The 48-hour window has passed. No new attempts accepted.', 'Visible — can view results only'],
            ['Deactivated', 'Manually deactivated by admin before expiry.', 'Visible — can view results only'],
          ]}
        />
        <CalloutBox variant="warning" title="One Active Batch">
          Only one batch can be active at a time. Publishing a new batch automatically deactivates the currently active one.
        </CalloutBox>
        <GuideImagePlaceholder description="Batch management table showing Draft, Active, Expired, and Deactivated batches with action buttons" />
      </GuideSection>

      {/* D. Revalida 1.0 - Question Builder */}
      <GuideSection letter="D" color="bg-amber-600" title="Revalida 1.0 — Question Builder">
        <p className="text-sm text-muted-foreground mb-3">
          In the classic version, admins manually create tests using the built-in <strong>Question Builder</strong>:
        </p>
        <Checklist items={[
          'Add questions one by one — set the type (MCQ, True/False, Situational), prompt text, choices, correct answer, and point value.',
          'Reorder questions via drag or order_index field.',
          'Save as Draft to continue editing later, or Save & Publish to go live immediately.',
          'Post-publish editing is supported for typo corrections on active batches.',
          'Delete is restricted to non-active batches (Draft, Expired, or Deactivated).',
        ]} />

        <h4 className="font-semibold text-sm mt-4 mb-2">Admin Tabs</h4>
        <QuickTable
          headers={['Tab', 'Purpose']}
          rows={[
            ['Active Test', 'Shows the currently active batch with question details and a live countdown timer.'],
            ['All Batches', 'Full batch management — create, edit, publish, deactivate, delete, and view questions.'],
            ['Submissions', 'Table of all agent attempts with status, score, and actions (view details, grade situational).'],
            ['Review Queue', 'Filtered list of attempts with "needs_manual_review" status for situational grading.'],
          ]}
        />
        <GuideImagePlaceholder description="Question Builder interface showing question type selector, prompt field, choices, and Save Draft / Publish buttons" />
      </GuideSection>

      {/* E. Revalida 2.0 - AI-Powered */}
      <GuideSection letter="E" color="bg-indigo-600" title="Revalida 2.0 — AI-Powered Generation">
        <p className="text-sm text-muted-foreground mb-3">
          Revalida 2.0 automates question creation using AI models that draw from the portal's Knowledge Base:
        </p>

        <h4 className="font-semibold text-sm mb-2">Admin Tabs</h4>
        <QuickTable
          headers={['Tab', 'Purpose']}
          rows={[
            ['Manage Batches', 'View all V2 batches, publish, deactivate, delete, and navigate to batch detail.'],
            ['Knowledge Base', 'Manage source material — upload/edit/delete contracts that feed AI question generation.'],
            ['Create New', 'Configure a new batch: set title, MCQ/TF/Situational counts, then trigger AI generation.'],
          ]}
        />

        <h4 className="font-semibold text-sm mt-4 mb-2">AI Generation Flow</h4>
        <Checklist items={[
          'Admin sets question counts (e.g., 5 MCQ, 3 T/F, 2 Situational) in the batch config form.',
          'System fetches source material from: recent KB articles (excluding internal_operations and Revalida schedule announcements), QA action plans, and uploaded contracts.',
          'AI generates questions with correct answers, source references, and evaluation rubrics.',
          'Generation status progresses: Pending → Generating → Completed (or Failed).',
          'Admin reviews generated questions in the "Questions" tab before publishing.',
        ]} />

        <h4 className="font-semibold text-sm mt-4 mb-2">Batch Detail View (Admin)</h4>
        <QuickTable
          headers={['Tab', 'Content']}
          rows={[
            ['Generation Status', 'Progress indicator showing current generation state and any error messages.'],
            ['Questions', 'Preview all generated questions with source references. Publish button available when status is "completed".'],
            ['Grading', 'Summary cards (Pending, AI Graded, Overridden) and situational answer review interface.'],
          ]}
        />
        <GuideImagePlaceholder description="Revalida 2.0 batch config form showing MCQ/TF/Situational count inputs and Generate button" />
      </GuideSection>

      {/* F. AI Grading (V2) */}
      <GuideSection letter="F" color="bg-red-600" title="AI Grading & Rubrics (V2 Only)">
        <p className="text-sm text-muted-foreground mb-3">
          In Revalida 2.0, situational questions are graded by AI with admin oversight:
        </p>
        <QuickTable
          headers={['Step', 'Description']}
          rows={[
            ['1. AI Scoring', 'After submission, the system calls an AI edge function that evaluates the agent\'s response against the evaluation rubric and suggests a score + justification.'],
            ['2. Admin Review', 'Admins see the AI-suggested score, justification, and the rubric. They can accept the AI score or override with their own.'],
            ['3. Override', 'If overridden, the admin enters a new score and reason. The answer status changes to "override".'],
            ['4. Finalization', 'Once all situational answers are reviewed, the attempt score is recalculated and finalized.'],
          ]}
        />
        <CalloutBox variant="tip" title="Rubric Visibility">
          Evaluation rubrics for situational questions are <strong>hidden from agents</strong> to maintain assessment integrity. They are only visible to admins during the grading process.
        </CalloutBox>
      </GuideSection>

      {/* G. Agent Experience */}
      <GuideSection letter="G" color="bg-emerald-600" title="Agent Test Experience">
        <p className="text-sm text-muted-foreground mb-3">
          The agent test-taking flow is identical across both versions:
        </p>
        <Checklist items={[
          'Agent sees active batch card with title, total points, and time remaining countdown.',
          'Click "Start Test" to begin — questions are presented in a randomized (shuffled) order.',
          'In-progress tests can be resumed without loss of progress (answers are held in local state until submission).',
          'On submission: MCQ and True/False are auto-graded immediately. Situational answers are marked "pending review" (V1) or sent to AI grading (V2).',
          'After submission, agent sees their percentage score. Correct answers remain hidden until the batch expires or is deactivated.',
          'Once the batch window closes, agents can view detailed results: their answers, correct answers (for MCQ/TF), points earned, and AI grading justifications (V2).',
        ]} />

        <CalloutBox variant="warning" title="Single Attempt">
          Each agent gets <strong>exactly one attempt</strong> per batch. A database unique constraint on (batch_id, agent_email) enforces this. Attempting to start a second test returns an error: "You have already taken this test."
        </CalloutBox>
        <GuideImagePlaceholder description="Agent test interface showing a shuffled question with MCQ choices, progress indicator, and Submit button" />
      </GuideSection>

      {/* H. Grading Workflow (V1) */}
      <GuideSection letter="H" color="bg-orange-600" title="Manual Grading Workflow (V1)">
        <p className="text-sm text-muted-foreground mb-3">
          In Revalida 1.0, situational questions require manual grading by admins:
        </p>
        <QuickTable
          headers={['Step', 'Description']}
          rows={[
            ['1. Submission', 'Agent submits test. MCQ/TF auto-graded. Status: "needs_manual_review" if situational questions exist.'],
            ['2. Review Queue', 'Admin opens the Review Queue tab to see all ungraded attempts.'],
            ['3. Grading Dialog', 'Click an attempt to open the grading interface. Each situational answer shows the prompt, agent response, and a points/feedback form.'],
            ['4. Finalize', 'After grading all situational answers, click "Finalize Grading" to calculate the final percentage and mark the attempt as "graded".'],
          ]}
        />
        <CalloutBox variant="info">
          If a batch has no situational questions, all attempts are auto-graded on submission and immediately move to "graded" status with a final percentage.
        </CalloutBox>
      </GuideSection>

      {/* I. Scorecard Integration */}
      <GuideSection letter="I" color="bg-gray-600" title="Scorecard Integration">
        <p className="text-sm text-muted-foreground mb-3">
          Revalida scores feed directly into the weekly <strong>Team Scorecard</strong>:
        </p>
        <QuickTable
          headers={['Parameter', 'Value']}
          rows={[
            ['Metric Weight', '5% of final weighted score (for Email and Logistics positions)'],
            ['Target Goal', '95%'],
            ['Batch Matching', 'Batches are matched to the scorecard week based on their start_at timestamp falling within the Monday–Sunday window.'],
            ['Score Used', 'The latest graded attempt\'s final_percent for each agent during that period.'],
          ]}
        />
        <CalloutBox variant="tip">
          If an agent has no graded attempt for a given week, the Revalida metric is omitted from their scorecard calculation rather than scored as zero.
        </CalloutBox>
      </GuideSection>

      {/* J. Data Retention */}
      <GuideSection letter="J" color="bg-pink-600" title="Data Retention">
        <p className="text-sm text-muted-foreground mb-3">
          Revalida data follows a <strong>14-day retention policy</strong>:
        </p>
        <Checklist items={[
          'A scheduled retention job runs periodically to clean up old test data.',
          'Before deletion, attempt and answer records are exported as JSON to private storage for archival.',
          'Batch metadata (title, dates, scores) is preserved in the scorecard via the saved_scorecards table.',
          'This policy prevents database bloat while maintaining historical performance records.',
        ]} />
      </GuideSection>

      {/* K. Knowledge Base (V2) */}
      <GuideSection letter="K" color="bg-cyan-600" title="Knowledge Base / Contracts (V2)">
        <p className="text-sm text-muted-foreground mb-3">
          Revalida 2.0 uses a dedicated <strong>Knowledge Base</strong> tab for managing source material:
        </p>
        <QuickTable
          headers={['Field', 'Description']}
          rows={[
            ['Name', 'Descriptive title for the contract or reference document.'],
            ['Parsed Content', 'The text content that AI uses to generate questions.'],
            ['Support Type', 'Optional filter — associates the contract with a specific support position.'],
            ['Is Active', 'Toggle to include/exclude from AI generation without deleting.'],
          ]}
        />
        <p className="text-sm text-muted-foreground mt-3">
          In addition to contracts, the AI generation pulls from <strong>recent KB articles</strong> (excluding internal operations category and Revalida schedule announcements) and <strong>QA action plans</strong> to ensure questions are relevant to current operations.
        </p>
      </GuideSection>

      {/* L. Access Control */}
      <GuideSection letter="L" color="bg-gray-600" title="Access Control">
        <QuickTable
          headers={['Role', 'V1 Access', 'V2 Access']}
          rows={[
            ['User / Agent', 'Take active test, view own results after expiry', 'Take active test, view own results after expiry'],
            ['Admin', 'Full management: create, edit, publish, deactivate, delete, grade, view all submissions', 'Full management: configure, generate, publish, grade, manage Knowledge Base'],
            ['HR', 'Same as Admin', 'Same as Admin'],
            ['Super Admin', 'Same as Admin', 'Same as Admin'],
          ]}
        />
      </GuideSection>

      {/* M. Notifications */}
      <GuideSection letter="M" color="bg-violet-600" title="Notifications">
        <p className="text-sm text-muted-foreground mb-3">
          When a batch is published, the system sends email notifications:
        </p>
        <Checklist items={[
          'All portal users receive an email with the batch title and a direct link to the test page.',
          'The notification distinguishes between V1 and V2 with appropriate routing URLs.',
          'If the email notification fails, the batch is still published — a warning toast informs the admin.',
        ]} />
      </GuideSection>
    </div>
  );
}
