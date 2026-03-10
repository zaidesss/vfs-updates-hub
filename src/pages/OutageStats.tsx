import { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle, Download, TrendingUp, Users, AlertCircle, Zap, Wifi, Heart, Calendar, Wrench, Clock, Timer, HelpCircle, ChevronDown, ChevronRight, Info, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { fetchAllLeaveRequests, LeaveRequest } from '@/lib/leaveRequestApi';
import { useToast } from '@/hooks/use-toast';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { getUniqueTeamLeads, getAgentEmailsByTeamLead } from '@/lib/agentDirectory';
import { PageHeader } from '@/components/ui/page-header';

const OUTAGE_REASONS = [
  'Power Outage',
  'Wi-Fi Issue',
  'Medical Leave',
  'Planned Leave',
  'Equipment Issue',
  'Late Login',
  'Undertime',
  'Unplanned'
];

const REASON_ICONS: Record<string, React.ReactNode> = {
  'Power Outage': <Zap className="h-4 w-4" />,
  'Wi-Fi Issue': <Wifi className="h-4 w-4" />,
  'Medical Leave': <Heart className="h-4 w-4" />,
  'Planned Leave': <Calendar className="h-4 w-4" />,
  'Equipment Issue': <Wrench className="h-4 w-4" />,
  'Late Login': <Clock className="h-4 w-4" />,
  'Undertime': <Timer className="h-4 w-4" />,
  'Unplanned': <HelpCircle className="h-4 w-4" />
};

// 3-Tier Threshold configuration based on HR Policy
interface ThresholdTier {
  acceptable: number;
  needsReview: number;
  actionRequired: number;
}

const REASON_THRESHOLDS: Record<string, ThresholdTier | null> = {
  'Power Outage': { acceptable: 1, needsReview: 2, actionRequired: 3 },
  'Wi-Fi Issue': { acceptable: 1, needsReview: 2, actionRequired: 3 },
  'Medical Leave': { acceptable: 2, needsReview: 3, actionRequired: 4 },
  'Planned Leave': null, // No threshold - unlimited
  'Equipment Issue': { acceptable: 1, needsReview: 2, actionRequired: 3 },
  'Late Login': { acceptable: 1, needsReview: 2, actionRequired: 4 },
  'Undertime': { acceptable: 1, needsReview: 2, actionRequired: 3 },
  'Unplanned': { acceptable: 1, needsReview: 2, actionRequired: 3 }
};

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(220, 70%, 50%)',
  'hsl(280, 65%, 60%)',
  'hsl(340, 75%, 55%)'
];

type OffenderStatus = 'acceptable' | 'needs_review' | 'action_required';

interface ViolationDetail {
  reason: string;
  count: number;
  thresholds: ThresholdTier;
  status: OffenderStatus;
}

interface RepeatOffender {
  agentName: string;
  agentEmail: string;
  violations: ViolationDetail[];
  worstStatus: OffenderStatus;
  totalExceeded: number;
}

