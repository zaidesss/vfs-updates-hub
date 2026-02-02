import { supabase } from '@/integrations/supabase/client';

// Types
export interface QAEvaluation {
  id: string;
  reference_number: string | null;
  agent_email: string;
  agent_name: string;
  evaluator_email: string;
  evaluator_name: string | null;
  audit_date: string;
  zd_instance: string;
  ticket_id: string;
  ticket_url: string | null;
  interaction_type: string;
  ticket_content: string | null;
  total_score: number;
  total_max: number;
  percentage: number;
  has_critical_fail: boolean;
  rating: string | null;
  accuracy_feedback: string | null;
  accuracy_kudos: string | null;
  compliance_feedback: string | null;
  compliance_kudos: string | null;
  customer_exp_feedback: string | null;
  customer_exp_kudos: string | null;
  agent_acknowledged: boolean;
  acknowledged_at: string | null;
  notification_sent: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  // New fields for work week and agent review
  work_week_start: string | null;
  work_week_end: string | null;
  coaching_date: string | null;
  agent_remarks: string | null;
  agent_reviewed: boolean;
  agent_reviewed_at: string | null;
}

export interface QAEvaluationScore {
  id: string;
  evaluation_id: string;
  category: string;
  subcategory: string;
  behavior_identifier: string | null;
  is_critical: boolean;
  score_earned: number | null;
  max_points: number;
  ai_suggested_score: number | null;
  ai_accepted: boolean | null;
  critical_error_detected: boolean | null;
  created_at: string;
}

