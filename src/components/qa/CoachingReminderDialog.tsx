import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface CoachingReminderDialogProps {
  open: boolean;
  onClose: () => void;
  coachingDate: string | null;
  coachingTime: string | null;
  evaluatorName: string | null;
}

export function CoachingReminderDialog({
  open,
  onClose,
  coachingDate,
  coachingTime,
  evaluatorName,
}: CoachingReminderDialogProps) {
  const formattedDate = coachingDate 
    ? format(new Date(coachingDate), 'EEEE, MMMM d, yyyy')
    : 'Not scheduled';

  const formattedTime = coachingTime || 'Time TBD';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Coaching Session Reminder
          </DialogTitle>
          <DialogDescription>
            Thank you for acknowledging this evaluation. Please note your upcoming coaching session.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Coaching Date</p>
                <p className="font-semibold">{formattedDate}</p>
              </div>
            </div>
            
            {coachingTime && (
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-semibold">{formattedTime}</p>
                </div>
              </div>
            )}

            {evaluatorName && (
              <p className="text-sm text-muted-foreground mt-2">
                Your coaching session will be conducted by <strong>{evaluatorName}</strong>.
              </p>
            )}
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            Please be prepared to discuss the feedback and action items from this evaluation. 
            If you have any scheduling conflicts, please reach out to your team lead as soon as possible.
          </p>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            Got it, thanks!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
