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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Save, 
  Send, 
  Sparkles, 
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  ChevronsUpDown,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
  sendQANotification,
  SCORING_CATEGORIES,
  INTERACTION_TYPES,
  ZD_INSTANCES,
  PASS_THRESHOLD,
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
    aiJustification: string | null;
  };
}

interface AgentProfile {
  id: string;
  email: string;
  full_name: string | null;
  agent_name: string | null;
}

// Action plan selections per category
interface CategoryActionState {
  selectedActions: string[];
  customAction: string;
}

export default function QAEvaluationForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [selectedAgent, setSelectedAgent] = useState<AgentProfile | null>(null);
  const [agentComboboxOpen, setAgentComboboxOpen] = useState(false);
  const [auditDate, setAuditDate] = useState(new Date().toISOString().split('T')[0]);
  const [zdInstance, setZdInstance] = useState<ZDInstance | ''>('');
  const [ticketId, setTicketId] = useState('');
  const [interactionType, setInteractionType] = useState<string>('');
  const [ticketContent, setTicketContent] = useState('');
  const [isFetchingTicket, setIsFetchingTicket] = useState(false);
  
  // Work week and coaching date
  const [workWeekStart, setWorkWeekStart] = useState<string>('');
  const [workWeekEnd, setWorkWeekEnd] = useState<string>('');
  const [coachingDate, setCoachingDate] = useState<string>('');

  // Feedback state - per category
  const [accuracyFeedback, setAccuracyFeedback] = useState('');
  const [complianceFeedback, setComplianceFeedback] = useState('');
  const [customerExpFeedback, setCustomerExpFeedback] = useState('');

  // Action plans per category
  const [categoryActions, setCategoryActions] = useState<Record<string, CategoryActionState>>({
    'Accuracy': { selectedActions: [], customAction: '' },
    'Compliance': { selectedActions: [], customAction: '' },
    'Customer Experience': { selectedActions: [], customAction: '' },
  });

  // Scores state
  const [scores, setScores] = useState<ScoreState>({});
  
  // AI suggested action plan IDs
  const [aiSuggestedActionIds, setAiSuggestedActionIds] = useState<string[]>([]);
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

  // Fetch action plan occurrence counts for the selected agent
  const { data: actionPlanOccurrences = {} } = useQuery({
    queryKey: ['action-plan-occurrences', selectedAgent?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qa_action_plan_occurrences')
        .select('subcategory, action_plan_id')
        .eq('agent_email', selectedAgent!.email);
      
      if (error) throw error;
      
      // Count occurrences by subcategory
      const counts: Record<string, number> = {};
      (data || []).forEach(row => {
        const key = row.subcategory || row.action_plan_id;
        if (key) {
          counts[key] = (counts[key] || 0) + 1;
        }
      });
      return counts;
    },
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
          aiJustification: null,
        };
      });
    });
    setScores(initialScores);
  }, []);

  // Calculate totals - NOW with proper critical error behavior
  const totals = useMemo(() => {
    let totalScore = 0;
    let totalMax = 0;
    let hasCriticalFail = false;
    const categoryScores: Record<string, { earned: number; max: number; hasCritical: boolean }> = {};

    SCORING_CATEGORIES.forEach(cat => {
      categoryScores[cat.category] = { earned: 0, max: 0, hasCritical: false };
      
      cat.subcategories.forEach(sub => {
        const key = `${cat.category}|${sub.subcategory}`;
        const scoreData = scores[key];
        
        if (sub.isCritical) {
          if (scoreData?.criticalError === true) {
            hasCriticalFail = true;
            categoryScores[cat.category].hasCritical = true;
          }
        } else {
          totalMax += sub.maxPoints;
          categoryScores[cat.category].max += sub.maxPoints;
          if (scoreData?.score !== null && scoreData?.score !== undefined) {
            totalScore += scoreData.score;
            categoryScores[cat.category].earned += scoreData.score;
          }
        }
      });
    });

    // If critical fail, total score becomes 0 but category scores are preserved for coaching
    const finalTotalScore = hasCriticalFail ? 0 : totalScore;
    const percentage = hasCriticalFail ? 0 : (totalMax > 0 ? (totalScore / totalMax) * 100 : 0);

    return {
      totalScore: finalTotalScore,
      rawTotalScore: totalScore, // Preserved for coaching visibility
      totalMax,
      percentage: Math.round(percentage * 100) / 100,
      hasCriticalFail,
      categoryScores,
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
        body: { 
          ticketContent, 
          categories: SCORING_CATEGORIES,
          actionPlans: actionPlans.map(ap => ({ id: ap.id, action_text: ap.action_text, category: ap.category })),
        },
      });

      if (error) throw error;

      if (data?.suggestions) {
        const newScores = { ...scores };
        Object.entries(data.suggestions).forEach(([key, value]: [string, any]) => {
          if (newScores[key]) {
            newScores[key] = {
              ...newScores[key],
              aiSuggested: value.score ?? null,
              criticalError: value.criticalError ?? null,
              aiJustification: value.justification ?? null,
            };
          }
        });
        setScores(newScores);
        
        // Set AI suggested action plan IDs
        if (data.suggestedActionPlanIds && Array.isArray(data.suggestedActionPlanIds)) {
          setAiSuggestedActionIds(data.suggestedActionPlanIds);
        }
        
        toast({
          title: 'AI analysis complete',
          description: 'Review the suggested scores and action plans.',
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

  // Handle category action selection
  const handleCategoryActionChange = (category: string, selectedIds: string[]) => {
    setCategoryActions(prev => ({
      ...prev,
      [category]: { ...prev[category], selectedActions: selectedIds },
    }));
  };

  const handleCategoryCustomAction = (category: string, customAction: string) => {
    setCategoryActions(prev => ({
      ...prev,
      [category]: { ...prev[category], customAction },
    }));
  };

  // Get feedback setter by category
  const getFeedbackValue = (category: string) => {
    switch (category) {
      case 'Accuracy': return accuracyFeedback;
      case 'Compliance': return complianceFeedback;
      case 'Customer Experience': return customerExpFeedback;
      default: return '';
    }
  };

  const setFeedbackValue = (category: string, value: string) => {
    switch (category) {
      case 'Accuracy': setAccuracyFeedback(value); break;
      case 'Compliance': setComplianceFeedback(value); break;
      case 'Customer Experience': setCustomerExpFeedback(value); break;
    }
  };

  // Validate form
  const isFormValid = useMemo(() => {
    if (!selectedAgent || !zdInstance || !ticketId || !interactionType || !coachingDate) {
      return false;
    }
    // Check all scores are filled
    return SCORING_CATEGORIES.every(cat =>
      cat.subcategories.every(sub => {
        const key = `${cat.category}|${sub.subcategory}`;
        if (sub.isCritical) {
          return scores[key]?.criticalError !== null;
        }
        return scores[key]?.score !== null;
      })
    );
  }, [selectedAgent, zdInstance, ticketId, interactionType, coachingDate, scores]);

  // Save mutation
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
        work_week_start: workWeekStart || undefined,
        work_week_end: workWeekEnd || undefined,
        coaching_date: coachingDate || undefined,
      });

      // Create scores - preserve category scores even if critical fail
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
            // Preserve actual scores for coaching visibility
            score_earned: sub.isCritical ? 0 : (scoreData?.score ?? null),
            max_points: sub.maxPoints,
            ai_suggested_score: scoreData?.aiSuggested ?? null,
            ai_accepted: scoreData?.aiAccepted ?? null,
            critical_error_detected: sub.isCritical ? scoreData?.criticalError ?? null : null,
            ai_justification: scoreData?.aiJustification ?? undefined,
          });
        });
      });
      await createQAScores(scoreInputs);

      // Create action needed entries from all categories
      const allActions: { evaluation_id: string; action_plan_id?: string; custom_action?: string }[] = [];
      Object.entries(categoryActions).forEach(([category, state]) => {
        state.selectedActions.forEach(id => {
          allActions.push({ evaluation_id: evaluation.id, action_plan_id: id });
        });
        if (state.customAction) {
          allActions.push({ evaluation_id: evaluation.id, custom_action: state.customAction });
        }
      });
      
      if (allActions.length > 0) {
        await createActionsNeeded(allActions);
      }

      // Record action plan occurrences for tracking repeat violations
      if (status === 'sent') {
        const occurrences: { agent_email: string; evaluation_id: string; action_plan_id?: string; subcategory?: string }[] = [];
        
        // Track by subcategory for any failing scores
        SCORING_CATEGORIES.forEach(cat => {
          cat.subcategories.forEach(sub => {
            const key = `${cat.category}|${sub.subcategory}`;
            const scoreData = scores[key];
            
            if (sub.isCritical && scoreData?.criticalError === true) {
              occurrences.push({
                agent_email: selectedAgent!.email,
                evaluation_id: evaluation.id,
                subcategory: sub.subcategory,
              });
            } else if (!sub.isCritical && scoreData?.score === 0) {
              occurrences.push({
                agent_email: selectedAgent!.email,
                evaluation_id: evaluation.id,
                subcategory: sub.subcategory,
              });
            }
          });
        });

        if (occurrences.length > 0) {
          await supabase.from('qa_action_plan_occurrences').insert(occurrences);
        }
      }

      // Update totals on evaluation
      const rating = totals.hasCriticalFail ? 'Fail' : (totals.percentage >= PASS_THRESHOLD ? 'Pass' : 'Fail');
      await updateQAEvaluation(evaluation.id, {
        total_score: totals.totalScore,
        total_max: totals.totalMax,
        percentage: totals.percentage,
        has_critical_fail: totals.hasCriticalFail,
        rating,
      });

      return { evaluation, status };
    },
    onSuccess: async ({ evaluation, status }) => {
      // Send email notification if status is 'sent'
      if (status === 'sent') {
        try {
          await sendQANotification(evaluation.id, 'new_evaluation');
        } catch (notifError) {
          console.error('Failed to send notification:', notifError);
        }
        
        // Send custom action notification if any custom actions were used
        const customActions = Object.entries(categoryActions)
          .filter(([_, state]) => state.customAction.trim())
          .map(([category, state]) => ({ category, action: state.customAction.trim() }));
        
        if (customActions.length > 0) {
          try {
            await supabase.functions.invoke('send-custom-action-notification', {
              body: {
                evaluationId: evaluation.id,
                customActions,
                evaluatorEmail: user!.email,
                evaluatorName: user!.name,
              },
            });
          } catch (customActionErr) {
            console.error('Failed to send custom action notification:', customActionErr);
          }
        }
      }

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
            {/* Work Week & Coaching Date Row - First fields to fill */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="workWeekStart">Work Week Start</Label>
                <Input
                  id="workWeekStart"
                  type="date"
                  value={workWeekStart}
                  onChange={(e) => setWorkWeekStart(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workWeekEnd">Work Week End</Label>
                <Input
                  id="workWeekEnd"
                  type="date"
                  value={workWeekEnd}
                  onChange={(e) => setWorkWeekEnd(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coachingDate">Coaching Date <span className="text-destructive">*</span></Label>
                <Input
                  id="coachingDate"
                  type="date"
                  value={coachingDate}
                  onChange={(e) => setCoachingDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Required before sending to agent</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Agent Combobox with Search */}
              <div className="space-y-2">
                <Label htmlFor="agent">Agent</Label>
                <Popover open={agentComboboxOpen} onOpenChange={setAgentComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={agentComboboxOpen}
                      className="w-full justify-between"
                    >
                      {selectedAgent 
                        ? (selectedAgent.full_name || selectedAgent.agent_name || selectedAgent.email)
                        : "Select agent..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 z-50" align="start">
                    <Command>
                      <CommandInput placeholder="Search agent by name..." />
                      <CommandList>
                        <CommandEmpty>No agent found.</CommandEmpty>
                        <CommandGroup>
                          {agents.map(agent => (
                            <CommandItem
                              key={agent.id}
                              value={agent.full_name || agent.agent_name || agent.email}
                              onSelect={() => {
                                setSelectedAgent(agent);
                                setAgentComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedAgent?.id === agent.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {agent.full_name || agent.agent_name || agent.email}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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

        {/* Scoring Sections - With Critical Errors at Top, Feedback & Action Plans Nested */}
        {SCORING_CATEGORIES.map((category, catIndex) => {
          const criticalItems = category.subcategories.filter(s => s.isCritical);
          const regularItems = category.subcategories.filter(s => !s.isCritical);
          const catActionState = categoryActions[category.category] || { selectedActions: [], customAction: '' };
          const categoryFeedback = getFeedbackValue(category.category);
          const catScore = totals.categoryScores[category.category];

          return (
            <Card key={catIndex} className={catScore?.hasCritical ? 'border-destructive' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{category.category}</CardTitle>
                  <Badge variant={catScore?.hasCritical ? 'destructive' : 'secondary'}>
                    {catScore?.earned ?? 0} / {catScore?.max ?? 0}
                  </Badge>
                </div>
                <CardDescription>
                  All-or-nothing scoring: 0 (Fail) or Max Points (Pass)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Critical Errors First */}
                {criticalItems.map((sub, subIndex) => {
                  const key = `${category.category}|${sub.subcategory}`;
                  const scoreData = scores[key] || { score: null, aiSuggested: null, aiAccepted: null, criticalError: null, aiJustification: null };
                  const occurrenceCount = (actionPlanOccurrences[sub.subcategory] || 0) + 1;

                  return (
                    <QACriticalRow
                      key={subIndex}
                      subcategory={sub.subcategory}
                      behavior={sub.behavior}
                      hasCritical={scoreData.criticalError}
                      aiSuggested={scoreData.criticalError}
                      aiJustification={scoreData.aiJustification}
                      onCriticalChange={(v) => handleCriticalChange(key, v)}
                      onAcceptAI={(accept) => handleAcceptCriticalAI(key, accept)}
                      occurrenceCount={occurrenceCount > 1 ? occurrenceCount : undefined}
                    />
                  );
                })}

                {/* Regular Scoring Items */}
                {regularItems.map((sub, subIndex) => {
                  const key = `${category.category}|${sub.subcategory}`;
                  const scoreData = scores[key] || { score: null, aiSuggested: null, aiAccepted: null, criticalError: null, aiJustification: null };
                  const occurrenceCount = (actionPlanOccurrences[sub.subcategory] || 0) + 1;

                  return (
                    <QAScoreRow
                      key={subIndex}
                      subcategory={sub.subcategory}
                      behavior={sub.behavior}
                      maxPoints={sub.maxPoints}
                      score={scoreData.score}
                      aiSuggested={scoreData.aiSuggested}
                      aiAccepted={scoreData.aiAccepted}
                      aiJustification={scoreData.aiJustification}
                      onScoreChange={(v) => handleScoreChange(key, v)}
                      onAcceptAI={() => handleAcceptAI(key)}
                      occurrenceCount={occurrenceCount > 1 ? occurrenceCount : undefined}
                    />
                  );
                })}

                {/* Category Feedback */}
                <div className="space-y-2 pt-4 border-t">
                  <Label>{category.category} Feedback</Label>
                  <Textarea
                    placeholder={`Provide feedback on ${category.category.toLowerCase()}...`}
                    value={categoryFeedback}
                    onChange={(e) => setFeedbackValue(category.category, e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Category Action Plans */}
                <div className="space-y-2">
                  <Label>Action Needed ({category.category})</Label>
                  <QAActionPlanSelect
                    actionPlans={actionPlans.filter(ap => !ap.category || ap.category === category.category)}
                    selectedIds={catActionState.selectedActions}
                    suggestedIds={aiSuggestedActionIds.filter(id => actionPlans.find(ap => ap.id === id && (!ap.category || ap.category === category.category)))}
                    onSelectionChange={(ids) => handleCategoryActionChange(category.category, ids)}
                  />
                  <Input
                    placeholder="Custom action (optional)..."
                    value={catActionState.customAction}
                    onChange={(e) => handleCategoryCustomAction(category.category, e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}

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
                {totals.hasCriticalFail && (
                  <p className="text-xs text-muted-foreground mt-1">(Raw: {totals.rawTotalScore})</p>
                )}
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Percentage</p>
                <p className="text-3xl font-bold">{totals.percentage}%</p>
                <p className="text-xs text-muted-foreground mt-1">Pass: ≥{PASS_THRESHOLD}%</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Critical Fail</p>
                <p className={`text-3xl font-bold ${totals.hasCriticalFail ? 'text-destructive' : 'text-chart-2'}`}>
                  {totals.hasCriticalFail ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Rating</p>
                <p className={`text-3xl font-bold ${totals.hasCriticalFail || totals.percentage < PASS_THRESHOLD ? 'text-destructive' : 'text-chart-2'}`}>
                  {totals.hasCriticalFail ? 'Fail' : (totals.percentage >= PASS_THRESHOLD ? 'Pass' : 'Fail')}
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
