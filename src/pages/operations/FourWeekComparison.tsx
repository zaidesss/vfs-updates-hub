import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, subWeeks } from 'date-fns';
import { BarChart3, Mail, MessageSquare, Phone, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePortalClock } from '@/context/PortalClockContext';
import { parseLocalDate } from '@/lib/ticketLogsApi';

interface WeekResult {
  label: string;
  startDate: string;
  endDate: string;
  total: number;
  email: number;
  chat: number;
  call: number;
}

interface ComparisonResponse {
  zdInstance: string;
  weeks: WeekResult[];
}

function useVolumeComparisonSplit(zdInstance: 'ZD1' | 'ZD2', allWeeks: { startDate: string; endDate: string; label: string }[]) {
  const historicalWeeks = useMemo(() => allWeeks.slice(0, -1), [allWeeks]);
  const currentWeek = useMemo(() => allWeeks.slice(-1), [allWeeks]);

  const historical = useQuery({
    queryKey: ['volume-comparison-hist', zdInstance, historicalWeeks],
    queryFn: async (): Promise<ComparisonResponse> => {
      const { data, error } = await supabase.functions.invoke('fetch-volume-comparison', {
        body: { zdInstance, weeks: historicalWeeks },
      });
      if (error) throw error;
      return data as ComparisonResponse;
    },
    staleTime: Infinity, // Completed weeks don't change
    retry: 1,
    enabled: historicalWeeks.length > 0,
  });

  const current = useQuery({
    queryKey: ['volume-comparison-current', zdInstance, currentWeek],
    queryFn: async (): Promise<ComparisonResponse> => {
      const { data, error } = await supabase.functions.invoke('fetch-volume-comparison', {
        body: { zdInstance, weeks: currentWeek },
      });
      if (error) throw error;
      return data as ComparisonResponse;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000, // Auto-refresh every hour
    retry: 1,
    enabled: currentWeek.length > 0,
  });

  // Merge both results
  const merged: ComparisonResponse | null = useMemo(() => {
    if (!historical.data && !current.data) return null;
    return {
      zdInstance,
      weeks: [
        ...(historical.data?.weeks ?? []),
        ...(current.data?.weeks ?? []),
      ],
    };
  }, [historical.data, current.data, zdInstance]);

  return {
    data: merged,
    isLoading: historical.isLoading || current.isLoading,
    isError: historical.isError || current.isError,
    error: (historical.error || current.error) as Error | null,
    isRefetching: historical.isRefetching || current.isRefetching,
    refetch: () => { historical.refetch(); current.refetch(); },
    lastUpdated: current.dataUpdatedAt,
  };
}

function buildWeekRanges(todayEST: string) {
  const today = parseLocalDate(todayEST);
  const currentMonday = startOfWeek(today, { weekStartsOn: 1 });

  const weeks: { startDate: string; endDate: string; label: string }[] = [];

  // 4 prior completed weeks + current incomplete week
  for (let i = 4; i >= 0; i--) {
    const mon = subWeeks(currentMonday, i);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);

    const label = i === 0
      ? `Current (${format(mon, 'M/d')})`
      : `Wk ${format(mon, 'M/d')}`;

    weeks.push({
      startDate: format(mon, 'yyyy-MM-dd'),
      endDate: format(sun, 'yyyy-MM-dd'),
      label,
    });
  }

  return weeks;
}

function ChangeIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <Minus className="h-3 w-3 text-muted-foreground" />;
  if (previous === 0) return <TrendingUp className="h-3 w-3 text-destructive" />;

  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return <span className="text-xs text-muted-foreground">0%</span>;

  return (
    <span className={cn('text-xs font-medium flex items-center gap-0.5', pct > 0 ? 'text-destructive' : 'text-chart-2')}>
      {pct > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {pct > 0 ? '+' : ''}{pct}%
    </span>
  );
}

