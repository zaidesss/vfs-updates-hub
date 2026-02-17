import { useState, useMemo, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PageGuideButton } from '@/components/PageGuideButton';
import { Clock, Timer, ThumbsUp, MessageSquare, BarChart3, AlertTriangle, RefreshCw, Database, Phone } from 'lucide-react';
import { usePortalClock } from '@/context/PortalClockContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, isSameWeek, addWeeks, differenceInWeeks } from 'date-fns';
import { ANCHOR_DATE, PORTAL_START_YEAR } from '@/lib/weekConstants';

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

interface InsightsData {
  zdInstance: string;
  totalTickets: number;
  avgResolutionTimeSeconds: number | null;
  fullResolutionTimeMinutes: number | null;
  csatScore: number | null;
  csatGood: number;
  csatTotal: number;
  avgFrtSeconds: number | null;
  cached?: boolean;
  cachedAt?: string;
}

function formatTime(seconds: number | null, unit: 'seconds' | 'minutes' = 'seconds'): string {
  if (seconds === null) return '—';
  if (unit === 'minutes') {
    const h = Math.floor(seconds / 60);
    const m = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

async function fetchInsights(weekStart: string, weekEnd: string, zdInstance: 'ZD1' | 'ZD2', forceRefresh = false, channel = 'all'): Promise<InsightsData> {
  const { data, error } = await supabase.functions.invoke('fetch-zendesk-insights', {
    body: { weekStart, weekEnd, zdInstance, forceRefresh, channel },
  });
  if (error) throw new Error(error.message || 'Failed to fetch insights');
  return data as InsightsData;
}

function MetricCard({ icon: Icon, label, value, subtext }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tracking-tight">{value}</p>
        {subtext && <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>}
      </div>
    </div>
  );
}

function InsightsCard({ weekStart, weekEnd, zdInstance, channel }: {
  weekStart: string;
  weekEnd: string;
  zdInstance: 'ZD1' | 'ZD2';
  channel: string;
}) {
  const queryClient = useQueryClient();
  const queryKey = ['zendesk-insights', weekStart, weekEnd, zdInstance, channel];

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey,
    queryFn: () => fetchInsights(weekStart, weekEnd, zdInstance, false, channel),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  const handleRefresh = useCallback(async () => {
    queryClient.fetchQuery({
      queryKey,
      queryFn: () => fetchInsights(weekStart, weekEnd, zdInstance, true, channel),
    });
  }, [queryClient, weekStart, weekEnd, zdInstance, channel]);

  const instanceLabel = zdInstance === 'ZD1' ? 'Zendesk Instance 1' : 'Zendesk Instance 2';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{instanceLabel}</CardTitle>
          <div className="flex items-center gap-2">
            {data?.cached && (
              <Badge variant="outline" className="text-xs gap-1">
                <Database className="h-3 w-3" />
                Cached
              </Badge>
            )}
            {data && (
              <Badge variant="secondary" className="text-xs">
                {data.totalTickets} tickets
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRefresh}
              disabled={isFetching}
              title="Refresh from Zendesk"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {(isLoading || (isFetching && !data)) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="p-4 rounded-lg bg-muted/50">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-7 w-16" />
              </div>
            ))}
          </div>
        )}

        {error && !isFetching && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{(error as Error).message}</AlertDescription>
          </Alert>
        )}

        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MetricCard
              icon={Timer}
              label="Avg Resolution Time"
              value={formatTime(data.avgResolutionTimeSeconds)}
              subtext="Agent handle time"
            />
            <MetricCard
              icon={Clock}
              label="Full Resolution Time"
              value={formatTime(data.fullResolutionTimeMinutes, 'minutes')}
              subtext="Created to solved"
            />
            {channel === 'all' && (
              <MetricCard
                icon={ThumbsUp}
                label="CSAT Score"
                value={data.csatScore !== null ? `${data.csatScore}%` : '—'}
                subtext={data.csatTotal > 0 ? `${data.csatGood}/${data.csatTotal} rated good` : 'No ratings'}
              />
            )}
            <MetricCard
              icon={MessageSquare}
              label="First Response Time"
              value={formatTime(data.avgFrtSeconds)}
              subtext="Avg first reply"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ZendeskInsights() {
  const { now: portalNow } = usePortalClock();
  const currentWeekStart = useMemo(() => startOfWeek(portalNow, { weekStartsOn: 1 }), [portalNow.toDateString()]);

  const [selectedYear, setSelectedYear] = useState<string>(String(currentWeekStart.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState<string>(String(currentWeekStart.getMonth() + 1).padStart(2, '0'));
  const [selectedWeek, setSelectedWeek] = useState<string>(format(currentWeekStart, 'yyyy-MM-dd'));
  const [selectedChannel, setSelectedChannel] = useState<string>('all');

  const availableWeeks = useMemo(() => {
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth) - 1;
    const monthStart = startOfMonth(new Date(year, month, 1));
    const monthEnd = endOfMonth(new Date(year, month, 1));
    const cwStart = startOfWeek(portalNow, { weekStartsOn: 1 });

    // Allow negative indices to support weeks before ANCHOR_DATE
    const startIdx = differenceInWeeks(monthStart, ANCHOR_DATE) - 1;
    const endIdx = differenceInWeeks(monthEnd, ANCHOR_DATE) + 1;

    const weeks: { value: string; label: string; start: Date; end: Date; isCurrent: boolean }[] = [];
    for (let i = startIdx; i <= endIdx; i++) {
      const ws = addWeeks(ANCHOR_DATE, i);
      const we = endOfWeek(ws, { weekStartsOn: 1 });
      if (ws > monthEnd || we < monthStart) continue;
      weeks.push({
        value: format(ws, 'yyyy-MM-dd'),
        label: `${format(ws, 'MM/dd')} - ${format(we, 'MM/dd')}`,
        start: ws,
        end: we,
        isCurrent: isSameWeek(ws, cwStart, { weekStartsOn: 1 }),
      });
    }
    return weeks;
  }, [selectedYear, selectedMonth, portalNow.toDateString()]);

  const { weekStart, weekEnd } = useMemo(() => {
    const sel = availableWeeks.find(w => w.value === selectedWeek);
    if (sel) return { weekStart: sel.start, weekEnd: sel.end };
    if (availableWeeks.length > 0) {
      const last = availableWeeks[availableWeeks.length - 1];
      return { weekStart: last.start, weekEnd: last.end };
    }
    const fb = startOfWeek(portalNow, { weekStartsOn: 1 });
    return { weekStart: fb, weekEnd: endOfWeek(fb, { weekStartsOn: 1 }) };
  }, [selectedWeek, availableWeeks]);

  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

  const currentYear = portalNow.getFullYear();
  const availableYears = Array.from({ length: currentYear - PORTAL_START_YEAR + 1 }, (_, i) => String(PORTAL_START_YEAR + i));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Zendesk Insights
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Team-wide averages for {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
            </p>
          </div>
          <PageGuideButton pageId="zendesk-insights" />
        </div>

        {/* Week Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedYear} onValueChange={(v) => { setSelectedYear(v); setSelectedWeek(''); }}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {availableYears.map(y => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); setSelectedWeek(''); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {MONTHS.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select week" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {availableWeeks.map(w => (
                <SelectItem key={w.value} value={w.value} className={w.isCurrent ? 'font-medium text-primary' : ''}>
                  {w.label}{w.isCurrent ? ' ✓' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedChannel} onValueChange={setSelectedChannel}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="voice">Voice</SelectItem>
              <SelectItem value="chat">Chat</SelectItem>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Instance Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InsightsCard weekStart={weekStartStr} weekEnd={weekEndStr} zdInstance="ZD1" channel={selectedChannel} />
          <InsightsCard weekStart={weekStartStr} weekEnd={weekEndStr} zdInstance="ZD2" channel={selectedChannel} />
        </div>
      </div>
    </Layout>
  );
}
