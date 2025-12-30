import { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, Zap, Wifi, Heart, Calendar, Wrench, Clock, Timer, HelpCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { fetchMyLeaveRequests, fetchAllLeaveRequests, LeaveRequest } from '@/lib/leaveRequestApi';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

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

export default function OutageReport() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [selectedAgent, setSelectedAgent] = useState<string>('all');

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

  // Get unique agents from requests
  const agents = useMemo(() => {
    const agentSet = new Set(requests.map(r => r.agent_email));
    return Array.from(agentSet).map(email => {
      const req = requests.find(r => r.agent_email === email);
      return { email, name: req?.agent_name || email };
    });
  }, [requests]);

  useEffect(() => {
    loadRequests();
  }, [isAdmin]);

  const loadRequests = async () => {
    setIsLoading(true);
    const result = isAdmin 
      ? await fetchAllLeaveRequests()
      : await fetchMyLeaveRequests();
    
    if (result.data) {
      // Only include approved/pending requests (not declined/canceled)
      setRequests(result.data.filter(r => r.status === 'approved' || r.status === 'pending'));
    } else if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive'
      });
    }
    setIsLoading(false);
  };

  // Filter requests by selected month and agent
  const filteredRequests = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));

    return requests.filter(req => {
      const reqStart = parseISO(req.start_date);
      const reqEnd = parseISO(req.end_date);
      const inMonth = reqStart <= monthEnd && reqEnd >= monthStart;
      const matchesAgent = selectedAgent === 'all' || req.agent_email === selectedAgent;
      return inMonth && matchesAgent;
    });
  }, [requests, selectedMonth, selectedAgent]);

  // Calculate stats by reason
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

  // Chart data for bar chart
  const barChartData = useMemo(() => {
    return OUTAGE_REASONS.map(reason => ({
      reason: reason.split(' ')[0], // Shorten for display
      fullReason: reason,
      count: reasonStats[reason].count,
      hours: Number(reasonStats[reason].hours.toFixed(1))
    })).filter(d => d.count > 0);
  }, [reasonStats]);

  // Pie chart data
  const pieChartData = useMemo(() => {
    return OUTAGE_REASONS.map((reason, index) => ({
      name: reason,
      value: reasonStats[reason].count,
      color: CHART_COLORS[index % CHART_COLORS.length]
    })).filter(d => d.value > 0);
  }, [reasonStats]);

  // Total stats
  const totalStats = useMemo(() => {
    return {
      count: filteredRequests.length,
      hours: filteredRequests.reduce((sum, r) => sum + (r.outage_duration_hours || 0), 0),
      days: filteredRequests.reduce((sum, r) => sum + (r.total_days || 0), 0)
    };
  }, [filteredRequests]);

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
            <h1 className="text-2xl font-bold text-foreground">Outage Report</h1>
            <p className="text-muted-foreground">
              {isAdmin ? 'View outage statistics for all agents' : 'View your outage statistics'}
            </p>
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
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Outages</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalStats.count}</p>
              <p className="text-xs text-muted-foreground">requests this month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalStats.hours.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">outage hours</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Days</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalStats.days}</p>
              <p className="text-xs text-muted-foreground">days affected</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Outages by Reason</CardTitle>
              <CardDescription>Number of outages per category</CardDescription>
            </CardHeader>
            <CardContent>
              {barChartData.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis type="category" dataKey="reason" width={80} className="text-xs" />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                                <p className="font-medium">{data.fullReason}</p>
                                <p className="text-sm text-muted-foreground">Count: {data.count}</p>
                                <p className="text-sm text-muted-foreground">Hours: {data.hours}h</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No outages recorded for this period
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribution</CardTitle>
              <CardDescription>Percentage breakdown by reason</CardDescription>
            </CardHeader>
            <CardContent>
              {pieChartData.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                                <p className="font-medium">{data.name}</p>
                                <p className="text-sm text-muted-foreground">{data.value} outages</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend 
                        formatter={(value: string) => <span className="text-xs">{value}</span>}
                      />
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

        {/* Detailed Table */}
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
      </div>
    </Layout>
  );
}
