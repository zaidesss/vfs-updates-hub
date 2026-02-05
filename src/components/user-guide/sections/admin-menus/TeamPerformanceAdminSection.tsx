import { CalloutBox, QuickTable, Checklist } from '../../GuideComponents';
import { ClipboardList, FileWarning, GraduationCap, Zap, ArrowRight } from 'lucide-react';

export function TeamPerformanceAdminSection() {
  return (
    <div className="space-y-8">
      {/* QA Evaluation Management */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">QA Evaluation Management</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Create, manage, and track quality assurance evaluations for agents.
        </p>

        <h4 className="font-medium mb-2">Creating an Evaluation</h4>
        <Checklist items={[
          'Navigate to Team Performance → QA Evaluations',
          'Click "New Evaluation" button',
          'Select the agent and ticket/interaction',
          'Score each evaluation criteria',
          'Add coaching notes and feedback',
          'Submit the evaluation',
        ]} />

        <h4 className="font-medium mb-2 mt-4">Evaluation Workflow</h4>
        <div className="p-4 bg-muted/50 rounded-lg my-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="px-2 py-1 bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded font-medium">Created</span>
            <ArrowRight className="h-4 w-4" />
            <span className="px-2 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded font-medium">Pending Acknowledgement</span>
            <ArrowRight className="h-4 w-4" />
            <span className="px-2 py-1 bg-green-500/20 text-green-700 dark:text-green-400 rounded font-medium">Acknowledged</span>
          </div>
        </div>

        <h4 className="font-medium mb-2 mt-4">Evaluation Components</h4>
        <QuickTable
          headers={['Component', 'Description']}
          rows={[
            ['Ticket Reference', 'Link to the ticket being evaluated'],
            ['Criteria Scores', 'Individual scores for accuracy, communication, etc.'],
            ['Overall Score', 'Calculated from weighted criteria'],
            ['Coaching Notes', 'Feedback for agent improvement'],
            ['Attachments', 'Supporting files or screenshots'],
          ]}
        />

        <CalloutBox variant="tip">
          Include specific examples in coaching notes. Actionable feedback helps agents improve faster.
        </CalloutBox>
      </section>

      {/* Agent Reports Workflow */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <FileWarning className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Agent Reports Workflow</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Review and act on compliance incidents flagged by the automated monitoring system.
        </p>

        <h4 className="font-medium mb-2">Automated Triggers</h4>
        <QuickTable
          headers={['Trigger', 'Schedule', 'Action']}
          rows={[
            ['Daily Compliance Audit', '5:00 AM UTC (12:00 AM EST)', 'Scans previous day for violations'],
            ['Report Generation', 'After audit completes', 'Creates reports for each violation'],
            ['Email Notifications', 'On report creation', 'Notifies leadership team'],
            ['In-App Notifications', 'On report creation', 'Populates Agent Reports hub'],
          ]}
        />

        <h4 className="font-medium mb-2 mt-4">Violation Types & Severity</h4>
        <QuickTable
          headers={['Type', 'Description', 'Severity']}
          rows={[
            ['NO_LOGOUT', 'Still logged in 3+ hours past shift end', 'High'],
            ['LATE_LOGIN', 'Logged in >5 min after scheduled start', 'Medium'],
            ['EARLY_OUT', 'Logged out before scheduled shift end', 'Medium'],
            ['TIME_NOT_MET', 'Total logged hours less than required', 'Medium'],
            ['QUOTA_NOT_MET', 'Daily ticket quota not achieved', 'Medium'],
            ['BIO_OVERUSE', 'Bio break time exceeded allowance', 'Low'],
            ['EXCESSIVE_RESTARTS', 'Device restart time exceeded 5 minutes', 'Low'],
            ['HIGH_GAP', 'High average gap between tickets', 'Low'],
          ]}
        />

        <h4 className="font-medium mb-2 mt-4">Report Resolution Workflow</h4>
        <div className="p-4 bg-muted/50 rounded-lg my-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="px-2 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded font-medium">Open</span>
            <span className="text-muted-foreground">→ Admin reviews incident details</span>
          </div>
          <div className="pl-4 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-32 font-medium">Option 1:</span>
              <span className="px-2 py-1 bg-purple-500/20 text-purple-700 dark:text-purple-400 rounded">Escalate as Outage</span>
              <span className="text-muted-foreground">→ Creates outage request, marks report "Escalated"</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-32 font-medium">Option 2:</span>
              <span className="px-2 py-1 bg-green-500/20 text-green-700 dark:text-green-400 rounded">Validate (Coaching)</span>
              <span className="text-muted-foreground">→ Confirms for coaching purposes</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-32 font-medium">Option 3:</span>
              <span className="px-2 py-1 bg-muted text-muted-foreground rounded">Dismiss (Invalid)</span>
              <span className="text-muted-foreground">→ False positive or not actionable</span>
            </div>
          </div>
        </div>

        <CalloutBox variant="info" title="Escalation Eligibility">
          Only attendance-related incidents (LATE_LOGIN, EARLY_OUT, TIME_NOT_MET) can be escalated as outages. Other types must be validated or dismissed.
        </CalloutBox>
      </section>

      {/* Revalida Batch Management */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Revalida Batch Management</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Create and manage knowledge assessment batches for agents.
        </p>

        <h4 className="font-medium mb-2">Creating an Assessment Batch</h4>
        <Checklist items={[
          'Navigate to Team Performance → Revalida',
          'Click "New Batch" button',
          'Enter batch title and description',
          'Set time limit and passing score',
          'Add questions (MCQ, True/False, Situational)',
          'Assign to specific agents or teams',
          'Publish when ready',
        ]} />

        <h4 className="font-medium mb-2 mt-4">Question Types</h4>
        <QuickTable
          headers={['Type', 'Grading', 'Description']}
          rows={[
            ['Multiple Choice', 'Auto-graded', 'Single correct answer from options'],
            ['True/False', 'Auto-graded', 'Binary true or false selection'],
            ['Situational', 'Manual grading', 'Open-ended scenario response'],
          ]}
        />

        <h4 className="font-medium mb-2 mt-4">Batch Lifecycle</h4>
        <div className="p-4 bg-muted/50 rounded-lg my-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="px-2 py-1 bg-muted text-muted-foreground rounded font-medium">Draft</span>
            <ArrowRight className="h-4 w-4" />
            <span className="px-2 py-1 bg-green-500/20 text-green-700 dark:text-green-400 rounded font-medium">Published</span>
            <ArrowRight className="h-4 w-4" />
            <span className="px-2 py-1 bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded font-medium">Closed</span>
          </div>
        </div>

        <h4 className="font-medium mb-2 mt-4">Grading Situational Questions</h4>
        <Checklist items={[
          'View submissions with "Needs Review" status',
          'Read agent responses for situational questions',
          'Assign points based on rubric/criteria',
          'Add feedback for the agent',
          'Save to update final score',
        ]} />

        <CalloutBox variant="warning" title="Manual Grading Required">
          Situational questions require manual review before final scores are calculated. Submissions remain in "Pending Review" until all questions are graded.
        </CalloutBox>
      </section>
    </div>
  );
}
