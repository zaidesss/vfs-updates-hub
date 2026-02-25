

## Plan: Add Juno and Team Lead as Recipients on All QA Evaluation Emails

### Problem
Currently, QA evaluation emails are sent only to the agent (with team lead in CC). The requirement is that **all** QA evaluation emails should go to:
1. **Juno** (`dzaydee06@gmail.com`) — always
2. **The Agent** being evaluated
3. **The Agent's Team Lead** (if exists and not terminated)

### Current Behavior vs. New Behavior

| Notification Type | Current Recipients | New Recipients |
|---|---|---|
| `new_evaluation` (Send to Agent) | To: Agent, CC: Team Lead | To: Agent + Juno, CC: Team Lead |
| `acknowledgment` | To: Team Lead (or Agent), CC: Agent | To: Team Lead + Juno, CC: Agent |
| `evaluation_updated` | To: Agent, CC: Team Lead | To: Agent + Juno, CC: Team Lead |

### Considerations Before Proceeding

1. **Should Juno's email be hardcoded or configurable?** Currently the approvers list in `src/lib/approvers.ts` already has Juno's email. We can reference it conceptually but since edge functions can't import from `src/`, we'd hardcode it in the edge function (same pattern as other notification functions). Alternatively, we could look up users with a specific role.

2. **What if Juno is the evaluator?** Should she still receive the email? (I'll assume yes — she should always be in the loop.)

3. **What if Juno is the agent's team lead?** We should de-duplicate so she doesn't get the same email twice.

4. **Acknowledgment emails** — currently sent to team lead (or agent if no team lead). Should Juno be added here too? Based on your request ("all QA evaluations"), yes.

### Changes

**File: `supabase/functions/send-qa-notification/index.ts`**

For all three notification types (`new_evaluation`, `acknowledgment`, `evaluation_updated`):
- Add `dzaydee06@gmail.com` (Juno) as a constant recipient
- Build the `to` array by combining the existing recipients + Juno
- De-duplicate to avoid sending the same email twice to the same person
- Keep the existing CC logic for team lead where applicable

Specifically:
- **Line 120-127** (`new_evaluation`): Change `to: [evaluation.agent_email]` → `to: [agent, juno]` (de-duped), keep team lead in CC
- **Line 191-196** (`acknowledgment`): Change `to: [teamLeadEmail]` → `to: [teamLead, juno]` (de-duped), keep agent in CC
- **Line 251-258** (`evaluation_updated`): Change `to: [evaluation.agent_email]` → `to: [agent, juno]` (de-duped), keep team lead in CC

### Technical Detail
Add a constant at the top of the edge function:
```typescript
const QA_ALWAYS_NOTIFY = 'dzaydee06@gmail.com'; // Juno
```

Then for each email send, build a de-duplicated recipient list:
```typescript
const toRecipients = [...new Set([evaluation.agent_email, QA_ALWAYS_NOTIFY].map(e => e.toLowerCase()))];
```

No database changes needed. Only the edge function file is modified.

