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
import { CalendarIcon, BarChart3, Mail, MessageSquare, Phone, RefreshCw, Circle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePortalClock } from '@/context/PortalClockContext';
import { parseLocalDate } from '@/lib/ticketLogsApi';

interface OldestTicket {
  id: number;
  created_at: string;
}

interface StatusInfo {
  count: number;
  oldest: OldestTicket | null;
  email: number;
  chat: number;
  call: number;
}

interface VolumeDemandResult {
  zdInstance: string;
  total: number;
  email: number;
  chat: number;
  call: number;
  statuses?: Record<string, StatusInfo>;
}

const SUBDOMAIN_MAP: Record<string, string> = {
  ZD1: 'customerserviceadvocates',
  ZD2: 'customerserviceadvocateshelp',
};

const STATUS_CONFIG: { key: string; label: string; colorClass: string }[] = [
  { key: 'new', label: 'New', colorClass: 'text-emerald-500' },
  { key: 'open', label: 'Open', colorClass: 'text-red-500' },
  { key: 'pending', label: 'Pending', colorClass: 'text-amber-500' },
  { key: 'hold', label: 'Hold', colorClass: 'text-muted-foreground' },
];

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
            todayEST={todayEST}
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
            todayEST={todayEST}
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
  todayEST,
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
  todayEST: string;
}) {
  const avg = (count: number) => Math.round(count / daysInRange);
  const subdomain = SUBDOMAIN_MAP[label] ?? subtitle;

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
            <Skeleton className="h-24 w-full" />
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
              <ChannelRow icon={<Mail className="h-4 w-4" />} label="Email" count={data.email} avg={avg(data.email)} colorClass="text-primary" />
              <ChannelRow icon={<MessageSquare className="h-4 w-4" />} label="Chat" count={data.chat} avg={avg(data.chat)} colorClass="text-warning" />
              <ChannelRow icon={<Phone className="h-4 w-4" />} label="Call" count={data.call} avg={avg(data.call)} colorClass="text-blue-500" />
            </div>

            {/* Status Breakdown */}
            {data.statuses && (
              <div className="space-y-3 border-t pt-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">By Status</p>
                {STATUS_CONFIG.map(({ key, label: statusLabel, colorClass }) => {
                  const info = data.statuses![key];
                  if (!info) return null;
                  return (
                    <StatusRow
                      key={key}
                      label={statusLabel}
                      count={info.count}
                      oldest={info.oldest}
                      colorClass={colorClass}
                      subdomain={subdomain}
                      todayEST={todayEST}
                      emailCount={info.email ?? 0}
                      chatCount={info.chat ?? 0}
                      callCount={info.call ?? 0}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatusRow({
  label,
  count,
  oldest,
  colorClass,
  subdomain,
  todayEST,
  emailCount,
  chatCount,
  callCount,
}: {
  label: string;
  count: number;
  oldest: OldestTicket | null;
  colorClass: string;
  subdomain: string;
  todayEST: string;
  emailCount: number;
  chatCount: number;
  callCount: number;
}) {
  const today = parseLocalDate(todayEST);

  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-[100px]">
          <Circle className={cn('h-3 w-3 fill-current', colorClass)} />
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <div className="text-right flex-1">
          <span className="text-lg font-semibold text-foreground">{count.toLocaleString()}</span>
          {oldest && (
            <div className="text-xs text-muted-foreground mt-0.5">
              <a
                href={`https://${subdomain}.zendesk.com/agent/tickets/${oldest.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                #{oldest.id}
                <ExternalLink className="h-3 w-3" />
              </a>
              <span className="ml-1.5">
                {format(new Date(oldest.created_at), 'MMM d, yyyy')}
              </span>
              <span className="ml-1 text-muted-foreground/70">
                ({differenceInCalendarDays(today, new Date(oldest.created_at))}d ago)
              </span>
            </div>
          )}
        </div>
      </div>
      {/* Channel sub-counts */}
      <div className="flex items-center gap-3 pl-5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Mail className="h-3 w-3 text-primary" />
          {emailCount.toLocaleString()}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="h-3 w-3 text-warning" />
          {chatCount.toLocaleString()}
        </span>
        <span className="inline-flex items-center gap-1">
          <Phone className="h-3 w-3 text-blue-500" />
          {callCount.toLocaleString()}
        </span>
      </div>
    </div>
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
