import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { getRollingTwoWeekRange, parseLocalDate } from '@/lib/ticketLogsApi';
import { format, differenceInDays } from 'date-fns';
import { CalendarIcon, Mail, MessageSquare, Phone, BarChart3, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const ZD1 = 'customerserviceadvocates';
const ZD2 = 'customerserviceadvocateshelp';

interface DailyData {
  date: string;
  email: number;
  chat: number;
  call: number;
  total: number;
}

function useVolumeDemandData(instance: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['volume-demand', instance, startDate, endDate],
    queryFn: async () => {
      // Fetch ticket_logs grouped by date and type
      const instances = instance === 'both' ? [ZD1, ZD2] : [instance];

      // Query ticket_logs - we need to fetch raw and group client-side due to EST casting
      let ticketQuery = supabase
        .from('ticket_logs')
        .select('timestamp, ticket_type, zd_instance')
        .gte('timestamp', `${startDate}T05:00:00.000Z`) // EST midnight = UTC 05:00
        .lte('timestamp', `${endDate}T05:00:00.000Z`)   // next day EST midnight
        .in('zd_instance', instances)
        .order('timestamp', { ascending: true });

      const { data: tickets, error: ticketError } = await ticketQuery;
      if (ticketError) throw ticketError;

      // Fetch call_count_daily for ZD1
      let callData: { date: string; call_count: number }[] = [];
      if (instance === 'both' || instance === ZD1) {
        const { data, error } = await supabase
          .from('call_count_daily')
          .select('date, call_count')
          .gte('date', startDate)
          .lte('date', endDate);
        if (error) throw error;
        callData = data || [];
      }

      // Group tickets by EST date
      const dateMap: Record<string, { email: number; chat: number; call: number }> = {};

      for (const t of tickets || []) {
        const estDate = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/New_York',
          year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(new Date(t.timestamp));

        if (estDate < startDate || estDate > endDate) continue;

        if (!dateMap[estDate]) dateMap[estDate] = { email: 0, chat: 0, call: 0 };
        const type = (t.ticket_type || '').toLowerCase();
        if (type === 'email') dateMap[estDate].email++;
        else if (type === 'chat') dateMap[estDate].chat++;
        else if (type === 'call' && t.zd_instance !== ZD1) dateMap[estDate].call++;
      }

      // Merge ZD1 call counts from call_count_daily
      if (instance === 'both' || instance === ZD1) {
        for (const c of callData) {
          if (!dateMap[c.date]) dateMap[c.date] = { email: 0, chat: 0, call: 0 };
          dateMap[c.date].call += c.call_count;
        }
      }

      // Build date range array
      const [sy, sm, sd] = startDate.split('-').map(Number);
      const [ey, em, ed] = endDate.split('-').map(Number);
      const start = new Date(sy, sm - 1, sd);
      const end = new Date(ey, em - 1, ed);
      const dailyData: DailyData[] = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = format(new Date(d), 'yyyy-MM-dd');
        const counts = dateMap[key] || { email: 0, chat: 0, call: 0 };
        dailyData.push({
          date: key,
          email: counts.email,
          chat: counts.chat,
          call: counts.call,
          total: counts.email + counts.chat + counts.call,
        });
      }

      return dailyData;
    },
    staleTime: 5 * 60 * 1000,
  });
}

const CHART_COLORS = {
  email: 'hsl(173, 58%, 39%)',    // primary
  chat: 'hsl(38, 92%, 50%)',      // warning
  call: 'hsl(220, 70%, 55%)',     // blue
};

const chartConfig = {
  email: { label: 'Email', color: CHART_COLORS.email },
  chat: { label: 'Chat', color: CHART_COLORS.chat },
  call: { label: 'Call', color: CHART_COLORS.call },
};

