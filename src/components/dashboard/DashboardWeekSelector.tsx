import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfWeek, endOfWeek, addWeeks, isSameWeek, differenceInWeeks } from 'date-fns';
import { usePortalClock } from '@/context/PortalClockContext';
import { ANCHOR_DATE } from '@/lib/weekConstants';

interface DashboardWeekSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  className?: string;
}

interface WeekOption {
  id: string;
  label: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
}

// ANCHOR_DATE is now imported from '@/lib/weekConstants'

export function DashboardWeekSelector({ 
  selectedDate, 
  onDateChange,
  className 
}: DashboardWeekSelectorProps) {
  const { now } = usePortalClock();

  // Generate rolling window of weeks from anchor date
  const weekOptions = useMemo(() => {
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weeksElapsed = differenceInWeeks(currentWeekStart, ANCHOR_DATE);
    
    // Show up to 10 weeks: current week + up to 9 past weeks
    const totalWeeks = Math.min(weeksElapsed + 1, 10);
    const startOffset = Math.max(0, weeksElapsed + 1 - totalWeeks);
    const numWeeks = totalWeeks;
    
    const weeks: WeekOption[] = [];

    for (let i = 0; i < numWeeks; i++) {
      const weekStart = addWeeks(ANCHOR_DATE, startOffset + i);
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const isCurrent = isSameWeek(weekStart, currentWeekStart, { weekStartsOn: 1 });
      
      weeks.push({
        id: weekStart.toISOString(),
        label: `${format(weekStart, 'MM/dd')} - ${format(weekEnd, 'MM/dd')}`,
        startDate: weekStart,
        endDate: weekEnd,
        isCurrent,
      });
    }

    return weeks;
  }, [now.toDateString()]);

  // Find the currently selected week's ID
  const selectedWeekId = useMemo(() => {
    const found = weekOptions.find(week => 
      isSameWeek(week.startDate, selectedDate, { weekStartsOn: 1 })
    );
    if (found) return found.id;
    // Default to current week
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const currentWeek = weekOptions.find(w => isSameWeek(w.startDate, currentWeekStart, { weekStartsOn: 1 }));
    return currentWeek?.id || weekOptions[weekOptions.length - 1]?.id;
  }, [selectedDate, weekOptions]);

  const handleValueChange = (value: string) => {
    const selectedWeek = weekOptions.find(w => w.id === value);
    if (selectedWeek) {
      onDateChange(selectedWeek.startDate);
    }
  };

  return (
    <Select value={selectedWeekId} onValueChange={handleValueChange}>
      <SelectTrigger className={`w-[180px] ${className || ''}`}>
        <SelectValue placeholder="Select week" />
      </SelectTrigger>
      <SelectContent className="bg-popover z-50">
        {weekOptions.map((week) => (
          <SelectItem 
            key={week.id} 
            value={week.id}
            className={week.isCurrent ? 'font-medium text-primary' : ''}
          >
            {week.label}
            {week.isCurrent && ' ✓'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
