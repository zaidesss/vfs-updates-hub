

## Add Threaded Conversation for QA Evaluation Remarks

### Summary
Currently, the agent can leave a one-time remark on a QA evaluation, but Super Admin, Admin, and HR cannot respond. We will add a threaded conversation system (similar to the existing Questions thread) so both parties can go back and forth. The agent will receive email + in-app notifications when an admin responds.

### Changes Overview

**Step 1 -- Create `qa_evaluation_replies` table**
- New table with columns: `id`, `evaluation_id` (FK to qa_evaluations), `user_email`, `user_name`, `message`, `created_at`
- RLS policies: agent can see/insert on their own evaluation; admin/HR/super_admin can see/insert on any evaluation
- The existing `agent_remarks` field stays as-is (it becomes the first message in the thread conceptually)

**Step 2 -- Add API functions in `qaEvaluationsApi.ts`**
- `fetchEvaluationReplies(evaluationId)` -- fetch all replies for an evaluation
- `createEvaluationReply(evaluationId, message, userEmail, userName)` -- insert a new reply

**Step 3 -- Update QA Evaluation Detail page UI**
- Replace the static "Agent Remarks" display card with a threaded conversation card
- Show the original `agent_remarks` as the first message (from the agent)
- Show all subsequent replies in chronological order, chat-style (agent on right, admin on left)
- Add a reply text area at the bottom for admin/HR/super_admin to respond
- Also allow the agent to continue replying (back-and-forth)
- Log each reply as an event in the Activity History

**Step 4 -- Create notification edge function**
- New function `send-qa-reply-notification` (similar to `send-question-reply-notification`)
- Sends email to the agent when admin/HR replies
- Sends email to the evaluator + admin/HR when the agent replies
- Creates in-app notification for the recipient

**Step 5 -- Wire up notifications**
- After a reply is inserted, invoke the edge function to notify the other party
- Email includes the reply text, evaluation reference number, and a prompt to log in

### Technical Details

**New table schema:**
```text
qa_evaluation_replies
  - id: uuid (PK, default gen_random_uuid())
  - evaluation_id: uuid (FK -> qa_evaluations.id, ON DELETE CASCADE)
  - user_email: text (not null)
  - user_name: text
  - message: text (not null)
  - created_at: timestamptz (default now())
```

**RLS policies:**
- SELECT: agent can read where evaluation.agent_email = their email; admin/HR/super_admin can read all
- INSERT: agent can insert on their own evaluation; admin/HR/super_admin can insert on any

**UI behavior:**
- The "Review Evaluation" section (where agent submits initial remarks) stays the same
- Once remarks are submitted, the remarks card becomes a conversation thread
- Admin/HR see a reply box below the thread at all times
- Agent also sees a reply box to continue the conversation
- Each new reply logs an `evaluation_reply` event in the activity history
