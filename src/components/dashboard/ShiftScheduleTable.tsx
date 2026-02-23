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
import { CalendarDays, AlertTriangle, Clock, Coffee } from 'lucide-react';
import type { DashboardProfile, DayAttendance, AttendanceStatus } from '@/lib/agentDashboardApi';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import type { EffectiveDaySchedule } from '@/lib/scheduleResolver';

interface ShiftScheduleTableProps {
  profile: DashboardProfile;
  attendance: DayAttendance[];
  weekStart: Date;
  weekEnd: Date;
  weekSelector?: React.ReactNode;
  effectiveWeekSchedules?: EffectiveDaySchedule[];
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

function getStatusBadges(dayAttendance: DayAttendance | undefined): React.ReactNode {
  if (!dayAttendance) {
    return <Badge variant="secondary" className="bg-muted text-muted-foreground">Pending</Badge>;
  }

  const { status, leaveType, loginTime, logoutTime, isEarlyOut, noLogout } = dayAttendance;
  const badges: React.ReactNode[] = [];

  // Login status badge
  switch (status) {
    case 'present':
      badges.push(
        <Badge key="present" className="bg-primary hover:bg-primary/90 text-primary-foreground">
          Present {loginTime && `(${loginTime})`}
        </Badge>
      );
      break;
    case 'late':
      badges.push(
        <Badge key="late" variant="secondary" className="bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700">
          Late {loginTime && `(${loginTime})`}
        </Badge>
      );
      break;
    case 'absent':
      if (dayAttendance.isNcns) {
        badges.push(
          <Badge key="absent-ncns" className="bg-red-800 hover:bg-red-900 text-white dark:bg-red-900 dark:hover:bg-red-950">
            Absent (NCNS)
          </Badge>
        );
      } else {
        badges.push(
          <Badge key="absent" variant="destructive">
            Absent
          </Badge>
        );
      }
      break;
    case 'on_leave':
      badges.push(
        <Badge key="leave" variant="secondary" className="bg-accent text-accent-foreground">
          {leaveType || 'On Leave'}
        </Badge>
      );
      break;
    case 'day_off':
      badges.push(
        <Badge key="off" variant="secondary" className="bg-muted text-muted-foreground">
          Off
        </Badge>
      );
      // Show OT Scheduled badge if there's an OT schedule on a day off
      if (dayAttendance.otSchedule) {
        badges.push(
          <Badge key="ot-scheduled" variant="secondary" className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border border-violet-300 dark:border-violet-700">
            OT: {dayAttendance.otSchedule}
          </Badge>
        );
      }
      break;
    case 'pending':
    default:
      badges.push(
        <Badge key="pending" variant="secondary" className="bg-muted/50 text-muted-foreground opacity-60">
          Pending
        </Badge>
      );
      break;
  }

  // Logout badge or warnings
  if (logoutTime) {
    if (isEarlyOut) {
      // Early out - show in red/orange
      badges.push(
        <Badge key="early-out" variant="destructive" className="bg-red-500 hover:bg-red-600 text-white">
          Early Out ({logoutTime})
        </Badge>
      );
    } else {
      // Normal logout
      badges.push(
        <Badge key="logout" variant="secondary" className="bg-muted text-muted-foreground">
          Logged Out ({logoutTime})
        </Badge>
      );
    }
  } else if (noLogout) {
    // No logout warning for past days
    badges.push(
      <Badge key="no-logout" variant="secondary" className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700">
        <AlertTriangle className="h-3 w-3 mr-1" />
        No Logout
      </Badge>
    );
  }

  // OT badges
  if (dayAttendance.otStatus || dayAttendance.otSchedule) {
    const { otStatus, otLoginTime, otLogoutTime, otSchedule } = dayAttendance;
    
    switch (otStatus) {
      case 'present_ot':
        badges.push(
          <Badge key="present-ot" className="bg-green-600 hover:bg-green-700 text-white">
            Present OT {otLoginTime && `(${otLoginTime})`}
          </Badge>
        );
        break;
      case 'late_ot':
        badges.push(
          <Badge key="late-ot" variant="secondary" className="bg-amber-500 hover:bg-amber-600 text-white">
            Late OT {otLoginTime && `(${otLoginTime})`}
          </Badge>
        );
        break;
      case 'absent_ot':
        badges.push(
          <Badge key="absent-ot" variant="destructive" className="bg-red-500 hover:bg-red-600 text-white">
            Absent OT
          </Badge>
        );
        break;
      case 'pending_ot':
        if (otSchedule) {
          badges.push(
            <Badge key="pending-ot" variant="secondary" className="bg-muted/50 text-muted-foreground opacity-60">
              OT Scheduled
            </Badge>
          );
        }
        break;
    }
    
    // OT Logout badge
    if (otLogoutTime && (otStatus === 'present_ot' || otStatus === 'late_ot')) {
      badges.push(
        <Badge key="ot-out" variant="secondary" className="bg-muted text-muted-foreground">
          OT Out ({otLogoutTime})
        </Badge>
      );
    }
  }

  return <div className="flex flex-wrap gap-1">{badges}</div>;
}

export function ShiftScheduleTable({ profile, attendance, weekStart, weekEnd, weekSelector, effectiveWeekSchedules }: ShiftScheduleTableProps) {
  const dayOffArray = profile.day_off || [];
  
  const getScheduleForDay = (dayKey: string, dayShort: string): string => {
    // Use effective schedule if available
    const effectiveDay = effectiveWeekSchedules?.find(d => d.dayName.substring(0, 3) === dayShort);
    if (effectiveDay) {
      if (effectiveDay.isDayOff) return 'Day Off';
      return effectiveDay.schedule || '-';
    }
    
    // Fallback to profile data
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
    const effectiveDay = effectiveWeekSchedules?.find(d => d.dayName.substring(0, 3) === dayShort);
    if (effectiveDay) return effectiveDay.isDayOff;
    return dayOffArray.includes(dayShort);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Shift Schedule
          </CardTitle>
          {weekSelector}
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px] md:w-[120px]">Day</TableHead>
              <TableHead className="hidden sm:table-cell">Schedule</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px] text-right">
                <span className="hidden sm:inline">Hours</span>
                <Clock className="h-4 w-4 sm:hidden inline" />
              </TableHead>
              <TableHead className="w-[100px] text-right">
                <span className="hidden sm:inline">Break</span>
                <Coffee className="h-4 w-4 sm:hidden inline" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DAYS.map((day, index) => {
              const isOff = isDayOff(day.short);
              const schedule = getScheduleForDay(day.key, day.short);
              
              // Primary match: compute the actual date for this row and match by date string
              const dayDate = new Date(weekStart);
              dayDate.setDate(weekStart.getDate() + index);
              const y = dayDate.getFullYear();
              const m = String(dayDate.getMonth() + 1).padStart(2, '0');
              const dd = String(dayDate.getDate()).padStart(2, '0');
              const dateStr = `${y}-${m}-${dd}`;
              
              // Fallback: also try matching by short day name for safety
              const dayAttendance = attendance.find((a) => a.dayKey === dateStr)
                || attendance.find((a) => {
                  if (!a.dayKey) return false;
                  // If dayKey looks like a date, derive the short day name
                  const parsed = new Date(a.dayKey + 'T00:00:00');
                  if (isNaN(parsed.getTime())) return a.dayKey === day.key;
                  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                  return names[parsed.getDay()] === day.short;
                });
              
              return (
                <TableRow key={day.key} className={isOff ? 'bg-muted/50' : ''}>
                  <TableCell className="font-medium">
                    <span className="hidden md:inline">{day.label}</span>
                    <span className="md:hidden">{day.short}</span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{schedule}</TableCell>
                  <TableCell>
                    {getStatusBadges(dayAttendance)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {dayAttendance?.hoursWorked || '-'}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {renderBreakCell(dayAttendance)}
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

/**
 * Render break tracking cell with color-coded status
 */
function renderBreakCell(dayAttendance: DayAttendance | undefined): React.ReactNode {
  if (!dayAttendance || dayAttendance.status === 'day_off' || dayAttendance.status === 'on_leave' || dayAttendance.status === 'absent' || dayAttendance.status === 'pending') {
    return <span className="text-muted-foreground">-</span>;
  }

  const { breakDuration, allowedBreak, isOverbreak, breakOverageMinutes } = dayAttendance;

  if (!breakDuration && !allowedBreak) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (!breakDuration) {
    return <span className="text-muted-foreground">0m / {allowedBreak}</span>;
  }

  if (isOverbreak) {
    return (
      <span className="text-red-600 dark:text-red-400 font-medium">
        {breakDuration} / {allowedBreak || '-'} 
        <span className="text-xs ml-1">⚠️ +{breakOverageMinutes}m</span>
      </span>
    );
  }

  return (
    <span className="text-green-600 dark:text-green-400">
      {breakDuration} / {allowedBreak || '-'} ✓
    </span>
  );
}
