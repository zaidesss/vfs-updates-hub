import { supabase } from "@/integrations/supabase/client";

// ============================================
// BATCH MANAGEMENT
// ============================================

export interface RevalidaV2Batch {
  id: string;
  title: string;
  is_active: boolean;
  start_at: string;
  end_at: string;
  mcq_count: number;
  tf_count: number;
  situational_count: number;
  total_points: number;
  generation_status: 'pending' | 'generating' | 'completed' | 'failed';
  generation_error?: string;
  source_week_start?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RevalidaV2Question {
  id: string;
  batch_id: string;
  type: 'mcq' | 'true_false' | 'situational';
  prompt: string;
  choice_a?: string;
  choice_b?: string;
  choice_c?: string;
  choice_d?: string;
  correct_answer?: string;
  points: number;
  order_index: number;
  source_type: 'kb_article' | 'qa_action' | 'qa_ai_suggestion' | 'contract';
  source_reference?: string;
  source_excerpt?: string;
  evaluation_rubric?: string;
  created_at: string;
}

export interface RevalidaV2Attempt {
  id: string;
  batch_id: string;
  agent_email: string;
  status: 'in_progress' | 'submitted' | 'graded';
  score?: number;
  percentage?: number;
  started_at?: string;
  submitted_at?: string;
  graded_at?: string;
  question_order?: string[];
  created_at: string;
  updated_at: string;
}

export interface RevalidaV2Answer {
  id: string;
  attempt_id: string;
  question_id: string;
  agent_answer?: string;
  is_correct?: boolean;
  points_earned?: number;
  ai_suggested_score?: number;
  ai_score_justification?: string;
  ai_status: 'pending' | 'graded' | 'override';
  admin_override_score?: number;
  admin_override_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface RevalidaV2Contract {
  id: string;
  name: string;
  file_path?: string;
  parsed_content: string;
  support_type?: string;
  is_active: boolean;
  uploaded_by: string;
  uploaded_at: string;
}

// ============================================
// BATCH CRUD
// ============================================

export const createBatch = async (batch: Omit<RevalidaV2Batch, 'id' | 'created_at' | 'updated_at' | 'total_points'>) => {
  const { data, error } = await supabase
    .from('revalida_v2_batches')
    .insert([batch])
    .select()
    .single();

  if (error) throw error;
  return data as RevalidaV2Batch;
};

export const getBatch = async (batchId: string) => {
  const { data, error } = await supabase
    .from('revalida_v2_batches')
    .select('*')
    .eq('id', batchId)
    .single();

  if (error) throw error;
  return data as RevalidaV2Batch;
};

export const listBatches = async () => {
  const { data, error } = await supabase
    .from('revalida_v2_batches')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as RevalidaV2Batch[];
};

export const updateBatch = async (batchId: string, updates: Partial<RevalidaV2Batch>) => {
  const { data, error } = await supabase
    .from('revalida_v2_batches')
    .update(updates)
    .eq('id', batchId)
    .select()
    .single();

  if (error) throw error;
  return data as RevalidaV2Batch;
};

// ============================================
// QUESTIONS CRUD
// ============================================

export const getQuestionsByBatch = async (batchId: string) => {
  const { data, error } = await supabase
    .from('revalida_v2_questions')
    .select('*')
    .eq('batch_id', batchId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data as RevalidaV2Question[];
};

export const updateQuestion = async (questionId: string, updates: Partial<RevalidaV2Question>) => {
  const { data, error } = await supabase
    .from('revalida_v2_questions')
    .update(updates)
    .eq('id', questionId)
    .select()
    .single();

  if (error) throw error;
  return data as RevalidaV2Question;
};

// ============================================
// ATTEMPTS CRUD
// ============================================

export const getOrCreateAttempt = async (batchId: string, agentEmail: string) => {
  // Check if attempt exists
  const { data: existing } = await supabase
    .from('revalida_v2_attempts')
    .select('*')
    .eq('batch_id', batchId)
    .eq('agent_email', agentEmail)
    .single();

  if (existing) {
    return existing as RevalidaV2Attempt;
  }

  // Create new attempt with randomized question order
  const questions = await getQuestionsByBatch(batchId);
  const questionOrder = questions
    .map(q => q.id)
    .sort(() => Math.random() - 0.5);

  const { data, error } = await supabase
    .from('revalida_v2_attempts')
    .insert([
      {
        batch_id: batchId,
        agent_email: agentEmail,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        question_order: questionOrder,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as RevalidaV2Attempt;
};

export const getAttempt = async (attemptId: string) => {
  const { data, error } = await supabase
    .from('revalida_v2_attempts')
    .select('*')
    .eq('id', attemptId)
    .single();

  if (error) throw error;
  return data as RevalidaV2Attempt;
};

export const getAttemptsByBatch = async (batchId: string) => {
  const { data, error } = await supabase
    .from('revalida_v2_attempts')
    .select('*')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as RevalidaV2Attempt[];
};

export const updateAttempt = async (attemptId: string, updates: Partial<RevalidaV2Attempt>) => {
  const { data, error } = await supabase
    .from('revalida_v2_attempts')
    .update(updates)
    .eq('id', attemptId)
    .select()
    .single();

  if (error) throw error;
  return data as RevalidaV2Attempt;
};

// ============================================
// ANSWERS CRUD
// ============================================

export const getAnswersByAttempt = async (attemptId: string) => {
  const { data, error } = await supabase
    .from('revalida_v2_answers')
    .select('*')
    .eq('attempt_id', attemptId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as RevalidaV2Answer[];
};

export const upsertAnswer = async (answer: Omit<RevalidaV2Answer, 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('revalida_v2_answers')
    .upsert([answer], { onConflict: 'attempt_id,question_id' })
    .select()
    .single();

  if (error) throw error;
  return data as RevalidaV2Answer;
};

export const updateAnswer = async (answerId: string, updates: Partial<RevalidaV2Answer>) => {
  const { data, error } = await supabase
    .from('revalida_v2_answers')
    .update(updates)
    .eq('id', answerId)
    .select()
    .single();

  if (error) throw error;
  return data as RevalidaV2Answer;
};

// ============================================
// CONTRACTS CRUD
// ============================================

export const listContracts = async () => {
  const { data, error } = await supabase
    .from('revalida_v2_contracts')
    .select('*')
    .order('uploaded_at', { ascending: false });

  if (error) throw error;
  return data as RevalidaV2Contract[];
};

export const createContract = async (contract: Omit<RevalidaV2Contract, 'id' | 'uploaded_at'>) => {
  const { data, error } = await supabase
    .from('revalida_v2_contracts')
    .insert([contract])
    .select()
    .single();

  if (error) throw error;
  return data as RevalidaV2Contract;
};

export const updateContract = async (contractId: string, updates: Partial<RevalidaV2Contract>) => {
  const { data, error } = await supabase
    .from('revalida_v2_contracts')
    .update(updates)
    .eq('id', contractId)
    .select()
    .single();

  if (error) throw error;
  return data as RevalidaV2Contract;
};

export const deleteContract = async (contractId: string) => {
  const { error } = await supabase
    .from('revalida_v2_contracts')
    .delete()
    .eq('id', contractId);

  if (error) throw error;
};

// ============================================
// EDGE FUNCTION: GENERATE QUESTIONS
// ============================================

export const generateQuestions = async (batchId: string) => {
  const batch = await getBatch(batchId);
  
  // Update status to "generating"
  await updateBatch(batchId, { generation_status: 'generating' });

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-revalida-v2`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          batchId,
          mcqCount: batch.mcq_count,
          tfCount: batch.tf_count,
          situationalCount: batch.situational_count,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate questions');
    }

    const result = await response.json();

    // Update batch status
    await updateBatch(batchId, {
      generation_status: 'completed',
      source_week_start: result.sourceWeekStart,
    });

    return result;
  } catch (error) {
    await updateBatch(batchId, {
      generation_status: 'failed',
      generation_error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

// ============================================
// EDGE FUNCTION: GRADE SITUATIONAL
// ============================================

export const gradeSituational = async (answerId: string, questionId: string, agentAnswer: string) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/grade-situational-v2`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          answerId,
          questionId,
          agentAnswer,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to grade response');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw error;
  }
};

// ============================================
// HELPER: CALCULATE SCORE
// ============================================

export const calculateAttemptScore = async (attemptId: string) => {
  const answers = await getAnswersByAttempt(attemptId);
  
  let totalPoints = 0;
  let earnedPoints = 0;

  answers.forEach(answer => {
    if (answer.points_earned !== null && answer.points_earned !== undefined) {
      earnedPoints += answer.points_earned;
      totalPoints += answer.points_earned; // For MCQ/T-F
    } else if (answer.ai_status === 'graded' && answer.ai_suggested_score !== null) {
      earnedPoints += answer.ai_suggested_score;
      totalPoints += 5; // Situational max
    } else if (answer.admin_override_score !== null) {
      earnedPoints += answer.admin_override_score;
      totalPoints += 5; // Situational max
    }
  });

  const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

  return {
    score: earnedPoints,
    totalPoints,
    percentage: Math.round(percentage * 100) / 100,
  };
};

// ============================================
// PUBLISH BATCH (48-HOUR WINDOW)
// ============================================

export const publishBatch = async (batchId: string) => {
  const now = new Date();
  const endAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // +48 hours
  
  // Deactivate any currently active batch first
  await supabase
    .from('revalida_v2_batches')
    .update({ is_active: false })
    .eq('is_active', true)
    .neq('id', batchId);
  
  return await updateBatch(batchId, {
    is_active: true,
    start_at: now.toISOString(),
    end_at: endAt.toISOString(),
  });
};

// ============================================
// FETCH EXISTING ATTEMPT (NO AUTO-CREATE)
// ============================================

export const fetchMyAttempt = async (batchId: string, agentEmail: string): Promise<RevalidaV2Attempt | null> => {
  const { data, error } = await supabase
    .from('revalida_v2_attempts')
    .select('*')
    .eq('batch_id', batchId)
    .eq('agent_email', agentEmail)
    .maybeSingle();

  if (error) throw error;
  return data as RevalidaV2Attempt | null;
};

// ============================================
// DEADLINE HELPERS
// ============================================

export function isDeadlinePassed(endAt: string | null | undefined): boolean {
  if (!endAt) return false;
  return new Date() > new Date(endAt);
}

export function getTimeRemaining(endAt: string | null | undefined): string {
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

// ============================================
// DEACTIVATE BATCH
// ============================================

export const deactivateBatch = async (batchId: string) => {
  const { data, error } = await supabase
    .from('revalida_v2_batches')
    .update({ is_active: false })
    .eq('id', batchId)
    .select()
    .single();

  if (error) throw error;
  return data as RevalidaV2Batch;
};

// ============================================
// DELETE BATCH (with cascade)
// ============================================

export const deleteBatch = async (batchId: string) => {
  // Get all attempts for this batch first
  const { data: attempts } = await supabase
    .from('revalida_v2_attempts')
    .select('id')
    .eq('batch_id', batchId);

  // Delete answers for all attempts
  if (attempts && attempts.length > 0) {
    const attemptIds = attempts.map(a => a.id);
    await supabase
      .from('revalida_v2_answers')
      .delete()
      .in('attempt_id', attemptIds);
  }

  // Delete attempts
  await supabase
    .from('revalida_v2_attempts')
    .delete()
    .eq('batch_id', batchId);

  // Delete questions
  await supabase
    .from('revalida_v2_questions')
    .delete()
    .eq('batch_id', batchId);

  // Delete batch
  const { error } = await supabase
    .from('revalida_v2_batches')
    .delete()
    .eq('id', batchId);

  if (error) throw error;
};

// ============================================
// START ATTEMPT (WITH DEADLINE CHECK)
// ============================================

export const startAttempt = async (batchId: string, agentEmail: string): Promise<RevalidaV2Attempt> => {
  // Check if batch deadline has passed
  const batch = await getBatch(batchId);
  if (isDeadlinePassed(batch.end_at)) {
    throw new Error('This assessment has expired');
  }

  // Check if attempt already exists
  const existing = await fetchMyAttempt(batchId, agentEmail);
  if (existing) {
    return existing;
  }

  // Create new attempt with randomized question order
  const questions = await getQuestionsByBatch(batchId);
  const questionOrder = questions
    .map(q => q.id)
    .sort(() => Math.random() - 0.5);

  const { data, error } = await supabase
    .from('revalida_v2_attempts')
    .insert([
      {
        batch_id: batchId,
        agent_email: agentEmail,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        question_order: questionOrder,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as RevalidaV2Attempt;
};
