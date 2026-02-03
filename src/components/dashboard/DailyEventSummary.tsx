import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, LogIn, LogOut, Coffee, GraduationCap, RotateCcw, Droplet, Clock } from 'lucide-react';
import type { ProfileEvent } from '@/lib/agentDashboardApi';
import { formatTimeInEST } from '@/lib/agentDashboardApi';
import { format, parseISO, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

interface DailyEventSummaryProps {
  events: ProfileEvent[];
  className?: string;
}

const EVENT_CONFIG: Record<string, { label: string; icon: typeof LogIn; color: string }> = {
  LOGIN: { 
    label: 'Logged In', 
    icon: LogIn, 
    color: 'text-green-600 dark:text-green-400' 
  },
  LOGOUT: { 
    label: 'Logged Out', 
    icon: LogOut, 
    color: 'text-muted-foreground' 
  },
  BREAK_IN: { 
    label: 'Break Started', 
    icon: Coffee, 
    color: 'text-amber-600 dark:text-amber-400' 
  },
  BREAK_OUT: { 
    label: 'Break Ended', 
    icon: Coffee, 
    color: 'text-amber-600 dark:text-amber-400' 
  },
  COACHING_START: { 
    label: 'Coaching Started', 
    icon: GraduationCap, 
    color: 'text-blue-600 dark:text-blue-400' 
  },
  COACHING_END: { 
    label: 'Coaching Ended', 
    icon: GraduationCap, 
    color: 'text-blue-600 dark:text-blue-400' 
  },
  DEVICE_RESTART_START: { 
    label: 'Device Restart', 
    icon: RotateCcw, 
    color: 'text-orange-600 dark:text-orange-400' 
  },
  DEVICE_RESTART_END: { 
    label: 'Device Restored', 
    icon: RotateCcw, 
    color: 'text-orange-600 dark:text-orange-400' 
  },
  BIO_START: { 
    label: 'Bio Break', 
    icon: Droplet, 
    color: 'text-cyan-600 dark:text-cyan-400' 
  },
  BIO_END: { 
    label: 'Bio Ended', 
    icon: Droplet, 
    color: 'text-cyan-600 dark:text-cyan-400' 
  },
  OT_LOGIN: { 
    label: 'OT Started', 
    icon: Clock, 
    color: 'text-purple-600 dark:text-purple-400' 
  },
  OT_LOGOUT: { 
    label: 'OT Ended', 
    icon: Clock, 
    color: 'text-purple-600 dark:text-purple-400' 
  },
};

export function DailyEventSummary({ events, className }: DailyEventSummaryProps) {
  // Filter events for today only
  const todayEvents = events.filter((event) => {
    const eventDate = parseISO(event.created_at);
    return isToday(eventDate);
  });

  // Sort by time ascending
  todayEvents.sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Today's Activity
          <Badge variant="secondary" className="ml-auto">
            {todayEvents.length} event{todayEvents.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {todayEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No activity recorded today
          </p>
        ) : (
          <div className="space-y-2">
            {todayEvents.map((event, index) => {
              const config = EVENT_CONFIG[event.event_type] || {
                label: event.event_type,
                icon: Activity,
                color: 'text-muted-foreground',
              };
              const Icon = config.icon;
              const eventTime = formatTimeInEST(parseISO(event.created_at));

              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  {/* Timeline connector */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      config.color.replace('text-', 'bg-')
                    )} />
                    {index < todayEvents.length - 1 && (
                      <div className="w-px h-4 bg-border mt-1" />
                    )}
                  </div>

                  {/* Time */}
                  <span className="text-xs font-mono text-muted-foreground w-20 shrink-0">
                    {eventTime}
                  </span>

                  {/* Icon and Label */}
                  <Icon className={cn('h-4 w-4 shrink-0', config.color)} />
                  <span className={cn('text-sm font-medium', config.color)}>
                    {config.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}