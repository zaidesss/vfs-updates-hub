import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  RevalidaV2Batch,
  RevalidaV2Attempt,
  listBatches,
  getBatch,
  getQuestionsByBatch,
  fetchMyAttempt,
  getAnswersByAttempt,
  publishBatch,
  deactivateBatch,
  deleteBatch,
  isDeadlinePassed,
} from '@/lib/revalidaV2Api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BatchConfigForm } from '@/components/revalida-v2/BatchConfigForm';
import { BatchManagementV2 } from '@/components/revalida-v2/BatchManagementV2';
import { ContractManager } from '@/components/revalida-v2/ContractManager';
import { QuestionPreview } from '@/components/revalida-v2/QuestionPreview';
import { GenerationStatus } from '@/components/revalida-v2/GenerationStatus';
import { TestInterface } from '@/components/revalida-v2/TestInterface';
import { SituationalGrading } from '@/components/revalida-v2/SituationalGrading';
import { BatchCardV2 } from '@/components/revalida-v2/BatchCardV2';
import { SubmissionDetailV2 } from '@/components/revalida-v2/SubmissionDetailV2';
import { AlertCircle, ArrowLeft, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function RevalidaV2() {
  const { user, isAdmin, isHR, isSuperAdmin } = useAuth();
  const { batchId, section } = useParams<{ batchId?: string; section?: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [showMyResults, setShowMyResults] = useState(false);
  
  // Get active tab from URL params, default to 'manage'
  const activeTab = searchParams.get('tab') || 'manage';
  
  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };
  
  // Admin access includes admin, super_admin, and HR roles
  const hasAdminAccess = isAdmin || isSuperAdmin || isHR;

  const { data: batches = [], isLoading: batchesLoading } = useQuery({
    queryKey: ['revalida-v2-batches'],
    queryFn: listBatches,
  });

  const { data: currentBatch } = useQuery({
    queryKey: ['revalida-v2-batch', batchId],
    queryFn: () => (batchId ? getBatch(batchId) : null),
    enabled: !!batchId,
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['revalida-v2-questions', batchId],
    queryFn: () => (batchId ? getQuestionsByBatch(batchId) : Promise.resolve([])),
    enabled: !!batchId,
  });

  // Agent: fetch existing attempt (no auto-create)
  const { data: attempt, refetch: refetchAttempt } = useQuery({
    queryKey: ['revalida-v2-my-attempt', batchId, user?.email],
    queryFn: async () => {
      if (batchId && user?.email) {
        return fetchMyAttempt(batchId, user.email);
      }
      return null;
    },
    enabled: !!batchId && !!user?.email && !hasAdminAccess,
  });

  const { data: answers = [] } = useQuery({
    queryKey: ['revalida-v2-answers', attempt?.id],
    queryFn: () => (attempt ? getAnswersByAttempt(attempt.id) : Promise.resolve([])),
    enabled: !!attempt?.id,
  });

  const handleBatchCreated = (batch: RevalidaV2Batch) => {
    navigate(`/team-performance/revalida-v2/${batch.id}`);
  };

  const handlePublish = async (id?: string) => {
    const targetId = id || batchId;
    if (!targetId) return;
    try {
      await publishBatch(targetId);
      queryClient.invalidateQueries({ queryKey: ['revalida-v2-batch', targetId] });
      queryClient.invalidateQueries({ queryKey: ['revalida-v2-batches'] });
      
      // Send email notification (non-blocking)
      const batch = queryClient.getQueryData<RevalidaV2Batch>(['revalida-v2-batch', targetId]) 
        || batches.find(b => b.id === targetId);
      const batchTitle = batch?.title || 'Revalida Assessment';
      const testUrl = `${window.location.origin}/team-performance/revalida-v2`;
      
      supabase.functions.invoke('send-revalida-notification', {
        body: { batchTitle, testUrl, version: 'v2' },
      }).then(({ error }) => {
        if (error) {
          console.error('Failed to send revalida notification:', error);
          toast.warning('Published successfully but email notification failed.');
        } else {
          toast.success('Revalida test is live! All users have been notified via email.');
        }
      });
      
    } catch (error) {
      toast.error('Failed to publish batch');
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await deactivateBatch(id);
      queryClient.invalidateQueries({ queryKey: ['revalida-v2-batch', id] });
      queryClient.invalidateQueries({ queryKey: ['revalida-v2-batches'] });
      toast.success('Batch deactivated successfully.');
    } catch (error) {
      toast.error('Failed to deactivate batch');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBatch(id);
      queryClient.invalidateQueries({ queryKey: ['revalida-v2-batches'] });
      toast.success('Batch deleted successfully.');
    } catch (error) {
      toast.error('Failed to delete batch');
    }
  };

  const handleEditBatch = (id: string) => {
    navigate(`/team-performance/revalida-v2/${id}`);
  };

  const handleTestComplete = (score: number, percentage: number) => {
    refetchAttempt();
    toast.success(`Test submitted! Your score will be available after AI review.`);
    navigate(`/team-performance/revalida-v2/${batchId}`);
  };

  const handleAttemptStarted = (newAttempt: RevalidaV2Attempt) => {
    queryClient.setQueryData(['revalida-v2-my-attempt', batchId, user?.email], newAttempt);
  };

  // Check if we're in take test mode
  const isTakeMode = section === 'take';

  // Admin Dashboard (no batchId)
  if (!batchId && hasAdminAccess) {
    return (
      <Layout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Revalida 2.0</h1>
            <p className="text-muted-foreground mt-2">
              AI-powered knowledge assessment system
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList>
              <TabsTrigger value="manage">Manage Batches</TabsTrigger>
              <TabsTrigger value="contracts">Knowledge Base</TabsTrigger>
              <TabsTrigger value="create">Create New</TabsTrigger>
            </TabsList>

            <TabsContent value="manage" className="space-y-4">
              <BatchManagementV2
                batches={batches}
                isLoading={batchesLoading}
                onCreateNew={() => handleTabChange('create')}
                onEditBatch={handleEditBatch}
                onPublish={handlePublish}
                onDeactivate={handleDeactivate}
                onDelete={handleDelete}
                onViewBatch={(id) => navigate(`/team-performance/revalida-v2/${id}`)}
              />
            </TabsContent>

            <TabsContent value="contracts">
              <ContractManager />
            </TabsContent>

            <TabsContent value="create">
              <BatchConfigForm onBatchCreated={handleBatchCreated} />
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    );
  }

  // Batch Detail View - Admin
  if (batchId && currentBatch && hasAdminAccess) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/team-performance/revalida-v2')}
              className="mt-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{currentBatch.title}</h1>
              <p className="text-muted-foreground mt-2">
                {currentBatch.mcq_count} MCQ • {currentBatch.tf_count} T/F • {currentBatch.situational_count} Situational
              </p>
            </div>
          </div>

          <Tabs defaultValue="generation" className="w-full">
            <TabsList>
              <TabsTrigger value="generation">Generation Status</TabsTrigger>
              <TabsTrigger value="questions">Questions</TabsTrigger>
              <TabsTrigger value="grading">Grading</TabsTrigger>
            </TabsList>

            <TabsContent value="generation">
              <GenerationStatus batch={currentBatch} />
            </TabsContent>

            <TabsContent value="questions">
              {currentBatch.generation_status === 'completed' && (
                <QuestionPreview batch={currentBatch} onPublish={() => handlePublish(batchId)} />
              )}
            </TabsContent>

            <TabsContent value="grading">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Clock className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-2xl font-bold">0</p>
                      <p className="text-sm text-muted-foreground">Pending Grading</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <CheckCircle2 className="h-5 w-5 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold">0</p>
                      <p className="text-sm text-muted-foreground">AI Graded</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <AlertCircle className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-2xl font-bold">0</p>
                      <p className="text-sm text-muted-foreground">Overridden</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              {attempt && answers.length > 0 && (
                <SituationalGrading
                  answers={answers}
                  questions={Object.fromEntries(questions.map(q => [q.id, q]))}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    );
  }

  // Agent: Take Test Mode
  if (batchId && currentBatch && isTakeMode && attempt && questions.length > 0) {
    // Check deadline before showing test interface
    if (isDeadlinePassed(currentBatch.end_at) && attempt.status === 'in_progress') {
      return (
        <Layout>
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h2 className="text-xl font-semibold mb-2">Assessment Expired</h2>
              <p className="text-muted-foreground mb-4">
                The deadline for this assessment has passed.
              </p>
              <Button onClick={() => navigate('/team-performance/revalida-v2')}>
                Back to Assessments
              </Button>
            </CardContent>
          </Card>
        </Layout>
      );
    }

    return (
      <Layout>
        <Card>
          <CardHeader>
            <CardTitle>{currentBatch.title}</CardTitle>
            <CardDescription>Answer all questions to complete the assessment</CardDescription>
          </CardHeader>
          <CardContent>
            <TestInterface
              attempt={attempt}
              questions={questions}
              onComplete={handleTestComplete}
            />
          </CardContent>
        </Card>
      </Layout>
    );
  }

  // Agent: Batch Detail (show BatchCardV2)
  if (batchId && currentBatch && !hasAdminAccess) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/team-performance/revalida-v2')}
              className="mt-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Revalida 2.0</h1>
              <p className="text-muted-foreground mt-2">
                AI-powered knowledge assessment
              </p>
            </div>
          </div>

          <BatchCardV2
            batch={currentBatch}
            attempt={attempt || null}
            userEmail={user?.email || ''}
            onAttemptStarted={handleAttemptStarted}
            onViewResults={() => setShowMyResults(true)}
          />

          {/* Post-expiry results view */}
          {showMyResults && attempt && questions.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Your Submission Details</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowMyResults(false)}>
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <SubmissionDetailV2
                  attempt={attempt}
                  questions={questions}
                  answers={answers}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </Layout>
    );
  }

  // Default: Agent List View (no batchId)
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Revalida 2.0</h1>
          <p className="text-muted-foreground mt-2">
            AI-powered knowledge assessment system
          </p>
        </div>

        {!hasAdminAccess ? (
          <div className="grid gap-4">
            {batches.filter(b => b.is_active).length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">No active assessments available.</p>
                </CardContent>
              </Card>
            ) : (
              batches.filter(b => b.is_active).map(batch => (
                <Card 
                  key={batch.id} 
                  className="cursor-pointer hover:bg-muted/50" 
                  onClick={() => navigate(`/team-performance/revalida-v2/${batch.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{batch.title}</CardTitle>
                        <CardDescription className="mt-2">
                          Total Points: {batch.total_points}
                        </CardDescription>
                      </div>
                      <Badge>
                        {isDeadlinePassed(batch.end_at) ? 'Expired' : 'Active'}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-semibold mb-4">Admin Dashboard</h2>
            <Button onClick={() => navigate('/team-performance/revalida-v2?section=create')}>
              Create New Batch
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}