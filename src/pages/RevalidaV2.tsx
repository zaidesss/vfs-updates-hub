import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import {
  RevalidaV2Batch,
  RevalidaV2Question,
  RevalidaV2Attempt,
  RevalidaV2Answer,
  listBatches,
  getBatch,
  getQuestionsByBatch,
  getOrCreateAttempt,
  getAnswersByAttempt,
  updateBatch,
} from '@/lib/revalidaV2Api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BatchConfigForm } from '@/components/revalida-v2/BatchConfigForm';
import { ContractManager } from '@/components/revalida-v2/ContractManager';
import { QuestionPreview } from '@/components/revalida-v2/QuestionPreview';
import { GenerationStatus } from '@/components/revalida-v2/GenerationStatus';
import { TestInterface } from '@/components/revalida-v2/TestInterface';
import { SituationalGrading } from '@/components/revalida-v2/SituationalGrading';
import { AlertCircle, CheckCircle2, Clock, Play } from 'lucide-react';
import { toast } from 'sonner';

export default function RevalidaV2() {
  const { user, isAdmin, isHR, isSuperAdmin } = useAuth();
  const { batchId, section } = useParams<{ batchId?: string; section?: string }>();
  const navigate = useNavigate();
  
  // Admin access includes admin, super_admin, and HR roles
  const hasAdminAccess = isAdmin || isSuperAdmin || isHR;

  const { data: batches = [] } = useQuery({
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

  const { data: attempt } = useQuery({
    queryKey: ['revalida-v2-attempt', batchId, user?.email],
    queryFn: async () => {
      if (batchId && user?.email) {
        return getOrCreateAttempt(batchId, user.email);
      }
      return null;
    },
    enabled: !!batchId && !!user?.email,
  });

  const { data: answers = [] } = useQuery({
    queryKey: ['revalida-v2-answers', attempt?.id],
    queryFn: () => (attempt ? getAnswersByAttempt(attempt.id) : Promise.resolve([])),
    enabled: !!attempt?.id,
  });

  const handleBatchCreated = (batch: RevalidaV2Batch) => {
    navigate(`/team-performance/revalida-v2/${batch.id}`);
  };

  const handlePublish = async () => {
    if (!batchId) return;
    try {
      await updateBatch(batchId, { is_active: true });
      toast.success('Batch published successfully!');
    } catch (error) {
      toast.error('Failed to publish batch');
    }
  };

  const handleTestComplete = (score: number, percentage: number) => {
    // Navigate to results or show completion screen
    toast.success(`Test completed! Score: ${score} (${percentage}%)`);
  };

  // Admin Dashboard
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

          <Tabs defaultValue="manage" className="w-full">
            <TabsList>
              <TabsTrigger value="manage">Manage Batches</TabsTrigger>
              <TabsTrigger value="contracts">Knowledge Base</TabsTrigger>
              <TabsTrigger value="create">Create New</TabsTrigger>
            </TabsList>

            <TabsContent value="manage" className="space-y-4">
              {batches.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground">No batches created yet</p>
                  </CardContent>
                </Card>
              ) : (
                batches.map(batch => (
                  <Card key={batch.id} className="cursor-pointer" onClick={() => navigate(`/team-performance/revalida-v2/${batch.id}`)}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{batch.title}</CardTitle>
                          <CardDescription>
                            {batch.mcq_count} MCQ • {batch.tf_count} T/F • {batch.situational_count} Situational
                          </CardDescription>
                        </div>
                        <Badge variant={batch.is_active ? 'default' : 'secondary'}>
                          {batch.is_active ? 'Active' : 'Draft'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      <p>Total Points: {batch.total_points}</p>
                      <p>Status: {batch.generation_status}</p>
                    </CardContent>
                  </Card>
                ))
              )}
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

  // Batch Detail / Take Test View
  if (batchId && currentBatch) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{currentBatch.title}</h1>
            <p className="text-muted-foreground mt-2">
              {currentBatch.mcq_count} MCQ • {currentBatch.tf_count} T/F • {currentBatch.situational_count} Situational
            </p>
          </div>

          {hasAdminAccess ? (
            // Admin View
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
                  <QuestionPreview batch={currentBatch} onPublish={handlePublish} />
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
          ) : (
            // Agent View - Take Test
            attempt && questions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Take Assessment</CardTitle>
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
            )
          )}
        </div>
      </Layout>
    );
  }

  // Default: Main Revalida 2.0 page
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
            {batches.filter(b => b.is_active).map(batch => (
              <Card key={batch.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/team-performance/revalida-v2/${batch.id}`)}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{batch.title}</CardTitle>
                      <CardDescription className="mt-2">
                        Total Points: {batch.total_points}
                      </CardDescription>
                    </div>
                    <Button>
                      <Play className="h-4 w-4 mr-2" />
                      Start Assessment
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
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
