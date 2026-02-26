import { useState, useMemo, useCallback, useEffect } from 'react';
import { AGENT_DIRECTORY } from '@/lib/agentDirectory';
import { usePortalClock } from '@/context/PortalClockContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { writeAuditLog } from '@/lib/auditLogApi';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PageGuideButton } from '@/components/PageGuideButton';
import { Save, CheckCircle2, AlertTriangle, RefreshCw, Search, ArrowUpDown, Download } from 'lucide-react';
import { exportToCSV, formatSecondsForExport, formatPercentForExport } from '@/lib/exportUtils';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, isBefore, isSameWeek, addWeeks, differenceInWeeks } from 'date-fns';
import { ANCHOR_DATE, getLastWeekStart, PORTAL_START_YEAR } from '@/lib/weekConstants';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { EditableMetricCell } from '@/components/scorecard/EditableMetricCell';
import {
  fetchWeeklyScorecard,
  fetchWeeklyScorecardDualRead,
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
  type ScorecardConfig,
} from '@/lib/scorecardApi';

const MINIMUM_DATE = new Date('2026-01-26');
const DATA_RETENTION_WEEKS = 2;

// Default AHT/FRT goals in seconds (fallback only - DB values preferred)
const DEFAULT_METRIC_GOALS = {
  call_aht: 240,  // 4 minutes
  chat_aht: 420,  // 7 minutes
  chat_frt: 20,   // 20 seconds
} as const;

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
  orderEscalation?: number | null;
}

type ScoreFilter = 'all' | 'excellent' | 'good' | 'needs-improvement' | 'on-leave';
type SortOrder = 'name-asc' | 'name-desc' | 'score-desc' | 'score-asc';

