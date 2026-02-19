import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { writeAuditLog } from '@/lib/auditLogApi';
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
import { PageGuideButton } from '@/components/PageGuideButton';
import { 
  Plus, 
  Search, 
  CheckCircle2,
  Clock,
  TrendingUp,
  FileText,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Pencil,
  Send
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, getMonth, getYear } from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { fetchQAEvaluations, resendQANotification, finalizeAndSendEvaluation, createEvaluationEvent, deleteQAEvaluation, PASS_THRESHOLD, type QAEvaluation, type QAEvaluationFilters } from '@/lib/qaEvaluationsApi';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { QAWeeklyComparison } from '@/components/qa/QAWeeklyComparison';
import { QAPerformanceSummary } from '@/components/qa/QAPerformanceSummary';

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

import { toProperCase } from '@/lib/stringUtils';



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
  // New Year/Month/Week selectors - default to current month
  const estNow = useMemo(() => new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })), []);
  const [selectedYear, setSelectedYear] = useState<string>(String(estNow.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState<string>(String(estNow.getMonth() + 1).padStart(2, '0'));
  const [selectedWeek, setSelectedWeek] = useState<string>(() => {
    const weekStart = startOfWeek(estNow, { weekStartsOn: 1 });
    return format(weekStart, 'yyyy-MM-dd');
  });
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [evaluationToDelete, setEvaluationToDelete] = useState<QAEvaluation | null>(null);

  const canCreate = isAdmin || isHR || isSuperAdmin;
  const canViewAll = isAdmin || isHR || isSuperAdmin;

  // Fetch evaluations with server-side date filtering
  const { data: evaluations = [], isLoading } = useQuery<QAEvaluation[]>({
    queryKey: ['qa-evaluations', selectedYear, selectedMonth, selectedWeek, canViewAll ? selectedAgent : user?.email],
    queryFn: () => fetchQAEvaluations({
      year: parseInt(selectedYear),
      month: parseInt(selectedMonth),
      weekStart: selectedWeek !== 'all' ? selectedWeek : undefined,
      agentEmail: !canViewAll && user?.email ? user.email : (canViewAll && selectedAgent !== 'all' ? selectedAgent : undefined),
    }),
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

  // Since we now filter server-side, just apply remaining client-side filters
  const agentFilteredEvaluations = useMemo(() => {
    // With server-side filtering, evaluations are already filtered by date and agent
    // Just need to handle local admin agent selection if not already filtered
    return evaluations;
  }, [evaluations]);

  // Get available weeks for the selected month
  const availableWeeks = useMemo(() => {
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth) - 1; // 0-indexed
    const monthStart = startOfMonth(new Date(year, month, 1));
    const monthEnd = endOfMonth(new Date(year, month, 1));
    
    // Find all unique weeks from evaluations in this month
    const weeks = new Map<string, { start: string; end: string; label: string }>();
    
    agentFilteredEvaluations.forEach(e => {
      if (e.work_week_start && e.work_week_end) {
        const weekStartDate = new Date(e.work_week_start + 'T12:00:00');
        // Week belongs to month if its start date falls within the month
        if (weekStartDate >= monthStart && weekStartDate <= monthEnd) {
          const key = e.work_week_start;
          if (!weeks.has(key)) {
            weeks.set(key, {
              start: e.work_week_start,
              end: e.work_week_end,
              label: `${format(new Date(e.work_week_start + 'T12:00:00'), 'MM/dd')} - ${format(new Date(e.work_week_end + 'T12:00:00'), 'MM/dd')}`,
            });
          }
        }
      }
    });
    
    return Array.from(weeks.values()).sort((a, b) => a.start.localeCompare(b.start));
  }, [agentFilteredEvaluations, selectedYear, selectedMonth]);

  // Reset week selection when month changes
  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    setSelectedWeek('all');
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setSelectedWeek('all');
  };

  // With server-side filtering, we only need to apply search filter client-side
  const filteredEvaluations = useMemo(() => {
    let filtered = agentFilteredEvaluations;

    // Search filtering (client-side for instant feedback)
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
  }, [agentFilteredEvaluations, searchQuery]);

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

  // Send to Agent mutation (for draft evaluations)
  const sendToAgentMutation = useMutation({
    mutationFn: async (evaluation: QAEvaluation) => {
      await finalizeAndSendEvaluation(evaluation.id);
      await createEvaluationEvent(
        evaluation.id,
        'sent_to_agent',
        'Evaluation finalized and sent to agent from list view',
        user?.email || '',
        user?.name
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qa-evaluations'] });
      toast({
        title: 'Sent to Agent',
        description: 'The evaluation has been sent to the agent.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to send',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete mutation (Super Admin only)
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteQAEvaluation(id),
    onSuccess: (_data, deletedId) => {
      const deletedEval = evaluations?.find(e => e.id === deletedId);
      queryClient.invalidateQueries({ queryKey: ['qa-evaluations'] });
      toast({
        title: 'Evaluation deleted',
        description: 'The QA evaluation has been permanently deleted.',
      });
      setDeleteModalOpen(false);
      setEvaluationToDelete(null);
      if (deletedEval) {
        writeAuditLog({
          area: 'QA Evaluations',
          action_type: 'deleted',
          entity_id: deletedId,
          entity_label: deletedEval.agent_name || deletedEval.agent_email,
          reference_number: deletedEval.reference_number || null,
          changed_by: user?.email || '',
        });
      }
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
           <div className="flex gap-2">
             {canCreate && (
               <Button onClick={() => navigate('/team-performance/qa-evaluations/new')} data-tour="create-qa">
                 <Plus className="h-4 w-4 mr-2" />
                 New Evaluation
               </Button>
             )}
             <PageGuideButton pageId="qa-evaluations" />
           </div>
         </div>

         {/* Filters Section - Year, Month, Week selectors in a row */}
         <Card>
           <CardContent className="pt-6">
             <div className="flex flex-col gap-4 md:flex-row md:items-end md:flex-wrap" data-tour="qa-date-filter">
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
                <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Week" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Weeks</SelectItem>
                    {availableWeeks.map((week, idx) => (
                      <SelectItem key={week.start} value={week.start}>
                        Week {idx + 1} ({week.label})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Agent Filter */}
              {canViewAll && (
                <div className="flex flex-col gap-2 md:ml-auto">
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
        <div className="grid gap-4 md:grid-cols-4" data-tour="qa-stats">
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
               <Table data-tour="qa-table">
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
                              {canCreate && (
                                <DropdownMenuItem
                                  onClick={() => navigate(`/team-performance/qa-evaluations/edit/${evaluation.id}`)}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {canCreate && evaluation.status === 'draft' && (
                                <DropdownMenuItem
                                  onClick={() => sendToAgentMutation.mutate(evaluation)}
                                  disabled={sendToAgentMutation.isPending}
                                >
                                  <Send className={`h-4 w-4 mr-2 ${sendToAgentMutation.isPending ? 'animate-spin' : ''}`} />
                                  Send to Agent
                                </DropdownMenuItem>
                              )}
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
