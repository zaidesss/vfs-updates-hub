import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search, 
  CheckCircle2,
  Clock,
  TrendingUp,
  FileText,
  MoreHorizontal,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter } from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { fetchQAEvaluations, resendQANotification, createEvaluationEvent, deleteQAEvaluation, PASS_THRESHOLD, type QAEvaluation } from '@/lib/qaEvaluationsApi';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { QAWeeklyComparison } from '@/components/qa/QAWeeklyComparison';
import { QAPerformanceSummary } from '@/components/qa/QAPerformanceSummary';
import { DatePicker } from '@/components/ui/date-picker';
import { toProperCase } from '@/lib/stringUtils';

type FilterTab = 'all' | 'current_week' | 'previous_week' | 'monthly' | 'last_month' | 'quarterly' | 'custom';

const EST_TIMEZONE = 'America/New_York';

// Format date in EST
function formatInEST(date: Date | string, formatStr: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const zonedDate = toZonedTime(d, EST_TIMEZONE);
  return formatTz(zonedDate, formatStr, { timeZone: EST_TIMEZONE });
}

export default function QAEvaluations() {
  const { user, isAdmin, isHR, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [evaluationToDelete, setEvaluationToDelete] = useState<QAEvaluation | null>(null);

  const canCreate = isAdmin || isHR || isSuperAdmin;
  const canViewAll = isAdmin || isHR || isSuperAdmin;

  // Fetch evaluations
  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ['qa-evaluations'],
    queryFn: fetchQAEvaluations,
  });

  // Get unique agents for filter dropdown
  const uniqueAgents = useMemo(() => {
    const agents = new Map<string, string>();
    evaluations.forEach(e => {
      if (!agents.has(e.agent_email)) {
        agents.set(e.agent_email, e.agent_name);
      }
    });
    return Array.from(agents.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [evaluations]);

  // Filter evaluations by agent first (for chart), then by date (for table)
  const agentFilteredEvaluations = useMemo(() => {
    let filtered = evaluations;

    // Filter by user if not admin
    if (!canViewAll && user?.email) {
      filtered = filtered.filter(e => e.agent_email.toLowerCase() === user.email.toLowerCase());
    }

    // Filter by selected agent (only for admins)
    if (canViewAll && selectedAgent !== 'all') {
      filtered = filtered.filter(e => e.agent_email === selectedAgent);
    }

    return filtered;
  }, [evaluations, canViewAll, user?.email, selectedAgent]);

  // Filter evaluations based on date tab
  const filteredEvaluations = useMemo(() => {
    const now = new Date();
    let filtered = agentFilteredEvaluations;

    // Date filtering based on tab
    switch (activeTab) {
      case 'current_week': {
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        filtered = filtered.filter(e => {
          const date = new Date(e.audit_date);
          return date >= weekStart && date <= weekEnd;
        });
        break;
      }
      case 'previous_week': {
        const prevWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        const prevWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        filtered = filtered.filter(e => {
          const date = new Date(e.audit_date);
          return date >= prevWeekStart && date <= prevWeekEnd;
        });
        break;
      }
      case 'monthly': {
        // This month: evaluations where work_week_start falls within this calendar month
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        const monthStartStr = format(monthStart, 'yyyy-MM-dd');
        const monthEndStr = format(monthEnd, 'yyyy-MM-dd');
        filtered = filtered.filter(e => {
          // Use work_week_start to determine month membership
          const weekStart = e.work_week_start || e.audit_date;
          return weekStart >= monthStartStr && weekStart <= monthEndStr;
        });
        break;
      }
      case 'last_month': {
        // Last month: evaluations where work_week_start falls within last calendar month
        const lastMonth = subMonths(now, 1);
        const monthStart = startOfMonth(lastMonth);
        const monthEnd = endOfMonth(lastMonth);
        const monthStartStr = format(monthStart, 'yyyy-MM-dd');
        const monthEndStr = format(monthEnd, 'yyyy-MM-dd');
        filtered = filtered.filter(e => {
          const weekStart = e.work_week_start || e.audit_date;
          return weekStart >= monthStartStr && weekStart <= monthEndStr;
        });
        break;
      }
      case 'quarterly': {
        const quarterStart = startOfQuarter(now);
        const quarterEnd = endOfQuarter(now);
        filtered = filtered.filter(e => {
          const date = new Date(e.audit_date);
          return date >= quarterStart && date <= quarterEnd;
        });
        break;
      }
      case 'custom': {
        if (customStartDate && customEndDate) {
          filtered = filtered.filter(e => {
            const date = new Date(e.audit_date);
            return date >= customStartDate && date <= customEndDate;
          });
        }
        break;
      }
    }

    // Search filtering
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.agent_name.toLowerCase().includes(query) ||
        e.reference_number?.toLowerCase().includes(query) ||
        e.ticket_id.toLowerCase().includes(query) ||
        e.evaluator_name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [agentFilteredEvaluations, activeTab, customStartDate, customEndDate, searchQuery]);

  // Calculate weekly stats from filtered evaluations (based on date range)
  // Group evaluations by their work_week_start to show weeks dynamically
  const weeklyStats = useMemo(() => {
    // Group evaluations by work week
    const weekGroups = new Map<string, QAEvaluation[]>();
    
    filteredEvaluations.forEach(e => {
      if (e.work_week_start && e.work_week_end) {
        const key = `${e.work_week_start}|${e.work_week_end}`;
        if (!weekGroups.has(key)) {
          weekGroups.set(key, []);
        }
        weekGroups.get(key)!.push(e);
      }
    });
    
    // Convert to array and sort by start date
    const weeks = Array.from(weekGroups.entries())
      .map(([key, evals]) => {
        const [startISO, endISO] = key.split('|');
        const avgScore = evals.reduce((sum, e) => sum + Number(e.percentage), 0) / evals.length;
        
        return {
          week: '', // Will be assigned after sorting
          startDate: format(new Date(startISO + 'T12:00:00'), 'MM-dd-yy'),
          endDate: format(new Date(endISO + 'T12:00:00'), 'MM-dd-yy'),
          startDateISO: startISO,
          endDateISO: endISO,
          evaluationCount: evals.length,
          averageScore: Math.round(avgScore * 100) / 100,
          individualScores: evals.map(e => Number(e.percentage)).sort((a, b) => b - a),
        };
      })
      .sort((a, b) => a.startDateISO.localeCompare(b.startDateISO));
    
    // Assign week numbers and take last 4 weeks
    const lastFourWeeks = weeks.slice(-4);
    return lastFourWeeks.map((week, idx) => ({
      ...week,
      week: `Week ${idx + 1}`,
    }));
  }, [filteredEvaluations]);

  // Calculate stats from filtered evaluations
  const stats = useMemo(() => {
    const total = filteredEvaluations.length;
    const acknowledged = filteredEvaluations.filter(e => e.agent_acknowledged).length;
    const pending = filteredEvaluations.filter(e => !e.agent_acknowledged && e.status === 'sent').length;
    const avgScore = total > 0 
      ? filteredEvaluations.reduce((sum, e) => sum + Number(e.percentage), 0) / total 
      : 0;
    
    return { total, acknowledged, pending, avgScore: Math.round(avgScore * 100) / 100 };
  }, [filteredEvaluations]);

  // Resend notification mutation
  const resendMutation = useMutation({
    mutationFn: async (evaluation: QAEvaluation) => {
      await resendQANotification(evaluation.id);
      await createEvaluationEvent(
        evaluation.id,
        'notification_resent',
        'Notification email resent to agent',
        user?.email || '',
        user?.name
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qa-evaluations'] });
      toast({
        title: 'Email resent',
        description: 'The notification has been resent to the agent.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to resend',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete mutation (Super Admin only)
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteQAEvaluation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qa-evaluations'] });
      toast({
        title: 'Evaluation deleted',
        description: 'The QA evaluation has been permanently deleted.',
      });
      setDeleteModalOpen(false);
      setEvaluationToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getRatingBadge = (evaluation: QAEvaluation) => {
    if (evaluation.has_critical_fail) {
      return <Badge variant="destructive">Critical Fail</Badge>;
    }
    if (evaluation.rating === 'Pass') {
      return <Badge className="bg-chart-2/20 text-chart-2 border-chart-2/50 hover:bg-chart-2/30 font-semibold">Pass</Badge>;
    }
    if (evaluation.rating === 'Fail') {
      return <Badge variant="destructive">Fail</Badge>;
    }
    return <Badge variant="secondary">{evaluation.rating || 'Pending'}</Badge>;
  };

  const getStatusBadge = (evaluation: QAEvaluation) => {
    if (evaluation.agent_acknowledged) {
      return <Badge className="bg-chart-2/20 text-chart-2 border-chart-2/50 hover:bg-chart-2/30"><CheckCircle2 className="h-3 w-3 mr-1" />Acknowledged</Badge>;
    }
    if (evaluation.status === 'sent') {
      return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
    return <Badge variant="secondary">{evaluation.status}</Badge>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">QA Evaluations</h1>
            <p className="text-muted-foreground">
              {canViewAll ? 'Quality assurance evaluations for all agents' : 'Your quality assurance evaluations'}
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => navigate('/team-performance/qa-evaluations/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Evaluation
            </Button>
          )}
        </div>

        {/* Filters Section - At the top */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              {/* Date Range Filter */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-muted-foreground">Date Range</label>
                <Select value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="current_week">Current Week</SelectItem>
                    <SelectItem value="previous_week">Previous Week</SelectItem>
                    <SelectItem value="monthly">This Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="quarterly">This Quarter</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range */}
              {activeTab === 'custom' && (
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-muted-foreground">From</label>
                    <DatePicker 
                      value={customStartDate?.toISOString().split('T')[0] || ''} 
                      onChange={(v) => setCustomStartDate(v ? new Date(v) : undefined)} 
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-muted-foreground">To</label>
                    <DatePicker 
                      value={customEndDate?.toISOString().split('T')[0] || ''} 
                      onChange={(v) => setCustomEndDate(v ? new Date(v) : undefined)} 
                    />
                  </div>
                </div>
              )}

              {/* Agent Filter */}
              {canViewAll && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Agent</label>
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Filter by agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Agents</SelectItem>
                      {uniqueAgents.map(([email, name]) => (
                        <SelectItem key={email} value={email}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Evaluations</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgScore}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                from {stats.total} evaluation{stats.total !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Acknowledged</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-chart-2" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.acknowledged}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-chart-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly/Monthly Performance Summary - uses filtered evaluations */}
        <QAPerformanceSummary evaluations={filteredEvaluations} />

        {/* Weekly Comparison Chart */}
        {weeklyStats.length > 0 && (
          <QAWeeklyComparison data={weeklyStats} />
        )}

        {/* Search and Table */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>Evaluations</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by agent, ticket, ref..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-pulse text-muted-foreground">Loading evaluations...</div>
              </div>
            ) : filteredEvaluations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4 opacity-50" />
                <p>No evaluations found</p>
                {canCreate && (
                  <Button 
                    variant="link" 
                    onClick={() => navigate('/team-performance/qa-evaluations/new')}
                    className="mt-2"
                  >
                    Create your first evaluation
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref #</TableHead>
                    <TableHead>Work Week</TableHead>
                    <TableHead>Date / Time (EST)</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Evaluator</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvaluations.map((evaluation) => (
                    <TableRow key={evaluation.id}>
                      <TableCell className="font-mono text-sm">
                        <a 
                          href={`/team-performance/qa-evaluations/${evaluation.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/team-performance/qa-evaluations/${evaluation.id}`);
                          }}
                          className="text-primary hover:underline font-medium"
                        >
                          {evaluation.reference_number || '-'}
                        </a>
                      </TableCell>
                      <TableCell className="text-sm">
                        {evaluation.work_week_start && evaluation.work_week_end ? (
                          <span className="text-muted-foreground">
                            {format(new Date(evaluation.work_week_start + 'T00:00:00'), 'MM/dd')} - {format(new Date(evaluation.work_week_end + 'T00:00:00'), 'MM/dd/yy')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{formatInEST(evaluation.created_at, 'MM-dd-yy')}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatInEST(evaluation.created_at, 'h:mm a')} EST
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{toProperCase(evaluation.agent_name)}</TableCell>
                      <TableCell>
                        {evaluation.ticket_url ? (
                          <a 
                            href={evaluation.ticket_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            #{evaluation.ticket_id}
                          </a>
                        ) : (
                          `#${evaluation.ticket_id}`
                        )}
                      </TableCell>
                      <TableCell>{toProperCase(evaluation.evaluator_name) || evaluation.evaluator_email}</TableCell>
                      <TableCell>
                        <span className={evaluation.has_critical_fail ? 'text-destructive font-medium' : ''}>
                          {evaluation.percentage}%
                        </span>
                      </TableCell>
                      <TableCell>{getRatingBadge(evaluation)}</TableCell>
                      <TableCell>{getStatusBadge(evaluation)}</TableCell>
                      <TableCell>
                        {(canCreate || isSuperAdmin) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canCreate && evaluation.status === 'sent' && (
                                <DropdownMenuItem
                                  onClick={() => resendMutation.mutate(evaluation)}
                                  disabled={resendMutation.isPending}
                                >
                                  <RefreshCw className={`h-4 w-4 mr-2 ${resendMutation.isPending ? 'animate-spin' : ''}`} />
                                  Resend Notification
                                </DropdownMenuItem>
                              )}
                              {isSuperAdmin && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEvaluationToDelete(evaluation);
                                    setDeleteModalOpen(true);
                                  }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={(open) => {
          setDeleteModalOpen(open);
          if (!open) setEvaluationToDelete(null);
        }}
        onConfirm={async () => {
          if (evaluationToDelete) {
            await deleteMutation.mutateAsync(evaluationToDelete.id);
          }
        }}
        title="Delete QA Evaluation"
        description={`Are you sure you want to delete evaluation ${evaluationToDelete?.reference_number || evaluationToDelete?.id}? This action cannot be undone.`}
        itemName={evaluationToDelete?.reference_number || undefined}
      />
    </Layout>
  );
}
