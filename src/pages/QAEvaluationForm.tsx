import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Save, 
  Send, 
  Sparkles, 
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  createQAEvaluation,
  createQAScores,
  createActionsNeeded,
  updateQAEvaluation,
  fetchActionPlans,
  fetchAgentViolationHistory,
  fetchPendingActionsForAgent,
  generateTicketUrl,
  SCORING_CATEGORIES,
  INTERACTION_TYPES,
  ZD_INSTANCES,
  type ZDInstance,
  type QAActionPlan,
  type CreateQAScoreInput,
} from '@/lib/qaEvaluationsApi';
import { QAScoreRow } from '@/components/qa/QAScoreRow';
import { QACriticalRow } from '@/components/qa/QACriticalRow';
import { QAActionPlanSelect } from '@/components/qa/QAActionPlanSelect';
import { QAPendingActions } from '@/components/qa/QAPendingActions';

interface ScoreState {
  [key: string]: {
    score: number | null;
    aiSuggested: number | null;
    aiAccepted: boolean | null;
    criticalError: boolean | null;
  };
}

interface AgentProfile {
  id: string;
  email: string;
  full_name: string | null;
  agent_name: string | null;
}

export default function QAEvaluationForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [selectedAgent, setSelectedAgent] = useState<AgentProfile | null>(null);
  const [auditDate, setAuditDate] = useState(new Date().toISOString().split('T')[0]);
  const [zdInstance, setZdInstance] = useState<ZDInstance | ''>('');
  const [ticketId, setTicketId] = useState('');
  const [interactionType, setInteractionType] = useState<string>('');
  const [ticketContent, setTicketContent] = useState('');
  const [isFetchingTicket, setIsFetchingTicket] = useState(false);

  // Feedback state
  const [accuracyFeedback, setAccuracyFeedback] = useState('');
  const [complianceFeedback, setComplianceFeedback] = useState('');
  const [customerExpFeedback, setCustomerExpFeedback] = useState('');

  // Scores state
  const [scores, setScores] = useState<ScoreState>({});

  // Selected action plans
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [customAction, setCustomAction] = useState('');

  // AI state
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch agents
  const { data: agents = [] } = useQuery({
    queryKey: ['agent-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_profiles')
        .select('id, email, full_name, agent_name')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return data as AgentProfile[];
    },
  });

  // Fetch action plans
  const { data: actionPlans = [] } = useQuery({
    queryKey: ['qa-action-plans'],
    queryFn: fetchActionPlans,
  });

  // Fetch violation history when agent changes
  const { data: violationHistory = [] } = useQuery({
    queryKey: ['agent-violations', selectedAgent?.email],
    queryFn: () => fetchAgentViolationHistory(selectedAgent!.email),
    enabled: !!selectedAgent?.email,
  });

  // Fetch pending actions when agent changes
  const { data: pendingActions = [] } = useQuery({
    queryKey: ['pending-actions', selectedAgent?.email],
    queryFn: () => fetchPendingActionsForAgent(selectedAgent!.email),
    enabled: !!selectedAgent?.email,
  });

  // Initialize scores from categories
  useEffect(() => {
    const initialScores: ScoreState = {};
    SCORING_CATEGORIES.forEach(cat => {
      cat.subcategories.forEach(sub => {
        const key = `${cat.category}|${sub.subcategory}`;
        initialScores[key] = {
          score: null,
          aiSuggested: null,
          aiAccepted: null,
          criticalError: sub.isCritical ? null : null,
        };
      });
    });
    setScores(initialScores);
  }, []);

  // Calculate totals
  const totals = useMemo(() => {
    let totalScore = 0;
    let totalMax = 0;
    let hasCriticalFail = false;

    SCORING_CATEGORIES.forEach(cat => {
      cat.subcategories.forEach(sub => {
        const key = `${cat.category}|${sub.subcategory}`;
        const scoreData = scores[key];
        
        if (sub.isCritical) {
          if (scoreData?.criticalError === true) {
            hasCriticalFail = true;
          }
        } else {
          totalMax += sub.maxPoints;
          if (scoreData?.score !== null && scoreData?.score !== undefined) {
            totalScore += scoreData.score;
          }
        }
      });
    });

    // If critical fail, force 0
    if (hasCriticalFail) {
      totalScore = 0;
    }

    const percentage = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;

    return {
      totalScore: hasCriticalFail ? 0 : totalScore,
      totalMax,
      percentage: Math.round(percentage * 100) / 100,
      hasCriticalFail,
    };
  }, [scores]);

  // Ticket URL
  const ticketUrl = useMemo(() => {
    if (zdInstance && ticketId) {
      return generateTicketUrl(zdInstance as ZDInstance, ticketId);
    }
    return '';
  }, [zdInstance, ticketId]);

  // Fetch ticket content from Zendesk
  const handleFetchTicket = async () => {
    if (!zdInstance || !ticketId) {
      toast({
        title: 'Missing information',
        description: 'Please select a ZD instance and enter a ticket ID.',
        variant: 'destructive',
      });
      return;
    }

    setIsFetchingTicket(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-zendesk-ticket', {
        body: { zdInstance, ticketId },
      });

      if (error) throw error;

      if (data?.content) {
        setTicketContent(data.content);
        toast({
          title: 'Ticket fetched',
          description: 'Ticket content has been loaded.',
        });
      }
    } catch (err: any) {
      console.error('Error fetching ticket:', err);
      toast({
        title: 'Failed to fetch ticket',
        description: err.message || 'Please try again or paste content manually.',
        variant: 'destructive',
      });
    } finally {
      setIsFetchingTicket(false);
    }
  };

  // AI score analysis
  const handleAIAnalysis = async () => {
    if (!ticketContent) {
      toast({
        title: 'No ticket content',
        description: 'Please fetch or paste ticket content first.',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-qa-ticket', {
        body: { ticketContent, categories: SCORING_CATEGORIES },
      });

      if (error) throw error;

      if (data?.suggestions) {
        const newScores = { ...scores };
        Object.entries(data.suggestions).forEach(([key, value]: [string, any]) => {
          if (newScores[key]) {
            newScores[key] = {
              ...newScores[key],
              aiSuggested: value.score,
              criticalError: value.criticalError ?? null,
            };
          }
        });
        setScores(newScores);
        toast({
          title: 'AI analysis complete',
          description: 'Review the suggested scores and accept or modify them.',
        });
      }
    } catch (err: any) {
      console.error('Error analyzing ticket:', err);
      toast({
        title: 'Analysis failed',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Update score
  const handleScoreChange = (key: string, score: number) => {
    setScores(prev => ({
      ...prev,
      [key]: { ...prev[key], score, aiAccepted: false },
    }));
  };

  // Accept AI suggestion
  const handleAcceptAI = (key: string) => {
    setScores(prev => ({
      ...prev,
      [key]: { 
        ...prev[key], 
        score: prev[key].aiSuggested, 
        aiAccepted: true 
      },
    }));
  };

  // Update critical error
  const handleCriticalChange = (key: string, hasCritical: boolean) => {
    setScores(prev => ({
      ...prev,
      [key]: { ...prev[key], criticalError: hasCritical },
    }));
  };

  // Accept critical AI suggestion
  const handleAcceptCriticalAI = (key: string, accept: boolean) => {
    const currentState = scores[key];
    setScores(prev => ({
      ...prev,
      [key]: { 
        ...prev[key], 
        criticalError: accept ? currentState.criticalError : false,
        aiAccepted: true,
      },
    }));
  };

  // Validate form
  const isFormValid = useMemo(() => {
    if (!selectedAgent || !zdInstance || !ticketId || !interactionType) {
      return false;
    }
    // Check all non-critical scores are filled
    return SCORING_CATEGORIES.every(cat =>
      cat.subcategories.every(sub => {
        const key = `${cat.category}|${sub.subcategory}`;
        if (sub.isCritical) {
          return scores[key]?.criticalError !== null;
        }
        return scores[key]?.score !== null;
      })
    );
  }, [selectedAgent, zdInstance, ticketId, interactionType, scores]);

  // Save as draft
  const saveMutation = useMutation({
    mutationFn: async (status: 'draft' | 'sent') => {
      // Create evaluation
      const evaluation = await createQAEvaluation({
        agent_email: selectedAgent!.email,
        agent_name: selectedAgent!.full_name || selectedAgent!.agent_name || selectedAgent!.email,
        evaluator_email: user!.email,
        evaluator_name: user!.name,
        audit_date: auditDate,
        zd_instance: zdInstance,
        ticket_id: ticketId,
        ticket_url: ticketUrl,
        interaction_type: interactionType,
        ticket_content: ticketContent,
        accuracy_feedback: accuracyFeedback,
        compliance_feedback: complianceFeedback,
        customer_exp_feedback: customerExpFeedback,
        status,
      });

      // Create scores
      const scoreInputs: CreateQAScoreInput[] = [];
      SCORING_CATEGORIES.forEach(cat => {
        cat.subcategories.forEach(sub => {
          const key = `${cat.category}|${sub.subcategory}`;
          const scoreData = scores[key];
          scoreInputs.push({
            evaluation_id: evaluation.id,
            category: cat.category,
            subcategory: sub.subcategory,
            behavior_identifier: sub.behavior,
            is_critical: sub.isCritical,
            score_earned: sub.isCritical ? 0 : (totals.hasCriticalFail ? 0 : scoreData?.score ?? null),
            max_points: sub.maxPoints,
            ai_suggested_score: scoreData?.aiSuggested ?? null,
            ai_accepted: scoreData?.aiAccepted ?? null,
            critical_error_detected: sub.isCritical ? scoreData?.criticalError ?? null : null,
          });
        });
      });
      await createQAScores(scoreInputs);

      // Create action needed entries
      if (selectedActions.length > 0 || customAction) {
        const actions = selectedActions.map(id => ({
          evaluation_id: evaluation.id,
          action_plan_id: id,
        }));
        if (customAction) {
          actions.push({
            evaluation_id: evaluation.id,
            action_plan_id: undefined,
            custom_action: customAction,
          } as any);
        }
        await createActionsNeeded(actions);
      }

      // Update totals on evaluation
      await updateQAEvaluation(evaluation.id, {
        total_score: totals.totalScore,
        total_max: totals.totalMax,
        percentage: totals.percentage,
        has_critical_fail: totals.hasCriticalFail,
        rating: totals.hasCriticalFail ? 'Fail' : (totals.percentage >= 80 ? 'Pass' : 'Fail'), // Default rating logic
      });

      return evaluation;
    },
    onSuccess: (evaluation, status) => {
      queryClient.invalidateQueries({ queryKey: ['qa-evaluations'] });
      toast({
        title: status === 'sent' ? 'Evaluation sent' : 'Draft saved',
        description: status === 'sent' 
          ? 'The agent will receive a notification email.'
          : 'You can continue editing later.',
      });
      navigate('/team-performance/qa-evaluations');
    },
    onError: (error: any) => {
      toast({
        title: 'Error saving evaluation',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New QA Evaluation</h1>
            <p className="text-muted-foreground">Evaluate agent ticket handling quality</p>
          </div>
        </div>

        {/* Agent Selection & Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Evaluation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="agent">Agent</Label>
                <Select 
                  value={selectedAgent?.id || ''} 
                  onValueChange={(v) => {
                    const agent = agents.find(a => a.id === v);
                    setSelectedAgent(agent || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.full_name || agent.agent_name || agent.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auditDate">Audit Date</Label>
                <Input
                  id="auditDate"
                  type="date"
                  value={auditDate}
                  onChange={(e) => setAuditDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zdInstance">ZD Instance</Label>
                <Select value={zdInstance} onValueChange={(v) => setZdInstance(v as ZDInstance)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select instance" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(ZD_INSTANCES).map(instance => (
                      <SelectItem key={instance} value={instance}>
                        {instance}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interactionType">Interaction Type</Label>
                <Select value={interactionType} onValueChange={setInteractionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERACTION_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticketId">Ticket #</Label>
              <div className="flex gap-2">
                <Input
                  id="ticketId"
                  placeholder="Enter ticket ID"
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  onClick={handleFetchTicket}
                  disabled={!zdInstance || !ticketId || isFetchingTicket}
                >
                  {isFetchingTicket ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Fetch Ticket'
                  )}
                </Button>
                {ticketUrl && (
                  <Button variant="ghost" size="icon" asChild>
                    <a href={ticketUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticketContent">Ticket Content (for AI analysis)</Label>
              <Textarea
                id="ticketContent"
                placeholder="Paste or fetch ticket content here..."
                value={ticketContent}
                onChange={(e) => setTicketContent(e.target.value)}
                rows={6}
              />
              <Button 
                variant="secondary" 
                onClick={handleAIAnalysis}
                disabled={!ticketContent || isAnalyzing}
                className="mt-2"
              >
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Analyze with AI
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Violation History Warning */}
        {violationHistory.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Previous violations detected for this agent:</strong>
              <ul className="mt-2 list-disc list-inside">
                {violationHistory.slice(0, 5).map((v, i) => (
                  <li key={i}>
                    {v.subcategory} - {v.count} occurrence(s), last on {v.last_occurrence}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Pending Actions */}
        {pendingActions.length > 0 && (
          <QAPendingActions actions={pendingActions} />
        )}

        {/* Scoring Sections */}
        {SCORING_CATEGORIES.map((category, catIndex) => (
          <Card key={catIndex}>
            <CardHeader>
              <CardTitle>{category.category}</CardTitle>
              <CardDescription>
                Rate each subcategory from 2 (Needs Improvement) to 6 (Excellent)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {category.subcategories.map((sub, subIndex) => {
                const key = `${category.category}|${sub.subcategory}`;
                const scoreData = scores[key] || { score: null, aiSuggested: null, aiAccepted: null, criticalError: null };

                if (sub.isCritical) {
                  return (
                    <QACriticalRow
                      key={subIndex}
                      subcategory={sub.subcategory}
                      behavior={sub.behavior}
                      hasCritical={scoreData.criticalError}
                      aiSuggested={scoreData.criticalError}
                      onCriticalChange={(v) => handleCriticalChange(key, v)}
                      onAcceptAI={(accept) => handleAcceptCriticalAI(key, accept)}
                    />
                  );
                }

                return (
                  <QAScoreRow
                    key={subIndex}
                    subcategory={sub.subcategory}
                    behavior={sub.behavior}
                    maxPoints={sub.maxPoints}
                    score={scoreData.score}
                    aiSuggested={scoreData.aiSuggested}
                    aiAccepted={scoreData.aiAccepted}
                    onScoreChange={(v) => handleScoreChange(key, v)}
                    onAcceptAI={() => handleAcceptAI(key)}
                  />
                );
              })}
            </CardContent>
          </Card>
        ))}

        {/* Feedback Section */}
        <Card>
          <CardHeader>
            <CardTitle>Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="accuracyFeedback">Accuracy Feedback</Label>
                {totals.percentage === 100 && !totals.hasCriticalFail && (
                  <Badge className="bg-chart-2 text-primary-foreground">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Perfect Score!
                  </Badge>
                )}
              </div>
              <Textarea
                id="accuracyFeedback"
                placeholder="Provide feedback on accuracy..."
                value={accuracyFeedback}
                onChange={(e) => setAccuracyFeedback(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="complianceFeedback">Compliance Feedback</Label>
              <Textarea
                id="complianceFeedback"
                placeholder="Provide feedback on compliance..."
                value={complianceFeedback}
                onChange={(e) => setComplianceFeedback(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerExpFeedback">Customer Experience Feedback</Label>
              <Textarea
                id="customerExpFeedback"
                placeholder="Provide feedback on customer experience..."
                value={customerExpFeedback}
                onChange={(e) => setCustomerExpFeedback(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Plans */}
        <Card>
          <CardHeader>
            <CardTitle>Action Needed</CardTitle>
            <CardDescription>Select action items for the agent to address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <QAActionPlanSelect
              actionPlans={actionPlans}
              selectedIds={selectedActions}
              onSelectionChange={setSelectedActions}
            />
            <div className="space-y-2">
              <Label htmlFor="customAction">Custom Action (optional)</Label>
              <Input
                id="customAction"
                placeholder="Add a custom action item..."
                value={customAction}
                onChange={(e) => setCustomAction(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className={totals.hasCriticalFail ? 'border-destructive' : ''}>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Score</p>
                <p className="text-3xl font-bold">{totals.totalScore} / {totals.totalMax}</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Percentage</p>
                <p className="text-3xl font-bold">{totals.percentage}%</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Critical Fail</p>
                <p className={`text-3xl font-bold ${totals.hasCriticalFail ? 'text-destructive' : 'text-chart-2'}`}>
                  {totals.hasCriticalFail ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Rating</p>
                <p className={`text-3xl font-bold ${totals.hasCriticalFail || totals.percentage < 80 ? 'text-destructive' : 'text-chart-2'}`}>
                  {totals.hasCriticalFail ? 'Fail' : (totals.percentage >= 80 ? 'Pass' : 'Fail')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => saveMutation.mutate('draft')}
            disabled={saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button 
            onClick={() => saveMutation.mutate('sent')}
            disabled={!isFormValid || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send to Agent
          </Button>
        </div>
      </div>
    </Layout>
  );
}
