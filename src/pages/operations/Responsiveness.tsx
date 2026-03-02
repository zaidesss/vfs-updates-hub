import React from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { RefreshCw, AlertTriangle, Ticket, Info, Clock, CheckCircle2, Mail, Calendar, Timer, MessageSquareReply, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  useSlaResponsiveness,
  formatAge,
  formatResolutionTime,
  combineInstances,
  type SlaInstanceData,
} from '@/lib/slaResponsivenessApi';
import SlaHistorySection from '@/components/sla/SlaHistorySection';

/* ── MetricRow (matches NewTicketsCounter pattern) ── */
function MetricRow({ icon, label, value, sub, variant, isLoading, emphasized }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  variant: 'destructive' | 'default' | 'success';
  isLoading: boolean;
  emphasized?: boolean;
}) {
  const colorClass = variant === 'destructive'
    ? 'text-destructive'
    : variant === 'success'
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-foreground';

  return (
    <div className={`flex items-center justify-between gap-4 ${emphasized ? 'bg-destructive/10 rounded-lg p-3 -mx-1' : ''}`}>
      <div className="flex items-center gap-3">
        <span className={colorClass}>{React.cloneElement(icon as React.ReactElement, { className: emphasized ? 'h-6 w-6' : 'h-4 w-4' })}</span>
        <span className={emphasized ? 'text-base font-semibold text-destructive' : 'text-sm font-medium text-muted-foreground'}>{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className={`${emphasized ? 'text-4xl' : 'text-2xl'} font-extrabold tabular-nums ${colorClass}`}>
          {isLoading ? '—' : typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {sub && <span className={`${emphasized ? 'text-sm' : 'text-xs'} text-muted-foreground whitespace-nowrap`}>{isLoading ? '' : sub}</span>}
      </div>
    </div>
  );
}

/* ── SLA Summary Card (single consolidated card per tab) ── */
function SlaSummaryCard({ data, isLoading, zd1, zd2, showSplit }: {
  data: SlaInstanceData | null;
  isLoading: boolean;
  zd1?: SlaInstanceData | null;
  zd2?: SlaInstanceData | null;
  showSplit: boolean;
}) {
  const d = data;

  // Today metrics
  const totalToday = (d?.lastHourNew ?? 0) + (d?.remainingYesterday ?? 0) + (d?.lastHourResponded ?? 0);
  // We don't actually have totalToday from the combined data — use the real-time fields
  // Actually the SLA edge function gives us lastHourNew/lastHourResponded for 60-min window,
  // but we want daily totals. The real-time data from the dashboard uses zendesk-realtime.
  // For the SLA page we'll use what we have: remainingYesterday, totalYesterday, workedYesterday, resolution, oldest.

  const awaiting = 0; // We don't have real-time new ticket count from SLA data alone
  // The SLA data has lastHourNew but that's 60-min, not daily awaiting.

  return (
    <div className="space-y-3">
      {/* Yesterday Section */}
      <MetricRow
        icon={<Calendar />}
        label="Total Yesterday"
        value={d?.totalYesterday ?? 0}
        sub={showSplit && zd1 && zd2 ? `(ZD1: ${zd1.totalYesterday} / ZD2: ${zd2.totalYesterday})` : undefined}
        variant="default"
        isLoading={isLoading}
      />
      <MetricRow
        icon={<CheckCircle2 />}
        label="Worked Yesterday"
        value={d?.workedYesterday ?? 0}
        sub={showSplit && zd1 && zd2 ? `(ZD1: ${zd1.workedYesterday} / ZD2: ${zd2.workedYesterday})` : undefined}
        variant="success"
        isLoading={isLoading}
      />
      <MetricRow
        icon={<Clock />}
        label="Remaining Yesterday"
        value={d?.remainingYesterday ?? 0}
        sub={showSplit && zd1 && zd2 ? `(ZD1: ${zd1.remainingYesterday} / ZD2: ${zd2.remainingYesterday})` : undefined}
        variant={(d?.remainingYesterday ?? 0) > 0 ? 'destructive' : 'success'}
        isLoading={isLoading}
        emphasized={(d?.remainingYesterday ?? 0) > 0}
      />

      <div className="border-t border-border/50" />

      {/* Oldest New Ticket */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground"><AlertTriangle className="h-4 w-4" /></span>
          <span className="text-sm font-medium text-muted-foreground">Oldest New Ticket</span>
        </div>
        {isLoading ? (
          <span className="text-2xl font-extrabold text-muted-foreground">—</span>
        ) : d?.oldestNewTicket ? (
          <span className={`text-2xl font-extrabold tabular-nums ${d.oldestNewTicket.age_minutes > 120 ? 'text-destructive' : 'text-foreground'}`}>
            #{d.oldestNewTicket.id} — {formatAge(d.oldestNewTicket.age_minutes)}
          </span>
        ) : (
          <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">None ✓</span>
        )}
      </div>

      <div className="border-t border-border/50" />

      {/* FRT & Resolution */}
      <MetricRow
        icon={<MessageSquareReply />}
        label="Avg First Reply (Today)"
        value={formatResolutionTime(d?.resolution.avgFirstReplyMinutes ?? null)}
        sub={showSplit && zd1 && zd2 ? `(ZD1: ${formatResolutionTime(zd1.resolution.avgFirstReplyMinutes)} / ZD2: ${formatResolutionTime(zd2.resolution.avgFirstReplyMinutes)})` : undefined}
        variant="default"
        isLoading={isLoading}
      />
      <MetricRow
        icon={<Timer />}
        label="Avg Full Resolution (Today)"
        value={formatResolutionTime(d?.resolution.avgFullResolutionMinutes ?? null)}
        sub={showSplit && zd1 && zd2 ? `(ZD1: ${formatResolutionTime(zd1.resolution.avgFullResolutionMinutes)} / ZD2: ${formatResolutionTime(zd2.resolution.avgFullResolutionMinutes)})` : undefined}
        variant="default"
        isLoading={isLoading}
      />
    </div>
  );
}

/* ── Distribution Chart ── */
function DistributionChart({ data, isLoading }: { data: SlaInstanceData | null; isLoading: boolean }) {
  const d = data;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Resolution Time Distribution (Today)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">Loading…</div>
        ) : !d?.resolution.distribution?.length || d.resolution.distribution.every(b => b.count === 0) ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">No solved tickets today</div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={d.resolution.distribution} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="bucket" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {d.resolution.distribution.map((entry, index) => {
                  const colors = [
                    'hsl(var(--chart-3))',
                    'hsl(var(--chart-4))',
                    'hsl(var(--chart-2))',
                    'hsl(var(--chart-1))',
                    'hsl(var(--destructive))',
                  ];
                  return <Cell key={entry.bucket} fill={colors[index] || colors[0]} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Main Page ── */
const Responsiveness = () => {
  const { data, isLoading, error, refresh } = useSlaResponsiveness();

  const combined = data ? combineInstances(data.zd1, data.zd2) : null;

  const fetchedAt = data?.fetchedAt
    ? new Date(data.fetchedAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : null;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">SLA Responsiveness</h1>
            <p className="text-sm text-muted-foreground">2-hour New Ticket SLA tracker across ZD1 & ZD2</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="destructive" className="text-xs font-bold px-2.5 py-1">2hr SLA</Badge>
            {fetchedAt && <span className="text-xs text-muted-foreground">Updated {fetchedAt}</span>}
            <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="py-4 flex items-center gap-2 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="combined">
          <TabsList>
            <TabsTrigger value="combined">Combined</TabsTrigger>
            <TabsTrigger value="zd1">ZD1</TabsTrigger>
            <TabsTrigger value="zd2">ZD2</TabsTrigger>
          </TabsList>

          <TabsContent value="combined" className="mt-4 space-y-6">
            <Card className="border-destructive/30 bg-gradient-to-r from-destructive/5 via-destructive/10 to-destructive/5 dark:from-destructive/10 dark:via-destructive/20 dark:to-destructive/10">
              <CardContent className="py-5 px-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-destructive/15 dark:bg-destructive/25">
                    <Ticket className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-foreground">SLA Monitor</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground transition-colors">
                          <Info className="h-4 w-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto text-sm" side="top">
                        Daily counts reset at <strong>12:00 AM EST</strong>.
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <SlaSummaryCard data={combined} isLoading={isLoading} zd1={data?.zd1} zd2={data?.zd2} showSplit={true} />
              </CardContent>
            </Card>
            <DistributionChart data={combined} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="zd1" className="mt-4 space-y-6">
            <Card>
              <CardContent className="py-5 px-6">
                <SlaSummaryCard data={data?.zd1 ?? null} isLoading={isLoading} showSplit={false} />
              </CardContent>
            </Card>
            <DistributionChart data={data?.zd1 ?? null} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="zd2" className="mt-4 space-y-6">
            <Card>
              <CardContent className="py-5 px-6">
                <SlaSummaryCard data={data?.zd2 ?? null} isLoading={isLoading} showSplit={false} />
              </CardContent>
            </Card>
            <DistributionChart data={data?.zd2 ?? null} isLoading={isLoading} />
          </TabsContent>
        </Tabs>

        {/* Historical Charts */}
        <SlaHistorySection />
      </div>
    </Layout>
  );
};

export default Responsiveness;
