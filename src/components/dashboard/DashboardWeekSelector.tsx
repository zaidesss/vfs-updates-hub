import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameWeek } from 'date-fns';

interface DashboardWeekSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  className?: string;
}

export function DashboardWeekSelector({ 
  selectedDate, 
  onDateChange,
  className 
}: DashboardWeekSelectorProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const today = new Date();
  const isCurrentWeek = isSameWeek(selectedDate, today, { weekStartsOn: 1 });

  const handlePreviousWeek = () => {
    onDateChange(subWeeks(selectedDate, 1));
  };

  const handleNextWeek = () => {
    onDateChange(addWeeks(selectedDate, 1));
  };

  const handleCurrentWeek = () => {
    onDateChange(new Date());
  };

  // Format: "Jan 27 - Feb 2, 2025"
  const formatWeekRange = () => {
    const startMonth = format(weekStart, 'MMM d');
    const endMonth = format(weekEnd, 'MMM d, yyyy');
    return `${startMonth} - ${endMonth}`;
  };

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handlePreviousWeek}
        title="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <button
        onClick={handleCurrentWeek}
        className={`text-sm font-normal px-2 py-1 rounded-md transition-colors ${
          isCurrentWeek 
            ? 'text-muted-foreground cursor-default' 
            : 'text-primary hover:bg-accent cursor-pointer underline underline-offset-2'
        }`}
        disabled={isCurrentWeek}
        title={isCurrentWeek ? 'Current week' : 'Go to current week'}
      >
        {formatWeekRange()}
      </button>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleNextWeek}
        title="Next week"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
