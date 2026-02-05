import { CalloutBox, QuickTable, Checklist } from '../../GuideComponents';
import { Ticket, ClipboardList, FileWarning, BarChart3, GraduationCap } from 'lucide-react';

export function TeamPerformanceMenuSection() {
  return (
    <div className="space-y-8">
      {/* Ticket Logs */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Ticket className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Ticket Logs</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          View your daily ticket handling records. Track your productivity and identify patterns.
        </p>

        <h4 className="font-medium mb-2">Ticket Metrics</h4>
        <QuickTable
          headers={['Metric', 'Description']}
          rows={[
            ['Email Tickets', 'Number of email tickets handled'],
            ['Chat Tickets', 'Number of chat interactions'],
            ['Call Tickets', 'Number of phone calls handled'],
            ['Total Count', 'Combined ticket count for the day'],
            ['Average Gap', 'Average time between tickets'],
          ]}
        />

        <h4 className="font-medium mb-2 mt-4">Features</h4>
        <Checklist items={[
          'View daily ticket breakdown',
          'Filter by date range',
          'See hourly distribution',
          'Compare against daily quota',
          'Export logs for review',
        ]} />

        <CalloutBox variant="info">
          Your daily quota is based on your schedule and assigned workload. Check with your team lead for specific targets.
        </CalloutBox>
      </section>

      {/* QA Evaluations */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">QA Evaluations</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          View your quality assurance evaluations. See scores, feedback, and acknowledgement status.
        </p>

        <h4 className="font-medium mb-2">Evaluation Components</h4>
        <QuickTable
          headers={['Component', 'Weight', 'What is Evaluated']}
          rows={[
            ['Accuracy', 'Varies', 'Correct information provided'],
            ['Communication', 'Varies', 'Clarity and professionalism'],
            ['Process Adherence', 'Varies', 'Following proper procedures'],
            ['Resolution', 'Varies', 'Effective problem solving'],
          ]}
        />

        <h4 className="font-medium mb-2 mt-4">Acknowledgement Process</h4>
        <Checklist items={[
          'Review the evaluation details',
          'Read QA feedback and coaching notes',
          'Click "Acknowledge" to confirm you have reviewed',
          'Add comments if needed',
          'Acknowledged evaluations are marked complete',
        ]} />

        <CalloutBox variant="warning" title="Required Action">
          You must acknowledge all QA evaluations. Unacknowledged evaluations will appear in your pending items.
        </CalloutBox>
      </section>

      {/* Agent Reports */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <FileWarning className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Agent Reports</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          View compliance incidents detected by the automated monitoring system. Understand and address any flagged issues.
        </p>

        <h4 className="font-medium mb-2">Incident Types</h4>
        <QuickTable
          headers={['Type', 'Description', 'Severity']}
          rows={[
            ['Late Login', 'Logged in after scheduled start + grace period', 'Medium'],
            ['Early Out', 'Logged out before scheduled end', 'Medium'],
            ['Time Not Met', 'Total logged hours less than required', 'Medium'],
            ['No Logout', 'Forgot to logout (auto-detected)', 'High'],
            ['Quota Not Met', 'Daily ticket quota not achieved', 'Medium'],
            ['Bio Overuse', 'Bio break exceeded allowance', 'Low'],
            ['Excessive Restart', 'Device restart time exceeded limit', 'Low'],
            ['High Gap', 'Long gaps between ticket handling', 'Low'],
          ]}
        />

        <h4 className="font-medium mb-2 mt-4">Report Status</h4>
        <div className="p-4 bg-muted/50 rounded-lg my-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="px-2 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded">Open</span>
            <span>→</span>
            <span className="px-2 py-1 bg-purple-500/20 text-purple-700 dark:text-purple-400 rounded">Escalated</span>
            <span className="text-muted-foreground mx-2">or</span>
            <span className="px-2 py-1 bg-green-500/20 text-green-700 dark:text-green-400 rounded">Validated</span>
            <span className="text-muted-foreground mx-2">or</span>
            <span className="px-2 py-1 bg-muted text-muted-foreground rounded">Dismissed</span>
          </div>
        </div>

        <CalloutBox variant="info">
          Agent reports are generated automatically by the daily compliance audit. Review them to understand any attendance or performance patterns.
        </CalloutBox>
      </section>

      {/* Scorecard */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Scorecard</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Comprehensive performance scorecard combining all metrics into an overall score.
        </p>

        <h4 className="font-medium mb-2">Scorecard Components</h4>
        <QuickTable
          headers={['Component', 'Description']}
          rows={[
            ['Productivity', 'Ticket count and efficiency metrics'],
            ['Quality', 'QA evaluation scores'],
            ['Attendance', 'Login compliance and schedule adherence'],
            ['Acknowledgements', 'Update completion rate'],
          ]}
        />

        <CalloutBox variant="tip">
          Your scorecard is updated weekly. Use it to track your overall performance and identify areas for improvement.
        </CalloutBox>
      </section>

      {/* Revalida */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Revalida</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Knowledge assessment system. Take quizzes to validate your understanding of processes and updates.
        </p>

        <h4 className="font-medium mb-2">Assessment Features</h4>
        <Checklist items={[
          'View available assessments',
          'Take timed quizzes',
          'See results immediately after submission',
          'Review correct answers (after grading)',
          'Track your assessment history',
        ]} />

        <h4 className="font-medium mb-2 mt-4">Question Types</h4>
        <QuickTable
          headers={['Type', 'Description']}
          rows={[
            ['Multiple Choice', 'Select the correct answer from options'],
            ['True/False', 'Determine if statement is true or false'],
            ['Situational', 'Describe how you would handle a scenario (manually graded)'],
          ]}
        />

        <CalloutBox variant="warning" title="Time Limit">
          Assessments have a time limit. Once started, you must complete before time expires.
        </CalloutBox>

        <CalloutBox variant="info">
          Situational questions require manual grading by admins. Your final score will be updated once all questions are graded.
        </CalloutBox>
      </section>
    </div>
  );
}
