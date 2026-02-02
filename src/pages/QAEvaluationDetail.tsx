import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  ExternalLink, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  FileText,
  Loader2,
  Mail,
  RefreshCw,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { 
  fetchQAEvaluationById, 
  acknowledgeEvaluation,
  resolveAction,
  fetchEvaluationEvents,
  createEvaluationEvent,
  SCORING_CATEGORIES,
  type QAEvaluation,
  type QAEvaluationScore,
  type QAActionNeeded,
  type QAEvaluationEvent
} from '@/lib/qaEvaluationsApi';

const EST_TIMEZONE = 'America/New_York';

// Format date in EST
function formatInEST(date: Date | string, formatStr: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const zonedDate = toZonedTime(d, EST_TIMEZONE);
  return formatTz(zonedDate, formatStr, { timeZone: EST_TIMEZONE });
}

export default function QAEvaluationDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin, isHR, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [acknowledging, setAcknowledging] = useState(false);
  const [acknowledgementChecked, setAcknowledgementChecked] = useState(false);

  const canViewAll = isAdmin || isHR || isSuperAdmin;

  // Fetch evaluation data
  const { data, isLoading, error } = useQuery({
    queryKey: ['qa-evaluation', id],
    queryFn: () => fetchQAEvaluationById(id!),
    enabled: !!id,
  });

  // Fetch audit trail events
  const { data: events = [] } = useQuery({
    queryKey: ['qa-evaluation-events', id],
    queryFn: () => fetchEvaluationEvents(id!),
    enabled: !!id,
  });

  const evaluation = data?.evaluation;
  const scores = data?.scores || [];
  const actions = data?.actions || [];

  // Check if user is the agent
  const isAgent = evaluation?.agent_email.toLowerCase() === user?.email?.toLowerCase();

  // Acknowledge mutation
  const acknowledgeMutation = useMutation({
    mutationFn: async () => {
      const result = await acknowledgeEvaluation(id!);
      // Log the event
      await createEvaluationEvent(
        id!,
        'agent_acknowledged',
        'Agent acknowledged the evaluation',
        user?.email || '',
        user?.name
      );
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qa-evaluation', id] });
      queryClient.invalidateQueries({ queryKey: ['qa-evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['qa-evaluation-events', id] });
      toast({
        title: 'Evaluation acknowledged',
        description: 'Thank you for reviewing this evaluation.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Resolve action mutation
  const resolveActionMutation = useMutation({
    mutationFn: (actionId: string) => resolveAction(actionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qa-evaluation', id] });
      toast({
        title: 'Action resolved',
        description: 'The action item has been marked as resolved.',
      });
    },
  });

  // Group scores by category
  const scoresByCategory = scores.reduce((acc, score) => {
    if (!acc[score.category]) acc[score.category] = [];
    acc[score.category].push(score);
    return acc;
  }, {} as Record<string, QAEvaluationScore[]>);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (error || !evaluation) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64">
          <XCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-medium">Evaluation not found</p>
          <Button variant="link" onClick={() => navigate(-1)}>
            Go back
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{evaluation.reference_number || 'QA Evaluation'}</h1>
              {evaluation.has_critical_fail ? (
                <Badge variant="destructive">Critical Fail</Badge>
              ) : evaluation.rating === 'Pass' ? (
                <Badge className="bg-chart-2 text-primary-foreground">Pass</Badge>
              ) : (
                <Badge variant="destructive">Fail</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Evaluation for {evaluation.agent_name}
            </p>
          </div>
        </div>

        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Agent</p>
                  <p className="font-medium">{evaluation.agent_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Evaluator</p>
                  <p className="font-medium">{evaluation.evaluator_name || evaluation.evaluator_email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Audit Date</p>
                  <p className="font-medium">{format(new Date(evaluation.audit_date), 'MMM d, yyyy')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Ticket</p>
                  {evaluation.ticket_url ? (
                    <a 
                      href={evaluation.ticket_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      #{evaluation.ticket_id}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p className="font-medium">#{evaluation.ticket_id}</p>
                  )}
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Score Summary */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Score</p>
                <p className="text-2xl font-bold">{evaluation.total_score} / {evaluation.total_max}</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Percentage</p>
                <p className="text-2xl font-bold">{evaluation.percentage}%</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Critical Error</p>
                <p className={`text-2xl font-bold ${evaluation.has_critical_fail ? 'text-destructive' : 'text-chart-2'}`}>
                  {evaluation.has_critical_fail ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Status</p>
                {evaluation.agent_acknowledged ? (
                  <div className="flex items-center justify-center gap-1 text-chart-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-bold">Acknowledged</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1 text-chart-4">
                    <Clock className="h-5 w-5" />
                    <span className="font-bold">Pending</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scores by Category */}
        {SCORING_CATEGORIES.map((category) => {
          const categoryScores = scoresByCategory[category.category] || [];
          const categoryTotal = categoryScores
            .filter(s => !s.is_critical)
            .reduce((sum, s) => sum + (s.score_earned || 0), 0);
          const categoryMax = categoryScores
            .filter(s => !s.is_critical)
            .reduce((sum, s) => sum + s.max_points, 0);
          const hasCritical = categoryScores.some(s => s.is_critical && s.critical_error_detected);

          return (
            <Card key={category.category} className={hasCritical ? 'border-destructive' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{category.category}</CardTitle>
                  <Badge variant={hasCritical ? 'destructive' : 'secondary'}>
                    {categoryTotal} / {categoryMax}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryScores.map((score) => (
                    <div 
                      key={score.id} 
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        score.is_critical && score.critical_error_detected 
                          ? 'bg-destructive/10 border border-destructive' 
                          : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {score.is_critical && (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          )}
                          <p className="font-medium">{score.subcategory}</p>
                        </div>
                        {score.behavior_identifier && (
                          <p className="text-sm text-muted-foreground">{score.behavior_identifier}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {score.is_critical ? (
                          <Badge variant={score.critical_error_detected ? 'destructive' : 'secondary'}>
                            {score.critical_error_detected ? 'Yes - Critical Fail' : 'No'}
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold">{score.score_earned ?? '-'}</span>
                            <span className="text-muted-foreground">/ {score.max_points}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Feedback */}
        <Card>
          <CardHeader>
            <CardTitle>Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {evaluation.accuracy_feedback && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Label className="font-medium">Accuracy Feedback</Label>
                  {evaluation.accuracy_kudos && (
                    <Badge className="bg-chart-2 text-primary-foreground">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Kudos
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{evaluation.accuracy_feedback}</p>
                {evaluation.accuracy_kudos && (
                  <p className="text-sm text-chart-2 mt-1 italic">{evaluation.accuracy_kudos}</p>
                )}
              </div>
            )}
            {evaluation.compliance_feedback && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Label className="font-medium">Compliance Feedback</Label>
                  {evaluation.compliance_kudos && (
                    <Badge className="bg-chart-2 text-primary-foreground">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Kudos
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{evaluation.compliance_feedback}</p>
                {evaluation.compliance_kudos && (
                  <p className="text-sm text-chart-2 mt-1 italic">{evaluation.compliance_kudos}</p>
                )}
              </div>
            )}
            {evaluation.customer_exp_feedback && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Label className="font-medium">Customer Experience Feedback</Label>
                  {evaluation.customer_exp_kudos && (
                    <Badge className="bg-chart-2 text-primary-foreground">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Kudos
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{evaluation.customer_exp_feedback}</p>
                {evaluation.customer_exp_kudos && (
                  <p className="text-sm text-chart-2 mt-1 italic">{evaluation.customer_exp_kudos}</p>
                )}
              </div>
            )}
            {!evaluation.accuracy_feedback && !evaluation.compliance_feedback && !evaluation.customer_exp_feedback && (
              <p className="text-muted-foreground">No feedback provided.</p>
            )}
          </CardContent>
        </Card>

        {/* Action Items */}
        {actions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Action Items</CardTitle>
              <CardDescription>
                {isAgent ? 'Check items as you complete them' : 'Action items assigned to the agent'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {actions.map((action) => (
                  <div 
                    key={action.id} 
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      action.is_resolved ? 'bg-chart-2/10' : 'bg-muted/50'
                    }`}
                  >
                    {isAgent && !action.is_resolved && (
                      <Checkbox
                        checked={action.is_resolved}
                        onCheckedChange={() => resolveActionMutation.mutate(action.id)}
                        disabled={resolveActionMutation.isPending}
                      />
                    )}
                    {action.is_resolved && (
                      <CheckCircle2 className="h-5 w-5 text-chart-2" />
                    )}
                    <div className="flex-1">
                      <p className={action.is_resolved ? 'line-through text-muted-foreground' : ''}>
                        {action.action_plan?.action_text || action.custom_action}
                      </p>
                    </div>
                    {action.action_plan?.category && (
                      <Badge variant="outline">{action.action_plan.category}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Audit Trail */}
        {canViewAll && events.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Activity History
              </CardTitle>
              <CardDescription>Timeline of all activities for this evaluation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {events.map((event, index) => (
                  <div 
                    key={event.id} 
                    className="flex gap-4 relative"
                  >
                    {/* Timeline line */}
                    {index < events.length - 1 && (
                      <div className="absolute left-[11px] top-6 w-0.5 h-full bg-border" />
                    )}
                    {/* Timeline dot */}
                    <div className="w-6 h-6 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center flex-shrink-0 z-10">
                      {event.event_type === 'notification_sent' && <Mail className="h-3 w-3 text-primary" />}
                      {event.event_type === 'notification_resent' && <RefreshCw className="h-3 w-3 text-primary" />}
                      {event.event_type === 'agent_acknowledged' && <CheckCircle2 className="h-3 w-3 text-chart-2" />}
                      {event.event_type === 'agent_reviewed' && <Eye className="h-3 w-3 text-primary" />}
                      {event.event_type === 'agent_remarks' && <FileText className="h-3 w-3 text-primary" />}
                      {!['notification_sent', 'notification_resent', 'agent_acknowledged', 'agent_reviewed', 'agent_remarks'].includes(event.event_type) && (
                        <Clock className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    {/* Event content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{event.event_description}</span>
                        <Badge variant="outline" className="text-xs">
                          {event.event_type.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        <span>by {event.actor_name || event.actor_email}</span>
                        <span className="mx-2">•</span>
                        <span>{formatInEST(event.created_at, 'MMM d, yyyy')} at {formatInEST(event.created_at, 'h:mm a')} EST</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Agent Acknowledgement */}
        {isAgent && !evaluation.agent_acknowledged && evaluation.status === 'sent' && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Acknowledgement Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                <Checkbox
                  id="acknowledge"
                  checked={acknowledgementChecked}
                  onCheckedChange={(checked) => setAcknowledgementChecked(checked as boolean)}
                />
                <Label htmlFor="acknowledge" className="text-sm leading-relaxed cursor-pointer">
                  I acknowledge that I have reviewed this Quality Evaluation in full. I understand the feedback 
                  provided and commit to implementing the action items identified. I agree that this evaluation 
                  accurately reflects the assessed interaction.
                </Label>
              </div>
              <Button 
                onClick={() => acknowledgeMutation.mutate()}
                disabled={!acknowledgementChecked || acknowledgeMutation.isPending}
                className="w-full"
              >
                {acknowledgeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Submit Acknowledgement
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Acknowledged timestamp */}
        {evaluation.agent_acknowledged && evaluation.acknowledged_at && (
          <div className="flex items-center justify-center gap-2 text-chart-2 p-4 bg-chart-2/10 rounded-lg">
            <CheckCircle2 className="h-5 w-5" />
            <span>
              Acknowledged on {format(new Date(evaluation.acknowledged_at), 'MMM d, yyyy \'at\' h:mm a')}
            </span>
          </div>
        )}
      </div>
    </Layout>
  );
}
