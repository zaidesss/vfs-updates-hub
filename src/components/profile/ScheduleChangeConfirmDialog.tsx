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
import { CalendarClock, AlertTriangle } from 'lucide-react';

interface ScheduleChangeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  effectiveDate: string; // formatted date string e.g. "Mon, Feb 17"
}

export function ScheduleChangeConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  effectiveDate,
}: ScheduleChangeConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/30">
              <CalendarClock className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            </div>
            <AlertDialogTitle className="text-lg">Confirm Schedule Changes</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-3 text-left space-y-3">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
              <span className="text-amber-900 dark:text-amber-200 text-sm">
                Schedule changes will take effect starting <strong>{effectiveDate}</strong>. Current week schedules are not affected.
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              To adjust schedules for the current week, please use the Coverage Board instead.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Confirm &amp; Save
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