export default function OutageStats() {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const estStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit' }).format(now);
    return estStr.slice(0, 7);
  });
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [policyOpen, setPolicyOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'monthly' | 'quarterly'>('monthly');
  const [selectedQuarter, setSelectedQuarter] = useState(() => {
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    return `${now.getFullYear()}-Q${q}`;
  });
  const [selectedTeamLead, setSelectedTeamLead] = useState<string>('all');

  const teamLeads = useMemo(() => getUniqueTeamLeads(), []);

  // Generate months from Jan 2024 to Dec 2026
  const monthOptions = useMemo(() => {
    const months = [];
    const startYear = 2024;
    const endYear = 2026;
    
    for (let year = endYear; year >= startYear; year--) {
      for (let month = 11; month >= 0; month--) {
        const date = new Date(year, month);
        months.push({
          value: format(date, 'yyyy-MM'),
          label: format(date, 'MMMM yyyy')
        });
      }
    }
    return months;
  }, []);

  // Generate quarter options from 2024-2026
  const quarterOptions = useMemo(() => {
    const quarters = [];
    for (let year = 2026; year >= 2024; year--) {
      for (let q = 4; q >= 1; q--) {
        quarters.push({
          value: `${year}-Q${q}`,
          label: `Q${q} ${year}`
        });
      }
    }
    return quarters;
  }, []);

  // Helper to get date range for a quarter
  const getQuarterRange = (quarterStr: string) => {
    const [yearStr, qStr] = quarterStr.split('-Q');
    const year = parseInt(yearStr);
    const q = parseInt(qStr);
    const startMonth = (q - 1) * 3; // 0-indexed
    const qStart = startOfMonth(new Date(year, startMonth));
    const qEnd = endOfMonth(new Date(year, startMonth + 2));
    return { qStart, qEnd };
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setIsLoading(true);
    const result = await fetchAllLeaveRequests();
    
    if (result.data) {
      // Only include approved requests
      setRequests(result.data.filter(r => r.status === 'approved'));
    } else if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive'
      });
    }
    setIsLoading(false);
  };

  // For non-admins, filter requests to only their own data
  const displayRequests = useMemo(() => {
    if (isAdmin) return requests;
    return requests.filter(r => r.agent_email === user?.email);
  }, [requests, isAdmin, user?.email]);

  // Get unique agents from requests (filtered by team lead if selected)
  const agents = useMemo(() => {
    const teamLeadEmails = selectedTeamLead !== 'all' ? getAgentEmailsByTeamLead(selectedTeamLead) : null;
    const agentSet = new Set(displayRequests.map(r => r.agent_email));
    return Array.from(agentSet)
      .filter(email => !teamLeadEmails || teamLeadEmails.includes(email.toLowerCase().trim()))
      .map(email => {
        const req = displayRequests.find(r => r.agent_email === email);
        return { email, name: req?.agent_name || email };
      });
  }, [displayRequests, selectedTeamLead]);

  // Filter requests by selected period, agent, and team lead
  const filteredRequests = useMemo(() => {
    let periodStart: Date;
    let periodEnd: Date;

    if (viewMode === 'quarterly') {
      const { qStart, qEnd } = getQuarterRange(selectedQuarter);
      periodStart = qStart;
      periodEnd = qEnd;
    } else {
      const [year, month] = selectedMonth.split('-').map(Number);
      periodStart = startOfMonth(new Date(year, month - 1));
      periodEnd = endOfMonth(new Date(year, month - 1));
    }

    const teamLeadEmails = selectedTeamLead !== 'all' ? getAgentEmailsByTeamLead(selectedTeamLead) : null;

    return displayRequests.filter(req => {
      const reqStart = parseISO(req.start_date);
      const reqEnd = parseISO(req.end_date);
      const inPeriod = reqStart <= periodEnd && reqEnd >= periodStart;
      const matchesAgent = selectedAgent === 'all' || req.agent_email === selectedAgent;
      const matchesTeamLead = !teamLeadEmails || teamLeadEmails.includes(req.agent_email.toLowerCase().trim());
      return inPeriod && matchesAgent && matchesTeamLead;
    });
  }, [displayRequests, selectedMonth, selectedQuarter, viewMode, selectedAgent, selectedTeamLead]);

  // Calculate stats by reason (for breakdown table)
  const reasonStats = useMemo(() => {
    const stats: Record<string, { count: number; hours: number; days: number }> = {};
    
    OUTAGE_REASONS.forEach(reason => {
      stats[reason] = { count: 0, hours: 0, days: 0 };
    });

    filteredRequests.forEach(req => {
      if (stats[req.outage_reason]) {
        stats[req.outage_reason].count += 1;
        stats[req.outage_reason].hours += req.outage_duration_hours || 0;
        stats[req.outage_reason].days += req.total_days || 0;
      }
    });

    return stats;
  }, [filteredRequests]);

  // Trend data (last 6 months or last 6 quarters)
  const trendData = useMemo(() => {
    const teamLeadEmails = selectedTeamLead !== 'all' ? getAgentEmailsByTeamLead(selectedTeamLead) : null;
    const data = [];

    if (viewMode === 'quarterly') {
      const now = new Date();
      const currentQ = Math.ceil((now.getMonth() + 1) / 3);
      const currentYear = now.getFullYear();
      for (let i = 5; i >= 0; i--) {
        let q = currentQ - i;
        let year = currentYear;
        while (q <= 0) { q += 4; year--; }
        const { qStart, qEnd } = getQuarterRange(`${year}-Q${q}`);
        const periodRequests = displayRequests.filter(req => {
          const reqStart = parseISO(req.start_date);
          const inPeriod = reqStart >= qStart && reqStart <= qEnd;
          const matchesTL = !teamLeadEmails || teamLeadEmails.includes(req.agent_email.toLowerCase().trim());
          return inPeriod && matchesTL;
        });
        data.push({
          month: `Q${q}`,
          fullMonth: `Q${q} ${year}`,
          total: periodRequests.length,
          hours: periodRequests.reduce((sum, r) => sum + (r.outage_duration_hours || 0), 0)
        });
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const mStart = startOfMonth(date);
        const mEnd = endOfMonth(date);
        const monthRequests = displayRequests.filter(req => {
          const reqStart = parseISO(req.start_date);
          const inPeriod = reqStart >= mStart && reqStart <= mEnd;
          const matchesTL = !teamLeadEmails || teamLeadEmails.includes(req.agent_email.toLowerCase().trim());
          return inPeriod && matchesTL;
        });
        data.push({
          month: format(date, 'MMM'),
          fullMonth: format(date, 'MMMM yyyy'),
          total: monthRequests.length,
          hours: monthRequests.reduce((sum, r) => sum + (r.outage_duration_hours || 0), 0)
        });
      }
    }
    return data;
  }, [displayRequests, viewMode, selectedTeamLead]);

  // Reason distribution for pie chart
  const reasonDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRequests.forEach(req => {
      counts[req.outage_reason] = (counts[req.outage_reason] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([name, value], index) => ({
        name,
        value,
        color: CHART_COLORS[index % CHART_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRequests]);

  // Helper to determine status based on count and thresholds
  const getStatus = (count: number, thresholds: ThresholdTier): OffenderStatus => {
    if (count >= thresholds.actionRequired) return 'action_required';
    if (count >= thresholds.needsReview) return 'needs_review';
    return 'acceptable';
  };

  // Repeat offenders calculation with 3-tier system
  const repeatOffenders = useMemo((): RepeatOffender[] => {
    const agentStats: Record<string, Record<string, number>> = {};

    filteredRequests.forEach(req => {
      if (!agentStats[req.agent_email]) {
        agentStats[req.agent_email] = {};
      }
      agentStats[req.agent_email][req.outage_reason] = 
        (agentStats[req.agent_email][req.outage_reason] || 0) + 1;
    });

    const offenders: RepeatOffender[] = [];

    Object.entries(agentStats).forEach(([email, reasons]) => {
      const violations: ViolationDetail[] = [];
      let worstStatus: OffenderStatus = 'acceptable';
      let totalExceeded = 0;
      
      Object.entries(reasons).forEach(([reason, count]) => {
        const thresholds = REASON_THRESHOLDS[reason];
        if (!thresholds) return; // Skip Planned Leave (no threshold)
        
        const status = getStatus(count, thresholds);
        
        if (status !== 'acceptable') {
          violations.push({ reason, count, thresholds, status });
          
          // Track worst status
          if (status === 'action_required') {
            worstStatus = 'action_required';
            totalExceeded += count - thresholds.actionRequired + 1;
          } else if (status === 'needs_review' && worstStatus !== 'action_required') {
            worstStatus = 'needs_review';
            totalExceeded += count - thresholds.needsReview + 1;
          }
        }
      });

      if (violations.length > 0) {
        const req = filteredRequests.find(r => r.agent_email === email);
        offenders.push({
          agentName: req?.agent_name || email,
          agentEmail: email,
          violations,
          worstStatus,
          totalExceeded
        });
      }
    });

    // Sort: action_required first, then needs_review, then by total exceeded
    return offenders.sort((a, b) => {
      const statusOrder = { action_required: 0, needs_review: 1, acceptable: 2 };
      if (statusOrder[a.worstStatus] !== statusOrder[b.worstStatus]) {
        return statusOrder[a.worstStatus] - statusOrder[b.worstStatus];
      }
      return b.totalExceeded - a.totalExceeded;
    });
  }, [filteredRequests]);

  // Count by status
  const offenderCounts = useMemo(() => {
    return {
      actionRequired: repeatOffenders.filter(o => o.worstStatus === 'action_required').length,
      needsReview: repeatOffenders.filter(o => o.worstStatus === 'needs_review').length
    };
  }, [repeatOffenders]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Agent Name', 'Email', 'Reason', 'Count', 'Needs Review At', 'Action Required At', 'Status', 'Exceeded By'];
    const rows: string[][] = [];

    repeatOffenders.forEach(offender => {
      offender.violations.forEach(v => {
        const exceededBy = v.status === 'action_required' 
          ? v.count - v.thresholds.actionRequired + 1
          : v.count - v.thresholds.needsReview + 1;
        rows.push([
          offender.agentName,
          offender.agentEmail,
          v.reason,
          v.count.toString(),
          v.thresholds.needsReview.toString(),
          v.thresholds.actionRequired.toString(),
          v.status === 'action_required' ? 'Action Required' : 'Needs Review',
          exceededBy.toString()
        ]);
      });
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repeat-offenders-${viewMode === 'quarterly' ? selectedQuarter : selectedMonth}${selectedTeamLead !== 'all' ? `-${selectedTeamLead.replace(/\s+/g, '_')}` : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: OffenderStatus }) => {
    if (status === 'action_required') {
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Action Required</Badge>;
    }
    return <Badge className="gap-1 bg-warning hover:bg-warning/90 text-warning-foreground"><AlertTriangle className="h-3 w-3" /> Needs Review</Badge>;
  };


  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Outage Statistics"
          description="Trends, patterns, and repeat offender tracking"
        >
          <div className="flex gap-3 flex-wrap items-center">
            <div className="flex items-center gap-2">
              <Label htmlFor="view-mode" className="text-sm text-muted-foreground whitespace-nowrap">Quarterly</Label>
              <Switch 
                id="view-mode"
                checked={viewMode === 'quarterly'}
                onCheckedChange={(checked) => setViewMode(checked ? 'quarterly' : 'monthly')}
              />
            </div>

            {viewMode === 'monthly' ? (
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select quarter" />
                </SelectTrigger>
                <SelectContent>
                  {quarterOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {isAdmin && (
              <Select value={selectedTeamLead} onValueChange={setSelectedTeamLead}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Team Lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Team Leads</SelectItem>
                  {teamLeads.map(lead => (
                    <SelectItem key={lead} value={lead}>{lead}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {isAdmin && (
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {agents.map(agent => (
                    <SelectItem key={agent.email} value={agent.email}>{agent.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {isAdmin && repeatOffenders.length > 0 && (
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </PageHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            {isAdmin && <TabsTrigger value="offenders">Repeat Offenders</TabsTrigger>}
            <TabsTrigger value="policy" className="gap-1">
              <FileText className="h-4 w-4" />
              Policy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    {viewMode === 'quarterly' ? 'Quarterly Outages' : 'Monthly Outages'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{filteredRequests.length}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Unique Agents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {new Set(filteredRequests.map(r => r.agent_email)).size}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Needs Review
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-warning">{offenderCounts.needsReview}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Action Required
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-destructive">{offenderCounts.actionRequired}</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>{viewMode === 'quarterly' ? 'Quarterly Trend' : 'Monthly Trend'}</CardTitle>
                  <CardDescription>Outage count over the last 6 {viewMode === 'quarterly' ? 'quarters' : 'months'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" />
                        <RechartsTooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                                  <p className="font-medium">{data.fullMonth}</p>
                                  <p className="text-sm text-muted-foreground">Outages: {data.total}</p>
                                  <p className="text-sm text-muted-foreground">Hours: {data.hours.toFixed(1)}h</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="total" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--primary))" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Reason Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Reason Distribution</CardTitle>
                  <CardDescription>Most common outage reasons this month</CardDescription>
                </CardHeader>
                <CardContent>
                  {reasonDistribution.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={reasonDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {reasonDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                const total = reasonDistribution.reduce((sum, d) => sum + d.value, 0);
                                const percent = ((data.value / total) * 100).toFixed(1);
                                return (
                                  <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                                    <p className="font-medium">{data.name}</p>
                                    <p className="text-sm text-muted-foreground">{data.value} outages ({percent}%)</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend formatter={(value: string) => <span className="text-xs">{value}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No outages recorded for this period
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Breakdown Tab */}
          <TabsContent value="breakdown" className="space-y-6 mt-6">
            {/* Summary Cards for Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Outages</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{filteredRequests.length}</p>
                  <p className="text-xs text-muted-foreground">requests this period</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{filteredRequests.reduce((sum, r) => sum + (r.outage_duration_hours || 0), 0).toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">outage hours</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Days</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{filteredRequests.reduce((sum, r) => sum + (r.total_days || 0), 0)}</p>
                  <p className="text-xs text-muted-foreground">days affected</p>
                </CardContent>
              </Card>
            </div>

            {/* Breakdown by Reason Table */}
            <Card>
              <CardHeader>
                <CardTitle>Breakdown by Reason</CardTitle>
                <CardDescription>Detailed statistics for each outage type</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-center">Count</TableHead>
                      <TableHead className="text-center">Total Days</TableHead>
                      <TableHead className="text-center">Total Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {OUTAGE_REASONS.map(reason => {
                      const stats = reasonStats[reason];
                      if (stats.count === 0) return null;
                      return (
                        <TableRow key={reason}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {REASON_ICONS[reason]}
                              <span className="font-medium">{reason}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{stats.count}</Badge>
                          </TableCell>
                          <TableCell className="text-center">{stats.days}</TableCell>
                          <TableCell className="text-center">{stats.hours.toFixed(1)}h</TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredRequests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No outages recorded for this period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Repeat Offenders Tab */}
          <TabsContent value="offenders" className="space-y-6 mt-6">
            {/* Collapsible Policy Guidelines */}
            <Collapsible open={policyOpen} onOpenChange={setPolicyOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <CardTitle>HR Policy Guidelines</CardTitle>
                      </div>
                      {policyOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </div>
                    <CardDescription>Click to expand policy details</CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h4 className="font-semibold mb-2">Policy Objective</h4>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                          <li>Establish clear expectations for attendance and engagement</li>
                          <li>Encourage proactive communication of service interruptions</li>
                          <li>Ensure fair and consistent handling of performance issues</li>
                          <li>Promote a healthy, accountable remote work environment</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Recurring Outages Definition</h4>
                        <p className="text-sm text-muted-foreground">
                          A recurring outage is defined as the same type of connectivity issue or unscheduled absence occurring more than 
                          2 times per month without valid documentation or prior communication.
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h4 className="font-semibold mb-2">Agent Responsibilities</h4>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                          <li>Notify Team Lead via Slack before/during any outage</li>
                          <li>Provide honest, timely updates with documentation if required</li>
                          <li>Take steps to prevent recurring issues (e.g., backup internet)</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Leader Responsibilities</h4>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                          <li>Monitor and document agent outage patterns</li>
                          <li>Initiate coaching when patterns emerge</li>
                          <li>Escalate to HR if outages persist or are unsupported</li>
                          <li>Apply progressive discipline fairly and consistently</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* 3-Tier Threshold Reference */}
            <TooltipProvider>
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Thresholds (Per HR Policy)</CardTitle>
                  <CardDescription>Acceptable limits, review triggers, and action thresholds</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-center">
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1 justify-center cursor-help">
                              <CheckCircle2 className="h-4 w-4 text-success" />
                              Acceptable
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>Within normal expectations. Standard monitoring applies.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="text-center">
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1 justify-center cursor-help">
                              <AlertTriangle className="h-4 w-4 text-warning" />
                              Needs Review
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>Early intervention stage. May result in coaching, discussion, and guidance.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="text-center">
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1 justify-center cursor-help">
                              <XCircle className="h-4 w-4 text-destructive" />
                              Action Required
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>Formal corrective action stage. May result in NTE or written warning.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {OUTAGE_REASONS.map(reason => {
                        const thresholds = REASON_THRESHOLDS[reason];
                        return (
                          <TableRow key={reason}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {REASON_ICONS[reason]}
                                <span className="font-medium">{reason}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {thresholds ? (
                                <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                                  ≤{thresholds.acceptable}/mo
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {thresholds ? (
                                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                                  {thresholds.needsReview}/mo
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {thresholds ? (
                                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                                  ≥{thresholds.actionRequired}/mo
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">No limit</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TooltipProvider>

            {/* Inline Callouts */}
            <div className="grid gap-4 md:grid-cols-3">
              <Alert className="border-warning/50 bg-warning/10">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertTitle className="text-warning">Needs Review</AlertTitle>
                <AlertDescription className="text-sm text-warning/80">
                  Indicates early issues and may result in coaching, discussion, and guidance.
                </AlertDescription>
              </Alert>
              
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Action Required</AlertTitle>
                <AlertDescription className="text-sm">
                  Applies when issues are repeated and may result in formal corrective action, including an NTE or written warning.
                </AlertDescription>
              </Alert>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Pattern Detection</AlertTitle>
                <AlertDescription className="text-sm">
                  Patterns across multiple categories may trigger a review even if individual thresholds are not exceeded.
                </AlertDescription>
              </Alert>
            </div>

            {/* Repeat Offenders Table */}
            <Card className={repeatOffenders.length > 0 ? 'border-destructive/50' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className={repeatOffenders.length > 0 ? 'h-5 w-5 text-destructive' : 'h-5 w-5'} />
                  Flagged Agents
                </CardTitle>
                <CardDescription>
                  Agents who have reached or exceeded the "Needs Review" or "Action Required" threshold
                </CardDescription>
              </CardHeader>
              <CardContent>
                {repeatOffenders.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent</TableHead>
                        <TableHead>Violations</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {repeatOffenders.map((offender) => (
                        <TableRow 
                          key={offender.agentEmail} 
                          className={offender.worstStatus === 'action_required' ? 'bg-destructive/5' : 'bg-warning/5'}
                        >
                          <TableCell>
                            <div>
                              <p className={`font-medium ${offender.worstStatus === 'action_required' ? 'text-destructive' : 'text-warning'}`}>
                                {offender.agentName}
                              </p>
                              <p className="text-xs text-muted-foreground">{offender.agentEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              {offender.violations.map((v, i) => (
                                <Badge 
                                  key={i} 
                                  variant={v.status === 'action_required' ? 'destructive' : 'outline'}
                                  className={v.status === 'needs_review' ? 'bg-warning/20 text-warning border-warning/30' : ''}
                                >
                                  {v.reason}: {v.count}/{v.status === 'action_required' ? v.thresholds.actionRequired : v.thresholds.needsReview}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <StatusBadge status={offender.worstStatus} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-success opacity-50" />
                    <p className="text-success">No flagged agents this month</p>
                    <p className="text-sm">All agents are within acceptable thresholds</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Policy Tab */}
          <TabsContent value="policy" className="space-y-6 mt-6">
            {/* Acceptable Thresholds */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Acceptable Monthly Thresholds
                </CardTitle>
                <CardDescription>Maximum occurrences per month considered within normal expectations</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-center">Acceptable Limit</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {OUTAGE_REASONS.map(reason => {
                      const thresholds = REASON_THRESHOLDS[reason];
                      return (
                        <TableRow key={reason}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {REASON_ICONS[reason]}
                              <span className="font-medium">{reason}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {thresholds ? (
                              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                                {thresholds.acceptable} per month
                              </Badge>
                            ) : (
                              <Badge variant="outline">No limit</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {reason === 'Planned Leave' ? 'Pre-approved absences are not counted against thresholds.' :
                             reason === 'Medical Leave' ? 'Must provide documentation for extended absences.' :
                             reason === 'Late Login' ? 'Exceeding 4 times triggers formal action.' :
                             'Exceeding limit triggers review process.'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Intervention Levels */}
            <Card>
              <CardHeader>
                <CardTitle>Intervention Levels</CardTitle>
                <CardDescription>Comparison of "Needs Review" vs "Action Required" responses</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aspect</TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-warning" />
                          Needs Review
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-destructive" />
                          Action Required
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Purpose</TableCell>
                      <TableCell>Early intervention</TableCell>
                      <TableCell>Corrective enforcement</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Manager Action</TableCell>
                      <TableCell>Coaching and discussion</TableCell>
                      <TableCell>Formal corrective action (NTE)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Monitoring Level</TableCell>
                      <TableCell>Standard monitoring</TableCell>
                      <TableCell>Close and continuous monitoring</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Documentation</TableCell>
                      <TableCell>Internal notes recommended</TableCell>
                      <TableCell>Formal documentation required</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Progressive Discipline Matrix */}
            <Card>
              <CardHeader>
                <CardTitle>Progressive Discipline Matrix</CardTitle>
                <CardDescription>Stages of corrective action for repeated violations</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stage</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                          Verbal Warning
                        </Badge>
                      </TableCell>
                      <TableCell>Minor first-time violation</TableCell>
                      <TableCell>Documented discussion</TableCell>
                      <TableCell className="text-muted-foreground text-sm">Coaching focus</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30">
                          Written Warning
                        </Badge>
                      </TableCell>
                      <TableCell>Repeated violations</TableCell>
                      <TableCell>HR file entry + PIP</TableCell>
                      <TableCell className="text-muted-foreground text-sm">Measurable goals set</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                          Final Written Warning
                        </Badge>
                      </TableCell>
                      <TableCell>Continued issues</TableCell>
                      <TableCell>Final warning issued</TableCell>
                      <TableCell className="text-muted-foreground text-sm">Last opportunity</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Badge variant="destructive">
                          Termination
                        </Badge>
                      </TableCell>
                      <TableCell>Persistent violations</TableCell>
                      <TableCell>Employment ends</TableCell>
                      <TableCell className="text-muted-foreground text-sm">All docs required</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Clearing Periods */}
            <Card>
              <CardHeader>
                <CardTitle>Clearing Periods</CardTitle>
                <CardDescription>Time required for warnings to be cleared from record</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Warning Level</TableHead>
                      <TableHead className="text-center">Clearing Period</TableHead>
                      <TableHead>Conditions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Verbal Warning</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">60 days</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">No repeat violations during period</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Written Warning</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">60 days</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">Full compliance + PIP completion</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Final Written Warning</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">90 days</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">Sustained compliance demonstrated</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Responsibilities */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Agent Responsibilities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                      <span className="text-sm">Notify Team Lead via Slack before or during any outage</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                      <span className="text-sm">Provide honest, timely updates with documentation if required</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                      <span className="text-sm">Take steps to prevent recurring issues (e.g., backup internet)</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Leader Responsibilities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                      <span className="text-sm">Monitor and document agent outage patterns</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                      <span className="text-sm">Initiate coaching when patterns emerge</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                      <span className="text-sm">Escalate to HR if outages persist or are unsupported</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                      <span className="text-sm">Apply progressive discipline fairly and consistently</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
