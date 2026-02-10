import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PageGuideButton } from '@/components/PageGuideButton';
import {
  fetchBatches,
  fetchBatchById,
  createBatch,
  updateBatch,
  publishBatch,
  deactivateBatch,
  deleteBatch,
  startAttempt,
  submitAttempt,
  fetchMyAttempt,
  fetchAllAttempts,
  fetchReviewQueue,
  fetchAnswersForAttempt,
  gradeAnswer,
  finalizeAttempt,
  RevalidaBatch,
  RevalidaQuestion,
  RevalidaAttempt,
  RevalidaAnswer,
  QuestionImport,
} from '@/lib/revalidaApi';
import { BatchCard } from '@/components/revalida/BatchCard';
import { BatchManagement } from '@/components/revalida/BatchManagement';
import { QuestionBuilder } from '@/components/revalida/QuestionBuilder';
import { QuestionDraft } from '@/components/revalida/QuestionCard';
import { TestForm } from '@/components/revalida/TestForm';
import { AttemptResult } from '@/components/revalida/AttemptResult';
import { SubmissionTable } from '@/components/revalida/SubmissionTable';
import { ReviewQueue } from '@/components/revalida/ReviewQueue';
import { GradingDialog } from '@/components/revalida/GradingDialog';
import { SubmissionDetailDialog } from '@/components/revalida/SubmissionDetailDialog';
import { BatchDetailDialog } from '@/components/revalida/BatchDetailDialog';
import { FileText, Loader2 } from 'lucide-react';

