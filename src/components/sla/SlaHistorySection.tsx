import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  useSlaHistory,
  groupByWeek,
  formatResolutionTime,
  type DailySnapshot,
  type WeeklyBucket,
} from '@/lib/slaResponsivenessApi';
import { format, parseISO, startOfWeek, endOfWeek, addWeeks } from 'date-fns';

const ZD1_COLOR = 'hsl(var(--chart-1))';
const ZD2_COLOR = 'hsl(var(--chart-2))';

function AllTimeTab({ snapshots }: { snapshots: DailySnapshot[] }) {
  // Group by date, merge ZD1/ZD2 into chart rows
  const chartData = useMemo(() => {
    const dateMap = new Map<string, { date: string; zd1New: number; zd2New: number }>();
    for (const s of snapshots) {
      if (!dateMap.has(s.date)) dateMap.set(s.date, { date: s.date, zd1New: 0, zd2New: 0 });
      const row = dateMap.get(s.date)!;
      if (s.zd_instance === 'ZD1') row.zd1New = s.total_new;
      else row.zd2New = s.total_new;
    }
    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [snapshots]);

  const summary = useMemo(() => {
    const zd1 = snapshots.filter(s => s.zd_instance === 'ZD1');
    const zd2 = snapshots.filter(s => s.zd_instance === 'ZD2');
    const totalNew = snapshots.reduce((s, d) => s + d.total_new, 0);
    const days = new Set(snapshots.map(s => s.date)).size;
    const avgDaily = days ? Math.round(totalNew / days) : 0;
    const frt = snapshots.filter(s => s.avg_first_reply_minutes != null).map(s => s.avg_first_reply_minutes!);
    const fr = snapshots.filter(s => s.avg_full_resolution_minutes != null).map(s => s.avg_full_resolution_minutes!);
    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
    return { totalNew, avgDaily, avgFRT: avg(frt), avgFR: avg(fr), days };
  }, [snapshots]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryMini label="Total Tickets" value={summary.totalNew.toLocaleString()} />
        <SummaryMini label="Avg Daily Volume" value={String(summary.avgDaily)} />
        <SummaryMini label="Avg First Reply" value={formatResolutionTime(summary.avgFRT)} />
        <SummaryMini label="Avg Resolution" value={formatResolutionTime(summary.avgFR)} />
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Daily New Tickets (All Time)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">No snapshot data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickFormatter={(v) => format(parseISO(v), 'M/d')} />
                <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={tooltipStyle()} labelFormatter={(v) => format(parseISO(v as string), 'MMM d, yyyy')} />
                <Legend />
                <Bar dataKey="zd1New" name="ZD1" fill={ZD1_COLOR} radius={[3, 3, 0, 0]} />
                <Bar dataKey="zd2New" name="ZD2" fill={ZD2_COLOR} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function WeeklyTab({ weekly, onDrillDown }: { weekly: WeeklyBucket[]; onDrillDown: (ws: string) => void }) {
  const chartData = weekly.map(w => ({
    week: w.weekLabel,
    weekStart: w.weekStart,
    zd1New: w.zd1.totalNew,
    zd2New: w.zd2.totalNew,
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Weekly New Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">No snapshot data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={tooltipStyle()} />
                <Legend />
                <Bar dataKey="zd1New" name="ZD1" fill={ZD1_COLOR} radius={[3, 3, 0, 0]} cursor="pointer"
                  onClick={(d: any) => onDrillDown(d.weekStart)} />
                <Bar dataKey="zd2New" name="ZD2" fill={ZD2_COLOR} radius={[3, 3, 0, 0]} cursor="pointer"
                  onClick={(d: any) => onDrillDown(d.weekStart)} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {weekly.length > 0 && (
        <Card>
          <CardContent className="pt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week</TableHead>
                  <TableHead className="text-right">New (ZD1)</TableHead>
                  <TableHead className="text-right">New (ZD2)</TableHead>
                  <TableHead className="text-right">Responded (ZD1)</TableHead>
                  <TableHead className="text-right">Responded (ZD2)</TableHead>
                  <TableHead className="text-right">Remaining (ZD1)</TableHead>
                  <TableHead className="text-right">Remaining (ZD2)</TableHead>
                  <TableHead className="text-right">Avg FRT (ZD1)</TableHead>
                  <TableHead className="text-right">Avg FRT (ZD2)</TableHead>
                  <TableHead className="text-right">Avg Res (ZD1)</TableHead>
                  <TableHead className="text-right">Avg Res (ZD2)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weekly.map(w => (
                  <TableRow key={w.weekStart} className="cursor-pointer hover:bg-muted/50" onClick={() => onDrillDown(w.weekStart)}>
                    <TableCell className="font-medium">{w.weekLabel}</TableCell>
                    <TableCell className="text-right tabular-nums">{w.zd1.totalNew}</TableCell>
                    <TableCell className="text-right tabular-nums">{w.zd2.totalNew}</TableCell>
                    <TableCell className="text-right tabular-nums">{w.zd1.totalResponded}</TableCell>
                    <TableCell className="text-right tabular-nums">{w.zd2.totalResponded}</TableCell>
                    <TableCell className="text-right tabular-nums">{w.zd1.remaining}</TableCell>
                    <TableCell className="text-right tabular-nums">{w.zd2.remaining}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatResolutionTime(w.zd1.avgFirstReply)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatResolutionTime(w.zd2.avgFirstReply)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatResolutionTime(w.zd1.avgFullResolution)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatResolutionTime(w.zd2.avgFullResolution)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DailyTab({ snapshots, initialWeekStart }: { snapshots: DailySnapshot[]; initialWeekStart?: string }) {
  const [weekStart, setWeekStart] = useState(() => {
    if (initialWeekStart) return parseISO(initialWeekStart);
    const now = new Date();
    return startOfWeek(now, { weekStartsOn: 1 });
  });

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const wsStr = format(weekStart, 'yyyy-MM-dd');
  const weStr = format(weekEnd, 'yyyy-MM-dd');

  const weekSnapshots = useMemo(
    () => snapshots.filter(s => s.date >= wsStr && s.date <= weStr),
    [snapshots, wsStr, weStr]
  );

  const chartData = useMemo(() => {
    const days: { date: string; label: string; zd1New: number; zd2New: number; zd1Resp: number; zd2Resp: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = format(new Date(weekStart.getTime() + i * 86400000), 'yyyy-MM-dd');
      const zd1 = weekSnapshots.find(s => s.date === d && s.zd_instance === 'ZD1');
      const zd2 = weekSnapshots.find(s => s.date === d && s.zd_instance === 'ZD2');
      days.push({
        date: d,
        label: format(parseISO(d), 'EEE M/d'),
        zd1New: zd1?.total_new ?? 0,
        zd2New: zd2?.total_new ?? 0,
        zd1Resp: zd1?.total_responded ?? 0,
        zd2Resp: zd2?.total_responded ?? 0,
      });
    }
    return days;
  }, [weekSnapshots, weekStart]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => setWeekStart(prev => addWeeks(prev, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
        </span>
        <Button variant="outline" size="icon" onClick={() => setWeekStart(prev => addWeeks(prev, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Daily Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {weekSnapshots.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">No data for this week</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={tooltipStyle()} />
                <Legend />
                <Bar dataKey="zd1New" name="ZD1 New" fill={ZD1_COLOR} radius={[3, 3, 0, 0]} />
                <Bar dataKey="zd2New" name="ZD2 New" fill={ZD2_COLOR} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {weekSnapshots.length > 0 && (
        <Card>
          <CardContent className="pt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">New (ZD1)</TableHead>
                  <TableHead className="text-right">New (ZD2)</TableHead>
                  <TableHead className="text-right">Responded (ZD1)</TableHead>
                  <TableHead className="text-right">Responded (ZD2)</TableHead>
                  <TableHead className="text-right">Remaining (ZD1)</TableHead>
                  <TableHead className="text-right">Remaining (ZD2)</TableHead>
                  <TableHead className="text-right">FRT (ZD1)</TableHead>
                  <TableHead className="text-right">FRT (ZD2)</TableHead>
                  <TableHead className="text-right">Res (ZD1)</TableHead>
                  <TableHead className="text-right">Res (ZD2)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chartData.map(day => {
                  const zd1 = weekSnapshots.find(s => s.date === day.date && s.zd_instance === 'ZD1');
                  const zd2 = weekSnapshots.find(s => s.date === day.date && s.zd_instance === 'ZD2');
                  return (
                    <TableRow key={day.date}>
                      <TableCell className="font-medium">{day.label}</TableCell>
                      <TableCell className="text-right tabular-nums">{zd1?.total_new ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{zd2?.total_new ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{zd1?.total_responded ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{zd2?.total_responded ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{zd1?.remaining_unanswered ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{zd2?.remaining_unanswered ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatResolutionTime(zd1?.avg_first_reply_minutes ?? null)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatResolutionTime(zd2?.avg_first_reply_minutes ?? null)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatResolutionTime(zd1?.avg_full_resolution_minutes ?? null)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatResolutionTime(zd2?.avg_full_resolution_minutes ?? null)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryMini({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function tooltipStyle() {
  return {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    color: 'hsl(var(--foreground))',
  };
}

export default function SlaHistorySection() {
  const { snapshots, weekly, isLoading, error } = useSlaHistory();
  const [historyTab, setHistoryTab] = useState('alltime');
  const [drillWeek, setDrillWeek] = useState<string | undefined>();

  const handleDrillDown = (weekStart: string) => {
    setDrillWeek(weekStart);
    setHistoryTab('daily');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">Loading historical data…</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-4 text-destructive text-sm">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Historical Trends</h2>
      </div>

      <Tabs value={historyTab} onValueChange={setHistoryTab}>
        <TabsList>
          <TabsTrigger value="alltime">All Time</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="daily">Daily</TabsTrigger>
        </TabsList>

        <TabsContent value="alltime" className="mt-4">
          <AllTimeTab snapshots={snapshots} />
        </TabsContent>
        <TabsContent value="weekly" className="mt-4">
          <WeeklyTab weekly={weekly} onDrillDown={handleDrillDown} />
        </TabsContent>
        <TabsContent value="daily" className="mt-4">
          <DailyTab snapshots={snapshots} initialWeekStart={drillWeek} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
