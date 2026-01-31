

# QA Evaluation Form Feature

## Overview

A comprehensive Quality Evaluation (QA) form system integrated into the Agent Portal under "Team Performance > QA Evaluations". Team Leads (Admins), HR, and Super Admins can create QA forms to evaluate agent ticket handling. The system includes AI-powered score suggestions, Zendesk ticket integration, violation tracking, and automated email notifications.

---

## Feature Summary

| Component | Description |
|-----------|-------------|
| **Location** | Team Performance > QA Evaluations |
| **Who Creates** | Team Leads (Admins), HR, Super Admins |
| **Who Views** | Admins see all; Regular users see only their own |
| **AI Integration** | Reads Zendesk ticket content via API to suggest scores |
| **Violation Tracking** | All-time history for repeat violation detection |
| **Agent Visibility** | Full visibility of all scores and feedback |

---

## Database Design

### New Tables

**1. `qa_evaluations` - Main form data**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| reference_number | text | Auto-generated "QA-0001" |
| agent_email | text | Agent being evaluated |
| agent_name | text | Agent's full name |
| evaluator_email | text | Team Lead who created |
| audit_date | date | Date of evaluation |
| zd_instance | text | customerserviceadvocates or customerserviceadvocateshelp |
| ticket_id | text | Zendesk ticket number |
| ticket_url | text | Full hyperlink to ticket |
| interaction_type | text | Call, Email, Chat, Hybrid, Logistics, Other |
| ticket_content | text | Fetched/pasted ticket content for AI analysis |
| total_score | integer | Calculated sum of earned points |
| total_max | integer | Maximum possible points |
| percentage | numeric | Score percentage |
| has_critical_fail | boolean | Yes/No for critical error |
| rating | text | Pass/Fail (formula pending) |
| accuracy_feedback | text | Feedback text |
| accuracy_kudos | text | AI-generated kudos if perfect |
| compliance_feedback | text | Feedback text |
| compliance_kudos | text | AI-generated kudos if perfect |
| customer_exp_feedback | text | Feedback text |
| customer_exp_kudos | text | AI-generated kudos if perfect |
| agent_acknowledged | boolean | Agent confirmation checkbox |
| acknowledged_at | timestamp | When agent acknowledged |
| notification_sent | boolean | Email sent to agent |
| created_at | timestamp | Form creation time |
| updated_at | timestamp | Last update time |

**2. `qa_evaluation_scores` - Individual category scores**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| evaluation_id | uuid | FK to qa_evaluations |
| category | text | Communication, Issue Resolution, etc. |
| subcategory | text | Tone & Empathy, Solution Accuracy, etc. |
| behavior_identifier | text | What is being measured |
| is_critical | boolean | True if "Critical Error" subcategory |
| score_earned | integer | 2-6 or 0 (if critical=Yes) |
| max_points | integer | Maximum for this row |
| ai_suggested_score | integer | AI recommendation |
| ai_accepted | boolean | Lead accepted AI score |
| critical_error_detected | boolean | Yes/No for critical items |
| created_at | timestamp | Record creation |

**3. `qa_action_plans` - Predefined action plan options**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| action_text | text | Short action description |
| category | text | Optional grouping |
| is_active | boolean | Can be deactivated |
| created_at | timestamp | Record creation |

**4. `qa_action_needed` - Actions assigned per evaluation**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| evaluation_id | uuid | FK to qa_evaluations |
| action_plan_id | uuid | FK to qa_action_plans (nullable) |
| custom_action | text | If not from dropdown |
| is_resolved | boolean | Agent marked as done |
| resolved_at | timestamp | When marked resolved |
| created_at | timestamp | Record creation |

**5. `qa_pending_actions` - Carried-over actions view**
Used to show unresolved actions from previous QA forms in new evaluations.

---

## Predefined Action Plans (Grade 7 Readability)

Based on the uploaded feedback documents, here are simplified action plans:

