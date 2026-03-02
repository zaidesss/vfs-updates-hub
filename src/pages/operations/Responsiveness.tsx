import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RefreshCw, Clock, AlertTriangle, Calendar, Timer, MessageSquareReply, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  useSlaResponsiveness,
  formatAge,
  formatResolutionTime,
  combineInstances,
  type SlaInstanceData,
} from '@/lib/slaResponsivenessApi';

function SlaCards({ data, isLoading }: { data: SlaInstanceData | null; isLoading: boolean }) {
  const d = data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Last 60 min */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Last 60 Minutes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <div>
                <span className="text-3xl font-extrabold tabular-nums text-destructive">
                  {isLoading ? '—' : d?.lastHourNew ?? 0}
                </span>
                <span className="text-sm text-muted-foreground ml-1">new</span>
              </div>
              <span className="text-muted-foreground text-lg">/</span>
              <div>
                <span className="text-3xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {isLoading ? '—' : d?.lastHourResponded ?? 0}
                </span>
                <span className="text-sm text-muted-foreground ml-1">responded</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Remaining Yesterday */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Remaining Yesterday
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-3xl font-extrabold tabular-nums ${(d?.remainingYesterday ?? 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
              {isLoading ? '—' : d?.remainingYesterday ?? 0}
            </span>
            <span className="text-sm text-muted-foreground ml-2">unanswered</span>
          </CardContent>
        </Card>

        {/* Oldest New Ticket */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Oldest New Ticket
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <span className="text-3xl font-extrabold text-muted-foreground">—</span>
            ) : d?.oldestNewTicket ? (
              <div>
                <span className={`text-3xl font-extrabold tabular-nums ${d.oldestNewTicket.age_minutes > 120 ? 'text-destructive' : 'text-foreground'}`}>
                  {formatAge(d.oldestNewTicket.age_minutes)}
                </span>
                <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]" title={d.oldestNewTicket.subject}>
                  #{d.oldestNewTicket.id} — {d.oldestNewTicket.subject}
                </p>
              </div>
            ) : (
              <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">No new tickets 🎉</span>
            )}
          </CardContent>
        </Card>

        {/* Avg Resolution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Avg Resolution (Today)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MessageSquareReply className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">First Reply:</span>
                <span className="text-xl font-bold tabular-nums">
                  {isLoading ? '—' : formatResolutionTime(d?.resolution.avgFirstReplyMinutes ?? null)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Full Resolution:</span>
                <span className="text-xl font-bold tabular-nums">
                  {isLoading ? '—' : formatResolutionTime(d?.resolution.avgFullResolutionMinutes ?? null)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Chart */}
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
                      'hsl(var(--chart-3))',  // green-ish
                      'hsl(var(--chart-4))',  // yellow-ish
                      'hsl(var(--chart-2))',  // orange-ish
                      'hsl(var(--chart-1))',  // red-ish
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
    </div>
  );
}

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

          <TabsContent value="combined" className="mt-4">
            <SlaCards data={combined} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="zd1" className="mt-4">
            <SlaCards data={data?.zd1 ?? null} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="zd2" className="mt-4">
            <SlaCards data={data?.zd2 ?? null} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Responsiveness;