function ComparisonCard({
  label,
  subtitle,
  data,
  isLoading,
  isError,
  error,
  onRefresh,
  isRefetching,
}: {
  label: string;
  subtitle: string;
  data: ComparisonResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRefresh: () => void;
  isRefetching: boolean;
  lastUpdated?: number;
}) {
  const channels = [
    { key: 'email' as const, label: 'Email', icon: <Mail className="h-4 w-4" />, colorClass: 'text-primary' },
    { key: 'chat' as const, label: 'Chat', icon: <MessageSquare className="h-4 w-4" />, colorClass: 'text-warning' },
    { key: 'call' as const, label: 'Call', icon: <Phone className="h-4 w-4" />, colorClass: 'text-blue-500' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{label}</CardTitle>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isLoading || isRefetching} className="h-8 w-8">
            <RefreshCw className={cn('h-4 w-4', (isLoading || isRefetching) && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">Failed: {error?.message || 'Unknown error'}</p>
        ) : data ? (
          <div className="space-y-4">
            {/* Header row */}
            <div className="grid gap-2" style={{ gridTemplateColumns: '100px repeat(5, 1fr)' }}>
              <div />
              {data.weeks.map(w => (
                <div key={w.startDate} className="text-center">
                  <p className="text-xs font-medium text-foreground">{w.label}</p>
                  <p className="text-[10px] text-muted-foreground">{w.startDate.slice(5)} – {w.endDate.slice(5)}</p>
                </div>
              ))}
            </div>

            {/* Total row */}
            <div className="grid gap-2 items-center border-b pb-3" style={{ gridTemplateColumns: '100px repeat(5, 1fr)' }}>
              <span className="text-sm font-semibold text-foreground">Total</span>
              {data.weeks.map((w, idx) => {
                const days = getDaysInWeek(w.startDate, w.endDate);
                return (
                  <div key={w.startDate} className="text-center">
                    <p className="text-lg font-bold text-foreground">{w.total.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{Math.round(w.total / days)}/d</p>
                    {idx > 0 && <ChangeIndicator current={w.total} previous={data.weeks[idx - 1].total} />}
                  </div>
                );
              })}
            </div>

            {/* Channel rows */}
            {channels.map(ch => (
              <div key={ch.key} className="grid gap-2 items-center" style={{ gridTemplateColumns: '100px repeat(5, 1fr)' }}>
                <div className={cn('flex items-center gap-1.5 text-sm font-medium', ch.colorClass)}>
                  {ch.icon}
                  {ch.label}
                </div>
                {data.weeks.map((w, idx) => {
                  const count = w[ch.key];
                  const days = getDaysInWeek(w.startDate, w.endDate);
                  return (
                    <div key={w.startDate} className="text-center">
                      <p className="text-sm font-semibold text-foreground">{count.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">{Math.round(count / days)}/d</p>
                      {idx > 0 && <ChangeIndicator current={count} previous={data.weeks[idx - 1][ch.key]} />}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function getDaysInWeek(startDate: string, endDate: string): number {
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  // If the week hasn't ended yet, count only days elapsed
  const effectiveEnd = endDate > todayStr ? todayStr : endDate;
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(effectiveEnd);
  const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(days, 1);
}

const FourWeekComparison = () => {
  const { todayEST } = usePortalClock();
  const weeks = useMemo(() => buildWeekRanges(todayEST), [todayEST]);

  const zd1 = useVolumeComparisonSplit('ZD1', weeks);
  const zd2 = useVolumeComparisonSplit('ZD2', weeks);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            4-Week Comparison
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Total tickets created per channel — last 4 completed weeks + current week (auto-refreshes hourly)
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <ComparisonCard
            label="ZD1"
            subtitle="customerserviceadvocates"
            data={zd1.data ?? null}
            isLoading={zd1.isLoading}
            isError={zd1.isError}
            error={zd1.error as Error | null}
            onRefresh={() => zd1.refetch()}
            isRefetching={zd1.isRefetching}
            lastUpdated={zd1.lastUpdated}
          />
          <ComparisonCard
            label="ZD2"
            subtitle="customerserviceadvocateshelp"
            data={zd2.data ?? null}
            isLoading={zd2.isLoading}
            isError={zd2.isError}
            error={zd2.error as Error | null}
            onRefresh={() => zd2.refetch()}
            isRefetching={zd2.isRefetching}
            lastUpdated={zd2.lastUpdated}
          />
        </div>
      </div>
    </Layout>
  );
};

export default FourWeekComparison;
