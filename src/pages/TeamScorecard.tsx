import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronLeft, ChevronRight, Calendar, Save, CheckCircle2, AlertTriangle } from 'lucide-react';
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format, isBefore, parseISO } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  fetchWeeklyScorecard,
  fetchScorecardConfig,
  saveScorecard,
  isWeekSaved,
  SUPPORT_TYPES,
  getScoreColor,
  getScoreBgColor,
  formatSeconds,
  type AgentScorecard,
  type ScorecardConfig
} from '@/lib/scorecardApi';

const MINIMUM_DATE = new Date('2026-01-26');
const DATA_RETENTION_WEEKS = 2;

export default function TeamScorecard() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [supportType, setSupportType] = useState<string>('Hybrid Support');

  const canSave = isAdmin || isSuperAdmin;

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

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!scorecards || !user?.email) {
        throw new Error('No data to save');
      }
      return saveScorecard(weekStartStr, weekEndStr, supportType, scorecards, user.email);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Scorecard saved successfully');
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

  const goToPreviousWeek = () => setSelectedDate(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setSelectedDate(prev => addWeeks(prev, 1));
  const goToCurrentWeek = () => setSelectedDate(new Date());

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

          {/* Save Button - Admin Only */}
          {canSave && scorecards && scorecards.length > 0 && !isBeforeMinimumDate && (
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              variant={weekIsSaved ? 'outline' : 'default'}
              className="gap-2"
            >
              {saveMutation.isPending ? (
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

              {/* Support Type Filter */}
              <Select value={supportType} onValueChange={setSupportType}>
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
                              <div className={`px-2 py-1 rounded ${scorecard.callAht !== null ? getScoreBgColor(100, 100) : 'bg-muted/30'}`}>
                                <span className={scorecard.callAht !== null ? 'text-foreground' : 'text-muted-foreground'}>
                                  {scorecard.callAht !== null ? formatSeconds(scorecard.callAht) : 'Pending'}
                                </span>
                              </div>
                            </TableCell>
                          )}

                          {showChatAht && (
                            <TableCell className="text-center">
                              <div className={`px-2 py-1 rounded ${scorecard.chatAht !== null ? getScoreBgColor(100, 100) : 'bg-muted/30'}`}>
                                <span className={scorecard.chatAht !== null ? 'text-foreground' : 'text-muted-foreground'}>
                                  {scorecard.chatAht !== null ? formatSeconds(scorecard.chatAht) : 'Pending'}
                                </span>
                              </div>
                            </TableCell>
                          )}

                          {showChatFrt && (
                            <TableCell className="text-center">
                              <div className={`px-2 py-1 rounded ${scorecard.chatFrt !== null ? getScoreBgColor(100, 100) : 'bg-muted/30'}`}>
                                <span className={scorecard.chatFrt !== null ? 'text-foreground' : 'text-muted-foreground'}>
                                  {scorecard.chatFrt !== null ? formatSeconds(scorecard.chatFrt) : 'Pending'}
                                </span>
                              </div>
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
                <span>Pending data</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                <span>Saved (frozen)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
