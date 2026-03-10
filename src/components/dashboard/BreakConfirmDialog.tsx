import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePortalClock } from '@/context/PortalClockContext';
import { parseScheduleRange } from '@/lib/agentDashboardApi';
import { AlertTriangle, CheckCircle, Clock, Info } from 'lucide-react';

const BREAK_IN_ALLOWANCE_MINUTES = 10;
const BREAK_OUT_GRACE_MINUTES = 5;

interface BreakConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  breakSchedule?: string | null;
}

function formatMinutesToTime(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

export function BreakConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  breakSchedule,
}: BreakConfirmDialogProps) {
  const { now, currentTimeMinutes } = usePortalClock();

  const portalTimeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const parsed = breakSchedule ? parseScheduleRange(breakSchedule) : null;

  let isWithinWindow = false;
  let breakDurationMinutes = 0;
  let calculatedReturnMinutes = 0;
  let graceEndMinutes = 0;

  if (parsed) {
    const { startMinutes, endMinutes } = parsed;
    // Break duration (handle overnight)
    breakDurationMinutes = endMinutes >= startMinutes
      ? endMinutes - startMinutes
      : (1440 - startMinutes) + endMinutes;

    // Break-in window: schedule start to start + 10 min
    const windowEnd = startMinutes + BREAK_IN_ALLOWANCE_MINUTES;
    isWithinWindow = currentTimeMinutes >= startMinutes && currentTimeMinutes <= windowEnd;

    // Calculated return = now + break duration
    calculatedReturnMinutes = currentTimeMinutes + breakDurationMinutes;
    graceEndMinutes = calculatedReturnMinutes + BREAK_OUT_GRACE_MINUTES;
  }

  const hasSchedule = !!parsed;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {hasSchedule && !isWithinWindow ? (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            ) : hasSchedule ? (
              <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />
            ) : (
              <Info className="h-5 w-5 text-muted-foreground" />
            )}
            Confirm Break In
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2">
              {/* Live portal time */}
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Current time:</span>
                <span className="font-mono font-semibold">{portalTimeStr} EST</span>
              </div>

              {hasSchedule && parsed && (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Break schedule:</span>
                    <span className="font-semibold">{parsed.startTime} - {parsed.endTime} EST</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Return by:</span>
                    <span className="font-semibold">{formatMinutesToTime(calculatedReturnMinutes)} EST</span>
                    <span className="text-muted-foreground text-xs">({breakDurationMinutes} min break)</span>
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    5-minute grace period — return by {formatMinutesToTime(graceEndMinutes)} to avoid overbreak flag
                  </div>
                </>
              )}

              {hasSchedule && isWithinWindow && (
                <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 text-green-800 dark:text-green-200 text-sm font-medium">
                  ✅ You are within your break-in window. Proceed to break.
                </div>
              )}

              {hasSchedule && !isWithinWindow && (
                <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-amber-800 dark:text-amber-200 text-sm font-medium">
                  ⚠️ You are outside your scheduled break-in window ({parsed!.startTime} – {formatMinutesToTime(parsed!.startMinutes + BREAK_IN_ALLOWANCE_MINUTES)}).
                </div>
              )}

              {!hasSchedule && (
                <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  No break schedule found for today. Proceed to break.
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={hasSchedule && !isWithinWindow ? 'bg-amber-600 hover:bg-amber-700' : ''}
          >
            {hasSchedule && !isWithinWindow ? 'Break In Anyway' : 'Confirm Break In'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
