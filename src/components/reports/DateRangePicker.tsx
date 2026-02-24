import { useState } from 'react';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

interface DateRangePickerProps {
  period: 'weekly' | 'monthly';
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangePicker({ period, value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const navigatePrevious = () => {
    const newStart = subWeeks(value.start, 1);
    const newEnd = endOfWeek(newStart, { weekStartsOn: 1 });
    onChange({
      start: startOfWeek(newStart, { weekStartsOn: 1 }),
      end: newEnd,
      label: formatRangeLabel(startOfWeek(newStart, { weekStartsOn: 1 }), newEnd),
    });
  };

  const navigateNext = () => {
    const now = new Date();
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    if (value.start >= currentWeekStart) return;
    
    const newStart = new Date(value.start);
    newStart.setDate(newStart.getDate() + 7);
    const newEnd = endOfWeek(newStart, { weekStartsOn: 1 });
    onChange({
      start: startOfWeek(newStart, { weekStartsOn: 1 }),
      end: newEnd,
      label: formatRangeLabel(startOfWeek(newStart, { weekStartsOn: 1 }), newEnd),
    });
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = endOfWeek(date, { weekStartsOn: 1 });
    onChange({ start, end, label: formatRangeLabel(start, end) });
    setOpen(false);
  };

  const isCurrentPeriod = () => {
    const now = new Date();
    return value.start.getTime() === startOfWeek(now, { weekStartsOn: 1 }).getTime();
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={navigatePrevious}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("min-w-[200px] justify-start text-left font-normal")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value.label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value.start}
            onSelect={handleDateSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <Button 
        variant="outline" 
        size="icon" 
        onClick={navigateNext}
        disabled={isCurrentPeriod()}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function formatRangeLabel(start: Date, end: Date): string {
  return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
}

export function getDefaultDateRange(): DateRange {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 });
  const end = endOfWeek(now, { weekStartsOn: 1 });
  return { start, end, label: formatRangeLabel(start, end) };
}