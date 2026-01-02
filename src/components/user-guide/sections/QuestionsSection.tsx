import { GuideSection, CalloutBox, Checklist, QuickTable } from '../GuideComponents';

export function QuestionsSection() {
  return (
    <>
      <GuideSection letter="H" color="bg-indigo-500" title="Questions - Submitting Questions">
        <p className="text-muted-foreground mb-4">
          Questions can be asked on any update if clarification is needed. Questions are sent to HR and Admin users for response.
        </p>

        <h3 className="font-semibold mb-2">How to Submit a Question</h3>
        <Checklist items={[
          "Open the update by clicking on its card.",
          "Scroll down to the 'Ask a Question' section.",
          "Type your question in the text area.",
          "Click the 'Submit Question' button.",
          "A confirmation message appears when submitted successfully.",
          "A reference number is assigned (e.g., Q-0001).",
        ]} />

        <CalloutBox variant="info" title="Who Receives Questions">
          All questions are visible to HR and Admin users. They will receive a notification when a new question is submitted.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="I" color="bg-indigo-400" title="Questions - Status and Thread">
        <p className="text-muted-foreground mb-4">
          Each question has a status indicating its current state. Conversations happen in a thread format.
        </p>

        <h3 className="font-semibold mb-2">Question Statuses</h3>
        <QuickTable 
          headers={['Status', 'Meaning', 'Who Can Set It']}
          rows={[
            ['Pending', 'Question is waiting for initial response.', 'Set automatically when submitted.'],
            ['On-Going', 'Conversation is in progress with replies.', 'Set automatically when a reply is added.'],
            ['Answered', 'Question has been resolved.', 'Question asker OR Admin/HR.'],
            ['Closed', 'Thread is permanently closed.', 'Admin/HR only.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Question Thread Dialog</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Clicking on a question opens the thread dialog where the conversation is displayed.
        </p>
        <Checklist items={[
          "Original question is shown at the top.",
          "All replies are displayed in chronological order.",
          "Your messages appear on the right side (chat-style).",
          "Other users' messages appear on the left side.",
          "Reference number is displayed in the header.",
          "Reply box at the bottom (if thread is not closed).",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Who Can Reply</h3>
        <QuickTable 
          headers={['User Type', 'Can Reply?', 'Notes']}
          rows={[
            ['Question Asker', 'Yes', 'Can reply to their own questions.'],
            ['Admin Users', 'Yes', 'Can reply to any question.'],
            ['HR Users', 'Yes', 'Can reply to any question.'],
            ['Other Users', 'No', 'Cannot see or reply to others\' questions.'],
          ]}
        />

        <CalloutBox variant="warning" title="Closed Threads">
          When a thread status is "Closed", no one can add new replies. This action is permanent and can only be done by Admin/HR users.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="J" color="bg-indigo-300" title="Questions - Actions">
        <p className="text-muted-foreground mb-4">
          Different actions are available depending on your role and the question status.
        </p>

        <h3 className="font-semibold mb-2">Action Buttons</h3>
        <QuickTable 
          headers={['Button', 'Who Sees It', 'When Available', 'What It Does']}
          rows={[
            ['Mark as Answered', 'Question asker', 'When status is NOT Answered', 'Changes status to Answered.'],
            ['Reopen', 'Question asker', 'When status IS Answered', 'Changes status back to Pending.'],
            ['Close Thread', 'Admin/HR only', 'When status is NOT Closed', 'Permanently closes the thread.'],
          ]}
        />

        <h3 className="font-semibold mb-2 mt-4">Keyboard Shortcuts</h3>
        <QuickTable 
          headers={['Shortcut', 'Action']}
          rows={[
            ['Enter', 'Send reply in question thread.'],
            ['Shift + Enter', 'Add a new line in the reply box.'],
          ]}
        />

        <CalloutBox variant="tip" title="Helper Text for Question Askers">
          When viewing your own question, a helper message is shown: "If you think your question has been answered and have no follow-up questions, feel free to mark the status as 'Answered' to close this thread."
        </CalloutBox>
      </GuideSection>
    </>
  );
}