| # | Action Plan |
|---|-------------|
| 1 | Get proof of delivery before offering replacement |
| 2 | Confirm address on file instead of asking again |
| 3 | Apologize when response is delayed |
| 4 | Introduce yourself when taking over a ticket |
| 5 | Start carrier trace before offering resolution |
| 6 | Include delivery details in first reply |
| 7 | Confirm address format: "Is this correct? [address]" |
| 8 | Review order details before responding |
| 9 | Address the customer's concern first |
| 10 | Focus on solution, not process steps |
| 11 | Read all previous notes before replying |
| 12 | Check shipping and customs before replacing |
| 13 | Do not share internal issues with customers |
| 14 | Do not cancel subscription without request |
| 15 | Verify refund status before promising refund |
| 16 | Escalate refund errors with correct details |
| 17 | Do not replace if delivery is confirmed |
| 18 | Address all concerns in one response |
| 19 | Lead with confidence, not open-ended options |
| 20 | Review case history upon return from leave |

---

## Scoring Categories Structure

Based on the Google Sheet images:

### Communication and Professionalism (Rows 15-20)
| Subcategory | Max Points |
|-------------|------------|
| Tone and Empathy | 6 |
| Clarity and Structure | 6 |
| Spelling and Grammar | 6 |
| Critical Error: Sharing Internal Info | Yes/No |

### Issue Resolution and Deliverables (Rows 24-28)
| Subcategory | Max Points |
|-------------|------------|
| Understanding the Issue | 6 |
| Solution Accuracy | 6 |
| First Contact Resolution | 6 |
| Critical Error: Incorrect Critical Info | Yes/No |

### Process and Policy Adherence (Rows 31-37)
| Subcategory | Max Points |
|-------------|------------|
| Policy Compliance | 6 |
| Customer Experience | 6 |
| Active Listening | 6 |
| Critical Error: Policy Breach | Yes/No |

---

## AI Integration Logic

### 1. Ticket Content Fetching (via Zendesk API)
- Edge function calls Zendesk API with ticket ID and instance
- Returns ticket conversation, agent replies, timestamps
- Requires: `ZENDESK_API_TOKEN_ZD1` and `ZENDESK_API_TOKEN_ZD2` secrets

### 2. AI Score Suggestion Flow
1. Team Lead selects ZD instance and enters ticket #
2. System fetches ticket content via Zendesk API
3. AI analyzes conversation against each behavior identifier
4. AI suggests scores (2-6 scale) for each category
5. Team Lead can Accept or Decline each suggestion
6. If Decline: Lead manually enters different score

### 3. Critical Error Detection
- For "Critical Error" subcategories (Sharing Internal Info, Incorrect Critical Info, Policy Breach)
- AI reads ticket and suggests Yes/No
- If Lead accepts "Yes": All scores become 0, Total = 0, Percentage = 0%, Has Critical = Yes, Rating = Fail
- If Lead declines: Value automatically becomes "No"

### 4. Kudos Message Generation
- If all scores in a category equal max points:
  - AI generates personalized kudos message
  - Displayed next to: ACCURACY FEEDBACK, COMPLIANCE FEEDBACK, CUSTOMER EXPERIENCE FEEDBACK

---

## Violation Tracking Logic

### Repeat Violation Detection
1. When creating new QA form, system queries all past `qa_evaluation_scores` for same agent
2. Groups by subcategory where `score_earned < max_points`
3. Shows warning: "This agent had similar issues before: [list of past violations]"
4. Helps lead determine appropriate action plan

### Pending Actions Display
1. Query `qa_action_needed` where `is_resolved = false` for this agent
2. Display in new QA form: "Previous Actions Pending Review"
3. Agent can check each item to mark as resolved
4. Creates accountability trail

---

## UI Components

### 1. QA Evaluations List Page (`/team-performance/qa-evaluations`)
- Filter tabs: All, Current Week, Previous Week, Monthly, Quarterly, Custom Date
- 4-week comparison chart showing evaluation counts and average scores
- Table columns: Ref #, Date, Agent, Evaluator, Score %, Rating, Status

### 2. Create QA Form Page
**Auto-populated:**
- Agent Name (dropdown of all agents, shows full_name from agent_profiles)
- Audit Date (current date)

**Manual Entry:**
- Interaction Type dropdown (Call, Email, Chat, Hybrid, Logistics, Other)
- ZD Instance dropdown (customerserviceadvocates, customerserviceadvocateshelp)
- Ticket # input (auto-generates hyperlink)
- "Fetch Ticket" button to retrieve content via API

