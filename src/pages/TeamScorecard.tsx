import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, CheckCircle2, AlertTriangle, RefreshCw, Search, ArrowUpDown } from 'lucide-react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, isBefore, eachWeekOfInterval } from 'date-fns';
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

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

interface EditedMetrics {
  callAht?: number | null;
  chatAht?: number | null;
  chatFrt?: number | null;
}

type ScoreFilter = 'all' | 'excellent' | 'good' | 'needs-improvement' | 'on-leave';
type SortOrder = 'name-asc' | 'name-desc' | 'score-desc' | 'score-asc';

export default function TeamScorecard() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  
  // Date selectors (identical to QA Evaluations)
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<string>(String(now.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState<string>(String(now.getMonth() + 1).padStart(2, '0'));
  const [selectedWeek, setSelectedWeek] = useState<string>('current'); // 'current' or week start ISO string
  
  // Filters
  const [supportType, setSupportType] = useState<string>('all'); // Default to 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('name-asc');
  
  const [editedMetrics, setEditedMetrics] = useState<Record<string, EditedMetrics>>({});

  const canSave = isAdmin || isSuperAdmin;
  const hasEdits = Object.keys(editedMetrics).length > 0;

  // Calculate available weeks for the selected month
  const availableWeeks = useMemo(() => {
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth) - 1;
    const monthStart = startOfMonth(new Date(year, month, 1));
    const monthEnd = endOfMonth(new Date(year, month, 1));
    
    // Get all Mondays in the month
    const weeks = eachWeekOfInterval(
      { start: monthStart, end: monthEnd },
      { weekStartsOn: 1 }
    );
    
    return weeks.map((weekStart, idx) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      return {
        value: format(weekStart, 'yyyy-MM-dd'),
        label: `Week ${idx + 1} (${format(weekStart, 'MM/dd')} - ${format(weekEnd, 'MM/dd')})`,
        start: weekStart,
        end: weekEnd,
      };
    }).filter(w => {
      // Only include weeks where at least part falls in this month
      const weekStartMonth = w.start.getMonth();
      const isInMonth = weekStartMonth === month || 
        (w.start <= monthEnd && w.end >= monthStart);
      return isInMonth;
    });
  }, [selectedYear, selectedMonth]);

  // Determine the current week to display
  const { weekStart, weekEnd } = useMemo(() => {
    if (selectedWeek === 'current') {
      // Find the week containing today, or the last week of the month
      const today = new Date();
      const matchingWeek = availableWeeks.find(w => 
        today >= w.start && today <= w.end
      );
      if (matchingWeek) {
        return { weekStart: matchingWeek.start, weekEnd: matchingWeek.end };
      }
      // Default to last week in month
      const lastWeek = availableWeeks[availableWeeks.length - 1];
      if (lastWeek) {
        return { weekStart: lastWeek.start, weekEnd: lastWeek.end };
      }
    }
    
    // Find the selected week
    const selected = availableWeeks.find(w => w.value === selectedWeek);
    if (selected) {
      return { weekStart: selected.start, weekEnd: selected.end };
    }
    
    // Fallback to first week
    if (availableWeeks.length > 0) {
      return { weekStart: availableWeeks[0].start, weekEnd: availableWeeks[0].end };
    }
    
    // Ultimate fallback
    const fallbackStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return { weekStart: fallbackStart, weekEnd: endOfWeek(fallbackStart, { weekStartsOn: 1 }) };
  }, [selectedWeek, availableWeeks]);

  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

  // Check if week is before minimum date
  const isBeforeMinimumDate = isBefore(weekStart, MINIMUM_DATE);

  // Check if week is old (beyond data retention period)
  const weeksAgo = Math.floor((new Date().getTime() - weekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const isOldWeek = weeksAgo > DATA_RETENTION_WEEKS;

  // Handle year/month changes
  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setSelectedWeek('current');
    setEditedMetrics({});
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    setSelectedWeek('current');
    setEditedMetrics({});
  };

  const handleWeekChange = (week: string) => {
    setSelectedWeek(week);
    setEditedMetrics({});
  };

  // Fetch scorecard data
  const { data: scorecards, isLoading: isLoadingScorecard } = useQuery({
    queryKey: ['scorecard', weekStartStr, supportType],
    queryFn: () => fetchWeeklyScorecard(weekStart, weekEnd, supportType),
    staleTime: 5 * 60 * 1000,
    enabled: !isBeforeMinimumDate,
  });

  // Fetch config for column visibility (for specific support type)
  const { data: config } = useQuery({
    queryKey: ['scorecard-config', supportType === 'all' ? 'Hybrid Support' : supportType],
    queryFn: () => fetchScorecardConfig(supportType === 'all' ? 'Hybrid Support' : supportType),
    staleTime: 10 * 60 * 1000,
  });

  // Check if week is saved
  const { data: weekIsSaved } = useQuery({
    queryKey: ['scorecard-saved', weekStartStr, weekEndStr, supportType],
    queryFn: () => isWeekSaved(weekStartStr, weekEndStr, supportType),
    staleTime: 60 * 1000,
    enabled: !isBeforeMinimumDate,
  });

  // Filter and sort scorecards
  const filteredScorecards = useMemo(() => {
    if (!scorecards) return [];
    
    let filtered = [...scorecards];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sc => {
        const name = sc.agent.full_name || sc.agent.agent_name || sc.agent.email;
        return name.toLowerCase().includes(query);
      });
    }
    
    // Score filter
    switch (scoreFilter) {
      case 'excellent':
        filtered = filtered.filter(sc => sc.finalScore !== null && sc.finalScore >= 90);
        break;
      case 'good':
        filtered = filtered.filter(sc => sc.finalScore !== null && sc.finalScore >= 80 && sc.finalScore < 90);
        break;
      case 'needs-improvement':
        filtered = filtered.filter(sc => sc.finalScore !== null && sc.finalScore < 80);
        break;
      case 'on-leave':
        filtered = filtered.filter(sc => sc.isOnLeave);
        break;
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortOrder) {
        case 'name-asc':
          return (a.agent.full_name || a.agent.email).localeCompare(b.agent.full_name || b.agent.email);
        case 'name-desc':
          return (b.agent.full_name || b.agent.email).localeCompare(a.agent.full_name || a.agent.email);
        case 'score-desc':
          return (b.finalScore ?? -1) - (a.finalScore ?? -1);
        case 'score-asc':
          return (a.finalScore ?? 999) - (b.finalScore ?? 999);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [scorecards, searchQuery, scoreFilter, sortOrder]);

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

  // Save Scorecard mutation (saves all agents, grouped by their support type)
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

  // Refresh Zendesk metrics mutation
  const refreshMutation = useMutation({
    mutationFn: () => {
      if (supportType === 'all') {
        toast.error('Please select a specific support type to refresh metrics');
        throw new Error('Cannot refresh metrics for all support types at once');
      }
      return triggerMetricsRefresh(weekStartStr, weekEndStr, supportType);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Refreshed metrics for ${result.processed} agents`);
        queryClient.invalidateQueries({ queryKey: ['scorecard', weekStartStr, supportType] });
      } else {
        toast.error(`Refresh failed: ${result.error}`);
      }
    },
    onError: (error) => {
      if (error.message !== 'Cannot refresh metrics for all support types at once') {
        toast.error(`Error: ${error.message}`);
      }
    },
  });

  // Handle metric edit
  const handleMetricEdit = useCallback((agentEmail: string, metricKey: 'callAht' | 'chatAht' | 'chatFrt', value: number | null) => {
    const emailLower = agentEmail.toLowerCase();
    setEditedMetrics(prev => {
      const current = prev[emailLower] || {};
      const updated = { ...current, [metricKey]: value };
      
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

  // Determine which columns to show
  // In "all" mode, show all possible columns
  const isAllMode = supportType === 'all';
  const showTypeColumn = isAllMode;
  const showProductivity = isAllMode || ['Hybrid Support', 'Email Support'].includes(supportType);
  const showCallAht = isAllMode || ['Hybrid Support', 'Phone Support'].includes(supportType);
  const showChatAht = isAllMode || ['Hybrid Support', 'Chat Support'].includes(supportType);
  const showChatFrt = isAllMode || ['Hybrid Support', 'Chat Support'].includes(supportType);
  const showQA = isAllMode || supportType !== 'Logistics';
  const showRevalida = isAllMode || supportType !== 'Logistics';
  const showOtProductivity = isAllMode || supportType !== 'Logistics';

  const getMetricGoal = (metricKey: string): number => {
    const configItem = config?.find(c => c.metric_key === metricKey);
    return configItem?.goal || 100;
  };

  const formatScore = (score: number | null): string => {
    if (score === null) return '-';
    return `${score.toFixed(1)}%`;
  };

  // Check if metric applies to agent's support type
  const metricApplies = (agentPosition: string | null, metricType: 'productivity' | 'callAht' | 'chatAht' | 'chatFrt' | 'qa' | 'revalida' | 'otProductivity'): boolean => {
    if (!isAllMode) return true; // In specific mode, all shown columns apply
    
    const pos = agentPosition || '';
    switch (metricType) {
      case 'productivity':
        return ['Hybrid Support', 'Email Support'].includes(pos);
      case 'callAht':
        return ['Hybrid Support', 'Phone Support'].includes(pos);
      case 'chatAht':
      case 'chatFrt':
        return ['Hybrid Support', 'Chat Support'].includes(pos);
      case 'qa':
      case 'revalida':
      case 'otProductivity':
        return pos !== 'Logistics';
      default:
        return true;
    }
  };

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

        {/* Filters Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              {/* Row 1: Date Selectors */}
              <div className="flex flex-wrap gap-4 items-end">
                {/* Year Selector */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Year</label>
                  <Select value={selectedYear} onValueChange={handleYearChange}>
                    <SelectTrigger className="w-28">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => {
                        const year = new Date().getFullYear() - i + 1;
                        return (
                          <SelectItem key={year} value={String(year)}>
                            {year}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Month Selector */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Month</label>
                  <Select value={selectedMonth} onValueChange={handleMonthChange}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Week Selector */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Week</label>
                  <Select value={selectedWeek} onValueChange={handleWeekChange}>
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder="Select week" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableWeeks.map((week) => (
                        <SelectItem key={week.value} value={week.value}>
                          {week.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Filters */}
              <div className="flex flex-wrap gap-4 items-end">
                {/* Support Type */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Support Type</label>
                  <Select value={supportType} onValueChange={(val) => { setSupportType(val); setEditedMetrics({}); }}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Agents</SelectItem>
                      {SUPPORT_TYPES.map(type => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Agent Search */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search agent..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-48"
                    />
                  </div>
                </div>

                {/* Score Filter */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Score</label>
                  <Select value={scoreFilter} onValueChange={(val) => setScoreFilter(val as ScoreFilter)}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Filter by score" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Scores</SelectItem>
                      <SelectItem value="excellent">Excellent (90%+)</SelectItem>
                      <SelectItem value="good">Good (80-89%)</SelectItem>
                      <SelectItem value="needs-improvement">Needs Improvement (&lt;80%)</SelectItem>
                      <SelectItem value="on-leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Order */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Sort by</label>
                  <Select value={sortOrder} onValueChange={(val) => setSortOrder(val as SortOrder)}>
                    <SelectTrigger className="w-44">
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                      <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                      <SelectItem value="score-desc">Score (High to Low)</SelectItem>
                      <SelectItem value="score-asc">Score (Low to High)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Refresh Metrics Button - Admin Only */}
                {canSave && !isBeforeMinimumDate && supportType !== 'all' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshMutation.mutate()}
                    disabled={refreshMutation.isPending}
                    className="gap-2 h-10 self-end"
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
                  {isAllMode ? 'All Agents' : supportType} Scorecard
                  {filteredScorecards && <span className="text-muted-foreground font-normal">({filteredScorecards.length} agents)</span>}
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
              ) : filteredScorecards && filteredScorecards.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {showTypeColumn && <TableHead className="min-w-[120px]">Type</TableHead>}
                        <TableHead className="min-w-[180px]">Agent Name</TableHead>
                        {showProductivity && <TableHead className="text-center">Productivity</TableHead>}
                        {showCallAht && (
                          <TableHead className="text-center">
                            <Tooltip>
                              <TooltipTrigger className="cursor-help">
                                Avg Talk Time
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>per call leg — Explore aligned</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableHead>
                        )}
{showChatAht && (
                          <TableHead className="text-center">
                            <Tooltip>
                              <TooltipTrigger className="cursor-help">
                                Chat AHT
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>per conversation — Explore aligned</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableHead>
                        )}
                        {showChatFrt && (
                          <TableHead className="text-center">
                            <Tooltip>
                              <TooltipTrigger className="cursor-help">
                                Chat FRT
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>first agent reply — Explore aligned</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableHead>
                        )}
                        {showQA && <TableHead className="text-center">QA</TableHead>}
                        {showRevalida && <TableHead className="text-center">Revalida</TableHead>}
                        <TableHead className="text-center">Reliability</TableHead>
                        {showOtProductivity && <TableHead className="text-center">OT Prod.</TableHead>}
                        <TableHead className="text-center">Final Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredScorecards.map((scorecard) => (
                        <TableRow key={scorecard.agent.id} className={scorecard.isOnLeave ? 'opacity-60' : ''}>
                          {showTypeColumn && (
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {scorecard.agent.position || 'Unknown'}
                              </Badge>
                            </TableCell>
                          )}
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
                              {metricApplies(scorecard.agent.position, 'productivity') ? (
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
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          )}

                          {showCallAht && (
                            <TableCell className="text-center">
                              {metricApplies(scorecard.agent.position, 'callAht') ? (
                                <EditableMetricCell
                                  value={getDisplayValue(scorecard, 'callAht')}
                                  originalValue={scorecard.callAht}
                                  goal={METRIC_GOALS.call_aht}
                                  isEditable={canSave}
                                  onEdit={(val) => handleMetricEdit(scorecard.agent.email, 'callAht', val)}
                                  formatValue={formatSeconds}
                                />
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          )}

                          {showChatAht && (
                            <TableCell className="text-center">
                              {metricApplies(scorecard.agent.position, 'chatAht') ? (
                                <EditableMetricCell
                                  value={getDisplayValue(scorecard, 'chatAht')}
                                  originalValue={scorecard.chatAht}
                                  goal={METRIC_GOALS.chat_aht}
                                  isEditable={canSave}
                                  onEdit={(val) => handleMetricEdit(scorecard.agent.email, 'chatAht', val)}
                                  formatValue={formatSeconds}
                                />
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          )}

                          {showChatFrt && (
                            <TableCell className="text-center">
                              {metricApplies(scorecard.agent.position, 'chatFrt') ? (
                                <EditableMetricCell
                                  value={getDisplayValue(scorecard, 'chatFrt')}
                                  originalValue={scorecard.chatFrt}
                                  goal={METRIC_GOALS.chat_frt}
                                  isEditable={canSave}
                                  onEdit={(val) => handleMetricEdit(scorecard.agent.email, 'chatFrt', val)}
                                  formatValue={formatSeconds}
                                />
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          )}

                          {showQA && (
                            <TableCell className="text-center">
                              {metricApplies(scorecard.agent.position, 'qa') ? (
                                <div className={`px-2 py-1 rounded ${getScoreBgColor(scorecard.qa, getMetricGoal('qa'))}`}>
                                  <span className={getScoreColor(scorecard.qa, getMetricGoal('qa'))}>
                                    {formatScore(scorecard.qa)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          )}

                          {showRevalida && (
                            <TableCell className="text-center">
                              {metricApplies(scorecard.agent.position, 'revalida') ? (
                                <div className="px-2 py-1 rounded bg-muted/30">
                                  <span className="text-muted-foreground">Pending</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
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
                              {metricApplies(scorecard.agent.position, 'otProductivity') ? (
                                <div className="px-2 py-1 rounded bg-muted/30">
                                  <span className="text-muted-foreground">-</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
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
                  {searchQuery || scoreFilter !== 'all' 
                    ? 'No agents match your filters'
                    : `No agents found${isAllMode ? '' : ` for ${supportType}`}`}
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
