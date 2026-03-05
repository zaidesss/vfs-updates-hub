import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, AlertTriangle, Ticket, Info, Clock, CheckCircle2, Mail, Calendar, Timer, FolderOpen, ChevronDown, ChevronRight, User } from 'lucide-react';
import { useZendeskRealtime, OpenTicketsData } from '@/lib/zendeskRealtimeApi';
import { useSlaResponsiveness, formatAge } from '@/lib/slaResponsivenessApi';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';

function MetricRow({ icon, label, total, zd1, zd2, variant, isLoading, emphasized }: {
  icon: React.ReactNode;
  label: string;
  total: number;
  zd1: number;
  zd2: number;
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
          {isLoading ? '—' : total.toLocaleString()}
        </span>
        <span className={`${emphasized ? 'text-sm' : 'text-xs'} text-muted-foreground whitespace-nowrap`}>
          ({isLoading ? '—' : `ZD1: ${zd1.toLocaleString()} / ZD2: ${zd2.toLocaleString()}`})
        </span>
      </div>
    </div>
  );
}
function OpenTicketsSection({ zd1, zd2, isLoading }: { zd1?: OpenTicketsData; zd2?: OpenTicketsData; isLoading: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const totalZd1 = zd1?.total ?? 0;
  const totalZd2 = zd2?.total ?? 0;
  const total = totalZd1 + totalZd2;

  // Merge agents from both instances
  const mergedAgents = new Map<string, { zd1: number; zd2: number }>();
  for (const a of zd1?.byAgent ?? []) {
    mergedAgents.set(a.name, { zd1: a.count, zd2: 0 });
  }
  for (const a of zd2?.byAgent ?? []) {
    const existing = mergedAgents.get(a.name) ?? { zd1: 0, zd2: 0 };
    mergedAgents.set(a.name, { ...existing, zd2: a.count });
  }
  const sortedAgents = Array.from(mergedAgents.entries())
    .map(([name, counts]) => ({ name, ...counts, total: counts.zd1 + counts.zd2 }))
    .sort((a, b) => b.total - a.total);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between gap-4 hover:bg-muted/30 rounded-lg transition-colors py-1 -mx-1 px-1">
          <div className="flex items-center gap-3">
            <span className="text-amber-600 dark:text-amber-400">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </span>
            <span className="text-amber-600 dark:text-amber-400"><FolderOpen className="h-4 w-4" /></span>
            <span className="text-sm font-medium text-muted-foreground">Open Tickets</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-extrabold tabular-nums text-amber-600 dark:text-amber-400">
              {isLoading ? '—' : total.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              ({isLoading ? '—' : `ZD1: ${totalZd1.toLocaleString()} / ZD2: ${totalZd2.toLocaleString()}`})
            </span>
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {sortedAgents.length > 0 && (
          <div className="mt-2 rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 text-xs">Agent</TableHead>
                  <TableHead className="h-8 text-xs text-right">ZD1</TableHead>
                  <TableHead className="h-8 text-xs text-right">ZD2</TableHead>
                  <TableHead className="h-8 text-xs text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAgents.map((agent) => (
                  <TableRow key={agent.name} className="hover:bg-muted/30">
                    <TableCell className="py-1.5 text-sm flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      {agent.name}
                    </TableCell>
                    <TableCell className="py-1.5 text-sm text-right tabular-nums">{agent.zd1 || '—'}</TableCell>
                    <TableCell className="py-1.5 text-sm text-right tabular-nums">{agent.zd2 || '—'}</TableCell>
                    <TableCell className="py-1.5 text-sm text-right tabular-nums font-semibold">{agent.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function NewTicketsCounter() {
  const { data, isLoading, error, refresh } = useZendeskRealtime();
  const { data: slaData, isLoading: slaLoading } = useSlaResponsiveness();

  const awaitingZd1 = data?.zd1?.newTickets ?? 0;
  const awaitingZd2 = data?.zd2?.newTickets ?? 0;
  const awaitingTotal = awaitingZd1 + awaitingZd2;

  const totalZd1 = data?.zd1?.totalTicketsToday ?? 0;
  const totalZd2 = data?.zd2?.totalTicketsToday ?? 0;
  const totalAll = totalZd1 + totalZd2;

  const respondedZd1 = Math.max(0, totalZd1 - awaitingZd1);
  const respondedZd2 = Math.max(0, totalZd2 - awaitingZd2);
  const respondedTotal = respondedZd1 + respondedZd2;

  const fetchedAt = data?.fetchedAt
    ? new Date(data.fetchedAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : null;

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>Unable to load ticket count</span>
          </div>
          <Button variant="ghost" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/30 bg-gradient-to-r from-destructive/5 via-destructive/10 to-destructive/5 dark:from-destructive/10 dark:via-destructive/20 dark:to-destructive/10">
      <CardContent className="py-5 px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-destructive/15 dark:bg-destructive/25">
              <Ticket className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-foreground">New Tickets Breakdown</span>
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
          <div className="flex flex-col items-end gap-1.5">
            <Badge variant="destructive" className="text-xs font-bold px-2.5 py-1">
              2hr SLA
            </Badge>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {fetchedAt && <span>Updated {fetchedAt}</span>}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={refresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="space-y-3">
          <MetricRow
            icon={<Clock className="h-4 w-4" />}
            label="Awaiting Response"
            total={awaitingTotal}
            zd1={awaitingZd1}
            zd2={awaitingZd2}
            variant="destructive"
            isLoading={isLoading}
            emphasized
          />
          <div className="border-t border-border/50" />
          <MetricRow
            icon={<Mail className="h-4 w-4" />}
            label="Total New Tickets as of Today"
            total={totalAll}
            zd1={totalZd1}
            zd2={totalZd2}
            variant="default"
            isLoading={isLoading}
          />
          <div className="border-t border-border/50" />
          <MetricRow
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Responded"
            total={respondedTotal}
            zd1={respondedZd1}
            zd2={respondedZd2}
            variant="success"
            isLoading={isLoading}
          />
          <div className="border-t border-border/50" />
          <MetricRow
            icon={<Calendar className="h-4 w-4" />}
            label="Total Yesterday"
            total={(slaData?.zd1?.totalYesterday ?? 0) + (slaData?.zd2?.totalYesterday ?? 0)}
            zd1={slaData?.zd1?.totalYesterday ?? 0}
            zd2={slaData?.zd2?.totalYesterday ?? 0}
            variant="default"
            isLoading={slaLoading}
          />
          <MetricRow
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Worked Yesterday"
            total={(slaData?.zd1?.workedYesterday ?? 0) + (slaData?.zd2?.workedYesterday ?? 0)}
            zd1={slaData?.zd1?.workedYesterday ?? 0}
            zd2={slaData?.zd2?.workedYesterday ?? 0}
            variant="success"
            isLoading={slaLoading}
          />
          <MetricRow
            icon={<Clock className="h-4 w-4" />}
            label="Remaining Yesterday"
            total={(slaData?.zd1?.remainingYesterday ?? 0) + (slaData?.zd2?.remainingYesterday ?? 0)}
            zd1={slaData?.zd1?.remainingYesterday ?? 0}
            zd2={slaData?.zd2?.remainingYesterday ?? 0}
            variant="destructive"
            isLoading={slaLoading}
          />
          <div className="border-t border-border/50" />
          <OpenTicketsSection
            zd1={data?.zd1?.openTickets}
            zd2={data?.zd2?.openTickets}
            isLoading={isLoading}
          />
          <div className="border-t border-border/50" />
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground"><Timer className="h-4 w-4" /></span>
              <span className="text-sm font-medium text-muted-foreground">Oldest New Ticket</span>
            </div>
            <span className={`text-2xl font-extrabold tabular-nums ${
              slaData?.zd1?.oldestNewTicket || slaData?.zd2?.oldestNewTicket
                ? ((Math.max(slaData?.zd1?.oldestNewTicket?.age_minutes ?? 0, slaData?.zd2?.oldestNewTicket?.age_minutes ?? 0)) > 120
                  ? 'text-destructive' : 'text-foreground')
                : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {slaLoading ? '—' : (() => {
                const zd1t = slaData?.zd1?.oldestNewTicket;
                const zd2t = slaData?.zd2?.oldestNewTicket;
                if (!zd1t && !zd2t) return 'None ✓';
                const oldest = (zd1t && zd2t)
                  ? (zd1t.age_minutes >= zd2t.age_minutes ? zd1t : zd2t)
                  : (zd1t || zd2t)!;
                return `#${oldest.id} — ${formatAge(oldest.age_minutes)}`;
              })()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
