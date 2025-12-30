import { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Download, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { fetchAllLeaveRequests, LeaveRequest } from '@/lib/leaveRequestApi';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';

// Threshold configuration: max occurrences per month per reason
const REASON_THRESHOLDS: Record<string, number> = {
  'Power Outage': 2,
  'Wi-Fi Issue': 2,
  'Medical Leave': 3,
  'Planned Leave': 4,
  'Equipment Issue': 2,
  'Late Login': 2,
  'Undertime': 2,
  'Unplanned': 1
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

interface RepeatOffender {
  agentName: string;
  agentEmail: string;
  violations: { reason: string; count: number; threshold: number }[];
  totalViolations: number;
}

export default function OutageStats() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  // Generate last 12 months for dropdown
  const monthOptions = useMemo(() => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      months.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy')
      });
    }
    return months;
  }, []);

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

  // Filter requests by selected month
  const filteredRequests = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));

    return requests.filter(req => {
      const reqStart = parseISO(req.start_date);
      const reqEnd = parseISO(req.end_date);
      return reqStart <= monthEnd && reqEnd >= monthStart;
    });
  }, [requests, selectedMonth]);

  // Monthly trend data (last 6 months)
  const trendData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const monthRequests = requests.filter(req => {
        const reqStart = parseISO(req.start_date);
        return reqStart >= monthStart && reqStart <= monthEnd;
      });

      data.push({
        month: format(date, 'MMM'),
        fullMonth: format(date, 'MMMM yyyy'),
        total: monthRequests.length,
        hours: monthRequests.reduce((sum, r) => sum + (r.outage_duration_hours || 0), 0)
      });
    }
    return data;
  }, [requests]);

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

  // Repeat offenders calculation
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
      const violations: { reason: string; count: number; threshold: number }[] = [];
      
      Object.entries(reasons).forEach(([reason, count]) => {
        const threshold = REASON_THRESHOLDS[reason] || 2;
        if (count > threshold) {
          violations.push({ reason, count, threshold });
        }
      });

      if (violations.length > 0) {
        const req = filteredRequests.find(r => r.agent_email === email);
        offenders.push({
          agentName: req?.agent_name || email,
          agentEmail: email,
          violations,
          totalViolations: violations.reduce((sum, v) => sum + (v.count - v.threshold), 0)
        });
      }
    });

    return offenders.sort((a, b) => b.totalViolations - a.totalViolations);
  }, [filteredRequests]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Agent Name', 'Email', 'Reason', 'Count', 'Threshold', 'Exceeded By'];
    const rows: string[][] = [];

    repeatOffenders.forEach(offender => {
      offender.violations.forEach(v => {
        rows.push([
          offender.agentName,
          offender.agentEmail,
          v.reason,
          v.count.toString(),
          v.threshold.toString(),
          (v.count - v.threshold).toString()
        ]);
      });
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repeat-offenders-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Redirect non-admins
  if (!isAdmin) {
    return <Navigate to="/outage-report" replace />;
  }

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Outage Statistics</h1>
            <p className="text-muted-foreground">Trends, patterns, and repeat offender tracking</p>
          </div>
          
          <div className="flex gap-3">
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
            
            {repeatOffenders.length > 0 && (
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Monthly Outages
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
                Repeat Offenders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-destructive">{repeatOffenders.length}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Total Violations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-warning">
                {repeatOffenders.reduce((sum, o) => sum + o.totalViolations, 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trend</CardTitle>
              <CardDescription>Outage count over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
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
                      <Tooltip 
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

        {/* Threshold Reference */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Thresholds</CardTitle>
            <CardDescription>Maximum allowed occurrences per month before flagging as repeat offender</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(REASON_THRESHOLDS).map(([reason, threshold]) => (
                <div key={reason} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">{reason}</span>
                  <Badge variant="outline">{threshold}/mo</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Repeat Offenders Table */}
        <Card className={repeatOffenders.length > 0 ? 'border-destructive/50' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className={repeatOffenders.length > 0 ? 'h-5 w-5 text-destructive' : 'h-5 w-5'} />
              Repeat Offenders
            </CardTitle>
            <CardDescription>
              Agents who have exceeded the monthly threshold for any outage reason
            </CardDescription>
          </CardHeader>
          <CardContent>
            {repeatOffenders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Violations</TableHead>
                    <TableHead className="text-center">Exceeded By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repeatOffenders.map((offender, idx) => (
                    <TableRow key={offender.agentEmail} className="bg-destructive/5">
                      <TableCell>
                        <div>
                          <p className="font-medium text-destructive">{offender.agentName}</p>
                          <p className="text-xs text-muted-foreground">{offender.agentEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {offender.violations.map((v, i) => (
                            <Badge key={i} variant="destructive" className="text-xs">
                              {v.reason}: {v.count}/{v.threshold}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold text-destructive">+{offender.totalViolations}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No repeat offenders this month</p>
                <p className="text-sm">All agents are within acceptable thresholds</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
