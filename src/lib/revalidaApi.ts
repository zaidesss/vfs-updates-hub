import { supabase } from "@/integrations/supabase/client";

// Types
export interface RevalidaBatch {
  id: string;
  title: string;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
  total_points: number;
  question_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RevalidaQuestion {
  id: string;
  batch_id: string;
  type: 'mcq' | 'true_false' | 'situational';
  prompt: string;
  choice_a: string | null;
  choice_b: string | null;
  choice_c: string | null;
  choice_d: string | null;
  correct_answer: string | null;
  points: number;
  order_index: number;
  is_required: boolean;
  created_at: string;
}

export interface RevalidaAttempt {
  id: string;
  batch_id: string;
  agent_id: string;
  agent_email: string;
  question_order: string[];
  status: 'in_progress' | 'submitted' | 'needs_manual_review' | 'graded';
  started_at: string;
  submitted_at: string | null;
  auto_score_points: number;
  auto_total_points: number;
  manual_score_points: number;
  manual_total_points: number;
  final_percent: number | null;
  graded_by: string | null;
  graded_at: string | null;
  created_at: string;
}

export interface RevalidaAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  answer_value: string | null;
  is_correct: boolean | null;
  points_awarded: number | null;
  feedback: string | null;
  graded_at: string | null;
  created_at: string;
}

export interface QuestionImport {
  type: 'mcq' | 'true_false' | 'situational';
  prompt: string;
  choice_a?: string;
  choice_b?: string;
  choice_c?: string;
  choice_d?: string;
  correct_answer?: string;
  points: number;
  order_index: number;
  is_required?: boolean;
}

// Fetch all batches (admin sees all, agents see active only via RLS)
export async function fetchBatches(): Promise<RevalidaBatch[]> {
  const { data, error } = await supabase
    .from('revalida_batches')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as RevalidaBatch[];
}

// Fetch single batch with questions
export async function fetchBatchById(batchId: string): Promise<{
  batch: RevalidaBatch;
  questions: RevalidaQuestion[];
}> {
  const [batchResult, questionsResult] = await Promise.all([
    supabase.from('revalida_batches').select('*').eq('id', batchId).single(),
    supabase.from('revalida_questions').select('*').eq('batch_id', batchId).order('order_index'),
  ]);

  if (batchResult.error) throw batchResult.error;
  if (questionsResult.error) throw questionsResult.error;

  return {
    batch: batchResult.data as RevalidaBatch,
    questions: (questionsResult.data || []) as RevalidaQuestion[],
  };
}

// Create a new batch with questions (from import)
export async function createBatch(
  title: string,
  questions: QuestionImport[],
  createdBy: string
): Promise<RevalidaBatch> {
  // Calculate totals
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const questionCount = questions.length;

  // Insert batch
  const { data: batch, error: batchError } = await supabase
    .from('revalida_batches')
    .insert({
      title,
      total_points: totalPoints,
      question_count: questionCount,
      created_by: createdBy,
    })
    .select()
    .single();

  if (batchError) throw batchError;

  // Insert questions
  const questionsToInsert = questions.map((q, idx) => ({
    batch_id: batch.id,
    type: q.type,
    prompt: q.prompt,
    choice_a: q.choice_a || null,
    choice_b: q.choice_b || null,
    choice_c: q.choice_c || null,
    choice_d: q.choice_d || null,
    correct_answer: q.correct_answer || null,
    points: q.points,
    order_index: q.order_index ?? idx,
    is_required: q.is_required ?? true,
  }));

  const { error: questionsError } = await supabase
    .from('revalida_questions')
    .insert(questionsToInsert);

  if (questionsError) throw questionsError;

  return batch as RevalidaBatch;
}

// Publish a batch (set active, start_at=now, end_at=now+48h)
export async function publishBatch(batchId: string): Promise<RevalidaBatch> {
  const now = new Date();
  const endAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // +48 hours

  const { data, error } = await supabase
    .from('revalida_batches')
    .update({
      is_active: true,
      start_at: now.toISOString(),
      end_at: endAt.toISOString(),
    })
    .eq('id', batchId)
    .select()
    .single();

  if (error) throw error;
  return data as RevalidaBatch;
}

// Deactivate a batch
export async function deactivateBatch(batchId: string): Promise<RevalidaBatch> {
  const { data, error } = await supabase
    .from('revalida_batches')
    .update({ is_active: false })
    .eq('id', batchId)
    .select()
    .single();

  if (error) throw error;
  return data as RevalidaBatch;
}

