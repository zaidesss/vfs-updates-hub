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
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface LogoutConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  shiftSchedule?: string | null;
}

export function LogoutConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  shiftSchedule,
}: LogoutConfirmDialogProps) {
  const { now, currentTimeMinutes } = usePortalClock();

  const portalTimeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  // Parse the shift schedule to get end time
  const parsed = shiftSchedule ? parseScheduleRange(shiftSchedule) : null;

  // Determine if logging out early
  let isEarlyOut = false;
  let shiftEndLabel: string | null = null;

  if (parsed) {
    shiftEndLabel = parsed.endTime;
    const endMinutes = parsed.endMinutes;

    // Handle overnight shifts (end < start means crosses midnight)
    if (endMinutes < parsed.startMinutes) {
      // Overnight shift: early out if current time is after start AND before end (next day)
      // If currentTime >= start, they're in the first half of the shift → early
      // If currentTime < end, they're in the second half → not early
      if (currentTimeMinutes >= parsed.startMinutes) {
        isEarlyOut = true; // Still in first half before midnight
      } else if (currentTimeMinutes < endMinutes) {
        isEarlyOut = true; // Past midnight but before shift end
      } else {
        isEarlyOut = false; // Past shift end time
      }
    } else {
      // Normal daytime shift
      isEarlyOut = currentTimeMinutes < endMinutes;
    }
  }

  const hasSchedule = !!parsed;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {hasSchedule && isEarlyOut ? (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            Confirm Logout
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2">
              {/* Live portal time */}
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Current time:</span>
                <span className="font-mono font-semibold">{portalTimeStr} EST</span>
              </div>

              {hasSchedule && shiftEndLabel && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Your shift ends at:</span>
                  <span className="font-semibold">{shiftEndLabel} EST</span>
                </div>
              )}

              {hasSchedule && isEarlyOut && (
                <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-amber-800 dark:text-amber-200 text-sm font-medium">
                  ⚠️ If you log out now, you will be marked as <strong>Early Out</strong>.
                </div>
              )}

              {hasSchedule && !isEarlyOut && (
                <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 text-green-800 dark:text-green-200 text-sm font-medium">
                  ✅ You are within your logout window. Proceed to logout.
                </div>
              )}

              {!hasSchedule && (
                <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  No shift schedule found for today. Proceed to logout.
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={isEarlyOut ? 'bg-amber-600 hover:bg-amber-700' : ''}
          >
            {isEarlyOut ? 'Log Out Anyway' : 'Confirm Logout'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