export default function TeamScorecard() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const { now: portalNow } = usePortalClock();
  const queryClient = useQueryClient();
  
  // Default to current week for initial Year/Month/Week
  const currentWeekStart = useMemo(() => startOfWeek(portalNow, { weekStartsOn: 1 }), [portalNow.toDateString()]);
  
  const [selectedYear, setSelectedYear] = useState<string>(String(currentWeekStart.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState<string>(String(currentWeekStart.getMonth() + 1).padStart(2, '0'));
  const [selectedWeek, setSelectedWeek] = useState<string>(format(currentWeekStart, 'yyyy-MM-dd'));
  
  // Filters
  const [supportType, setSupportType] = useState<string>('all'); // Default to 'all'
  const [teamLeadFilter, setTeamLeadFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('name-asc');
  
  const [editedMetrics, setEditedMetrics] = useState<Record<string, EditedMetrics>>({});
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const canSave = isAdmin || isSuperAdmin;
  const hasEdits = Object.keys(editedMetrics).length > 0;

  // Detect user's team lead for regular (non-admin) users
  const userTeamLead = useMemo(() => {
    if (isAdmin) return null;
    const email = user?.email?.toLowerCase().trim();
    if (!email) return null;
    const info = AGENT_DIRECTORY[email];
    return info?.teamLead || null;
  }, [user?.email, isAdmin]);

  // Auto-set team lead filter for regular users
  useEffect(() => {
    if (userTeamLead) {
      setTeamLeadFilter(userTeamLead);
    }
  }, [userTeamLead]);

  // Calculate available weeks for the selected month
  const availableWeeks = useMemo(() => {
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth) - 1;
    const monthStart = startOfMonth(new Date(year, month, 1));
    const monthEnd = endOfMonth(new Date(year, month, 1));
    const currentWeekStart = startOfWeek(portalNow, { weekStartsOn: 1 });
    
    // Use anchor-based week generation (same logic as DashboardWeekSelector)
    // Find first anchor-aligned week that overlaps this month
    const weeksFromAnchorToMonthStart = differenceInWeeks(monthStart, ANCHOR_DATE);
    const startIdx = Math.max(0, weeksFromAnchorToMonthStart - 1); // one before to catch overlap
    const weeksFromAnchorToMonthEnd = differenceInWeeks(monthEnd, ANCHOR_DATE);
    const endIdx = weeksFromAnchorToMonthEnd + 1; // one after to catch overlap
    
    const weeks: { value: string; label: string; start: Date; end: Date; isCurrent: boolean }[] = [];
    
    for (let i = startIdx; i <= endIdx; i++) {
      const ws = addWeeks(ANCHOR_DATE, i);
      const we = endOfWeek(ws, { weekStartsOn: 1 });
      
      // Only include if week overlaps with the selected month
      if (ws > monthEnd || we < monthStart) continue;
      
      const isCurrent = isSameWeek(ws, currentWeekStart, { weekStartsOn: 1 });
      
      weeks.push({
        value: format(ws, 'yyyy-MM-dd'),
        label: `${format(ws, 'MM/dd')} - ${format(we, 'MM/dd')}`,
        start: ws,
        end: we,
        isCurrent,
      });
    }

    return weeks;
  }, [selectedYear, selectedMonth, portalNow.toDateString()]);

  // Determine the current week to display
  const { weekStart, weekEnd } = useMemo(() => {
    // Find the selected week
    const selected = availableWeeks.find(w => w.value === selectedWeek);
    if (selected) {
      return { weekStart: selected.start, weekEnd: selected.end };
    }
    
    // Fallback: find last week in available weeks, or first
    const lastWeekDate = getLastWeekStart(portalNow);
    const lastWeekMatch = availableWeeks.find(w => 
      isSameWeek(w.start, lastWeekDate, { weekStartsOn: 1 })
    );
    if (lastWeekMatch) {
      return { weekStart: lastWeekMatch.start, weekEnd: lastWeekMatch.end };
    }
    
    if (availableWeeks.length > 0) {
      const last = availableWeeks[availableWeeks.length - 1];
      return { weekStart: last.start, weekEnd: last.end };
    }
    
    // Ultimate fallback
    const fallbackStart = startOfWeek(portalNow, { weekStartsOn: 1 });
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
    // Reset to last available week when changing year
    setSelectedWeek('');
    if (!userTeamLead) setTeamLeadFilter('all');
    setEditedMetrics({});
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    setSelectedWeek('');
    if (!userTeamLead) setTeamLeadFilter('all');
    setEditedMetrics({});
  };

  const handleWeekChange = (week: string) => {
    setSelectedWeek(week);
    if (!userTeamLead) setTeamLeadFilter('all');
    setEditedMetrics({});
  };

  // Fetch scorecard data (dual-read: snapshots for old weeks, live for current)
  const { data: scorecards, isLoading: isLoadingScorecard } = useQuery({
    queryKey: ['scorecard', weekStartStr, supportType],
    queryFn: () => fetchWeeklyScorecardDualRead(weekStart, weekEnd, supportType),
    staleTime: 5 * 60 * 1000,
    enabled: !isBeforeMinimumDate,
  });

  // Detect if viewing snapshot data
  const isSnapshotData = useMemo(() => {
    if (!scorecards || scorecards.length === 0) return false;
    return scorecards[0]?.dataSource === 'snapshot';
  }, [scorecards]);

  // Detect if old week has no snapshot data available
  const isNoSnapshotAvailable = useMemo(() => {
    if (!scorecards || isLoadingScorecard) return false;
    return isOldWeek && scorecards.length === 0;
  }, [scorecards, isOldWeek, isLoadingScorecard]);

  // Fetch config for column visibility (for specific support type)
  const { data: config, data: configData } = useQuery({
    queryKey: ['scorecard-config', supportType === 'all' ? 'Hybrid' : supportType],
    queryFn: () => fetchScorecardConfig(supportType === 'all' ? 'Hybrid' : supportType),
    staleTime: 10 * 60 * 1000,
  });
  
  // Also fetch all support type configs for goal lookups in 'all' mode
  const { data: allConfigs } = useQuery({
    queryKey: ['scorecard-config-all'],
    queryFn: async () => {
      const results: Record<string, ScorecardConfig[]> = {};
      for (const st of SUPPORT_TYPES) {
        results[st] = await fetchScorecardConfig(st);
      }
      return results;
    },
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
  // Derive unique team leads from current scorecard data
  const availableTeamLeads = useMemo(() => {
    if (!scorecards) return [];
    const leads = new Set<string>();
    scorecards.forEach(sc => {
      const email = sc.agent.email?.toLowerCase().trim();
      const agentInfo = email ? AGENT_DIRECTORY[email] : null;
      if (agentInfo?.teamLead) {
        leads.add(agentInfo.teamLead);
      }
    });
    return Array.from(leads).sort();
  }, [scorecards]);

  const filteredScorecards = useMemo(() => {
    if (!scorecards) return [];
    
    let filtered = [...scorecards];

    // Team Lead filter
    if (teamLeadFilter !== 'all') {
      filtered = filtered.filter(sc => {
        const email = sc.agent.email?.toLowerCase().trim();
        const agentInfo = email ? AGENT_DIRECTORY[email] : null;
        return agentInfo?.teamLead === teamLeadFilter;
      });
    }
    
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
  }, [scorecards, teamLeadFilter, searchQuery, scoreFilter, sortOrder]);

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
            order_escalation: edits.orderEscalation,
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
      // Build condensed diff of edited metrics
      const metricChanges: Record<string, { old: string | null; new: string | null }> = {};
      Object.entries(editedMetrics).forEach(([agentEmail, edits]) => {
        const sc = scorecards?.find(s => s.agent.email.toLowerCase() === agentEmail);
        if (!sc) return;
        if (edits.callAht !== undefined && edits.callAht !== sc.callAht)
          metricChanges[`${agentEmail}:call_aht`] = { old: String(sc.callAht ?? ''), new: String(edits.callAht) };
        if (edits.chatAht !== undefined && edits.chatAht !== sc.chatAht)
          metricChanges[`${agentEmail}:chat_aht`] = { old: String(sc.chatAht ?? ''), new: String(edits.chatAht) };
        if (edits.chatFrt !== undefined && edits.chatFrt !== sc.chatFrt)
          metricChanges[`${agentEmail}:chat_frt`] = { old: String(sc.chatFrt ?? ''), new: String(edits.chatFrt) };
        if (edits.orderEscalation !== undefined)
          metricChanges[`${agentEmail}:order_escalation`] = { old: null, new: String(edits.orderEscalation) };
      });
      writeAuditLog({
        area: 'Scorecard',
        action_type: 'updated',
        entity_label: `Metrics edit: ${weekStartStr}`,
        changed_by: user?.email || '',
        changes: Object.keys(metricChanges).length > 0 ? metricChanges : undefined,
        metadata: { week_start: weekStartStr, support_type: supportType },
      });
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
        writeAuditLog({
          area: 'Scorecard',
          action_type: 'created',
          entity_label: `Scorecard snapshot: ${weekStartStr}`,
          changed_by: user?.email || '',
          metadata: { week_start: weekStartStr, week_end: weekEndStr, support_type: supportType },
        });
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
  const handleMetricEdit = useCallback((agentEmail: string, metricKey: 'callAht' | 'chatAht' | 'chatFrt' | 'orderEscalation', value: number | null) => {
    const emailLower = agentEmail.toLowerCase();
    setEditedMetrics(prev => {
      const current = prev[emailLower] || {};
      const updated = { ...current, [metricKey]: value };
      
      const scorecard = scorecards?.find(s => s.agent.email.toLowerCase() === emailLower);
      if (scorecard) {
        const isOriginal = 
          (updated.callAht === undefined || updated.callAht === scorecard.callAht) &&
          (updated.chatAht === undefined || updated.chatAht === scorecard.chatAht) &&
          (updated.chatFrt === undefined || updated.chatFrt === scorecard.chatFrt) &&
          (updated.orderEscalation === undefined || updated.orderEscalation === scorecard.orderEscalation);
        
        if (isOriginal) {
          const { [emailLower]: _, ...rest } = prev;
          return rest;
        }
      }
      
      return { ...prev, [emailLower]: updated };
    });
  }, [scorecards]);

  // Get displayed value (edited or original)
  const getDisplayValue = useCallback((scorecard: AgentScorecard, metricKey: 'callAht' | 'chatAht' | 'chatFrt' | 'orderEscalation'): number | null => {
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
  const showProductivity = isAllMode || ['Hybrid', 'Email + Phone', 'Email + Chat', 'Email'].includes(supportType);
  const showOrderEscalation = isAllMode || supportType === 'Logistics';
  const showCallAht = isAllMode || ['Hybrid', 'Email + Phone', 'Phone'].includes(supportType);
  const showChatAht = isAllMode || ['Hybrid', 'Email + Chat', 'Chat'].includes(supportType);
  const showChatFrt = isAllMode || ['Hybrid', 'Email + Chat', 'Chat'].includes(supportType);
  const showQA = true; // Now enabled for all including Logistics
  const showRevalida = true; // Now enabled for all including Logistics
  const showOtProductivity = isAllMode || supportType !== 'Logistics';

  // Get metric goal from DB config, with fallback to defaults
  const getMetricGoal = (metricKey: string, agentPosition?: string | string[] | null): number => {
    // In 'all' mode, look up goal from agent's specific support type
    if (supportType === 'all' && agentPosition && allConfigs) {
      const posKey = Array.isArray(agentPosition) ? agentPosition[0] : agentPosition;
      const agentConfig = posKey ? allConfigs[posKey] : undefined;
      const configItem = agentConfig?.find(c => c.metric_key === metricKey);
      if (configItem?.goal) return configItem.goal;
    }
    
    // Otherwise use the current support type's config
    const configItem = config?.find(c => c.metric_key === metricKey);
    if (configItem?.goal) return configItem.goal;
    
    // Fallback to defaults for AHT/FRT
    if (metricKey === 'call_aht') return DEFAULT_METRIC_GOALS.call_aht;
    if (metricKey === 'chat_aht') return DEFAULT_METRIC_GOALS.chat_aht;
    if (metricKey === 'chat_frt') return DEFAULT_METRIC_GOALS.chat_frt;
    
    return 100;
  };

  const formatScore = (score: number | null): string => {
    if (score === null) return '-';
    return `${score.toFixed(1)}%`;
  };

  // Check if metric applies to agent's support type
  const metricApplies = (agentPosition: string | string[] | null, metricType: 'productivity' | 'callAht' | 'chatAht' | 'chatFrt' | 'qa' | 'revalida' | 'otProductivity' | 'orderEscalation'): boolean => {
    if (!isAllMode) return true; // In specific mode, all shown columns apply
    
    // pos here is the resolved config key (e.g. 'Hybrid', 'Email + Chat', 'Email')
    const pos = Array.isArray(agentPosition) ? agentPosition[0] || '' : agentPosition || '';
    switch (metricType) {
      case 'productivity':
        return ['Hybrid', 'Email + Phone', 'Email + Chat', 'Email'].includes(pos);
      case 'orderEscalation':
        return pos === 'Logistics';
      case 'callAht':
        return ['Hybrid', 'Email + Phone', 'Phone'].includes(pos);
      case 'chatAht':
      case 'chatFrt':
        return ['Hybrid', 'Email + Chat', 'Chat'].includes(pos);
      case 'qa':
      case 'revalida':
        return true;
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

            {canSave && scorecards && scorecards.length > 0 && !isBeforeMinimumDate && !isSnapshotData && (
              <Button
                onClick={() => setShowSaveConfirm(true)}
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

            {/* Export Button */}
            {scorecards && scorecards.length > 0 && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  const columns = [
                    { key: 'agent.full_name', header: 'Agent' },
                    { key: 'agent.position', header: 'Position' },
                    { key: 'productivity', header: 'Productivity %' },
                    { key: 'callAht', header: 'Call AHT (seconds)' },
                    { key: 'chatAht', header: 'Chat AHT (seconds)' },
                    { key: 'chatFrt', header: 'Chat FRT (seconds)' },
                    { key: 'qa', header: 'QA %' },
                    { key: 'revalida', header: 'Revalida %' },
                    { key: 'reliability', header: 'Reliability %' },
                    { key: 'finalScore', header: 'Final Score %' },
                  ];
                  const filename = `scorecard-${weekStartStr}-to-${weekEndStr}-${supportType.replace(/\s+/g, '-').toLowerCase()}.csv`;
                  exportToCSV(filteredScorecards, columns, filename);
                  toast.success('Scorecard exported successfully');
                }}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            )}

            {canSave && !isBeforeMinimumDate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={() => refreshMutation.mutate()}
                      disabled={refreshMutation.isPending || supportType === 'all'}
                      variant="outline"
                      className="gap-2"
                    >
                      {refreshMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Refreshing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Refresh Metrics
                        </>
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                {supportType === 'all' && (
                  <TooltipContent>
                    <p>Select a specific support type to refresh metrics</p>
                  </TooltipContent>
                )}
              </Tooltip>
            )}
            
            <PageGuideButton pageId="scorecard" data-tour="date-filter" />
          </div>
        </div>

         {/* Filters Card */}
         <Card>
           <CardContent className="pt-6">
             <div className="flex flex-col gap-4" data-tour="date-filter">
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
                      {Array.from(
                        { length: portalNow.getFullYear() - PORTAL_START_YEAR + 1 },
                        (_, i) => PORTAL_START_YEAR + i
                      ).reverse().map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
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
                        <SelectItem 
                          key={week.value} 
                          value={week.value}
                          className={week.isCurrent ? 'font-medium text-primary' : ''}
                        >
                          {week.label}
                          {week.isCurrent && ' ✓'}
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

                {/* Team Lead Filter */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Team Lead</label>
                  {userTeamLead ? (
                    <Select value={userTeamLead} disabled>
                      <SelectTrigger className="w-48" disabled>
                        <SelectValue>{userTeamLead}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={userTeamLead}>{userTeamLead}</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select value={teamLeadFilter} onValueChange={setTeamLeadFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="All Team Leads" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Team Leads</SelectItem>
                        {availableTeamLeads.map(lead => (
                          <SelectItem key={lead} value={lead}>
                            {lead}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
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

        {/* No Snapshot Available Warning */}
        {isNoSnapshotAvailable && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No data available for this week. Historical data requires a saved snapshot, but none was found for this period.
            </AlertDescription>
          </Alert>
        )}

        {/* Old Week Warning (only when live data, not snapshot) */}
        {!isBeforeMinimumDate && isOldWeek && !weekIsSaved && !hasSavedData && !isSnapshotData && !isNoSnapshotAvailable && (
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
                  {isSnapshotData && (
                    <Badge variant="outline" className="gap-1 text-primary border-primary/30 bg-primary/5">
                      <Save className="h-3 w-3" />
                      Snapshot
                    </Badge>
                  )}
                  {weekIsSaved && !isSnapshotData && (
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
                                Call AHT
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
                        {showOrderEscalation && (
                          <TableHead className="text-center">
                            <Tooltip>
                              <TooltipTrigger className="cursor-help">
                                Order Esc.
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Order Escalation & Intervention %</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableHead>
                        )}
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
                                  goal={getMetricGoal('call_aht', scorecard.agent.position)}
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
                                  goal={getMetricGoal('chat_aht', scorecard.agent.position)}
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
                                  goal={getMetricGoal('chat_frt', scorecard.agent.position)}
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
                                scorecard.revalida !== null ? (
                                  <div className={`px-2 py-1 rounded ${getScoreBgColor(scorecard.revalida, getMetricGoal('revalida', scorecard.agent.position))}`}>
                                    <span className={getScoreColor(scorecard.revalida, getMetricGoal('revalida', scorecard.agent.position))}>
                                      {formatScore(scorecard.revalida)}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="px-2 py-1 rounded bg-muted/30">
                                    <span className="text-muted-foreground">-</span>
                                  </div>
                                )
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          )}

                          {showOrderEscalation && (
                            <TableCell className="text-center">
                              {metricApplies(scorecard.agent.position, 'orderEscalation') ? (
                                <EditableMetricCell
                                  value={getDisplayValue(scorecard, 'orderEscalation')}
                                  originalValue={scorecard.orderEscalation}
                                  goal={getMetricGoal('order_escalation', scorecard.agent.position)}
                                  isEditable={canSave}
                                  onEdit={(val) => handleMetricEdit(scorecard.agent.email, 'orderEscalation', val)}
                                  formatValue={(v) => v !== null ? `${v}%` : '-'}
                                  isPercentMode={true}
                                />
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
                                scorecard.otProductivity !== null ? (
                                  <div className={`px-2 py-1 rounded ${getScoreBgColor(scorecard.otProductivity, getMetricGoal('ot_productivity', scorecard.agent.position))}`}>
                                    <span className={getScoreColor(scorecard.otProductivity, getMetricGoal('ot_productivity', scorecard.agent.position))}>
                                      {formatScore(scorecard.otProductivity)}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="px-2 py-1 rounded bg-muted/30">
                                    <span className="text-muted-foreground">-</span>
                                  </div>
                                )
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
      <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <AlertDialogTitle>Save Scorecard?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2 text-left">
              Please make sure that all values are 100% accurate and updated before saving. Any changes made after saving will not be reflected in the saved scorecard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowSaveConfirm(false);
                saveScorecardMutation.mutate();
              }}
            >
              Yes, Save Scorecard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
