import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfWeek, endOfWeek, addWeeks, isSameWeek } from 'date-fns';

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

export function DashboardWeekSelector({ 
  selectedDate, 
  onDateChange,
  className 
}: DashboardWeekSelectorProps) {
  const today = new Date();

  // Generate 10 weeks: 5 past, current, 4 future
  const weekOptions = useMemo(() => {
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weeks: WeekOption[] = [];

    for (let i = -5; i <= 4; i++) {
      const weekStart = addWeeks(currentWeekStart, i);
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekNumber = i + 6; // Week 1-10 (current = Week 6)
      
      weeks.push({
        id: weekStart.toISOString(),
        label: `Week ${weekNumber} (${format(weekStart, 'MM/dd')} - ${format(weekEnd, 'MM/dd')})`,
        startDate: weekStart,
        endDate: weekEnd,
        isCurrent: i === 0,
      });
    }

    return weeks;
  }, [today.toDateString()]);

  // Find the currently selected week's ID
  const selectedWeekId = useMemo(() => {
    const found = weekOptions.find(week => 
      isSameWeek(week.startDate, selectedDate, { weekStartsOn: 1 })
    );
    return found?.id || weekOptions.find(w => w.isCurrent)?.id || weekOptions[5]?.id;
  }, [selectedDate, weekOptions]);

  const handleValueChange = (value: string) => {
    const selectedWeek = weekOptions.find(w => w.id === value);
    if (selectedWeek) {
      onDateChange(selectedWeek.startDate);
    }
  };

  return (
    <Select value={selectedWeekId} onValueChange={handleValueChange}>
      <SelectTrigger className={`w-[220px] ${className || ''}`}>
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
