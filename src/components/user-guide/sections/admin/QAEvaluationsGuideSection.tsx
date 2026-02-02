import { Badge } from '@/components/ui/badge';
import { GuideSection, CalloutBox, QuickTable, Checklist } from '../../GuideComponents';
import { 
  ClipboardCheck, 
  FileText, 
  Users, 
  Star, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Calendar,
  BarChart3,
  MessageSquare,
  Send,
  Eye,
  Edit,
  Trash2,
  Bell,
  ListChecks
} from 'lucide-react';

export function QAEvaluationsGuideSection() {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <ClipboardCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">QA Evaluations - Complete Guide</h1>
          <p className="text-muted-foreground">Learn how to use the Quality Assurance evaluation system</p>
        </div>
      </div>

      {/* A - Overview */}
      <GuideSection letter="A" color="bg-primary" title="What is QA Evaluations?">
        <p className="text-muted-foreground mb-4">
          The QA Evaluations page lets team leads, HR, and admins check how well agents handle customer tickets. 
          Each evaluation looks at three main areas: <strong>Accuracy</strong>, <strong>Compliance</strong>, 
          and <strong>Customer Experience</strong>. The system tracks all scores and helps identify areas 
          where agents can improve.
        </p>
        
        <CalloutBox variant="info" title="Who Can Access This Page?">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Team Leads:</strong> Can create and manage evaluations for their team members</li>
            <li><strong>HR:</strong> Can view and create evaluations for all agents</li>
            <li><strong>Admins/Super Admins:</strong> Full access to all evaluations and settings</li>
            <li><strong>Agents:</strong> Can view only their own evaluations once sent</li>
          </ul>
        </CalloutBox>
      </GuideSection>

      {/* B - Dashboard Overview */}
      <GuideSection letter="B" color="bg-blue-600" title="Dashboard Overview">
        <p className="text-muted-foreground mb-4">
          When you open QA Evaluations, you see several cards that show key numbers at a glance.
        </p>

        <QuickTable
          headers={['Card', 'What It Shows']}
          rows={[
            ['Total Evaluations', 'How many evaluations exist based on your selected date range and agent filter'],
            ['Average Score', 'The mean of all evaluation percentages in your filtered view'],
            ['Acknowledged', 'How many evaluations the agent has marked as "Acknowledged"'],
            ['Pending Review', 'Evaluations that have been sent but not yet reviewed by the agent'],
          ]}
        />
      </GuideSection>

      {/* C - Weekly and Monthly Summary */}
      <GuideSection letter="C" color="bg-emerald-600" title="Weekly & Monthly Summaries">
        <div className="space-y-4">
          <div className="border rounded-lg p-4 space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Weekly Summary
            </h4>
            <p className="text-sm text-muted-foreground">
              Shows the current work week (Sunday to Saturday). The target is <strong>5 tickets per week</strong>. 
              The progress bar fills as more tickets get audited. The percentage shown is the average score 
              for that week.
            </p>
          </div>

          <div className="border rounded-lg p-4 space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Monthly Summary
            </h4>
            <p className="text-sm text-muted-foreground">
              Combines all weekly scores for the current month. If the month has 4 weeks with 5 tickets each, 
              that's 20 evaluations. For 5-week months, that's 25 evaluations.
            </p>
          </div>

          <CalloutBox variant="tip" title="How Averages Are Calculated">
            <p><strong>Weekly:</strong> Sum of all percentages ÷ Number of evaluations = Weekly Average</p>
            <p><strong>Monthly:</strong> Total of all scores for the month ÷ Total evaluations = Monthly Average</p>
          </CalloutBox>
        </div>
      </GuideSection>

      {/* D - 4-Week Comparison */}
      <GuideSection letter="D" color="bg-violet-600" title="4-Week Comparison">
        <p className="text-muted-foreground mb-4">
          This section shows the last 4 work weeks side by side. Each week displays:
        </p>
        
        <Checklist items={[
          'Week label: Week 1, Week 2, etc. (Week 4 is the most recent)',
          'Date range: Start and end dates for that work week',
          'Evaluation count: How many tickets were audited that week',
          'Average percentage: Mean score for that week (green if ≥96%, red if below)',
          'Individual scores: Each evaluation\'s percentage shown as small badges below',
        ]} />

        <CalloutBox variant="warning" title="Target: 5 Evaluations Per Week">
          Each work week should have exactly 5 evaluations. The individual score badges help you 
          quickly see which specific tickets passed or failed.
        </CalloutBox>
      </GuideSection>

      {/* E - Scoring System */}
      <GuideSection letter="E" color="bg-amber-600" title="How Scoring Works">
        <p className="text-muted-foreground mb-4">
          The scoring system uses an "all or nothing" approach. For each behavior, the agent either 
          gets full points or zero points. There is no partial credit.
        </p>

        <QuickTable
          headers={['Category', 'Points', 'Focus Areas']}
          rows={[
            ['Accuracy', '21 points', 'Language, clarity, solutions, timing'],
            ['Compliance', '17 points', 'Verification, policies, documentation'],
            ['Customer Experience', '14 points', 'Greeting, empathy, rapport, closure'],
            ['Total', '52 points', 'All three categories combined'],
          ]}
        />

        <div className="grid gap-4 md:grid-cols-2 mt-4">
          <div className="bg-chart-2/10 border border-chart-2/30 rounded-lg p-4">
            <h4 className="font-semibold text-chart-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Pass (≥96%)
            </h4>
            <p className="text-sm text-muted-foreground mt-2">
              The agent must score at least 50 out of 52 points (96.15%) with no critical errors to pass.
            </p>
          </div>

          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
            <h4 className="font-semibold text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Fail (&lt;96% or Critical Error)
            </h4>
            <p className="text-sm text-muted-foreground mt-2">
              Below 96% is a fail. Any critical error also results in an automatic fail with 0% score.
            </p>
          </div>
        </div>
      </GuideSection>

      {/* F - Critical Errors */}
      <GuideSection letter="F" color="bg-red-600" title="Critical Errors">
        <p className="text-muted-foreground mb-4">
          Critical errors are serious mistakes that automatically fail the evaluation. The total score 
          becomes 0% if any critical error is marked "Yes."
        </p>

        <QuickTable
          headers={['Critical Error', 'Category', 'Description']}
          rows={[
            ['Incorrect Critical Info', 'Accuracy', 'Agent gave wrong information that could cause harm'],
            ['Policy and Process Breach', 'Compliance', 'Agent violated a critical company policy'],
            ['Security Breach', 'Compliance', 'Agent exposed sensitive data or bypassed security'],
            ['Rude/Disrespectful Behavior', 'Customer Experience', 'Agent was rude or unprofessional'],
          ]}
        />

        <CalloutBox variant="info">
          Even with a critical fail, the system saves all individual scores so coaches can see 
          exactly where the agent needs improvement.
        </CalloutBox>
      </GuideSection>

      {/* G - Creating an Evaluation */}
      <GuideSection letter="G" color="bg-indigo-600" title="Creating a New Evaluation">
        <p className="text-muted-foreground mb-4">
          Click the <strong>"New Evaluation"</strong> button to start. Fill in these fields in order:
        </p>

        <ol className="space-y-3 list-decimal list-inside text-sm">
          <li><strong>Work Week:</strong> Pick the Sunday-to-Saturday range this audit covers</li>
          <li><strong>Coaching Date & Time:</strong> Set when you will discuss this evaluation with the agent</li>
          <li><strong>Select Agent:</strong> Use the search box to find and pick the agent</li>
          <li><strong>Zendesk Instance & Ticket ID:</strong> Pick the Zendesk account and enter the ticket number</li>
          <li><strong>Fetch Ticket (Optional):</strong> Click to load ticket content for AI-assisted scoring</li>
          <li><strong>Score Each Category:</strong> Mark each behavior as Pass (full points) or Fail (0 points)</li>
          <li><strong>Add Feedback & Action Plans:</strong> Write notes and select action items for coaching</li>
        </ol>

        <CalloutBox variant="tip" title="AI-Assisted Scoring">
          After fetching the ticket, the AI suggests scores based on the ticket content. 
          You can accept or override each suggestion.
        </CalloutBox>
      </GuideSection>

      {/* H - Action Plans */}
      <GuideSection letter="H" color="bg-pink-600" title="Action Plans">
        <p className="text-muted-foreground mb-4">
          Action plans are coaching items that tell agents what to improve. Each category has its own 
          set of pre-made action items.
        </p>

        <QuickTable
          headers={['Category', 'Focus']}
          rows={[
            ['Accuracy Actions', 'Improving information accuracy, grammar, and clarity'],
            ['Compliance Actions', 'Policy following, documentation, and security practices'],
            ['Customer Experience Actions', 'Tone, empathy, rapport building, and communication'],
          ]}
        />

        <CalloutBox variant="info" title="Tracking Repeat Issues">
          The system tracks how many times an agent gets the same action plan. If an agent 
          repeats the same mistake, you see an "occurrence count" badge showing which evaluations 
          had the same issue (e.g., "2nd occurrence - QA-0012").
        </CalloutBox>
      </GuideSection>

      {/* I - Saving and Sending */}
      <GuideSection letter="I" color="bg-teal-600" title="Saving & Sending Evaluations">
        <div className="grid gap-4 md:grid-cols-2 mb-4">
          <div className="border rounded-lg p-4 space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Save as Draft
            </h4>
            <p className="text-sm text-muted-foreground">
              Saves your progress without sending to the agent. Use this if you need to finish later. 
              Draft evaluations are only visible to evaluators.
            </p>
          </div>

          <div className="border rounded-lg p-4 space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              Finalize & Send
            </h4>
            <p className="text-sm text-muted-foreground">
              Completes the evaluation and sends an email notification to the agent. The agent can 
              then view and acknowledge it.
            </p>
          </div>
        </div>

        <CalloutBox variant="warning">
          Once you click "Finalize & Send," the evaluation cannot be changed back to draft. 
          Make sure all scores and feedback are correct before sending.
        </CalloutBox>
      </GuideSection>

      {/* J - Agent View */}
      <GuideSection letter="J" color="bg-cyan-600" title="Agent's View">
        <p className="text-muted-foreground mb-4">
          When an agent opens their evaluation, they see:
        </p>

        <Checklist items={[
          'Score Summary: Total score, percentage, and pass/fail rating',
          'Category Breakdown: Detailed scores for Accuracy, Compliance, and Customer Experience',
          'Feedback & Kudos: Written feedback and positive notes from the evaluator',
          'Action Items: List of things to improve with occurrence tracking',
        ]} />
      </GuideSection>

      {/* K - Acknowledgment Process */}
      <GuideSection letter="K" color="bg-lime-600" title="Acknowledgment Process">
        <p className="text-muted-foreground mb-4">
          Agents must acknowledge evaluations to confirm they reviewed the feedback. The process has two steps:
        </p>

        <ol className="space-y-3 list-decimal list-inside text-sm">
          <li>
            <strong>Mark as Reviewed:</strong> Click the "Mark as Reviewed" button. 
            You can optionally add remarks about the evaluation.
          </li>
          <li>
            <strong>Acknowledge:</strong> Check the "I acknowledge this evaluation" checkbox. 
            A reminder will show your scheduled coaching date and time.
          </li>
        </ol>

        <CalloutBox variant="success" title="Coaching Reminder">
          When you acknowledge, a dialog shows when your coaching session is scheduled. 
          This helps you prepare for the discussion with your team lead.
        </CalloutBox>
      </GuideSection>

      {/* L - Activity History */}
      <GuideSection letter="L" color="bg-orange-600" title="Activity History">
        <p className="text-muted-foreground mb-4">
          Every evaluation has an activity log that tracks all changes and actions. This creates a 
          complete audit trail.
        </p>

        <QuickTable
          headers={['Event', 'Description']}
          rows={[
            ['Draft created', 'Evaluation was first saved as a draft'],
            ['Evaluation edited', 'Changes were made to scores or feedback'],
            ['Sent to agent', 'Evaluation was finalized and notification sent'],
            ['Agent reviewed', 'Agent clicked "Mark as Reviewed"'],
            ['Agent acknowledged', 'Agent checked the acknowledgment box'],
            ['Notification resent', 'Email notification was sent again'],
          ]}
        />
      </GuideSection>

      {/* M - Filters */}
      <GuideSection letter="M" color="bg-slate-600" title="Filtering & Searching">
        <p className="text-muted-foreground mb-4">
          Use the top filters to narrow down evaluations:
        </p>

        <div className="grid gap-4 md:grid-cols-2 mb-4">
          <div className="border rounded-lg p-4 space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date Range
            </h4>
            <p className="text-sm text-muted-foreground">
              Pick from preset ranges (This Week, This Month, All Time) or set custom dates
            </p>
          </div>

          <div className="border rounded-lg p-4 space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Agent Filter
            </h4>
            <p className="text-sm text-muted-foreground">
              Select a specific agent to see only their evaluations
            </p>
          </div>
        </div>

        <CalloutBox variant="info">
          The dashboard statistics, table, and 4-week comparison all update based on your filter selections.
        </CalloutBox>
      </GuideSection>

      {/* N - Table Features */}
      <GuideSection letter="N" color="bg-fuchsia-600" title="Evaluations Table">
        <p className="text-muted-foreground mb-4">
          The main table shows all evaluations with these columns:
        </p>

        <QuickTable
          headers={['Column', 'Description']}
          rows={[
            ['Ref #', 'Click to open the full evaluation details'],
            ['Agent', 'Name of the agent being evaluated'],
            ['Work Week', 'The date range this audit covers (MM/dd - MM/dd/yy)'],
            ['Ticket', 'Zendesk ticket ID that was reviewed'],
            ['Score', 'Points earned out of total (e.g., 50/52)'],
            ['%', 'Percentage score (green if ≥96%, red if below)'],
            ['Rating', 'Pass, Fail, or Critical Fail badge'],
            ['Status', 'Acknowledged, Pending, or Draft'],
            ['Evaluator', 'Name of the person who did the evaluation'],
            ['Date/Time', 'When the evaluation was created (EST)'],
          ]}
        />
      </GuideSection>

      {/* O - Editing and Deleting */}
      <GuideSection letter="O" color="bg-rose-600" title="Editing & Deleting">
        <div className="grid gap-4 md:grid-cols-2 mb-4">
          <div className="border rounded-lg p-4 space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Edit Evaluation
            </h4>
            <p className="text-sm text-muted-foreground">
              Click the edit icon in the Actions column. You can change scores, feedback, and action items. 
              Changes are saved to the activity log.
            </p>
          </div>

          <div className="border rounded-lg p-4 space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive" />
              Delete Evaluation
            </h4>
            <p className="text-sm text-muted-foreground">
              Click the delete icon. A confirmation dialog appears. This action cannot be undone.
            </p>
          </div>
        </div>

        <CalloutBox variant="warning">
          Deleting an evaluation permanently removes it and all related data including scores, 
          action items, and activity history.
        </CalloutBox>
      </GuideSection>

      {/* P - Email Notifications */}
      <GuideSection letter="P" color="bg-sky-600" title="Email Notifications">
        <p className="text-muted-foreground mb-4">
          The system sends automatic emails for these events:
        </p>

        <QuickTable
          headers={['Event', 'Who Gets It', 'What It Contains']}
          rows={[
            ['New Evaluation', 'Agent', 'Link to view the evaluation and score summary'],
            ['Acknowledgment Confirmation', 'Evaluator', 'Notification that agent acknowledged their evaluation'],
          ]}
        />

        <CalloutBox variant="tip" title="Resend Notification">
          If an agent didn't receive the email, you can click the "Resend" button on the 
          evaluation detail page to send it again.
        </CalloutBox>
      </GuideSection>

      {/* Q - Tips */}
      <GuideSection letter="Q" color="bg-primary" title="Tips & Best Practices">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-chart-2/10 border border-chart-2/30 rounded-lg p-4">
            <h4 className="font-semibold text-chart-2 mb-2">Do</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Complete 5 evaluations per week per agent</li>
              <li>✓ Add specific feedback with examples</li>
              <li>✓ Select action plans that match the issues</li>
              <li>✓ Schedule coaching sessions promptly</li>
              <li>✓ Review past violations before creating new evaluations</li>
            </ul>
          </div>

          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
            <h4 className="font-semibold text-destructive mb-2">Don't</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✗ Send evaluations without feedback</li>
              <li>✗ Skip the coaching date/time fields</li>
              <li>✗ Ignore repeat violations</li>
              <li>✗ Delete evaluations to hide poor scores</li>
              <li>✗ Wait too long to acknowledge as an agent</li>
            </ul>
          </div>
        </div>
      </GuideSection>
    </div>
  );
}
