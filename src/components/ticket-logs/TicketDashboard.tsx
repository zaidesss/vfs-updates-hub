import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { fetchDashboardData, formatGapTime, AgentDashboardData } from '@/lib/ticketLogsApi';
import { supabase } from '@/integrations/supabase/client';
import { Mail, MessageCircle, Phone } from 'lucide-react';

interface TicketDashboardProps {
  zdInstance: string;
  title: string;
}

export function TicketDashboard({ zdInstance, title }: TicketDashboardProps) {
  const [data, setData] = useState<AgentDashboardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const dashboardData = await fetchDashboardData(zdInstance);
      setData(dashboardData);
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
              Last 14 Days
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
          <Badge variant="outline" className="text-xs font-normal">
            Last 14 Days
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-max">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-card border border-border px-4 py-3 text-left font-medium min-w-[140px]">
                    Agent
                  </th>
                  {dates.map((date) => (
                    <th
                      key={date}
                      colSpan={3}
                      className="border border-border px-2 py-2 text-center font-medium bg-muted/50"
                    >
                      {format(new Date(date), 'M/d')}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className="sticky left-0 z-10 bg-card border border-border px-4 py-2 text-left font-medium">
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
                    <td className="sticky left-0 z-10 bg-card border border-border px-4 py-3 font-medium">
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
                          <span className={dateData.chat > 0 ? 'font-semibold text-green-700 dark:text-green-300' : 'text-muted-foreground'}>
                            {dateData.chat}
                          </span>
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
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

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