**Scoring Section:**
- Category headers with subcategories
- Each row: Subcategory | Behavior | Score Dropdown (2-6) | Max | AI Suggest button
- Critical Error rows: Yes/No dropdown with AI detection

**Feedback Section:**
- ACCURACY FEEDBACK textarea + [Kudos badge if earned]
- COMPLIANCE FEEDBACK textarea + [Kudos badge if earned]
- CUSTOMER EXPERIENCE FEEDBACK textarea + [Kudos badge if earned]
- Action Needed dropdown (multi-select from predefined list + custom add)

**Summary:**
- Total Score (calculated)
- Total Max (calculated)
- Percentage (calculated)
- Has Critical Fail (auto-set)
- Rating (pending formula)

**Multi-Ticket Support:**
- "Add Another Ticket" button creates additional form section
- Each ticket is a separate evaluation record linked by same session

### 3. Agent View
- Read-only view of their QA evaluations
- Pending actions section with checkboxes
- Acknowledgment checkbox: "I acknowledge that I have reviewed this QA evaluation and will implement the action items identified."
- Submit acknowledgment button

---

## Email Notifications

### 1. New QA Form Notification
- **Trigger:** Team Lead clicks "Send to Agent"
- **To:** Agent email
- **CC:** All team leads + super admins
- **Subject:** QA Evaluation Completed - [Date] - [Ticket#]
- **Body:** Summary of scores, link to view full form

### 2. Agent Acknowledgment Notification
- **Trigger:** Agent checks acknowledgment box
- **To:** Team Leads + Super Admins
- **CC:** Agent
- **Subject:** QA Evaluation Acknowledged - [Agent Name] - [Date]
- **Body:** Confirmation message with link to form

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/QAEvaluations.tsx` | List page with filters and comparison |
| `src/pages/QAEvaluationForm.tsx` | Create/edit form page |
| `src/pages/QAEvaluationDetail.tsx` | View single evaluation |
| `src/lib/qaEvaluationsApi.ts` | API functions for QA operations |
| `src/components/qa/QAScoreRow.tsx` | Individual score row component |
| `src/components/qa/QACriticalRow.tsx` | Critical error row component |
| `src/components/qa/QAActionPlanSelect.tsx` | Action plan dropdown |
| `src/components/qa/QAPendingActions.tsx` | Pending actions display |
| `src/components/qa/QAWeeklyComparison.tsx` | 4-week comparison chart |
| `supabase/functions/fetch-zendesk-ticket/index.ts` | Fetch ticket content |
| `supabase/functions/analyze-qa-ticket/index.ts` | AI score suggestions |
| `supabase/functions/send-qa-notification/index.ts` | Email notifications |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/Layout.tsx` | Add "QA Evaluations" to Team Performance menu |
| `src/App.tsx` | Add routes for QA pages |

---

## Implementation Order

1. **Database Migration** - Create tables and seed action plans
2. **API Layer** - Create `qaEvaluationsApi.ts` with CRUD operations
3. **List Page** - Basic list with filters
4. **Form Page** - Create form with all fields
5. **Zendesk API Edge Function** - Fetch ticket content (requires API tokens)
6. **AI Analysis Edge Function** - Score suggestions using Lovable AI
7. **Scoring Logic** - Critical error handling, calculations
8. **Violation Tracking** - Past violations query and display
9. **Pending Actions** - Display and resolution tracking
10. **Email Notifications** - Edge functions for sending emails
11. **Agent View** - Read-only with acknowledgment
12. **Comparison Charts** - 4-week visualization

---

## Required Secrets

Before implementing Zendesk API integration:

| Secret Name | Purpose |
|-------------|---------|
| `ZENDESK_API_TOKEN_ZD1` | API token for customerserviceadvocates instance |
| `ZENDESK_API_TOKEN_ZD2` | API token for customerserviceadvocateshelp instance |
| `ZENDESK_ADMIN_EMAIL` | Email associated with API token |

---

## Acknowledgment Text

For the agent confirmation checkbox:

> "I acknowledge that I have reviewed this Quality Evaluation in full. I understand the feedback provided and commit to implementing the action items identified. I agree that this evaluation accurately reflects the assessed interaction."

