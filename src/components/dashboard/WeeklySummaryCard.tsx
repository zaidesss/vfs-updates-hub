import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Clock, 
  AlertTriangle, 
  LogOut, 
  Coffee,
  Calendar,
  TrendingUp,
  RotateCcw,
  Timer
} from 'lucide-react';
import type { DayAttendance, ProfileEvent } from '@/lib/agentDashboardApi';
import { formatDurationFromMinutes } from '@/lib/agentDashboardApi';
import { format, startOfWeek, endOfWeek, parseISO, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

interface WeeklySummaryCardProps {
  attendance: DayAttendance[];
  allEvents?: ProfileEvent[];
  className?: string;
}

interface SummaryMetric {
  label: string;
  value: string | number;
  icon: typeof Clock;
  color: string;
  subtext?: string;
}

export function WeeklySummaryCard({ attendance, allEvents = [], className }: WeeklySummaryCardProps) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  // Calculate metrics
  const workingDays = attendance.filter(
    (a) => a.status !== 'day_off' && a.status !== 'on_leave' && a.status !== 'pending'
  );
  
  const daysWorked = attendance.filter(
    (a) => a.status === 'present' || a.status === 'late'
  ).length;

  const totalHoursWorkedMinutes = attendance.reduce(
    (sum, a) => sum + (a.hoursWorkedMinutes || 0),
    0
  );

  const lateDays = attendance.filter((a) => a.status === 'late').length;
  const earlyOuts = attendance.filter((a) => a.isEarlyOut).length;
  const noLogoutDays = attendance.filter((a) => a.noLogout).length;

  // Break variance calculation
  const totalBreakTaken = attendance.reduce(
    (sum, a) => sum + (a.breakDurationMinutes || 0),
    0
  );
  const totalBreakAllowed = attendance.reduce(
    (sum, a) => sum + (a.allowedBreakMinutes || 0),
    0
  );
  const breakVariance = totalBreakTaken - totalBreakAllowed;

  // Device restart count (type assertion since DEVICE_RESTART_START will be added in migration)
  const deviceRestarts = allEvents.filter(
    (e) => (e.event_type as string) === 'DEVICE_RESTART_START'
  ).length;

  // OT metrics
  const otEvents = allEvents.filter(
    (e) => e.event_type === 'OT_LOGIN' || e.event_type === 'OT_LOGOUT'
  );
  const otLoginCount = allEvents.filter(e => e.event_type === 'OT_LOGIN').length;
  const totalOTWorkedMinutes = attendance.reduce(
    (sum, a) => sum + (a.otHoursWorkedMinutes || 0),
    0
  );

  const metrics: SummaryMetric[] = [
    {
      label: 'Days Worked',
      value: `${daysWorked}/${workingDays.length}`,
      icon: Calendar,
      color: 'text-primary',
    },
    {
      label: 'Total Hours',
      value: formatDurationFromMinutes(totalHoursWorkedMinutes),
      icon: Clock,
      color: 'text-green-600 dark:text-green-400',
    },
    {
      label: 'Late Days',
      value: lateDays,
      icon: AlertTriangle,
      color: lateDays > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
    },
    {
      label: 'Early Outs',
      value: earlyOuts,
      icon: LogOut,
      color: earlyOuts > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
    },
    {
      label: 'No Logout',
      value: noLogoutDays,
      icon: AlertTriangle,
      color: noLogoutDays > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
    },
    {
      label: 'Break Variance',
      value: breakVariance === 0 ? 'On track' : `${breakVariance > 0 ? '+' : ''}${breakVariance}m`,
      icon: Coffee,
      color: breakVariance > 0 ? 'text-red-600 dark:text-red-400' : breakVariance < 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground',
      subtext: breakVariance > 0 ? 'over' : breakVariance < 0 ? 'under' : undefined,
    },
  ];

  // Only add device restarts if there are any
  if (deviceRestarts > 0) {
    metrics.push({
      label: 'Device Restarts',
      value: deviceRestarts,
      icon: RotateCcw,
      color: 'text-orange-600 dark:text-orange-400',
    });
  }

  // Add OT Hours if there are any OT sessions
  if (otLoginCount > 0 || totalOTWorkedMinutes > 0) {
    metrics.push({
      label: 'OT Hours',
      value: formatDurationFromMinutes(totalOTWorkedMinutes),
      icon: Timer,
      color: 'text-blue-600 dark:text-blue-400',
      subtext: otLoginCount > 0 ? `${otLoginCount} session${otLoginCount > 1 ? 's' : ''}` : undefined,
    });
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Weekly Summary
          <span className="text-sm font-normal text-muted-foreground ml-2">
            ({format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div
                key={index}
                className="flex flex-col gap-1 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn('h-4 w-4', metric.color)} />
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={cn('text-lg font-semibold', metric.color)}>
                    {metric.value}
                  </span>
                  {metric.subtext && (
                    <span className="text-xs text-muted-foreground">{metric.subtext}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}