export default function Revalida() {
  const { user, isAdmin, profileId } = useAuth();
  const { toast } = useToast();

  // State
  const [batches, setBatches] = useState<RevalidaBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeBatch, setActiveBatch] = useState<RevalidaBatch | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<RevalidaQuestion[]>([]);
  const [myAttempt, setMyAttempt] = useState<RevalidaAttempt | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTestForm, setShowTestForm] = useState(false);

  // Question Builder state
  const [showQuestionBuilder, setShowQuestionBuilder] = useState(false);
  const [editingBatch, setEditingBatch] = useState<RevalidaBatch | null>(null);
  const [editingQuestions, setEditingQuestions] = useState<RevalidaQuestion[]>([]);
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  // Admin state
  const [allAttempts, setAllAttempts] = useState<RevalidaAttempt[]>([]);
  const [reviewQueue, setReviewQueue] = useState<RevalidaAttempt[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [attemptsLoading, setAttemptsLoading] = useState(false);

  // Grading dialog state
  const [gradingAttempt, setGradingAttempt] = useState<RevalidaAttempt | null>(null);
  const [gradingBatch, setGradingBatch] = useState<RevalidaBatch | null>(null);
  const [gradingQuestions, setGradingQuestions] = useState<RevalidaQuestion[]>([]);
  const [gradingAnswers, setGradingAnswers] = useState<RevalidaAnswer[]>([]);
  
  // View detail dialog state (for eye icon)
  const [viewingAttempt, setViewingAttempt] = useState<RevalidaAttempt | null>(null);
  const [viewingBatch, setViewingBatch] = useState<RevalidaBatch | null>(null);
  const [viewingQuestions, setViewingQuestions] = useState<RevalidaQuestion[]>([]);
  const [viewingAnswers, setViewingAnswers] = useState<RevalidaAnswer[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [gradingLoading, setGradingLoading] = useState(false);
  
  // Batch detail dialog state (for batch eye icon)
  const [viewingBatchDetail, setViewingBatchDetail] = useState<RevalidaBatch | null>(null);
  const [viewingBatchQuestions, setViewingBatchQuestions] = useState<RevalidaQuestion[]>([]);

  // Load batches
  const loadBatches = useCallback(async () => {
    try {
      const data = await fetchBatches();
      setBatches(data);

      // Find active batch for agents
      const active = data.find(b => b.is_active);
      if (active) {
        const { batch, questions } = await fetchBatchById(active.id);
        setActiveBatch(batch);
        setActiveQuestions(questions);

        // Load agent's attempt for this batch
        if (user?.email) {
          const attempt = await fetchMyAttempt(active.id, user.email);
          setMyAttempt(attempt);
        }
      } else {
        setActiveBatch(null);
        setActiveQuestions([]);
        setMyAttempt(null);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading batches',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.email, toast]);

  // Load attempts for admin
  const loadAttempts = useCallback(async () => {
    if (!isAdmin) return;

    setAttemptsLoading(true);
    try {
      const [attempts, queue] = await Promise.all([
        fetchAllAttempts(selectedBatchId || undefined),
        fetchReviewQueue(),
      ]);
      setAllAttempts(attempts);
      setReviewQueue(queue);
    } catch (error: any) {
      toast({
        title: 'Error loading submissions',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setAttemptsLoading(false);
    }
  }, [isAdmin, selectedBatchId, toast]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  useEffect(() => {
    if (isAdmin) {
      loadAttempts();
    }
  }, [isAdmin, loadAttempts]);

  // Convert QuestionDraft to QuestionImport
  const convertToImport = (draft: QuestionDraft): QuestionImport => ({
    type: draft.type,
    prompt: draft.prompt,
    choice_a: draft.choice_a || undefined,
    choice_b: draft.choice_b || undefined,
    choice_c: draft.choice_c || undefined,
    choice_d: draft.choice_d || undefined,
    correct_answer: draft.correct_answer || undefined,
    points: draft.points,
    order_index: draft.order_index,
  });

  // Handle create new batch
  const handleCreateNew = () => {
    setEditingBatch(null);
    setEditingQuestions([]);
    setShowQuestionBuilder(true);
  };

  // Handle edit batch
  const handleEditBatch = async (batchId: string) => {
    try {
      const { batch, questions } = await fetchBatchById(batchId);
      setEditingBatch(batch);
      setEditingQuestions(questions);
      setShowQuestionBuilder(true);
    } catch (error: any) {
      toast({
        title: 'Error loading batch',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Handle save draft
  const handleSaveDraft = async (title: string, questions: QuestionDraft[]) => {
    if (!user?.email) return;

    setIsSavingBatch(true);
    try {
      const questionsImport = questions.map(convertToImport);
      
      if (editingBatch) {
        // Update existing batch
        await updateBatch(editingBatch.id, title, questionsImport);
        toast({
          title: 'Batch Updated',
          description: `"${title}" has been saved.`,
        });
      } else {
        // Create new batch
        await createBatch(title, questionsImport, user.email);
        toast({
          title: 'Batch Created',
          description: `"${title}" has been saved as a draft.`,
        });
      }
      
      setShowQuestionBuilder(false);
      setEditingBatch(null);
      setEditingQuestions([]);
      await loadBatches();
    } finally {
      setIsSavingBatch(false);
    }
  };

  // Send revalida email notification (non-blocking)
  const sendRevalidaNotification = async (batchTitle: string, version: 'v1' | 'v2') => {
    try {
      const testUrl = `${window.location.origin}/${version === 'v2' ? 'team-performance/revalida-v2' : 'team-performance/revalida'}`;
      const { error } = await supabase.functions.invoke('send-revalida-notification', {
        body: { batchTitle, testUrl, version },
      });
      if (error) throw error;
      toast({
        title: 'Revalida test is live!',
        description: 'All users have been notified via email.',
      });
    } catch (err) {
      console.error('Failed to send revalida notification:', err);
      toast({
        title: 'Published successfully',
        description: 'But email notification failed to send.',
        variant: 'destructive',
      });
    }
  };

  // Handle save and publish
  const handleSaveAndPublish = async (title: string, questions: QuestionDraft[]) => {
    if (!user?.email) return;

    setIsSavingBatch(true);
    try {
      const questionsImport = questions.map(convertToImport);
      
      let batch: RevalidaBatch;
      if (editingBatch) {
        batch = await updateBatch(editingBatch.id, title, questionsImport);
      } else {
        batch = await createBatch(title, questionsImport, user.email);
      }
      
      // Deactivate any currently active batch first
      const currentActive = batches.find(b => b.is_active);
      if (currentActive && currentActive.id !== batch.id) {
        await deactivateBatch(currentActive.id);
      }

      await publishBatch(batch.id);
      
      toast({
        title: 'Batch Published',
        description: 'The test is now available to agents for 48 hours.',
      });
      
      // Send email notification (non-blocking)
      sendRevalidaNotification(title, 'v1');
      
      setShowQuestionBuilder(false);
      setEditingBatch(null);
      setEditingQuestions([]);
      await loadBatches();
    } finally {
      setIsSavingBatch(false);
    }
  };

  // Handle publish
  const handlePublish = async (batchId: string) => {
    // Deactivate any currently active batch first
    const currentActive = batches.find(b => b.is_active);
    if (currentActive && currentActive.id !== batchId) {
      await deactivateBatch(currentActive.id);
    }

    await publishBatch(batchId);
    
    // Get batch title for notification
    const batch = batches.find(b => b.id === batchId);
    
    toast({
      title: 'Batch Published',
      description: 'The test is now available to agents for 48 hours.',
    });
    
    // Send email notification (non-blocking)
    if (batch) {
      sendRevalidaNotification(batch.title, 'v1');
    }
    
    await loadBatches();
  };

  // Handle deactivate
  const handleDeactivate = async (batchId: string) => {
    await deactivateBatch(batchId);
    toast({
      title: 'Batch Deactivated',
      description: 'The test is no longer available to agents.',
    });
    await loadBatches();
  };

  // Handle delete
  const handleDelete = async (batchId: string) => {
    await deleteBatch(batchId);
    toast({
      title: 'Batch Deleted',
      description: 'The batch and all associated data have been removed.',
    });
    await loadBatches();
  };

  // Handle start test
  const handleStartTest = async () => {
    if (!activeBatch || !profileId || !user?.email) return;

    setIsStarting(true);
    try {
      const attempt = await startAttempt(activeBatch.id, profileId, user.email);
      setMyAttempt(attempt);
      setShowTestForm(true);
    } catch (error: any) {
      toast({
        title: 'Cannot Start Test',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsStarting(false);
    }
  };

  // Handle continue test (resume existing attempt without API call)
  const handleContinueTest = () => {
    if (myAttempt && activeBatch) {
      setShowTestForm(true);
    }
  };

  // Handle submit test
  const handleSubmitTest = async (answers: { question_id: string; answer_value: string }[]) => {
    if (!myAttempt) return;

    setIsSubmitting(true);
    try {
      const updatedAttempt = await submitAttempt(myAttempt.id, answers);
      setMyAttempt(updatedAttempt);
      setShowTestForm(false);
      toast({
        title: 'Test Submitted',
        description: updatedAttempt.status === 'graded'
          ? `Your score: ${updatedAttempt.final_percent?.toFixed(1)}%`
          : 'Your submission is pending review.',
      });
    } catch (error: any) {
      toast({
        title: 'Submission Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle view batch
  const handleViewBatch = async (batchId: string) => {
    try {
      const { batch, questions } = await fetchBatchById(batchId);
      setViewingBatchDetail(batch);
      setViewingBatchQuestions(questions);
    } catch (error: any) {
      toast({
        title: 'Error loading batch',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Handle view attempt - works for all statuses
  const handleViewAttempt = async (attemptId: string) => {
    const attempt = allAttempts.find(a => a.id === attemptId);
    if (!attempt) return;
    
    // For needs_manual_review, open grading dialog if admin
    if (attempt.status === 'needs_manual_review' && isAdmin) {
      handleGradeAttempt(attemptId);
      return;
    }
    
    // For all other statuses, open view-only detail dialog
    setViewLoading(true);
    try {
      const { batch, questions } = await fetchBatchById(attempt.batch_id);
      const answers = await fetchAnswersForAttempt(attemptId);
      
      setViewingAttempt(attempt);
      setViewingBatch(batch);
      setViewingQuestions(questions);
      setViewingAnswers(answers);
    } catch (error: any) {
      toast({
        title: 'Error loading submission',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setViewLoading(false);
    }
  };

  // Handle grade attempt
  const handleGradeAttempt = async (attemptId: string) => {
    setGradingLoading(true);
    try {
      const attempt = allAttempts.find(a => a.id === attemptId) || reviewQueue.find(a => a.id === attemptId);
      if (!attempt) throw new Error('Attempt not found');

      const { batch, questions } = await fetchBatchById(attempt.batch_id);
      const answers = await fetchAnswersForAttempt(attemptId);

      setGradingAttempt(attempt);
      setGradingBatch(batch);
      setGradingQuestions(questions);
      setGradingAnswers(answers);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setGradingLoading(false);
    }
  };

  // Handle grade answer
  const handleGradeAnswer = async (answerId: string, points: number, feedback?: string) => {
    const updatedAnswer = await gradeAnswer(answerId, points, feedback);
    setGradingAnswers(prev =>
      prev.map(a => (a.id === answerId ? updatedAnswer : a))
    );
  };

  // Handle finalize grading
  const handleFinalizeGrading = async () => {
    if (!gradingAttempt || !user?.email) return;

    await finalizeAttempt(gradingAttempt.id, user.email);
    toast({
      title: 'Grading Complete',
      description: 'The attempt has been finalized.',
    });
    setGradingAttempt(null);
    await loadAttempts();
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // Agent taking test
  if (showTestForm && myAttempt && activeBatch) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto">
          <TestForm
            batch={activeBatch}
            questions={activeQuestions}
            attempt={myAttempt}
            onSubmit={handleSubmitTest}
            onCancel={() => setShowTestForm(false)}
            isSubmitting={isSubmitting}
          />
        </div>
      </Layout>
    );
  }

  // Question Builder view
  if (showQuestionBuilder && isAdmin) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <QuestionBuilder
            editBatch={editingBatch}
            editQuestions={editingQuestions}
            onSaveDraft={handleSaveDraft}
            onSaveAndPublish={handleSaveAndPublish}
            onCancel={() => {
              setShowQuestionBuilder(false);
              setEditingBatch(null);
              setEditingQuestions([]);
            }}
            isSaving={isSavingBatch}
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Revalida</h1>
            <p className="text-muted-foreground">Weekly Knowledge Assessment</p>
          </div>
        </div>

        {/* Admin View */}
        {isAdmin ? (
          <Tabs defaultValue="batches" className="space-y-4">
            <TabsList>
              <TabsTrigger value="batches">Batches</TabsTrigger>
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
              <TabsTrigger value="review">
                Review Queue
                {reviewQueue.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                    {reviewQueue.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="batches">
              <BatchManagement
                batches={batches}
                isLoading={false}
                onCreateNew={handleCreateNew}
                onEditBatch={handleEditBatch}
                onPublish={handlePublish}
                onDeactivate={handleDeactivate}
                onDelete={handleDelete}
                onViewBatch={handleViewBatch}
              />
            </TabsContent>

            <TabsContent value="submissions">
              <SubmissionTable
                attempts={allAttempts}
                batches={batches}
                selectedBatchId={selectedBatchId}
                onBatchChange={setSelectedBatchId}
                onViewAttempt={handleViewAttempt}
                isLoading={attemptsLoading}
              />
            </TabsContent>

            <TabsContent value="review">
              <ReviewQueue
                attempts={reviewQueue}
                batches={batches}
                onGradeAttempt={handleGradeAttempt}
                isLoading={attemptsLoading}
              />
            </TabsContent>
          </Tabs>
        ) : (
          /* Agent View */
          <div className="max-w-xl mx-auto space-y-6">
            {activeBatch ? (
              <>
                {myAttempt && myAttempt.status !== 'in_progress' ? (
                  <AttemptResult attempt={myAttempt} />
                ) : (
                  <BatchCard
                    batch={activeBatch}
                    attempt={myAttempt}
                    onStartTest={handleStartTest}
                    onContinueTest={handleContinueTest}
                    isStarting={isStarting}
                  />
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No active test available.</p>
                <p className="text-sm">Check back later for the next Revalida.</p>
              </div>
            )}
          </div>
        )}

        {/* Grading Dialog */}
        <GradingDialog
          isOpen={!!gradingAttempt}
          onOpenChange={(open) => !open && setGradingAttempt(null)}
          attempt={gradingAttempt}
          batch={gradingBatch}
          questions={gradingQuestions}
          answers={gradingAnswers}
          onGradeAnswer={handleGradeAnswer}
          onFinalizeGrading={handleFinalizeGrading}
          isLoading={gradingLoading}
        />
        
        {/* Submission Detail Dialog (for viewing graded/submitted attempts) */}
        <SubmissionDetailDialog
          isOpen={!!viewingAttempt}
          onOpenChange={(open) => {
            if (!open) {
              setViewingAttempt(null);
              setViewingBatch(null);
              setViewingQuestions([]);
              setViewingAnswers([]);
            }
          }}
          attempt={viewingAttempt}
          batch={viewingBatch}
          questions={viewingQuestions}
          answers={viewingAnswers}
          isAdmin={isAdmin}
        />
        
        {/* Batch Detail Dialog (for viewing batch questions) */}
        <BatchDetailDialog
          isOpen={!!viewingBatchDetail}
          onOpenChange={(open) => {
            if (!open) {
              setViewingBatchDetail(null);
              setViewingBatchQuestions([]);
            }
          }}
          batch={viewingBatchDetail}
          questions={viewingBatchQuestions}
        />
      </div>
    </Layout>
  );
}
