import * as React from "react";
import { format, parse, isValid, getDaysInMonth } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DatePickerProps {
  value?: string; // ISO date string (yyyy-MM-dd) or empty string
  onChange: (value: string) => void; // Returns ISO date string or empty string
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  minYear?: number;
  maxYear?: number;
}

const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  className,
  id,
  minYear = 1920,
  maxYear = new Date().getFullYear() + 10,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Parse the ISO date string to components
  const parsedDate = React.useMemo(() => {
    if (!value) return { month: "", day: "", year: "" };
    const parsed = parse(value, "yyyy-MM-dd", new Date());
    if (!isValid(parsed)) return { month: "", day: "", year: "" };
    return {
      month: String(parsed.getMonth() + 1).padStart(2, "0"),
      day: String(parsed.getDate()).padStart(2, "0"),
      year: String(parsed.getFullYear()),
    };
  }, [value]);

  const [selectedMonth, setSelectedMonth] = React.useState(parsedDate.month);
  const [selectedDay, setSelectedDay] = React.useState(parsedDate.day);
  const [selectedYear, setSelectedYear] = React.useState(parsedDate.year);

  // Update local state when value changes externally
  React.useEffect(() => {
    setSelectedMonth(parsedDate.month);
    setSelectedDay(parsedDate.day);
    setSelectedYear(parsedDate.year);
  }, [parsedDate.month, parsedDate.day, parsedDate.year]);

  // Generate years array (descending for easier selection of past dates)
  const years = React.useMemo(() => {
    const arr = [];
    for (let y = maxYear; y >= minYear; y--) {
      arr.push(String(y));
    }
    return arr;
  }, [minYear, maxYear]);

  // Generate days array based on selected month and year
  const days = React.useMemo(() => {
    const month = parseInt(selectedMonth, 10);
    const year = parseInt(selectedYear, 10) || new Date().getFullYear();
    const daysInMonth = month ? getDaysInMonth(new Date(year, month - 1)) : 31;
    const arr = [];
    for (let d = 1; d <= daysInMonth; d++) {
      arr.push(String(d).padStart(2, "0"));
    }
    return arr;
  }, [selectedMonth, selectedYear]);

  // Update the value when all three are selected
  const updateValue = (month: string, day: string, year: string) => {
    if (month && day && year) {
      // Validate the day is within range for the month
      const daysInMonth = getDaysInMonth(new Date(parseInt(year), parseInt(month) - 1));
      const validDay = Math.min(parseInt(day), daysInMonth);
      const isoDate = `${year}-${month}-${String(validDay).padStart(2, "0")}`;
      onChange(isoDate);
    }
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    updateValue(month, selectedDay, selectedYear);
  };

  const handleDayChange = (day: string) => {
    setSelectedDay(day);
    updateValue(selectedMonth, day, selectedYear);
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    updateValue(selectedMonth, selectedDay, year);
  };

  const handleClear = () => {
    setSelectedMonth("");
    setSelectedDay("");
    setSelectedYear("");
    onChange("");
    setOpen(false);
  };

  // Format display value
  const displayValue = React.useMemo(() => {
    if (!value) return null;
    const parsed = parse(value, "yyyy-MM-dd", new Date());
    if (!isValid(parsed)) return null;
    return format(parsed, "MM/dd/yyyy");
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !displayValue && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayValue ? displayValue : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4 bg-popover border shadow-lg z-50" align="start">
        <div className="space-y-4">
          <div className="flex gap-2">
            {/* Month Dropdown */}
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Month</label>
              <Select value={selectedMonth} onValueChange={handleMonthChange}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-[100]">
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Day Dropdown */}
            <div className="w-20">
              <label className="text-xs text-muted-foreground mb-1 block">Day</label>
              <Select value={selectedDay} onValueChange={handleDayChange}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-[100] max-h-[200px]">
                  {days.map((d) => (
                    <SelectItem key={d} value={d}>
                      {parseInt(d, 10)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Dropdown */}
            <div className="w-24">
              <label className="text-xs text-muted-foreground mb-1 block">Year</label>
              <Select value={selectedYear} onValueChange={handleYearChange}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-[100] max-h-[200px]">
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={handleClear}>
              Clear
            </Button>
            <Button size="sm" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Utility function to format date strings for display (use across the app)
export function formatDisplayDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (!isValid(date)) return "-";
    return format(date, "MM/dd/yyyy");
  } catch {
    return "-";
  }
}

// Utility function to format datetime strings for display
export function formatDisplayDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (!isValid(date)) return "-";
    return format(date, "MM/dd/yyyy h:mm a");
  } catch {
    return "-";
  }
}
