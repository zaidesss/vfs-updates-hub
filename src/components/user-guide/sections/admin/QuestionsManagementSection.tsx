import { GuideSection, CalloutBox, Checklist, QuickTable } from '../../GuideComponents';

export function QuestionsManagementSection() {
  return (
    <GuideSection letter="E" color="bg-purple-500" title="Admin Panel - Questions Tab">
      <p className="text-muted-foreground mb-4">
        The Questions tab displays all user questions for administrators to review and answer.
      </p>

      <h3 className="font-semibold mb-2">Questions Table Columns</h3>
      <QuickTable 
        headers={['Column', 'Description']}
        rows={[
          ['Reference Number', 'Unique identifier (e.g., Q-0001).'],
          ['Question', 'Truncated text of the question.'],
          ['Update Title', 'The update the question relates to.'],
          ['Asked By', 'Email of the user who asked.'],
          ['Status', 'Badge showing Pending/On-Going/Answered/Closed.'],
          ['Asked At', 'Date and time submitted.'],
          ['Actions', 'View Thread button.'],
        ]}
      />

      <h3 className="font-semibold mb-2 mt-4">Responding to Questions</h3>
      <Checklist items={[
        "Click 'View Thread' to open the question dialog.",
        "Review the original question and any previous replies.",
        "Type your response in the reply box at the bottom.",
        "Click 'Send Reply' to post your response.",
        "Optionally, click 'Close Thread' if no more replies are needed.",
      ]} />

      <h3 className="font-semibold mb-2 mt-4">Status Management</h3>
      <QuickTable 
        headers={['Action', 'When To Use']}
        rows={[
          ['Keep On-Going', 'When further discussion may be needed.'],
          ['Mark as Answered', 'When the question has been fully resolved.'],
          ['Close Thread', 'When the conversation should be permanently closed.'],
        ]}
      />

      <CalloutBox variant="warning" title="Closing Threads">
        When a thread is closed, no one (including the user who asked) can add new replies. Use this only when the conversation is complete.
      </CalloutBox>

      <CalloutBox variant="tip">
        Users receive email notifications when their questions are replied to. Clear and helpful responses improve user satisfaction.
      </CalloutBox>
    </GuideSection>
  );
}
