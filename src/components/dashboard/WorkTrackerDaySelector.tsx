import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { format, addDays, isSameDay, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';

interface WorkTrackerDaySelectorProps {
  weekStart: Date;
  selectedDay: Date;
  onDayChange: (date: Date) => void;
}

const DAY_ABBREVIATIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Get current date in EST timezone
 */
function getTodayInEST(): Date {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
}

/**
 * Day selector pills for the Work Tracker component
 * Shows Mon-Sun, with future days disabled for current week
 */
export function WorkTrackerDaySelector({
  weekStart,
  selectedDay,
  onDayChange,
}: WorkTrackerDaySelectorProps) {
  const todayEST = getTodayInEST();

  // Generate all 7 days of the week
  const days = useMemo(() => {
    return DAY_ABBREVIATIONS.map((abbr, index) => {
      const date = addDays(weekStart, index);
      // Day is selectable if it's today or in the past
      const isSelectable = !isAfter(date, todayEST) || isSameDay(date, todayEST);
      const isSelected = isSameDay(date, selectedDay);

      return {
        abbr,
        date,
        isSelectable,
        isSelected,
        dateStr: format(date, 'yyyy-MM-dd'),
      };
    });
  }, [weekStart, selectedDay, todayEST.toDateString()]);

  return (
    <div className="flex items-center gap-1">
      {days.map((day) => (
        <Button
          key={day.dateStr}
          variant={day.isSelected ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onDayChange(day.date)}
          disabled={!day.isSelectable}
          className={cn(
            'h-7 px-2 text-xs font-medium',
            day.isSelected && 'bg-primary text-primary-foreground',
            !day.isSelectable && 'opacity-40 cursor-not-allowed'
          )}
          title={format(day.date, 'EEEE, MMM d')}
        >
          {day.abbr}
        </Button>
      ))}
    </div>
  );
}