// Delete a batch
export async function deleteBatch(batchId: string): Promise<void> {
  const { error } = await supabase
    .from('revalida_batches')
    .delete()
    .eq('id', batchId);

  if (error) throw error;
}

// Update an existing batch (for drafts only)
export async function updateBatch(
  batchId: string,
  title: string,
  questions: QuestionImport[]
): Promise<RevalidaBatch> {
  // Calculate totals
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const questionCount = questions.length;

  // Update batch
  const { data: batch, error: batchError } = await supabase
    .from('revalida_batches')
    .update({
      title,
      total_points: totalPoints,
      question_count: questionCount,
    })
    .eq('id', batchId)
    .select()
    .single();

  if (batchError) throw batchError;

  // Delete old questions
  const { error: deleteError } = await supabase
    .from('revalida_questions')
    .delete()
    .eq('batch_id', batchId);

  if (deleteError) throw deleteError;

  // Insert new questions
  const questionsToInsert = questions.map((q, idx) => ({
    batch_id: batchId,
    type: q.type,
    prompt: q.prompt,
    choice_a: q.choice_a || null,
    choice_b: q.choice_b || null,
    choice_c: q.choice_c || null,
    choice_d: q.choice_d || null,
    correct_answer: q.correct_answer || null,
    points: q.points,
    order_index: q.order_index ?? idx,
    is_required: q.is_required ?? true,
  }));

  const { error: questionsError } = await supabase
    .from('revalida_questions')
    .insert(questionsToInsert);

  if (questionsError) throw questionsError;

  return batch as RevalidaBatch;
}

// Start an attempt (create with shuffled question order)
export async function startAttempt(
  batchId: string,
  agentId: string,
  agentEmail: string
): Promise<RevalidaAttempt> {
  // First check if deadline has passed
  const { data: batch, error: batchError } = await supabase
    .from('revalida_batches')
    .select('end_at, is_active')
    .eq('id', batchId)
    .single();

  if (batchError) throw batchError;
  if (!batch.is_active) throw new Error('This test is no longer active');
  if (batch.end_at && new Date() > new Date(batch.end_at)) {
    throw new Error('The deadline for this test has passed');
  }

  // Fetch questions for this batch
  const { data: questions, error: questionsError } = await supabase
    .from('revalida_questions')
    .select('id')
    .eq('batch_id', batchId);

  if (questionsError) throw questionsError;

  // Shuffle question IDs
  const questionIds = questions.map(q => q.id);
  const shuffled = [...questionIds].sort(() => Math.random() - 0.5);

  // Create attempt
  const { data, error } = await supabase
    .from('revalida_attempts')
    .insert({
      batch_id: batchId,
      agent_id: agentId,
      agent_email: agentEmail.toLowerCase(),
      question_order: shuffled,
      status: 'in_progress',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('You have already taken this test');
    }
    throw error;
  }

  return data as RevalidaAttempt;
}

// Fetch agent's attempt for a batch
export async function fetchMyAttempt(
  batchId: string,
  agentEmail: string
): Promise<RevalidaAttempt | null> {
  const { data, error } = await supabase
    .from('revalida_attempts')
    .select('*')
    .eq('batch_id', batchId)
    .eq('agent_email', agentEmail.toLowerCase())
    .maybeSingle();

  if (error) throw error;
  return data as RevalidaAttempt | null;
}

// Fetch all attempts for a batch (admin)
export async function fetchAllAttempts(batchId?: string): Promise<RevalidaAttempt[]> {
  let query = supabase.from('revalida_attempts').select('*');
  
  if (batchId) {
    query = query.eq('batch_id', batchId);
  }
  
  const { data, error } = await query.order('started_at', { ascending: false });

  if (error) throw error;
  return (data || []) as RevalidaAttempt[];
}

