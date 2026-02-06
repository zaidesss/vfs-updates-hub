import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  Calendar as CalendarIcon, 
  User,
  Clock,
  Target,
  Ticket,
  AlertTriangle,
  Coffee,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { INCIDENT_TYPE_CONFIG, type IncidentType } from '@/lib/agentReportsApi';

interface AgentMetrics {
  date: string;
  loginTime: string | null;
  logoutTime: string | null;
  hoursWorked: number | null;
  tickets: {
    email: number;
    chat: number;
    call: number;
    total: number;
  };
  quota: number;
  quotaMet: boolean;
  avgGap: number | null;
  breakMinutes: number | null;
  incidents: { type: IncidentType; count: number }[];
}

interface WeeklyAgentMetrics {
  weekStart: string;
  weekEnd: string;
  daysActive: number;
  daysScheduled: number;
  totalHoursWorked: number;
  tickets: {
    email: number;
    chat: number;
    call: number;
    total: number;
  };
  weeklyQuota: number;
  quotaMet: boolean;
  avgGap: number | null;
  totalBreakMinutes: number;
  incidents: { type: IncidentType; count: number }[];
  dailyBreakdown: { date: string; tickets: number; hours: number }[];
}

export function IndividualAgentAnalytics() {
  const { user, isAdmin, isHR, profileId: currentProfileId } = useAuth();
  const canSelectAgent = isAdmin || isHR;

  // State
  const [mode, setMode] = useState<'daily' | 'weekly'>('daily');
  const [selectedDate, setSelectedDate] = useState<Date>(subDays(new Date(), 1));
  const [selectedAgentEmail, setSelectedAgentEmail] = useState<string>(user?.email || '');
  const [agents, setAgents] = useState<{ email: string; name: string; profileId: string }[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<AgentMetrics | null>(null);
  const [weeklyMetrics, setWeeklyMetrics] = useState<WeeklyAgentMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load agents list (for admin/HR)
  useEffect(() => {
    if (!canSelectAgent) {
      setSelectedAgentEmail(user?.email || '');
      return;
    }

    const loadAgents = async () => {
      const { data } = await supabase
        .from('agent_profiles')
        .select('id, email, full_name')
        .neq('employment_status', 'Terminated')
        .order('full_name');
      
      if (data) {
        setAgents(data.map(a => ({ 
          email: a.email, 
          name: a.full_name || a.email,
          profileId: a.id 
        })));
      }
    };

    loadAgents();
  }, [canSelectAgent, user?.email]);

  // Load metrics
  useEffect(() => {
    const loadMetrics = async () => {
      if (!selectedAgentEmail) return;
      
      setIsLoading(true);

      if (mode === 'daily') {
        await loadDailyMetrics();
      } else {
        await loadWeeklyMetrics();
      }

      setIsLoading(false);
    };

    loadMetrics();
  }, [selectedAgentEmail, selectedDate, mode]);

  const loadDailyMetrics = async () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const startOfDay = `${dateStr}T00:00:00.000Z`;
    const endOfDay = `${dateStr}T23:59:59.999Z`;

    // Get profile ID for events
    const { data: profile } = await supabase
      .from('agent_profiles')
      .select('id, position, quota_email, quota_chat, quota_phone')
      .eq('email', selectedAgentEmail.toLowerCase())
      .single();

    if (!profile) {
      setDailyMetrics(null);
      return;
    }

    // Parallel fetches
    const [eventsResult, ticketsResult, gapsResult, incidentsResult] = await Promise.all([
      supabase.from('profile_events')
        .select('event_type, created_at')
        .eq('profile_id', profile.id)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at'),
      supabase.from('ticket_logs')
        .select('ticket_type')
        .eq('agent_email', selectedAgentEmail.toLowerCase())
        .gte('timestamp', startOfDay)
        .lte('timestamp', endOfDay),
      supabase.from('ticket_gap_daily')
        .select('avg_gap_seconds')
        .eq('agent_email', selectedAgentEmail.toLowerCase())
        .eq('date', dateStr)
        .single(),
      supabase.from('agent_reports')
        .select('incident_type')
        .eq('agent_email', selectedAgentEmail.toLowerCase())
        .eq('incident_date', dateStr),
    ]);

    const events = eventsResult.data || [];
    const tickets = ticketsResult.data || [];
    const gap = gapsResult.data?.avg_gap_seconds;
    const incidents = incidentsResult.data || [];

    // Parse login/logout times
    const loginEvent = events.find(e => e.event_type === 'LOGIN');
    const logoutEvent = [...events].reverse().find(e => e.event_type === 'LOGOUT');

    let hoursWorked: number | null = null;
    if (loginEvent && logoutEvent) {
      hoursWorked = (new Date(logoutEvent.created_at).getTime() - new Date(loginEvent.created_at).getTime()) / 3600000;
    }

    // Calculate break time
    let breakMinutes = 0;
    const breakIns = events.filter(e => e.event_type === 'BREAK_IN');
    const breakOuts = events.filter(e => e.event_type === 'BREAK_OUT');
    for (let i = 0; i < Math.min(breakIns.length, breakOuts.length); i++) {
      breakMinutes += (new Date(breakOuts[i].created_at).getTime() - new Date(breakIns[i].created_at).getTime()) / 60000;
    }

    // Calculate quota
    const pos = (profile.position || '').toLowerCase();
    const quota = pos.includes('hybrid') 
      ? (profile.quota_email || 0) + (profile.quota_chat || 0) + (profile.quota_phone || 0)
      : pos.includes('chat') 
        ? (profile.quota_email || 0) + (profile.quota_chat || 0)
        : pos.includes('phone')
          ? (profile.quota_email || 0) + (profile.quota_phone || 0)
          : profile.quota_email || 0;

    // Count tickets
    const emailCount = tickets.filter(t => t.ticket_type?.toLowerCase() === 'email').length;
    const chatCount = tickets.filter(t => t.ticket_type?.toLowerCase() === 'chat').length;
    const callCount = tickets.filter(t => t.ticket_type?.toLowerCase() === 'call').length;
    const totalTickets = emailCount + chatCount + callCount;

    // Group incidents
    const incidentMap = new Map<IncidentType, number>();
    incidents.forEach(i => {
      const type = i.incident_type as IncidentType;
      incidentMap.set(type, (incidentMap.get(type) || 0) + 1);
    });

    setDailyMetrics({
      date: dateStr,
      loginTime: loginEvent ? format(new Date(loginEvent.created_at), 'h:mm a') : null,
      logoutTime: logoutEvent ? format(new Date(logoutEvent.created_at), 'h:mm a') : null,
      hoursWorked,
      tickets: { email: emailCount, chat: chatCount, call: callCount, total: totalTickets },
      quota,
      quotaMet: totalTickets >= quota,
      avgGap: gap !== undefined ? gap / 60 : null,
      breakMinutes: breakMinutes > 0 ? breakMinutes : null,
      incidents: Array.from(incidentMap.entries()).map(([type, count]) => ({ type, count })),
    });
  };

  const loadWeeklyMetrics = async () => {
    const weekStartDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEndDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekStartStr = format(weekStartDate, 'yyyy-MM-dd');
    const weekEndStr = format(weekEndDate, 'yyyy-MM-dd');
    const startOfWeekTs = `${weekStartStr}T00:00:00.000Z`;
    const endOfWeekTs = `${weekEndStr}T23:59:59.999Z`;

    // Get profile
    const { data: profile } = await supabase
      .from('agent_profiles')
      .select('id, position, quota_email, quota_chat, quota_phone')
      .eq('email', selectedAgentEmail.toLowerCase())
      .single();

    if (!profile) {
      setWeeklyMetrics(null);
      return;
    }

    // Parallel fetches
    const [eventsResult, ticketsResult, gapsResult, incidentsResult] = await Promise.all([
      supabase.from('profile_events')
        .select('event_type, created_at')
        .eq('profile_id', profile.id)
        .gte('created_at', startOfWeekTs)
        .lte('created_at', endOfWeekTs)
        .order('created_at'),
      supabase.from('ticket_logs')
        .select('ticket_type, timestamp')
        .eq('agent_email', selectedAgentEmail.toLowerCase())
        .gte('timestamp', startOfWeekTs)
        .lte('timestamp', endOfWeekTs),
      supabase.from('ticket_gap_daily')
        .select('avg_gap_seconds, date')
        .eq('agent_email', selectedAgentEmail.toLowerCase())
        .gte('date', weekStartStr)
        .lte('date', weekEndStr),
      supabase.from('agent_reports')
        .select('incident_type')
        .eq('agent_email', selectedAgentEmail.toLowerCase())
        .gte('incident_date', weekStartStr)
        .lte('incident_date', weekEndStr),
    ]);

    const events = eventsResult.data || [];
    const tickets = ticketsResult.data || [];
    const gaps = gapsResult.data || [];
    const incidents = incidentsResult.data || [];

    // Group events by day
    const eventsByDay = new Map<string, any[]>();
    events.forEach(e => {
      const day = e.created_at.split('T')[0];
      if (!eventsByDay.has(day)) eventsByDay.set(day, []);
      eventsByDay.get(day)!.push(e);
    });

    // Calculate daily breakdown and totals
    let daysActive = 0;
    let totalHoursWorked = 0;
    let totalBreakMinutes = 0;
    const dailyBreakdown: { date: string; tickets: number; hours: number }[] = [];

    eventsByDay.forEach((dayEvents, day) => {
      const loginEvent = dayEvents.find(e => e.event_type === 'LOGIN');
      const logoutEvent = [...dayEvents].reverse().find(e => e.event_type === 'LOGOUT');
      
      if (loginEvent) {
        daysActive++;
        let hours = 0;
        if (logoutEvent) {
          hours = (new Date(logoutEvent.created_at).getTime() - new Date(loginEvent.created_at).getTime()) / 3600000;
          totalHoursWorked += hours;
        }

        // Calculate break time for day
        const breakIns = dayEvents.filter(e => e.event_type === 'BREAK_IN');
        const breakOuts = dayEvents.filter(e => e.event_type === 'BREAK_OUT');
        for (let i = 0; i < Math.min(breakIns.length, breakOuts.length); i++) {
          totalBreakMinutes += (new Date(breakOuts[i].created_at).getTime() - new Date(breakIns[i].created_at).getTime()) / 60000;
        }

        const dayTickets = tickets.filter(t => t.timestamp.startsWith(day)).length;
        dailyBreakdown.push({ date: day, tickets: dayTickets, hours });
      }
    });

    // Count tickets
    const emailCount = tickets.filter(t => t.ticket_type?.toLowerCase() === 'email').length;
    const chatCount = tickets.filter(t => t.ticket_type?.toLowerCase() === 'chat').length;
    const callCount = tickets.filter(t => t.ticket_type?.toLowerCase() === 'call').length;
    const totalTickets = emailCount + chatCount + callCount;

    // Calculate quota
    const pos = (profile.position || '').toLowerCase();
    const dailyQuota = pos.includes('hybrid') 
      ? (profile.quota_email || 0) + (profile.quota_chat || 0) + (profile.quota_phone || 0)
      : pos.includes('chat') 
        ? (profile.quota_email || 0) + (profile.quota_chat || 0)
        : pos.includes('phone')
          ? (profile.quota_email || 0) + (profile.quota_phone || 0)
          : profile.quota_email || 0;
    const weeklyQuota = dailyQuota * 5;

    // Calculate avg gap
    const avgGap = gaps.length > 0 
      ? gaps.reduce((sum, g) => sum + (g.avg_gap_seconds || 0), 0) / gaps.length / 60 
      : null;

    // Group incidents
    const incidentMap = new Map<IncidentType, number>();
    incidents.forEach(i => {
      const type = i.incident_type as IncidentType;
      incidentMap.set(type, (incidentMap.get(type) || 0) + 1);
    });

    setWeeklyMetrics({
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      daysActive,
      daysScheduled: 5, // Assuming 5-day work week
      totalHoursWorked,
      tickets: { email: emailCount, chat: chatCount, call: callCount, total: totalTickets },
      weeklyQuota,
      quotaMet: totalTickets >= weeklyQuota * 0.8,
      avgGap,
      totalBreakMinutes,
      incidents: Array.from(incidentMap.entries()).map(([type, count]) => ({ type, count })),
      dailyBreakdown: dailyBreakdown.sort((a, b) => a.date.localeCompare(b.date)),
    });
  };

  const formatHours = (h: number | null) => {
    if (h === null) return '-';
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return hrs === 0 ? `${mins}m` : mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            Individual Agent Analytics
          </CardTitle>

          <div className="flex items-center gap-3">
            {/* Agent Selector (Admin/HR only) */}
            {canSelectAgent && (
              <Select value={selectedAgentEmail} onValueChange={setSelectedAgentEmail}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map(a => (
                    <SelectItem key={a.email} value={a.email}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Mode Toggle */}
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'daily' | 'weekly')}>
              <TabsList>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {mode === 'daily' 
                    ? format(selectedDate, 'MMM d, yyyy')
                    : `Week of ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d')}`
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : mode === 'daily' && dailyMetrics ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Attendance */}
              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-sm">Attendance</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Login</span>
                      <span className="font-medium">{dailyMetrics.loginTime || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Logout</span>
                      <span className="font-medium">{dailyMetrics.logoutTime || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hours</span>
                      <span className="font-medium">{formatHours(dailyMetrics.hoursWorked)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Productivity */}
              <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Ticket className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-sm">Tickets</span>
                  </div>
                  <div className="text-2xl font-bold mb-1">
                    {dailyMetrics.tickets.total}
                    <span className="text-sm font-normal text-muted-foreground">/{dailyMetrics.quota}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    E: {dailyMetrics.tickets.email} | C: {dailyMetrics.tickets.chat} | P: {dailyMetrics.tickets.call}
                  </div>
                  <Badge className={cn('mt-1', dailyMetrics.quotaMet ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                    {dailyMetrics.quotaMet ? 'Quota Met' : 'Below Quota'}
                  </Badge>
                </CardContent>
              </Card>

              {/* Performance */}
              <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-sm">Performance</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Gap</span>
                      <span className="font-medium">{dailyMetrics.avgGap !== null ? `${dailyMetrics.avgGap.toFixed(1)} min` : '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Break</span>
                      <span className="font-medium">{dailyMetrics.breakMinutes !== null ? `${Math.round(dailyMetrics.breakMinutes)} min` : '-'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Compliance */}
              <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="font-medium text-sm">Incidents</span>
                  </div>
                  {dailyMetrics.incidents.length === 0 ? (
                    <div className="text-sm text-green-600 font-medium">✓ Clean</div>
                  ) : (
                    <div className="space-y-1">
                      {dailyMetrics.incidents.map(inc => (
                        <div key={inc.type} className="text-xs">
                          <span className={INCIDENT_TYPE_CONFIG[inc.type]?.color || 'text-muted-foreground'}>
                            {INCIDENT_TYPE_CONFIG[inc.type]?.label || inc.type}
                          </span>
                          {inc.count > 1 && <span className="text-muted-foreground"> x{inc.count}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : mode === 'weekly' && weeklyMetrics ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Attendance */}
              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-sm">Attendance</span>
                  </div>
                  <div className="text-2xl font-bold mb-1">
                    {weeklyMetrics.daysActive}
                    <span className="text-sm font-normal text-muted-foreground">/{weeklyMetrics.daysScheduled} days</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatHours(weeklyMetrics.totalHoursWorked)} total
                  </div>
                </CardContent>
              </Card>

              {/* Productivity */}
              <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Ticket className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-sm">Tickets</span>
                  </div>
                  <div className="text-2xl font-bold mb-1">
                    {weeklyMetrics.tickets.total}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    E: {weeklyMetrics.tickets.email} | C: {weeklyMetrics.tickets.chat} | P: {weeklyMetrics.tickets.call}
                  </div>
                  <Badge className={cn('mt-1', weeklyMetrics.quotaMet ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                    {weeklyMetrics.quotaMet ? 'On Track' : 'Below Target'}
                  </Badge>
                </CardContent>
              </Card>

              {/* Performance */}
              <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-sm">Performance</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Gap</span>
                      <span className="font-medium">{weeklyMetrics.avgGap !== null ? `${weeklyMetrics.avgGap.toFixed(1)} min` : '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Breaks</span>
                      <span className="font-medium">{formatHours(weeklyMetrics.totalBreakMinutes / 60)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Compliance */}
              <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="font-medium text-sm">Incidents</span>
                  </div>
                  {weeklyMetrics.incidents.length === 0 ? (
                    <div className="text-sm text-green-600 font-medium">✓ Clean Week</div>
                  ) : (
                    <div className="space-y-1">
                      {weeklyMetrics.incidents.slice(0, 3).map(inc => (
                        <div key={inc.type} className="text-xs">
                          <span className={INCIDENT_TYPE_CONFIG[inc.type]?.color || 'text-muted-foreground'}>
                            {INCIDENT_TYPE_CONFIG[inc.type]?.label || inc.type}
                          </span>
                          {inc.count > 1 && <span className="text-muted-foreground"> x{inc.count}</span>}
                        </div>
                      ))}
                      {weeklyMetrics.incidents.length > 3 && (
                        <div className="text-xs text-muted-foreground">+{weeklyMetrics.incidents.length - 3} more</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Daily Breakdown */}
            {weeklyMetrics.dailyBreakdown.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Daily Breakdown</h4>
                <div className="grid grid-cols-7 gap-2">
                  {weeklyMetrics.dailyBreakdown.map(day => (
                    <div key={day.date} className="text-center p-2 bg-muted rounded-md">
                      <div className="text-xs text-muted-foreground">{format(new Date(day.date), 'EEE')}</div>
                      <div className="text-sm font-medium">{day.tickets}</div>
                      <div className="text-xs text-muted-foreground">{formatHours(day.hours)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No data available for the selected period</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