export interface QAActionPlan {
  id: string;
  action_text: string;
  category: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface QAActionNeeded {
  id: string;
  evaluation_id: string;
  action_plan_id: string | null;
  custom_action: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
  action_plan?: QAActionPlan;
}

export interface QAEvaluationEvent {
  id: string;
  evaluation_id: string;
  event_type: string;
  event_description: string | null;
  actor_email: string;
  actor_name: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface CreateQAEvaluationInput {
  agent_email: string;
  agent_name: string;
  evaluator_email: string;
  evaluator_name: string;
  audit_date: string;
  zd_instance: string;
  ticket_id: string;
  ticket_url: string;
  interaction_type: string;
  ticket_content?: string;
  accuracy_feedback?: string;
  compliance_feedback?: string;
  customer_exp_feedback?: string;
  status?: string;
  work_week_start?: string;
  work_week_end?: string;
  coaching_date?: string;
}

export interface CreateQAScoreInput {
  evaluation_id: string;
  category: string;
  subcategory: string;
  behavior_identifier?: string;
  is_critical: boolean;
  score_earned?: number;
  max_points: number;
  ai_suggested_score?: number;
  ai_accepted?: boolean;
  critical_error_detected?: boolean;
}

// Zendesk instance URL mapping
export const ZD_INSTANCES = {
  customerserviceadvocates: 'customerserviceadvocates.zendesk.com',
  customerserviceadvocateshelp: 'customerserviceadvocateshelp.zendesk.com',
} as const;

export type ZDInstance = keyof typeof ZD_INSTANCES;

// Generate ticket URL
export function generateTicketUrl(instance: ZDInstance, ticketId: string): string {
  return `https://${ZD_INSTANCES[instance]}/agent/tickets/${ticketId}`;
}

// Fetch all QA evaluations
export async function fetchQAEvaluations(): Promise<QAEvaluation[]> {
  const { data, error } = await supabase
    .from('qa_evaluations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as QAEvaluation[];
}

// Fetch single QA evaluation with scores and actions
export async function fetchQAEvaluationById(id: string): Promise<{
  evaluation: QAEvaluation;
  scores: QAEvaluationScore[];
  actions: QAActionNeeded[];
}> {
  const [evaluationRes, scoresRes, actionsRes] = await Promise.all([
    supabase.from('qa_evaluations').select('*').eq('id', id).single(),
    supabase.from('qa_evaluation_scores').select('*').eq('evaluation_id', id),
    supabase.from('qa_action_needed').select('*, action_plan:qa_action_plans(*)').eq('evaluation_id', id),
  ]);

  if (evaluationRes.error) throw evaluationRes.error;
  if (scoresRes.error) throw scoresRes.error;
  if (actionsRes.error) throw actionsRes.error;

  return {
    evaluation: evaluationRes.data as QAEvaluation,
    scores: (scoresRes.data || []) as QAEvaluationScore[],
    actions: (actionsRes.data || []) as QAActionNeeded[],
  };
}

// Fetch action plans
export async function fetchActionPlans(): Promise<QAActionPlan[]> {
  const { data, error } = await supabase
    .from('qa_action_plans')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return (data || []) as QAActionPlan[];
}

// Create QA evaluation
export async function createQAEvaluation(input: CreateQAEvaluationInput): Promise<QAEvaluation> {
  const { data, error } = await supabase
    .from('qa_evaluations')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as QAEvaluation;
}

// Create QA scores in bulk
export async function createQAScores(scores: CreateQAScoreInput[]): Promise<QAEvaluationScore[]> {
  const { data, error } = await supabase
    .from('qa_evaluation_scores')
    .insert(scores)
    .select();

  if (error) throw error;
  return (data || []) as QAEvaluationScore[];
}

// Update QA evaluation
export async function updateQAEvaluation(
  id: string, 
  updates: Partial<QAEvaluation>
): Promise<QAEvaluation> {
  const { data, error } = await supabase
    .from('qa_evaluations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as QAEvaluation;
}

// Create action needed
export async function createActionNeeded(
  evaluation_id: string,
  action_plan_id?: string,
  custom_action?: string
): Promise<QAActionNeeded> {
  const { data, error } = await supabase
    .from('qa_action_needed')
    .insert({ evaluation_id, action_plan_id, custom_action })
    .select('*, action_plan:qa_action_plans(*)')
    .single();

  if (error) throw error;
  return data as QAActionNeeded;
}

// Bulk create actions needed
export async function createActionsNeeded(
  actions: { evaluation_id: string; action_plan_id?: string; custom_action?: string }[]
): Promise<QAActionNeeded[]> {
  const { data, error } = await supabase
    .from('qa_action_needed')
    .insert(actions)
    .select();

  if (error) throw error;
  return (data || []) as QAActionNeeded[];
}

// Resolve action
export async function resolveAction(id: string): Promise<QAActionNeeded> {
  const { data, error } = await supabase
    .from('qa_action_needed')
    .update({ is_resolved: true, resolved_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as QAActionNeeded;
}

// Acknowledge evaluation (agent)
export async function acknowledgeEvaluation(id: string): Promise<QAEvaluation> {
  const { data, error } = await supabase
    .from('qa_evaluations')
    .update({ 
      agent_acknowledged: true, 
      acknowledged_at: new Date().toISOString() 
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  
  // Send acknowledgment notification
  try {
    await sendQANotification(id, 'acknowledgment');
  } catch (notifError) {
    console.error('Failed to send acknowledgment notification:', notifError);
  }
  
  return data as QAEvaluation;
}

// Mark evaluation as reviewed by agent
export async function markAgentReviewed(id: string, remarks?: string): Promise<QAEvaluation> {
  const updates: Partial<QAEvaluation> = {
    agent_reviewed: true,
    agent_reviewed_at: new Date().toISOString(),
  };
  
  if (remarks) {
    updates.agent_remarks = remarks;
  }
  
  const { data, error } = await supabase
    .from('qa_evaluations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as QAEvaluation;
}

// Fetch pending actions for an agent
export async function fetchPendingActionsForAgent(agentEmail: string): Promise<QAActionNeeded[]> {
  const { data, error } = await supabase
    .from('qa_action_needed')
    .select(`
      *,
      action_plan:qa_action_plans(*),
      evaluation:qa_evaluations!inner(agent_email, reference_number, audit_date)
    `)
    .eq('is_resolved', false)
    .eq('evaluation.agent_email', agentEmail);

  if (error) throw error;
  return (data || []) as QAActionNeeded[];
}

// Fetch past violations for an agent (all-time history)
export async function fetchAgentViolationHistory(agentEmail: string): Promise<{
  subcategory: string;
  count: number;
  last_occurrence: string;
}[]> {
  // First get all evaluations for this agent
  const { data: evaluations, error: evalError } = await supabase
    .from('qa_evaluations')
    .select('id, audit_date')
    .eq('agent_email', agentEmail);

  if (evalError) throw evalError;
  if (!evaluations || evaluations.length === 0) return [];

  const evaluationIds = evaluations.map(e => e.id);

  // Get all scores where score_earned < max_points
  const { data: scores, error: scoresError } = await supabase
    .from('qa_evaluation_scores')
    .select('subcategory, evaluation_id, score_earned, max_points')
    .in('evaluation_id', evaluationIds)
    .not('is_critical', 'eq', true);

  if (scoresError) throw scoresError;
  if (!scores) return [];

  // Filter violations and group by subcategory
  const violations: Record<string, { count: number; last_occurrence: string }> = {};
  
  scores.forEach(score => {
    if (score.score_earned !== null && score.max_points !== null && score.score_earned < score.max_points) {
      const eval_date = evaluations.find(e => e.id === score.evaluation_id)?.audit_date || '';
      if (!violations[score.subcategory]) {
        violations[score.subcategory] = { count: 0, last_occurrence: eval_date };
      }
      violations[score.subcategory].count++;
      if (eval_date > violations[score.subcategory].last_occurrence) {
        violations[score.subcategory].last_occurrence = eval_date;
      }
    }
  });

  return Object.entries(violations).map(([subcategory, data]) => ({
    subcategory,
    count: data.count,
    last_occurrence: data.last_occurrence,
  }));
}

// Fetch evaluations for date range
export async function fetchEvaluationsForDateRange(
  startDate: string,
  endDate: string
): Promise<QAEvaluation[]> {
  const { data, error } = await supabase
    .from('qa_evaluations')
    .select('*')
    .gte('audit_date', startDate)
    .lte('audit_date', endDate)
    .order('audit_date', { ascending: false });

  if (error) throw error;
  return (data || []) as QAEvaluation[];
}

// Fetch weekly comparison stats (last 4 weeks)
export async function fetchWeeklyComparisonStats(): Promise<{
  week: string;
  startDate: string;
  endDate: string;
  evaluationCount: number;
  averageScore: number;
}[]> {
  const now = new Date();
  const weeks: { week: string; startDate: string; endDate: string }[] = [];
  
  // Calculate last 4 weeks (Monday to Sunday)
  for (let i = 0; i < 4; i++) {
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - now.getDay() - (i * 7));
    if (now.getDay() === 0) {
      weekEnd.setDate(weekEnd.getDate() - 7);
    }
    
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);
    
    weeks.push({
      week: `Week ${4 - i}`,
      startDate: weekStart.toISOString().split('T')[0],
      endDate: weekEnd.toISOString().split('T')[0],
    });
  }

  // Fetch evaluations for all 4 weeks
  const { data, error } = await supabase
    .from('qa_evaluations')
    .select('audit_date, percentage')
    .gte('audit_date', weeks[weeks.length - 1].startDate)
    .lte('audit_date', weeks[0].endDate);

  if (error) throw error;

  // Calculate stats for each week
  return weeks.reverse().map(week => {
    const weekEvaluations = (data || []).filter(
      e => e.audit_date >= week.startDate && e.audit_date <= week.endDate
    );
    
    const avgScore = weekEvaluations.length > 0
      ? weekEvaluations.reduce((sum, e) => sum + Number(e.percentage), 0) / weekEvaluations.length
      : 0;

    return {
      ...week,
      evaluationCount: weekEvaluations.length,
      averageScore: Math.round(avgScore * 100) / 100,
    };
  });
}

// Delete QA evaluation
export async function deleteQAEvaluation(id: string): Promise<void> {
  const { error } = await supabase
    .from('qa_evaluations')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Scoring categories structure - NEW structure with all-or-nothing scoring
// Total max points: 52 (Accuracy: 21, Compliance: 17, Customer Experience: 14)
// Pass threshold: 96% or above with no critical errors
export const SCORING_CATEGORIES = [
  {
    category: 'Accuracy',
    feedbackField: 'accuracy_feedback',
    subcategories: [
      // Critical error first
      { subcategory: 'Incorrect Critical Info', behavior: 'Did the agent provide incorrect critical information?', maxPoints: 0, isCritical: true },
      // Regular scoring items (all-or-nothing: 0 or maxPoints)
      { subcategory: 'Language & Grammar', behavior: 'Uses correct spelling, grammar, and language', maxPoints: 3, isCritical: false },
      { subcategory: 'Clarity & Structure', behavior: 'Provides clear and well-structured responses', maxPoints: 2, isCritical: false },
      { subcategory: 'Understanding the Issue', behavior: 'Correctly identifies and understands the customer issue', maxPoints: 5, isCritical: false },
      { subcategory: 'Solution Accuracy', behavior: 'Provides accurate and appropriate solutions', maxPoints: 6, isCritical: false },
      { subcategory: 'First Contact Resolution', behavior: 'Resolves the issue in one interaction when possible', maxPoints: 3, isCritical: false },
      { subcategory: 'Timeliness', behavior: 'Responds within expected timeframes', maxPoints: 2, isCritical: false },
    ],
  },
  {
    category: 'Compliance',
    feedbackField: 'compliance_feedback',
    subcategories: [
      // Critical errors first
      { subcategory: 'Policy and Process Breach', behavior: 'Did the agent breach a critical policy or process?', maxPoints: 0, isCritical: true },
      { subcategory: 'Security Breach', behavior: 'Did the agent commit a security breach?', maxPoints: 0, isCritical: true },
      // Regular scoring items
      { subcategory: 'Account Verification', behavior: 'Properly verifies customer account before making changes', maxPoints: 4, isCritical: false },
      { subcategory: 'Policy Compliance', behavior: 'Follows company policies and procedures', maxPoints: 4, isCritical: false },
      { subcategory: 'Escalation Handling', behavior: 'Escalates issues appropriately when needed', maxPoints: 3, isCritical: false },
      { subcategory: 'Documentation', behavior: 'Properly documents interactions and actions taken', maxPoints: 3, isCritical: false },
      { subcategory: 'Confidentiality', behavior: 'Maintains customer confidentiality and data privacy', maxPoints: 3, isCritical: false },
    ],
  },
  {
    category: 'Customer Experience',
    feedbackField: 'customer_exp_feedback',
    subcategories: [
      // Critical error first
      { subcategory: 'Rude / Disrespectful Behavior', behavior: 'Was the agent rude or disrespectful to the customer?', maxPoints: 0, isCritical: true },
      // Regular scoring items
      { subcategory: 'Greeting & Introduction', behavior: 'Properly greets and introduces themselves', maxPoints: 2, isCritical: false },
      { subcategory: 'Tone & Empathy', behavior: 'Demonstrates empathy and uses appropriate tone', maxPoints: 3, isCritical: false },
      { subcategory: 'Active Listening / Acknowledgement', behavior: 'Actively listens and acknowledges customer concerns', maxPoints: 3, isCritical: false },
      { subcategory: 'Proactive Assistance', behavior: 'Proactively offers additional help or information', maxPoints: 4, isCritical: false },
      { subcategory: 'Positive Language', behavior: 'Uses positive and professional language', maxPoints: 3, isCritical: false },
      { subcategory: 'Rapport Building', behavior: 'Builds rapport with the customer', maxPoints: 2, isCritical: false },
      { subcategory: 'Closure', behavior: 'Properly closes the interaction', maxPoints: 2, isCritical: false },
    ],
  },
];

// Category type for reference
export type ScoringCategory = typeof SCORING_CATEGORIES[number];

// Interaction types
export const INTERACTION_TYPES = [
  'Call',
  'Email',
  'Chat',
  'Hybrid',
  'Logistics',
  'Other',
] as const;

export type InteractionType = typeof INTERACTION_TYPES[number];

// Calculate rating based on percentage and critical fails
// Pass: 96% or above with no critical errors
// Fail: Below 96% OR has any critical error
export const PASS_THRESHOLD = 96;

export function calculateRating(percentage: number, hasCriticalFail: boolean): 'Pass' | 'Fail' {
  if (hasCriticalFail) return 'Fail';
  return percentage >= PASS_THRESHOLD ? 'Pass' : 'Fail';
}

// Calculate totals from scores
export function calculateScoreTotals(scores: { score_earned: number | null; max_points: number; is_critical: boolean; critical_error_detected?: boolean | null }[]): {
  totalScore: number;
  totalMax: number;
  percentage: number;
  hasCriticalFail: boolean;
} {
  const hasCriticalFail = scores.some(s => s.is_critical && s.critical_error_detected === true);
  
  if (hasCriticalFail) {
    return {
      totalScore: 0,
      totalMax: scores.filter(s => !s.is_critical).reduce((sum, s) => sum + s.max_points, 0),
      percentage: 0,
      hasCriticalFail: true,
    };
  }
  
  const nonCriticalScores = scores.filter(s => !s.is_critical);
  const totalScore = nonCriticalScores.reduce((sum, s) => sum + (s.score_earned || 0), 0);
  const totalMax = nonCriticalScores.reduce((sum, s) => sum + s.max_points, 0);
  const percentage = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
  
  return { totalScore, totalMax, percentage, hasCriticalFail: false };
}

// Send QA notification
export async function sendQANotification(
  evaluationId: string,
  type: 'new_evaluation' | 'acknowledgment'
): Promise<void> {
  const { error } = await supabase.functions.invoke('send-qa-notification', {
    body: { evaluationId, type },
  });
  
  if (error) throw error;
}

// Finalize and send evaluation to agent
export async function finalizeAndSendEvaluation(id: string): Promise<QAEvaluation> {
  // First update status to sent
  const { data, error } = await supabase
    .from('qa_evaluations')
    .update({ status: 'sent' })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  
  // Send notification
  await sendQANotification(id, 'new_evaluation');
  
  return data as QAEvaluation;
}

// Create evaluation event (audit trail)
export async function createEvaluationEvent(
  evaluationId: string,
  eventType: string,
  eventDescription: string,
  actorEmail: string,
  actorName?: string,
  metadata?: Record<string, any>
): Promise<void> {
  const { error } = await supabase
    .from('qa_evaluation_events')
    .insert({
      evaluation_id: evaluationId,
      event_type: eventType,
      event_description: eventDescription,
      actor_email: actorEmail,
      actor_name: actorName,
      metadata: metadata || {},
    });

  if (error) {
    console.error('Failed to create evaluation event:', error);
  }
}

// Fetch evaluation events (audit trail)
export async function fetchEvaluationEvents(evaluationId: string): Promise<QAEvaluationEvent[]> {
  const { data, error } = await supabase
    .from('qa_evaluation_events')
    .select('*')
    .eq('evaluation_id', evaluationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as QAEvaluationEvent[];
}

// Resend QA notification (throws on failure for UI toast)
export async function resendQANotification(evaluationId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('send-qa-notification', {
    body: { evaluationId, type: 'new_evaluation' },
  });
  
  if (error) {
    throw new Error(error.message || 'Failed to send notification');
  }
}