const VolumeDemand = () => {
  const defaultRange = getRollingTwoWeekRange();
  const [instance, setInstance] = useState('both');
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [channelFilter, setChannelFilter] = useState('all');

  const { data: dailyData, isLoading } = useVolumeDemandData(instance, startDate, endDate);

  const summary = useMemo(() => {
    if (!dailyData) return { total: 0, email: 0, chat: 0, call: 0, avg: 0, days: 0 };
    const email = dailyData.reduce((s, d) => s + d.email, 0);
    const chat = dailyData.reduce((s, d) => s + d.chat, 0);
    const call = dailyData.reduce((s, d) => s + d.call, 0);
    const total = email + chat + call;
    const days = dailyData.length || 1;
    return { total, email, chat, call, avg: Math.round(total / days), days };
  }, [dailyData]);

  const filteredChartData = useMemo(() => {
    if (!dailyData) return [];
    return dailyData.map(d => ({
      date: format(parseLocalDate(d.date), 'M/d'),
      fullDate: d.date,
      email: channelFilter === 'all' || channelFilter === 'email' ? d.email : 0,
      chat: channelFilter === 'all' || channelFilter === 'chat' ? d.chat : 0,
      call: channelFilter === 'all' || channelFilter === 'call' ? d.call : 0,
    }));
  }, [dailyData, channelFilter]);

  const pieData = useMemo(() => {
    if (!summary.total) return [];
    const items = [];
    if (summary.email > 0) items.push({ name: 'Email', value: summary.email, color: CHART_COLORS.email });
    if (summary.chat > 0) items.push({ name: 'Chat', value: summary.chat, color: CHART_COLORS.chat });
    if (summary.call > 0) items.push({ name: 'Call', value: summary.call, color: CHART_COLORS.call });
    return items;
  }, [summary]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Volume & Demand
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Daily ticket volumes by channel and instance
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={instance} onValueChange={setInstance}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Both Instances</SelectItem>
                <SelectItem value={ZD1}>ZD1 Only</SelectItem>
                <SelectItem value={ZD2}>ZD2 Only</SelectItem>
              </SelectContent>
            </Select>

            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="chat">Chat</SelectItem>
                <SelectItem value="call">Call</SelectItem>
              </SelectContent>
            </Select>

            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartChange={setStartDate}
              onEndChange={setEndDate}
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <SummaryCard title="Total Tickets" value={summary.total} icon={<TrendingUp className="h-4 w-4" />} loading={isLoading} />
          <SummaryCard title="Daily Average" value={summary.avg} icon={<BarChart3 className="h-4 w-4" />} loading={isLoading} />
          <SummaryCard title="Email" value={summary.email} icon={<Mail className="h-4 w-4" />} color="text-primary" loading={isLoading} />
          <SummaryCard title="Chat" value={summary.chat} icon={<MessageSquare className="h-4 w-4" />} color="text-warning" loading={isLoading} />
          <SummaryCard title="Call" value={summary.call} icon={<Phone className="h-4 w-4" />} color="text-blue-500" loading={isLoading} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bar Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Daily Volume</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <BarChart data={filteredChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                    <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    {(channelFilter === 'all' || channelFilter === 'email') && (
                      <Bar dataKey="email" stackId="a" fill={CHART_COLORS.email} radius={[0, 0, 0, 0]} />
                    )}
                    {(channelFilter === 'all' || channelFilter === 'chat') && (
                      <Bar dataKey="chat" stackId="a" fill={CHART_COLORS.chat} radius={[0, 0, 0, 0]} />
                    )}
                    {(channelFilter === 'all' || channelFilter === 'call') && (
                      <Bar dataKey="call" stackId="a" fill={CHART_COLORS.call} radius={[2, 2, 0, 0]} />
                    )}
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Channel Distribution</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              {isLoading ? (
                <Skeleton className="h-[250px] w-[250px] rounded-full" />
              ) : pieData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data</p>
              ) : (
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daily Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <div className="relative w-full overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Email</TableHead>
                      <TableHead className="text-right">Chat</TableHead>
                      <TableHead className="text-right">Call</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyData?.map(row => (
                      <TableRow key={row.date}>
                        <TableCell className="font-medium">
                          {format(parseLocalDate(row.date), 'EEE, MMM d')}
                        </TableCell>
                        <TableCell className="text-right">{row.email}</TableCell>
                        <TableCell className="text-right">{row.chat}</TableCell>
                        <TableCell className="text-right">{row.call}</TableCell>
                        <TableCell className="text-right font-semibold">{row.total}</TableCell>
                      </TableRow>
                    ))}
                    {dailyData && dailyData.length > 0 && (
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">{summary.email}</TableCell>
                        <TableCell className="text-right">{summary.chat}</TableCell>
                        <TableCell className="text-right">{summary.call}</TableCell>
                        <TableCell className="text-right">{summary.total}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

// -- Sub-components --

function SummaryCard({ title, value, icon, color, loading }: {
  title: string; value: number; icon: React.ReactNode; color?: string; loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        {loading ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          <>
            <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground mb-1', color)}>
              {icon}
              {title}
            </div>
            <div className="text-2xl font-bold text-foreground">{value.toLocaleString()}</div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DateRangePicker({ startDate, endDate, onStartChange, onEndChange }: {
  startDate: string; endDate: string; onStartChange: (d: string) => void; onEndChange: (d: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5" />
            {format(parseLocalDate(startDate), 'M/d')} – {format(parseLocalDate(endDate), 'M/d')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={{
              from: parseLocalDate(startDate),
              to: parseLocalDate(endDate),
            }}
            onSelect={(range) => {
              if (range?.from) onStartChange(format(range.from, 'yyyy-MM-dd'));
              if (range?.to) onEndChange(format(range.to, 'yyyy-MM-dd'));
            }}
            numberOfMonths={2}
            className={cn('p-3 pointer-events-auto')}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default VolumeDemand;
