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
import type { DashboardProfile } from '@/lib/agentDashboardApi';

interface ShiftScheduleTableProps {
  profile: DashboardProfile;
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

export function ShiftScheduleTable({ profile }: ShiftScheduleTableProps) {
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Shift Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Day</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DAYS.map((day) => {
              const isOff = isDayOff(day.short);
              const schedule = getScheduleForDay(day.key, day.short);
              
              return (
                <TableRow key={day.key} className={isOff ? 'bg-muted/50' : ''}>
                  <TableCell className="font-medium">{day.label}</TableCell>
                  <TableCell>{schedule}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={isOff ? 'secondary' : 'default'}
                      className={isOff ? 'bg-muted text-muted-foreground' : ''}
                    >
                      {isOff ? 'Off' : 'Working'}
                    </Badge>
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