// Submit attempt with answers (auto-grade MCQ/TF)
export async function submitAttempt(
  attemptId: string,
  answers: { question_id: string; answer_value: string }[]
): Promise<RevalidaAttempt> {
  // Fetch the attempt to verify
  const { data: attempt, error: attemptError } = await supabase
    .from('revalida_attempts')
    .select('*, batch:revalida_batches(end_at, is_active)')
    .eq('id', attemptId)
    .single();

  if (attemptError) throw attemptError;
  if (attempt.status !== 'in_progress') {
    throw new Error('This test has already been submitted');
  }

  const batch = attempt.batch as { end_at: string | null; is_active: boolean };
  if (batch.end_at && new Date() > new Date(batch.end_at)) {
    throw new Error('The deadline for this test has passed');
  }

  // Fetch questions for grading
  const { data: questions, error: questionsError } = await supabase
    .from('revalida_questions')
    .select('*')
    .eq('batch_id', attempt.batch_id);

  if (questionsError) throw questionsError;

  const questionsMap = new Map(questions.map(q => [q.id, q]));

  // Grade answers
  let autoScorePoints = 0;
  let autoTotalPoints = 0;
  let manualTotalPoints = 0;
  let hasSituational = false;

  const gradedAnswers = answers.map(answer => {
    const question = questionsMap.get(answer.question_id);
    if (!question) return null;

    if (question.type === 'situational') {
      hasSituational = true;
      manualTotalPoints += question.points;
      return {
        attempt_id: attemptId,
        question_id: answer.question_id,
        answer_value: answer.answer_value,
        is_correct: null,
        points_awarded: null,
      };
    } else {
      autoTotalPoints += question.points;
      const isCorrect = answer.answer_value === question.correct_answer;
      const pointsAwarded = isCorrect ? question.points : 0;
      autoScorePoints += pointsAwarded;

      return {
        attempt_id: attemptId,
        question_id: answer.question_id,
        answer_value: answer.answer_value,
        is_correct: isCorrect,
        points_awarded: pointsAwarded,
        graded_at: new Date().toISOString(),
      };
    }
  }).filter(Boolean);

  // Insert answers
  const { error: answersError } = await supabase
    .from('revalida_answers')
    .insert(gradedAnswers);

  if (answersError) throw answersError;

  // Determine status and final_percent
  const status = hasSituational ? 'needs_manual_review' : 'graded';
  const finalPercent = hasSituational
    ? null
    : (autoTotalPoints > 0 ? (autoScorePoints / autoTotalPoints) * 100 : 0);

  // Update attempt
  const { data: updatedAttempt, error: updateError } = await supabase
    .from('revalida_attempts')
    .update({
      status,
      submitted_at: new Date().toISOString(),
      auto_score_points: autoScorePoints,
      auto_total_points: autoTotalPoints,
      manual_total_points: manualTotalPoints,
      final_percent: finalPercent,
      ...(status === 'graded' && { graded_at: new Date().toISOString() }),
    })
    .eq('id', attemptId)
    .select()
    .single();

  if (updateError) throw updateError;

  return updatedAttempt as RevalidaAttempt;
}

// Fetch review queue (attempts needing manual review)
export async function fetchReviewQueue(): Promise<RevalidaAttempt[]> {
  const { data, error } = await supabase
    .from('revalida_attempts')
    .select('*')
    .eq('status', 'needs_manual_review')
    .order('submitted_at', { ascending: true });

  if (error) throw error;
  return (data || []) as RevalidaAttempt[];
}

// Fetch answers for an attempt
export async function fetchAnswersForAttempt(attemptId: string): Promise<RevalidaAnswer[]> {
  const { data, error } = await supabase
    .from('revalida_answers')
    .select('*')
    .eq('attempt_id', attemptId);

  if (error) throw error;
  return (data || []) as RevalidaAnswer[];
}

// Grade a situational answer
export async function gradeAnswer(
  answerId: string,
  pointsAwarded: number,
  feedback?: string
): Promise<RevalidaAnswer> {
  const { data, error } = await supabase
    .from('revalida_answers')
    .update({
      points_awarded: pointsAwarded,
      is_correct: pointsAwarded > 0,
      feedback: feedback || null,
      graded_at: new Date().toISOString(),
    })
    .eq('id', answerId)
    .select()
    .single();

  if (error) throw error;
  return data as RevalidaAnswer;
}

