import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Search, 
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  FileText,
  Eye
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from 'date-fns';
import { fetchQAEvaluations, fetchWeeklyComparisonStats, type QAEvaluation } from '@/lib/qaEvaluationsApi';
import { QAWeeklyComparison } from '@/components/qa/QAWeeklyComparison';
import { DatePicker } from '@/components/ui/date-picker';

type FilterTab = 'all' | 'current_week' | 'previous_week' | 'monthly' | 'quarterly' | 'custom';

export default function QAEvaluations() {
  const { user, isAdmin, isHR, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();

  const canCreate = isAdmin || isHR || isSuperAdmin;
  const canViewAll = isAdmin || isHR || isSuperAdmin;

  // Fetch evaluations
  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ['qa-evaluations'],
    queryFn: fetchQAEvaluations,
  });

  // Fetch weekly comparison stats
  const { data: weeklyStats = [] } = useQuery({
    queryKey: ['qa-weekly-stats'],
    queryFn: fetchWeeklyComparisonStats,
  });

  // Filter evaluations based on active tab
  const filteredEvaluations = useMemo(() => {
    const now = new Date();
    let filtered = evaluations;

    // Filter by user if not admin
    if (!canViewAll && user?.email) {
      filtered = filtered.filter(e => e.agent_email.toLowerCase() === user.email.toLowerCase());
    }

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
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        filtered = filtered.filter(e => {
          const date = new Date(e.audit_date);
          return date >= monthStart && date <= monthEnd;
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
  }, [evaluations, activeTab, customStartDate, customEndDate, searchQuery, canViewAll, user?.email]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = filteredEvaluations.length;
    const acknowledged = filteredEvaluations.filter(e => e.agent_acknowledged).length;
    const pending = filteredEvaluations.filter(e => !e.agent_acknowledged && e.status === 'sent').length;
    const avgScore = total > 0 
      ? filteredEvaluations.reduce((sum, e) => sum + Number(e.percentage), 0) / total 
      : 0;
    
    return { total, acknowledged, pending, avgScore: Math.round(avgScore * 100) / 100 };
  }, [filteredEvaluations]);

  const getRatingBadge = (evaluation: QAEvaluation) => {
    if (evaluation.has_critical_fail) {
      return <Badge variant="destructive">Critical Fail</Badge>;
    }
    if (evaluation.rating === 'Pass') {
      return <Badge className="bg-chart-2 hover:bg-chart-2/90 text-primary-foreground">Pass</Badge>;
    }
    if (evaluation.rating === 'Fail') {
      return <Badge variant="destructive">Fail</Badge>;
    }
    return <Badge variant="secondary">{evaluation.rating || 'Pending'}</Badge>;
  };

  const getStatusBadge = (evaluation: QAEvaluation) => {
    if (evaluation.agent_acknowledged) {
      return <Badge className="bg-chart-2 hover:bg-chart-2/90 text-primary-foreground"><CheckCircle2 className="h-3 w-3 mr-1" />Acknowledged</Badge>;
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

        {/* Weekly Comparison Chart */}
        {weeklyStats.length > 0 && (
          <QAWeeklyComparison data={weeklyStats} />
        )}

        {/* Filters and Search */}
        <div className="flex flex-col gap-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="current_week">Current Week</TabsTrigger>
                <TabsTrigger value="previous_week">Previous Week</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
                <TabsTrigger value="custom">Custom</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
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
            </div>

            {/* Custom date range */}
            {activeTab === 'custom' && (
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">From:</span>
                  <DatePicker 
                    value={customStartDate?.toISOString().split('T')[0] || ''} 
                    onChange={(v) => setCustomStartDate(v ? new Date(v) : undefined)} 
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">To:</span>
                  <DatePicker 
                    value={customEndDate?.toISOString().split('T')[0] || ''} 
                    onChange={(v) => setCustomEndDate(v ? new Date(v) : undefined)} 
                  />
                </div>
              </div>
            )}
          </Tabs>
        </div>

        {/* Evaluations Table */}
        <Card>
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
                    <TableHead>Date</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Evaluator</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvaluations.map((evaluation) => (
                    <TableRow key={evaluation.id}>
                      <TableCell className="font-mono text-sm">
                        {evaluation.reference_number || '-'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(evaluation.audit_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">{evaluation.agent_name}</TableCell>
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
                      <TableCell>{evaluation.evaluator_name || evaluation.evaluator_email}</TableCell>
                      <TableCell>
                        <span className={evaluation.has_critical_fail ? 'text-destructive font-medium' : ''}>
                          {evaluation.percentage}%
                        </span>
                      </TableCell>
                      <TableCell>{getRatingBadge(evaluation)}</TableCell>
                      <TableCell>{getStatusBadge(evaluation)}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/team-performance/qa-evaluations/${evaluation.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
