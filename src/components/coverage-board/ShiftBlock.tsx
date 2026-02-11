import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type ShiftBlockType = 'regular' | 'ot' | 'dayoff' | 'outage' | 'override';

interface ShiftBlockProps {
  startHour: number; // decimal hours e.g. 9.5 = 9:30 AM
  endHour: number;
  type: ShiftBlockType;
  agentName: string;
  startLabel: string;
  endLabel: string;
  supportType?: string;
  isOverridden?: boolean;
  outageReason?: string;
}

const TYPE_STYLES: Record<ShiftBlockType, string> = {
  regular: 'bg-blue-500/80 border-blue-600',
  ot: 'bg-violet-500/80 border-violet-600',
  dayoff: 'bg-muted/40 border-dashed border-muted-foreground/30',
  outage: 'bg-red-500/30 border-red-500 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(239,68,68,0.15)_4px,rgba(239,68,68,0.15)_8px)]',
  override: 'bg-amber-500/70 border-amber-600',
};

// Convert decimal hour to percentage position in the 24-hour grid
function hourToPercent(hour: number): number {
  return (hour / 24) * 100;
}

export function parseTimeToDecimal(timeStr: string): number | null {
  if (!timeStr || timeStr.toLowerCase() === 'day off') return null;
  
  // Handle formats like "9:00 AM", "5:30 PM", "09:00", "17:30"
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();
  
  if (period) {
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
  }
  
  return hours + minutes / 60;
}

export function parseScheduleRange(schedule: string): { start: number; end: number } | null {
  if (!schedule || schedule.toLowerCase() === 'day off') return null;
  
  // Handle "9:00 AM - 5:30 PM" or "09:00 - 17:30"
  const parts = schedule.split(/\s*[-–]\s*/);
  if (parts.length !== 2) return null;
  
  const start = parseTimeToDecimal(parts[0].trim());
  const end = parseTimeToDecimal(parts[1].trim());
  
  if (start === null || end === null) return null;
  return { start, end };
}

export function ShiftBlock({
  startHour,
  endHour,
  type,
  agentName,
  startLabel,
  endLabel,
  supportType,
  isOverridden,
  outageReason,
}: ShiftBlockProps) {
  const left = hourToPercent(startHour);
  const width = hourToPercent(endHour - startHour);

  if (width <= 0) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'absolute top-1 bottom-1 rounded border text-[10px] text-white font-medium flex items-center justify-center overflow-hidden cursor-default select-none transition-opacity hover:opacity-90',
            TYPE_STYLES[type]
          )}
          style={{
            left: `${left}%`,
            width: `${width}%`,
            minWidth: '2px',
          }}
        >
          {width > 4 && (
            <span className="truncate px-1">
              {type === 'dayoff' ? 'OFF' : type === 'outage' ? 'OUT' : `${startLabel} - ${endLabel}`}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs space-y-1 max-w-[200px]">
        <p className="font-semibold">{agentName}</p>
        <p>{startLabel} – {endLabel}</p>
        {supportType && <p className="text-muted-foreground">{supportType}</p>}
        {isOverridden && <p className="text-amber-400 font-medium">⚡ Overridden</p>}
        {outageReason && <p className="text-red-400">{outageReason}</p>}
      </TooltipContent>
    </Tooltip>
  );
}