// Finalize attempt after all situational answers are graded
export async function finalizeAttempt(
  attemptId: string,
  graderEmail: string
): Promise<RevalidaAttempt> {
  // Get all answers for this attempt
  const { data: answers, error: answersError } = await supabase
    .from('revalida_answers')
    .select('points_awarded')
    .eq('attempt_id', attemptId);

  if (answersError) throw answersError;

  // Get current attempt
  const { data: attempt, error: attemptError } = await supabase
    .from('revalida_attempts')
    .select('auto_score_points, auto_total_points, manual_total_points')
    .eq('id', attemptId)
    .single();

  if (attemptError) throw attemptError;

  // Calculate manual score points from situational answers
  const manualScorePoints = answers
    .filter(a => a.points_awarded !== null)
    .reduce((sum, a) => sum + (a.points_awarded || 0), 0) - attempt.auto_score_points;

  // Calculate final percent
  const totalPoints = attempt.auto_total_points + attempt.manual_total_points;
  const totalScore = attempt.auto_score_points + manualScorePoints;
  const finalPercent = totalPoints > 0 ? (totalScore / totalPoints) * 100 : 0;

  // Update attempt
  const { data: updatedAttempt, error: updateError } = await supabase
    .from('revalida_attempts')
    .update({
      status: 'graded',
      manual_score_points: manualScorePoints,
      final_percent: finalPercent,
      graded_by: graderEmail,
      graded_at: new Date().toISOString(),
    })
    .eq('id', attemptId)
    .select()
    .single();

  if (updateError) throw updateError;

  return updatedAttempt as RevalidaAttempt;
}

// Fetch agent name map (email -> full_name)
export async function fetchAgentNameMap(): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('agent_profiles')
    .select('email, full_name')
    .not('full_name', 'is', null);

  if (error) throw error;
  const map = new Map<string, string>();
  (data || []).forEach(row => {
    if (row.email && row.full_name) {
      map.set(row.email.toLowerCase(), row.full_name);
    }
  });
  return map;
}

// Override an answer's score (admin manual override)
export async function overrideAnswer(
  answerId: string,
  pointsAwarded: number,
  isCorrect: boolean,
  feedback?: string
): Promise<RevalidaAnswer> {
  const { data, error } = await supabase
    .from('revalida_answers')
    .update({
      points_awarded: pointsAwarded,
      is_correct: isCorrect,
      feedback: feedback || null,
      graded_at: new Date().toISOString(),
    })
    .eq('id', answerId)
    .select()
    .single();

  if (error) throw error;
  return data as RevalidaAnswer;
}

// Recalculate attempt score from all answers after overrides
export async function recalculateAttemptScore(
  attemptId: string,
  graderEmail: string
): Promise<RevalidaAttempt> {
  // Get all answers
  const { data: answers, error: answersError } = await supabase
    .from('revalida_answers')
    .select('*, question:revalida_questions(type, points)')
    .eq('attempt_id', attemptId);

  if (answersError) throw answersError;

  let autoScorePoints = 0;
  let autoTotalPoints = 0;
  let manualScorePoints = 0;
  let manualTotalPoints = 0;

  for (const ans of answers || []) {
    const q = ans.question as any;
    if (!q) continue;
    if (q.type === 'situational') {
      manualTotalPoints += q.points;
      manualScorePoints += ans.points_awarded ?? 0;
    } else {
      autoTotalPoints += q.points;
      autoScorePoints += ans.points_awarded ?? 0;
    }
  }

  const totalPoints = autoTotalPoints + manualTotalPoints;
  const totalScore = autoScorePoints + manualScorePoints;
  const finalPercent = totalPoints > 0 ? (totalScore / totalPoints) * 100 : 0;

  // Check if all answers are graded
  const allGraded = (answers || []).every(a => a.points_awarded !== null);

  const { data, error } = await supabase
    .from('revalida_attempts')
    .update({
      auto_score_points: autoScorePoints,
      auto_total_points: autoTotalPoints,
      manual_score_points: manualScorePoints,
      manual_total_points: manualTotalPoints,
      final_percent: finalPercent,
      status: allGraded ? 'graded' : 'needs_manual_review',
      graded_by: graderEmail,
      graded_at: new Date().toISOString(),
    })
    .eq('id', attemptId)
    .select()
    .single();

  if (error) throw error;
  return data as RevalidaAttempt;
}

// Check if batch deadline has passed
export function isDeadlinePassed(endAt: string | null): boolean {
  if (!endAt) return false;
  return new Date() > new Date(endAt);
}

// Calculate time remaining until deadline
export function getTimeRemaining(endAt: string | null): string {
  if (!endAt) return '';
  
  const now = new Date();
  const end = new Date(endAt);
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return 'Expired';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h remaining`;
  }
  
  return `${hours}h ${minutes}m remaining`;
}
