import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronLeft, ChevronRight, Calendar, Save, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format, isBefore } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { EditableMetricCell } from '@/components/scorecard/EditableMetricCell';
import {
  fetchWeeklyScorecard,
  fetchScorecardConfig,
  saveScorecard,
  isWeekSaved,
  upsertZendeskMetrics,
  triggerMetricsRefresh,
  SUPPORT_TYPES,
  getScoreColor,
  getScoreBgColor,
  formatSeconds,
  type AgentScorecard,
} from '@/lib/scorecardApi';

const MINIMUM_DATE = new Date('2026-01-26');
const DATA_RETENTION_WEEKS = 2;

// AHT/FRT goals in seconds
const METRIC_GOALS = {
  call_aht: 300,  // 5 minutes
  chat_aht: 180,  // 3 minutes
  chat_frt: 60,   // 1 minute
};

interface EditedMetrics {
  callAht?: number | null;
  chatAht?: number | null;
  chatFrt?: number | null;
}

export default function TeamScorecard() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [supportType, setSupportType] = useState<string>('Hybrid Support');
  const [editedMetrics, setEditedMetrics] = useState<Record<string, EditedMetrics>>({});

  const canSave = isAdmin || isSuperAdmin;
  const hasEdits = Object.keys(editedMetrics).length > 0;

  // Calculate week boundaries (Monday to Sunday)
  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const weekEnd = useMemo(() => endOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

  // Check if week is before minimum date
  const isBeforeMinimumDate = isBefore(weekStart, MINIMUM_DATE);

  // Check if week is old (beyond data retention period) and might have incomplete data
  const weeksAgo = Math.floor((new Date().getTime() - weekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const isOldWeek = weeksAgo > DATA_RETENTION_WEEKS;

  // Fetch scorecard data
  const { data: scorecards, isLoading: isLoadingScorecard } = useQuery({
    queryKey: ['scorecard', weekStartStr, supportType],
    queryFn: () => fetchWeeklyScorecard(weekStart, weekEnd, supportType),
    staleTime: 5 * 60 * 1000,
    enabled: !isBeforeMinimumDate,
  });

  // Fetch config for column visibility
  const { data: config } = useQuery({
    queryKey: ['scorecard-config', supportType],
    queryFn: () => fetchScorecardConfig(supportType),
    staleTime: 10 * 60 * 1000,
  });

  // Check if week is saved
  const { data: weekIsSaved } = useQuery({
    queryKey: ['scorecard-saved', weekStartStr, weekEndStr, supportType],
    queryFn: () => isWeekSaved(weekStartStr, weekEndStr, supportType),
    staleTime: 60 * 1000,
    enabled: !isBeforeMinimumDate,
  });

  // Save Changes mutation (saves edited metrics to zendesk_agent_metrics)
  const saveChangesMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(editedMetrics);
      const results = await Promise.all(
        entries.map(([agentEmail, edits]) =>
          upsertZendeskMetrics(weekStartStr, weekEndStr, agentEmail, {
            call_aht_seconds: edits.callAht,
            chat_aht_seconds: edits.chatAht,
            chat_frt_seconds: edits.chatFrt,
          })
        )
      );
      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        throw new Error(`Failed to save ${failed.length} metrics`);
      }
      return results;
    },
    onSuccess: () => {
      toast.success('Metrics saved successfully');
      setEditedMetrics({});
      queryClient.invalidateQueries({ queryKey: ['scorecard', weekStartStr, supportType] });
    },
    onError: (error) => {
      toast.error(`Error saving metrics: ${error.message}`);
    },
  });

  // Save Scorecard mutation
  const saveScorecardMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) throw new Error('Not authenticated');
      
      // Apply edits to scorecards before saving
      const scorecardsWithEdits = scorecards?.map(sc => {
        const edits = editedMetrics[sc.agent.email.toLowerCase()];
        if (!edits) return sc;
        return {
          ...sc,
          callAht: edits.callAht !== undefined ? edits.callAht : sc.callAht,
          chatAht: edits.chatAht !== undefined ? edits.chatAht : sc.chatAht,
          chatFrt: edits.chatFrt !== undefined ? edits.chatFrt : sc.chatFrt,
        };
      }) || [];
      
      return saveScorecard(weekStartStr, weekEndStr, supportType, scorecardsWithEdits, user.email);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Scorecard saved successfully');
        setEditedMetrics({});
        queryClient.invalidateQueries({ queryKey: ['scorecard', weekStartStr, supportType] });
        queryClient.invalidateQueries({ queryKey: ['scorecard-saved', weekStartStr, weekEndStr, supportType] });
      } else {
        toast.error(`Failed to save: ${result.error}`);
      }
    },
    onError: (error) => {
      toast.error(`Error saving scorecard: ${error.message}`);
    },
  });

  // Refresh Zendesk metrics mutation (admin only, per support type)
  const refreshMutation = useMutation({
    mutationFn: () => triggerMetricsRefresh(weekStartStr, weekEndStr, supportType),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Refreshed metrics for ${result.processed} agents`);
        queryClient.invalidateQueries({ queryKey: ['scorecard', weekStartStr, supportType] });
      } else {
        toast.error(`Refresh failed: ${result.error}`);
      }
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Handle metric edit
  const handleMetricEdit = useCallback((agentEmail: string, metricKey: 'callAht' | 'chatAht' | 'chatFrt', value: number | null) => {
    const emailLower = agentEmail.toLowerCase();
    setEditedMetrics(prev => {
      const current = prev[emailLower] || {};
      const updated = { ...current, [metricKey]: value };
      
      // Check if all edits match original values - if so, remove from edited
      const scorecard = scorecards?.find(s => s.agent.email.toLowerCase() === emailLower);
      if (scorecard) {
        const isOriginal = 
          (updated.callAht === undefined || updated.callAht === scorecard.callAht) &&
          (updated.chatAht === undefined || updated.chatAht === scorecard.chatAht) &&
          (updated.chatFrt === undefined || updated.chatFrt === scorecard.chatFrt);
        
        if (isOriginal) {
          const { [emailLower]: _, ...rest } = prev;
          return rest;
        }
      }
      
      return { ...prev, [emailLower]: updated };
    });
  }, [scorecards]);

  // Get displayed value (edited or original)
  const getDisplayValue = useCallback((scorecard: AgentScorecard, metricKey: 'callAht' | 'chatAht' | 'chatFrt'): number | null => {
    const edits = editedMetrics[scorecard.agent.email.toLowerCase()];
    if (edits && edits[metricKey] !== undefined) {
      return edits[metricKey]!;
    }
    return scorecard[metricKey];
  }, [editedMetrics]);

  const goToPreviousWeek = () => {
    setSelectedDate(prev => subWeeks(prev, 1));
    setEditedMetrics({});
  };
  
  const goToNextWeek = () => {
    setSelectedDate(prev => addWeeks(prev, 1));
    setEditedMetrics({});
  };
  
  const goToCurrentWeek = () => {
    setSelectedDate(new Date());
    setEditedMetrics({});
  };

  // Determine which columns to show based on support type
  const showProductivity = ['Hybrid Support', 'Email Support'].includes(supportType);
  const showCallAht = ['Hybrid Support', 'Phone Support'].includes(supportType);
  const showChatAht = ['Hybrid Support', 'Chat Support'].includes(supportType);
  const showChatFrt = ['Hybrid Support', 'Chat Support'].includes(supportType);
  const showQA = supportType !== 'Logistics';
  const showRevalida = supportType !== 'Logistics';
  const showOtProductivity = supportType !== 'Logistics';

  const getMetricGoal = (metricKey: string): number => {
    const configItem = config?.find(c => c.metric_key === metricKey);
    return configItem?.goal || 100;
  };

  const formatScore = (score: number | null): string => {
    if (score === null) return '-';
    return `${score.toFixed(1)}%`;
  };

  // Check if any scorecard is already saved
  const hasSavedData = scorecards?.some(s => s.isSaved);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Team Scorecard</h1>
            <p className="text-muted-foreground">Weekly performance metrics by support type</p>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            {/* Save Changes Button - Only when there are edits */}
            {canSave && hasEdits && (
              <Button
                onClick={() => saveChangesMutation.mutate()}
                disabled={saveChangesMutation.isPending}
                variant="default"
                className="gap-2"
              >
                {saveChangesMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            )}

            {/* Save Scorecard Button - Admin Only */}
            {canSave && scorecards && scorecards.length > 0 && !isBeforeMinimumDate && (
              <Button
                onClick={() => saveScorecardMutation.mutate()}
                disabled={saveScorecardMutation.isPending}
                variant={weekIsSaved ? 'outline' : hasEdits ? 'outline' : 'default'}
                className="gap-2"
              >
                {saveScorecardMutation.isPending ? (
                  <>Saving...</>
                ) : weekIsSaved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Scorecard
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              {/* Week Navigation */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-md min-w-[240px] justify-center">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                  </span>
                </div>
                <Button variant="outline" size="icon" onClick={goToNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
                  Today
                </Button>
              </div>

              {/* Support Type Filter + Refresh Button */}
              <div className="flex items-center gap-2">
                <Select value={supportType} onValueChange={(val) => { setSupportType(val); setEditedMetrics({}); }}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select support type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Refresh Metrics Button - Admin Only */}
                {canSave && !isBeforeMinimumDate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshMutation.mutate()}
                    disabled={refreshMutation.isPending}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                    {refreshMutation.isPending ? 'Refreshing...' : 'Refresh Metrics'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Before Minimum Date Warning */}
        {isBeforeMinimumDate && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Scorecard data is only available for weeks starting on or after January 26, 2026.
            </AlertDescription>
          </Alert>
        )}

        {/* Old Week Warning */}
        {!isBeforeMinimumDate && isOldWeek && !weekIsSaved && !hasSavedData && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This week's data may be incomplete. Raw ticket logs expire after 2 weeks. 
              {canSave && ' Save the scorecard to preserve these values permanently.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Scorecard Table */}
        {!isBeforeMinimumDate && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {supportType} Scorecard
                  {scorecards && <span className="text-muted-foreground font-normal">({scorecards.length} agents)</span>}
                  {weekIsSaved && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Saved
                    </Badge>
                  )}
                  {hasEdits && (
                    <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                      {Object.keys(editedMetrics).length} edited
                    </Badge>
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingScorecard ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : scorecards && scorecards.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px]">Agent Name</TableHead>
                        {showProductivity && <TableHead className="text-center">Productivity</TableHead>}
                        {showCallAht && <TableHead className="text-center">Call AHT</TableHead>}
                        {showChatAht && <TableHead className="text-center">Chat AHT</TableHead>}
                        {showChatFrt && <TableHead className="text-center">Chat FRT</TableHead>}
                        {showQA && <TableHead className="text-center">QA</TableHead>}
                        {showRevalida && <TableHead className="text-center">Revalida</TableHead>}
                        <TableHead className="text-center">Reliability</TableHead>
                        {showOtProductivity && <TableHead className="text-center">OT Prod.</TableHead>}
                        <TableHead className="text-center">Final Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scorecards.map((scorecard) => (
                        <TableRow key={scorecard.agent.id} className={scorecard.isOnLeave ? 'opacity-60' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {scorecard.agent.full_name || scorecard.agent.agent_name || scorecard.agent.email}
                              </span>
                              {scorecard.isOnLeave && (
                                <Badge variant="secondary" className="text-xs">LEAVE</Badge>
                              )}
                              {scorecard.isSaved && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                                  saved
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          
                          {showProductivity && (
                            <TableCell className="text-center">
                              <div className={`px-2 py-1 rounded ${getScoreBgColor(scorecard.productivity, getMetricGoal('productivity'))}`}>
                                <span className={getScoreColor(scorecard.productivity, getMetricGoal('productivity'))}>
                                  {scorecard.productivity !== null ? (
                                    <>
                                      {formatScore(scorecard.productivity)}
                                      <span className="text-xs text-muted-foreground ml-1">({scorecard.productivityCount})</span>
                                    </>
                                  ) : '-'}
                                </span>
                              </div>
                            </TableCell>
                          )}

                          {showCallAht && (
                            <TableCell className="text-center">
                              <EditableMetricCell
                                value={getDisplayValue(scorecard, 'callAht')}
                                originalValue={scorecard.callAht}
                                goal={METRIC_GOALS.call_aht}
                                isEditable={canSave}
                                onEdit={(val) => handleMetricEdit(scorecard.agent.email, 'callAht', val)}
                                formatValue={formatSeconds}
                              />
                            </TableCell>
                          )}

                          {showChatAht && (
                            <TableCell className="text-center">
                              <EditableMetricCell
                                value={getDisplayValue(scorecard, 'chatAht')}
                                originalValue={scorecard.chatAht}
                                goal={METRIC_GOALS.chat_aht}
                                isEditable={canSave}
                                onEdit={(val) => handleMetricEdit(scorecard.agent.email, 'chatAht', val)}
                                formatValue={formatSeconds}
                              />
                            </TableCell>
                          )}

                          {showChatFrt && (
                            <TableCell className="text-center">
                              <EditableMetricCell
                                value={getDisplayValue(scorecard, 'chatFrt')}
                                originalValue={scorecard.chatFrt}
                                goal={METRIC_GOALS.chat_frt}
                                isEditable={canSave}
                                onEdit={(val) => handleMetricEdit(scorecard.agent.email, 'chatFrt', val)}
                                formatValue={formatSeconds}
                              />
                            </TableCell>
                          )}

                          {showQA && (
                            <TableCell className="text-center">
                              <div className={`px-2 py-1 rounded ${getScoreBgColor(scorecard.qa, getMetricGoal('qa'))}`}>
                                <span className={getScoreColor(scorecard.qa, getMetricGoal('qa'))}>
                                  {formatScore(scorecard.qa)}
                                </span>
                              </div>
                            </TableCell>
                          )}

                          {showRevalida && (
                            <TableCell className="text-center">
                              <div className="px-2 py-1 rounded bg-muted/30">
                                <span className="text-muted-foreground">Pending</span>
                              </div>
                            </TableCell>
                          )}

                          <TableCell className="text-center">
                            <div className={`px-2 py-1 rounded ${getScoreBgColor(scorecard.reliability, 100)}`}>
                              <span className={getScoreColor(scorecard.reliability, 100)}>
                                {formatScore(scorecard.reliability)}
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({scorecard.daysPresent}/{scorecard.scheduledDays - scorecard.approvedLeaveDays})
                                </span>
                              </span>
                            </div>
                          </TableCell>

                          {showOtProductivity && (
                            <TableCell className="text-center">
                              <div className="px-2 py-1 rounded bg-muted/30">
                                <span className="text-muted-foreground">-</span>
                              </div>
                            </TableCell>
                          )}

                          <TableCell className="text-center">
                            <div className={`px-2 py-1 rounded font-semibold ${getScoreBgColor(scorecard.finalScore, 100)}`}>
                              <span className={getScoreColor(scorecard.finalScore, 100)}>
                                {scorecard.isOnLeave ? 'N/A' : formatScore(scorecard.finalScore)}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No agents found for {supportType}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30" />
                <span>≥100% of goal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-100 dark:bg-yellow-900/30" />
                <span>80-99% of goal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/30" />
                <span>&lt;80% of goal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-muted/30" />
                <span>Pending / No data</span>
              </div>
              {canSave && (
                <div className="flex items-center gap-2 ml-4 border-l pl-4">
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-amber-600 border-amber-300">
                    edited
                  </Badge>
                  <span>Manually edited value</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
