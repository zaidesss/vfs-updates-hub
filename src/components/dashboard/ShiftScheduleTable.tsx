import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CalendarDays } from 'lucide-react';
import type { DashboardProfile, DayAttendance, AttendanceStatus } from '@/lib/agentDashboardApi';
import { format, startOfWeek, endOfWeek } from 'date-fns';

interface ShiftScheduleTableProps {
  profile: DashboardProfile;
  attendance: DayAttendance[];
}

const DAYS = [
  { key: 'mon', label: 'Monday', short: 'Mon' },
  { key: 'tue', label: 'Tuesday', short: 'Tue' },
  { key: 'wed', label: 'Wednesday', short: 'Wed' },
  { key: 'thu', label: 'Thursday', short: 'Thu' },
  { key: 'fri', label: 'Friday', short: 'Fri' },
  { key: 'sat', label: 'Saturday', short: 'Sat' },
  { key: 'sun', label: 'Sunday', short: 'Sun' },
] as const;

function getStatusBadge(dayAttendance: DayAttendance | undefined): React.ReactNode {
  if (!dayAttendance) {
    return <Badge variant="secondary" className="bg-muted text-muted-foreground">Pending</Badge>;
  }

  const { status, leaveType, loginTime, logoutTime } = dayAttendance;

  const logoutBadge = logoutTime ? (
    <Badge variant="secondary" className="bg-muted text-muted-foreground">
      Logged Out ({logoutTime})
    </Badge>
  ) : null;

  switch (status) {
    case 'present':
      return (
        <div className="flex flex-wrap gap-1">
          <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Present {loginTime && `(${loginTime})`}
          </Badge>
          {logoutBadge}
        </div>
      );
    case 'late':
      return (
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700">
            Late {loginTime && `(${loginTime})`}
          </Badge>
          {logoutBadge}
        </div>
      );
    case 'absent':
      return (
        <Badge variant="destructive">
          Absent
        </Badge>
      );
    case 'on_leave':
      return (
        <Badge variant="secondary" className="bg-accent text-accent-foreground">
          {leaveType || 'On Leave'}
        </Badge>
      );
    case 'day_off':
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
          Off
        </Badge>
      );
    case 'pending':
    default:
      return (
        <Badge variant="secondary" className="bg-muted/50 text-muted-foreground opacity-60">
          Pending
        </Badge>
      );
  }
}

export function ShiftScheduleTable({ profile, attendance }: ShiftScheduleTableProps) {
  const dayOffArray = profile.day_off || [];
  
  const getScheduleForDay = (dayKey: string, dayShort: string): string => {
    // Check if it's a day off
    if (dayOffArray.includes(dayShort)) {
      return 'Day Off';
    }
    
    // Check specific day schedule first
    const specificSchedule = profile[`${dayKey}_schedule` as keyof DashboardProfile] as string | null;
    if (specificSchedule) {
      return specificSchedule;
    }
    
    // Fall back to weekday/weekend schedule
    if (['sat', 'sun'].includes(dayKey)) {
      return profile.weekend_schedule || '-';
    }
    return profile.weekday_schedule || '-';
  };

  const isDayOff = (dayShort: string): boolean => {
    return dayOffArray.includes(dayShort);
  };

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Shift Schedule
          <span className="text-sm font-normal text-muted-foreground ml-2">
            ({format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Day</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead className="w-[150px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DAYS.map((day) => {
              const isOff = isDayOff(day.short);
              const schedule = getScheduleForDay(day.key, day.short);
              const dayAttendance = attendance.find((a) => a.dayKey === day.key);
              
              return (
                <TableRow key={day.key} className={isOff ? 'bg-muted/50' : ''}>
                  <TableCell className="font-medium">{day.label}</TableCell>
                  <TableCell>{schedule}</TableCell>
                  <TableCell>
                    {getStatusBadge(dayAttendance)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
