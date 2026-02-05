import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchBatches,
  fetchBatchById,
  createBatch,
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
import { TestForm } from '@/components/revalida/TestForm';
import { AttemptResult } from '@/components/revalida/AttemptResult';
import { SubmissionTable } from '@/components/revalida/SubmissionTable';
import { ReviewQueue } from '@/components/revalida/ReviewQueue';
import { GradingDialog } from '@/components/revalida/GradingDialog';
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
  const [gradingLoading, setGradingLoading] = useState(false);

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

  // Handle import
  const handleImport = async (title: string, questions: QuestionImport[]) => {
    if (!user?.email) return;

    await createBatch(title, questions, user.email);
    toast({
      title: 'Batch Created',
      description: `"${title}" has been created with ${questions.length} questions.`,
    });
    await loadBatches();
  };

  // Handle publish
  const handlePublish = async (batchId: string) => {
    // Deactivate any currently active batch first
    const currentActive = batches.find(b => b.is_active);
    if (currentActive && currentActive.id !== batchId) {
      await deactivateBatch(currentActive.id);
    }

    await publishBatch(batchId);
    toast({
      title: 'Batch Published',
      description: 'The test is now available to agents for 48 hours.',
    });
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
  const handleViewBatch = (batchId: string) => {
    // Could open a detail dialog - for now just log
    console.log('View batch:', batchId);
  };

  // Handle view attempt
  const handleViewAttempt = (attemptId: string) => {
    const attempt = allAttempts.find(a => a.id === attemptId);
    if (attempt && attempt.status === 'needs_manual_review') {
      handleGradeAttempt(attemptId);
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
                onImport={handleImport}
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
      </div>
    </Layout>
  );
}
