import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

import { fetchDashboardData, formatGapTime, AgentDashboardData, parseLocalDate } from '@/lib/ticketLogsApi';
import { supabase } from '@/integrations/supabase/client';
import { Mail, MessageCircle, Phone, RefreshCw } from 'lucide-react';

interface TicketDashboardProps {
  zdInstance: string;
  title: string;
}

export function TicketDashboard({ zdInstance, title }: TicketDashboardProps) {
  const [data, setData] = useState<AgentDashboardData[]>([]);
  const [dateRangeLabel, setDateRangeLabel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingCalls, setIsRefreshingCalls] = useState(false);

  const isZD1 = zdInstance === 'customerserviceadvocates';

  const refreshCallCounts = async () => {
    setIsRefreshingCalls(true);
    try {
      const { error } = await supabase.functions.invoke('fetch-call-counts', {
        body: { date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }) },
      });
      if (error) throw error;
      toast({ title: 'Call counts refreshed', description: 'Latest call data fetched from Zendesk Talk.' });
      await loadData();
    } catch (err) {
      console.error('Failed to refresh call counts:', err);
      toast({ title: 'Refresh failed', description: 'Could not fetch call counts. Try again later.', variant: 'destructive' });
    } finally {
      setIsRefreshingCalls(false);
    }
  };

  const loadData = async () => {
    try {
      const result = await fetchDashboardData(zdInstance);
      setData(result.data);
      setDateRangeLabel(result.dateRange.displayLabel);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to realtime updates filtered by zd_instance
    const channel = supabase
      .channel(`ticket-logs-dashboard-${zdInstance}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ticket_logs' },
        (payload) => {
          // Only refresh if the new ticket is for this instance
          if (payload.new && (payload.new as { zd_instance?: string }).zd_instance === zdInstance) {
            console.log(`New ticket for ${zdInstance}, refreshing dashboard...`);
            loadData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [zdInstance]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{title}</span>
          <Badge variant="outline" className="text-xs font-normal">
            {dateRangeLabel || 'Loading...'}
          </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No ticket data available for this instance.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Get unique dates from the first agent
  const dates = data[0]?.dates.map(d => d.date) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <div className="flex items-center gap-2">
            {isZD1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshCallCounts}
                disabled={isRefreshingCalls}
                className="h-7 px-2 text-xs"
                title="Refresh call counts from Zendesk Talk"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isRefreshingCalls ? 'animate-spin' : ''}`} />
                {isRefreshingCalls ? 'Refreshing...' : 'Refresh Calls'}
              </Button>
            )}
            <Badge variant="outline" className="text-xs font-normal">
              {dateRangeLabel || 'Loading...'}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto max-h-[70vh] data-table-scroll w-full">
          <div className="min-w-max">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="sticky top-0 z-20">
                  <th className="sticky left-0 z-30 bg-card border border-border px-4 py-3 text-left font-medium min-w-[140px]">
                    Agent
                  </th>
                  {dates.map((date) => (
                    <th
                      key={date}
                      colSpan={3}
                      className="border border-border px-2 py-2 text-center font-medium bg-muted"
                    >
                      {format(parseLocalDate(date), 'M/d')}
                    </th>
                  ))}
                </tr>
                <tr className="sticky top-[37px] z-20">
                  <th className="sticky left-0 z-30 bg-card border border-border px-4 py-2 text-left font-medium">
                    <span className="text-xs text-muted-foreground">Type</span>
                  </th>
                  {dates.map((date) => (
                    <>
                      <th
                        key={`${date}-email`}
                        className="border border-border px-2 py-1 text-center bg-blue-100 dark:bg-blue-950"
                      >
                        <Mail className="h-3 w-3 mx-auto text-blue-600 dark:text-blue-400" />
                      </th>
                      <th
                        key={`${date}-chat`}
                        className="border border-border px-2 py-1 text-center bg-green-100 dark:bg-green-950"
                      >
                        <MessageCircle className="h-3 w-3 mx-auto text-green-600 dark:text-green-400" />
                      </th>
                      <th
                        key={`${date}-call`}
                        className="border border-border px-2 py-1 text-center bg-amber-100 dark:bg-amber-950"
                      >
                        <Phone className="h-3 w-3 mx-auto text-amber-600 dark:text-amber-400" />
                      </th>
                    </>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((agent) => (
                  <tr key={agent.agent_name} className="hover:bg-muted/30">
                    <td className="sticky left-0 z-10 bg-card border border-border px-4 py-3 font-medium shadow-[2px_0_4px_-2px_hsl(var(--border))]">
                      <div className="flex flex-col">
                        <span>{agent.agent_name}</span>
                        {agent.dates[0]?.isActive && (
                          <span className="text-[10px] text-muted-foreground">
                            Avg Gap: {formatGapTime(agent.dates[0]?.avgGapSeconds ?? null)}
                          </span>
                        )}
                        {!agent.dates[0]?.isActive && (
                          <span className="text-[10px] text-amber-600">Gap tracking disabled</span>
                        )}
                      </div>
                    </td>
                    {agent.dates.map((dateData) => (
                      <>
                        <td
                          key={`${agent.agent_name}-${dateData.date}-email`}
                          className="border border-border px-2 py-2 text-center bg-blue-50 dark:bg-blue-950/30"
                        >
                          <span className={dateData.email > 0 ? 'font-semibold text-blue-700 dark:text-blue-300' : 'text-muted-foreground'}>
                            {dateData.email}
                          </span>
                        </td>
                        <td
                          key={`${agent.agent_name}-${dateData.date}-chat`}
                          className="border border-border px-2 py-2 text-center bg-green-50 dark:bg-green-950/30"
                        >
                          <div className="flex flex-col items-center">
                            <span className={dateData.chat > 0 ? 'font-semibold text-green-700 dark:text-green-300' : 'text-muted-foreground'}>
                              {dateData.chat}
                            </span>
                            {dateData.autosolvedChat > 0 && (
                              <span className="text-[9px] text-orange-600 dark:text-orange-400 leading-tight" title="Auto-solved chats (3-min inactivity)">
                                {dateData.autosolvedChat} auto
                              </span>
                            )}
                          </div>
                        </td>
                        <td
                          key={`${agent.agent_name}-${dateData.date}-call`}
                          className="border border-border px-2 py-2 text-center bg-amber-50 dark:bg-amber-950/30"
                        >
                          <span className={dateData.call > 0 ? 'font-semibold text-amber-700 dark:text-amber-300' : 'text-muted-foreground'}>
                            {dateData.call}
                          </span>
                        </td>
                      </>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center gap-6 mt-4 text-xs text-muted-foreground justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-950 border border-blue-300" />
            <span>Email</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-100 dark:bg-green-950 border border-green-300" />
            <span>Chat</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-950 border border-amber-300" />
            <span>Call</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
