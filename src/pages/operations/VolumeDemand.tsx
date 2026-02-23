import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, differenceInCalendarDays, min } from 'date-fns';
import { CalendarIcon, BarChart3, Mail, MessageSquare, Phone, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePortalClock } from '@/context/PortalClockContext';
import { parseLocalDate } from '@/lib/ticketLogsApi';

interface VolumeDemandResult {
  zdInstance: string;
  total: number;
  email: number;
  chat: number;
  call: number;
}

function useVolumeDemand(zdInstance: 'ZD1' | 'ZD2', startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['volume-demand', zdInstance, startDate, endDate],
    queryFn: async (): Promise<VolumeDemandResult> => {
      const { data, error } = await supabase.functions.invoke('fetch-volume-demand', {
        body: { zdInstance, startDate, endDate },
      });
      if (error) throw error;
      return data as VolumeDemandResult;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

function getDefaultWeekRange(todayEST: string) {
  const today = parseLocalDate(todayEST);
  const mon = startOfWeek(today, { weekStartsOn: 1 });
  const sun = endOfWeek(today, { weekStartsOn: 1 });
  return {
    startDate: format(mon, 'yyyy-MM-dd'),
    endDate: format(sun, 'yyyy-MM-dd'),
  };
}

const VolumeDemand = () => {
  const { todayEST } = usePortalClock();
  const defaultRange = getDefaultWeekRange(todayEST);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);

  const zd1 = useVolumeDemand('ZD1', startDate, endDate);
  const zd2 = useVolumeDemand('ZD2', startDate, endDate);

  // Calculate number of days for daily average (capped at today)
  const daysInRange = useMemo(() => {
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    const today = parseLocalDate(todayEST);
    const effectiveEnd = min([end, today]);
    const days = differenceInCalendarDays(effectiveEnd, start) + 1;
    return Math.max(days, 1);
  }, [startDate, endDate, todayEST]);

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
              Live unresolved ticket counts by channel (excludes Solved & Closed)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartChange={setStartDate}
              onEndChange={setEndDate}
            />
            <span className="text-xs text-muted-foreground">
              Avg over {daysInRange} day{daysInRange !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Instance Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InstanceCard
            label="ZD1"
            subtitle="customerserviceadvocates"
            data={zd1.data ?? null}
            isLoading={zd1.isLoading}
            isError={zd1.isError}
            error={zd1.error}
            daysInRange={daysInRange}
            onRefresh={() => zd1.refetch()}
            isRefetching={zd1.isRefetching}
          />
          <InstanceCard
            label="ZD2"
            subtitle="customerserviceadvocateshelp"
            data={zd2.data ?? null}
            isLoading={zd2.isLoading}
            isError={zd2.isError}
            error={zd2.error}
            daysInRange={daysInRange}
            onRefresh={() => zd2.refetch()}
            isRefetching={zd2.isRefetching}
          />
        </div>
      </div>
    </Layout>
  );
};

// -- Sub-components --

function InstanceCard({
  label,
  subtitle,
  data,
  isLoading,
  isError,
  error,
  daysInRange,
  onRefresh,
  isRefetching,
}: {
  label: string;
  subtitle: string;
  data: VolumeDemandResult | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  daysInRange: number;
  onRefresh: () => void;
  isRefetching: boolean;
}) {
  const avg = (count: number) => Math.round(count / daysInRange);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{label}</CardTitle>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading || isRefetching}
            className="h-8 w-8"
          >
            <RefreshCw className={cn('h-4 w-4', (isLoading || isRefetching) && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-32" />
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        ) : isError ? (
          <div className="text-sm text-destructive">
            Failed to load: {error?.message || 'Unknown error'}
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Total */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Unresolved</p>
              <p className="text-3xl font-bold text-foreground">{data.total.toLocaleString()}</p>
            </div>

            {/* Channel Breakdown */}
            <div className="space-y-3 border-t pt-3">
              <ChannelRow
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                count={data.email}
                avg={avg(data.email)}
                colorClass="text-primary"
              />
              <ChannelRow
                icon={<MessageSquare className="h-4 w-4" />}
                label="Chat"
                count={data.chat}
                avg={avg(data.chat)}
                colorClass="text-warning"
              />
              <ChannelRow
                icon={<Phone className="h-4 w-4" />}
                label="Call"
                count={data.call}
                avg={avg(data.call)}
                colorClass="text-blue-500"
              />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ChannelRow({
  icon,
  label,
  count,
  avg,
  colorClass,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  avg: number;
  colorClass: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className={cn('flex items-center gap-2 text-sm font-medium', colorClass)}>
        {icon}
        {label}
      </div>
      <div className="text-right">
        <span className="text-lg font-semibold text-foreground">{count.toLocaleString()}</span>
        <span className="text-xs text-muted-foreground ml-2">({avg}/d)</span>
      </div>
    </div>
  );
}

function DateRangePicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
}: {
  startDate: string;
  endDate: string;
  onStartChange: (d: string) => void;
  onEndChange: (d: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
          <CalendarIcon className="h-3.5 w-3.5" />
          {format(parseLocalDate(startDate), 'MMM d')} – {format(parseLocalDate(endDate), 'MMM d')}
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
  );
}

export default VolumeDemand;
