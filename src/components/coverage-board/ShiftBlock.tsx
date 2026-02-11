import { useState, useCallback, useRef, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { TOTAL_HOUR_COLS, HOURS_PER_DAY } from '@/lib/coverageBoardApi';

export type ShiftBlockType = 'regular' | 'ot' | 'dayoff' | 'outage' | 'override' | 'empty';

interface ShiftBlockProps {
  dayOffset: number;
  startHour: number;
  endHour: number;
  type: ShiftBlockType;
  agentName: string;
  startLabel: string;
  endLabel: string;
  supportType?: string;
  isOverridden?: boolean;
  outageReason?: string;
  hasConflict?: boolean;
  conflictDay?: string;
  editMode?: boolean;
  timelineWidth?: number;
  onBlockAdjust?: (newStartHour: number, newEndHour: number) => void;
}

export const POSITION_COLORS: Record<string, string> = {
  'Hybrid Support': 'bg-blue-500/80 border-blue-600',
  'Email Support': 'bg-emerald-500/80 border-emerald-600',
  'Phone Support': 'bg-orange-500/80 border-orange-600',
  'Chat Support': 'bg-cyan-500/80 border-cyan-600',
  'Logistics': 'bg-indigo-500/80 border-indigo-600',
};
const POSITION_FALLBACK = 'bg-slate-500/80 border-slate-600';

const TYPE_STYLES: Record<ShiftBlockType, string> = {
  regular: '',
  ot: 'bg-violet-500/80 border-violet-600',
  dayoff: 'bg-zinc-500/50 border-zinc-500/60',
  outage: 'bg-red-500/30 border-red-500 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(239,68,68,0.15)_4px,rgba(239,68,68,0.15)_8px)]',
  override: 'bg-amber-500/70 border-amber-600',
  empty: 'bg-zinc-700/70 border-zinc-600/50',
};

// ── Utilities ──────────────────────────────────────────────────────────────

export function snapToHalfHour(hours: number): number {
  return Math.round(hours * 2) / 2;
}

export function decimalToTimeLabel(hours: number): string {
  const clamped = Math.max(0, Math.min(24, hours));
  const h = Math.floor(clamped);
  const m = Math.round((clamped - h) * 60);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

function toPercent(dayOffset: number, hour: number): number {
  return ((dayOffset * HOURS_PER_DAY + hour) / TOTAL_HOUR_COLS) * 100;
}

export function parseTimeToDecimal(timeStr: string): number | null {
  if (!timeStr || timeStr.toLowerCase() === 'day off') return null;
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
  const parts = schedule.split(/\s*[-–]\s*/);
  if (parts.length !== 2) return null;
  const start = parseTimeToDecimal(parts[0].trim());
  const end = parseTimeToDecimal(parts[1].trim());
  if (start === null || end === null) return null;
  return { start, end };
}

const EDGE_PX = 6;
const MIN_DURATION = 0.5; // 30 minutes

export function ShiftBlock({
  dayOffset,
  startHour,
  endHour,
  type,
  agentName,
  startLabel,
  endLabel,
  supportType,
  isOverridden,
  outageReason,
  hasConflict,
  conflictDay,
  editMode = false,
  timelineWidth = 0,
  onBlockAdjust,
}: ShiftBlockProps) {
  const isInteractive = editMode && type !== 'empty' && onBlockAdjust && timelineWidth > 0;

  // Drag/resize state
  const [dragState, setDragState] = useState<{
    mode: 'drag' | 'resize-left' | 'resize-right';
    startX: number;
    origStart: number;
    origEnd: number;
    deltaHours: number;
  } | null>(null);

  const blockRef = useRef<HTMLDivElement>(null);

  // Compute hours per pixel for the timeline
  const hoursPerPx = timelineWidth > 0 ? TOTAL_HOUR_COLS / timelineWidth : 0;

  // Effective start/end during drag
  const effectiveStart = dragState
    ? (() => {
        const { mode, origStart, origEnd, deltaHours } = dragState;
        const maxEnd = dayOffset >= 6 ? HOURS_PER_DAY : HOURS_PER_DAY * 2;
        if (mode === 'drag') return Math.max(0, Math.min(maxEnd - (origEnd - origStart), snapToHalfHour(origStart + deltaHours)));
        if (mode === 'resize-left') return Math.max(0, Math.min(origEnd - MIN_DURATION, snapToHalfHour(origStart + deltaHours)));
        return origStart;
      })()
    : startHour;

  const effectiveEnd = dragState
    ? (() => {
        const { mode, origStart, origEnd, deltaHours } = dragState;
        const maxEnd = dayOffset >= 6 ? HOURS_PER_DAY : HOURS_PER_DAY * 2;
        if (mode === 'drag') {
          const newStart = Math.max(0, Math.min(maxEnd - (origEnd - origStart), snapToHalfHour(origStart + deltaHours)));
          return newStart + (origEnd - origStart);
        }
        if (mode === 'resize-right') return Math.max(origStart + MIN_DURATION, Math.min(maxEnd, snapToHalfHour(origEnd + deltaHours)));
        return origEnd;
      })()
    : endHour;

  const left = toPercent(dayOffset, effectiveStart);
  const width = toPercent(0, effectiveEnd - effectiveStart);

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isInteractive || !blockRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      const rect = blockRef.current.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const isLeftEdge = relX <= EDGE_PX;
      const isRightEdge = relX >= rect.width - EDGE_PX;

      let mode: 'drag' | 'resize-left' | 'resize-right' = 'drag';
      if (isLeftEdge) mode = 'resize-left';
      else if (isRightEdge) mode = 'resize-right';

      setDragState({
        mode,
        startX: e.clientX,
        origStart: startHour,
        origEnd: endHour,
        deltaHours: 0,
      });
    },
    [isInteractive, startHour, endHour]
  );

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const pxDelta = e.clientX - dragState.startX;
      const hoursDelta = pxDelta * hoursPerPx;
      setDragState(prev => prev ? { ...prev, deltaHours: hoursDelta } : null);
    };

    const handleMouseUp = () => {
      if (dragState && onBlockAdjust) {
        const snappedStart = snapToHalfHour(effectiveStart);
        const snappedEnd = snapToHalfHour(effectiveEnd);
        // Only fire if there was actual movement
        if (snappedStart !== startHour || snappedEnd !== endHour) {
          onBlockAdjust(snappedStart, snappedEnd);
        }
      }
      setDragState(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, hoursPerPx, effectiveStart, effectiveEnd, startHour, endHour, onBlockAdjust]);

  // Cursor logic for edit mode
  const handleMouseMoveLocal = useCallback(
    (e: React.MouseEvent) => {
      if (!isInteractive || !blockRef.current || dragState) return;
      const rect = blockRef.current.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      if (relX <= EDGE_PX || relX >= rect.width - EDGE_PX) {
        blockRef.current.style.cursor = 'col-resize';
      } else {
        blockRef.current.style.cursor = 'grab';
      }
    },
    [isInteractive, dragState]
  );

  if (width <= 0) return null;

  const isDragging = !!dragState;
  const hasVisualChange = isDragging && (effectiveStart !== startHour || effectiveEnd !== endHour);

  const currentStartLabel = isDragging ? decimalToTimeLabel(effectiveStart) : startLabel;
  const currentEndLabel = isDragging ? decimalToTimeLabel(effectiveEnd) : endLabel;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={blockRef}
          className={cn(
            'absolute border text-[10px] text-white font-medium flex items-center justify-center overflow-hidden select-none transition-opacity hover:opacity-90',
            type === 'dayoff' || type === 'empty' ? 'top-0 bottom-0' : 'top-1 bottom-1 rounded',
            type === 'regular'
              ? (POSITION_COLORS[supportType || ''] || POSITION_FALLBACK)
              : TYPE_STYLES[type],
            isInteractive && !isDragging && 'cursor-grab z-[6]',
            isDragging && 'cursor-grabbing z-30 opacity-80',
            hasVisualChange && 'ring-2 ring-inset ring-dashed ring-amber-400/70',
            hasConflict && 'ring-2 ring-red-500 animate-pulse'
          )}
          style={{
            left: `${left}%`,
            width: `${width}%`,
            minWidth: '2px',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMoveLocal}
          onClick={(e) => { if (isInteractive) e.stopPropagation(); }}
        >
          {width > 0.8 && (
            <span className="truncate px-0.5">
              {type === 'dayoff' ? 'Day Off' : type === 'empty' ? '' : type === 'outage' ? 'OUT' : `${currentStartLabel}-${currentEndLabel}`}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs space-y-1 max-w-[200px]">
        <p className="font-semibold">{agentName}</p>
        <p>{currentStartLabel} – {currentEndLabel}</p>
        {supportType && <p className="text-muted-foreground">{supportType}</p>}
        {isOverridden && <p className="text-amber-400 font-medium">⚡ Overridden</p>}
        {outageReason && <p className="text-red-400">{outageReason}</p>}
        {hasConflict && <p className="text-red-400 font-medium">⚠️ Conflicts with Day Off on {conflictDay}</p>}
        {hasVisualChange && <p className="text-amber-400 font-medium">📐 Unsaved adjustment</p>}
      </TooltipContent>
    </Tooltip>
  );
}
