import { useEffect, useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { usePortalClock } from '@/context/PortalClockContext';
import { parseScheduleRange } from '@/lib/agentDashboardApi';
import { CalendarClock, Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';

interface NextShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAcknowledge: () => void;
  profileId: string;
  agentEmail?: string;
}

interface OffDay {
  date: Date;
  reason: string; // "Day Off", "Planned Leave", "Sick Leave", etc.
}

interface ShiftInfo {
  offDays: OffDay[];
  nextShiftDate: Date;
  nextShiftStartTime: string;
}

export function NextShiftDialog({ open, onOpenChange, onAcknowledge, profileId, agentEmail }: NextShiftDialogProps) {
  const { now } = usePortalClock();
  const [loading, setLoading] = useState(false);
  const [shiftInfo, setShiftInfo] = useState<ShiftInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const baseDateRef = useRef<Date | null>(null);

  useEffect(() => {
    if (!open || !profileId) return;

    // Capture the current date once when dialog opens
    baseDateRef.current = now;
    const baseDate = baseDateRef.current;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setShiftInfo(null);

    async function fetchNextShift() {
      const offDays: OffDay[] = [];
      let offset = 1; // start from tomorrow

      // Scan consecutive off days
      while (!cancelled) {
        const checkDate = addDays(baseDate, offset);
        const checkStr = format(checkDate, 'yyyy-MM-dd');

        const { data, error: err } = await supabase
          .rpc('get_effective_schedule', { p_agent_id: profileId, p_target_date: checkStr });

        if (cancelled) return;
        if (err) {
          setError('Could not fetch schedule.');
          setLoading(false);
          return;
        }

        const row = data?.[0];
        const isDayOff = row?.is_day_off ?? true;
        const schedule = row?.effective_schedule;

        if (!isDayOff && schedule && schedule.toLowerCase() !== 'day off') {
          // Found a work day — this is the next shift
          const parsed = parseScheduleRange(schedule);

          // If there are off days, fetch leave reasons
          if (offDays.length > 0 && agentEmail) {
            const firstOff = format(offDays[0].date, 'yyyy-MM-dd');
            const lastOff = format(offDays[offDays.length - 1].date, 'yyyy-MM-dd');

            const { data: leaveData } = await supabase
              .from('leave_requests')
              .select('outage_reason, start_date, end_date')
              .eq('status', 'approved')
              .ilike('agent_email', agentEmail)
              .lte('start_date', lastOff)
              .gte('end_date', firstOff);

            if (!cancelled && leaveData) {
              // Cross-reference each off day with leave requests
              for (const offDay of offDays) {
                const offDateStr = format(offDay.date, 'yyyy-MM-dd');
                const matchingLeave = leaveData.find(
                  (lr) => lr.start_date <= offDateStr && lr.end_date >= offDateStr
                );
                if (matchingLeave) {
                  offDay.reason = matchingLeave.outage_reason;
                }
              }
            }
          }

          if (cancelled) return;

          setShiftInfo({
            offDays,
            nextShiftDate: checkDate,
            nextShiftStartTime: parsed?.startTime ?? schedule,
          });
          setLoading(false);
          return;
        }

        // It's an off day — collect it
        offDays.push({ date: checkDate, reason: 'Day Off' });

        offset++;
        if (offset > 60) {
          setError('Could not find an upcoming shift within 60 days.');
          setLoading(false);
          return;
        }
      }
    }

    fetchNextShift();
    return () => { cancelled = true; };
  }, [open, profileId]);

  const formatDate = (d: Date) => format(d, 'EEEE, MMMM d, yyyy');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-blue-500" />
            Next Shift Reminder
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-4 pt-2">
              {loading && (
                <div className="flex items-center justify-center gap-2 py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Checking your schedule…</span>
                </div>
              )}

              {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 text-red-800 dark:text-red-200 text-sm">
                  {error}
                </div>
              )}

              {shiftInfo && shiftInfo.offDays.length === 0 && (
                <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 text-blue-900 dark:text-blue-100 text-sm leading-relaxed">
                  Please note your next shift is <strong>tomorrow, {formatDate(shiftInfo.nextShiftDate)}</strong>, at <strong>{shiftInfo.nextShiftStartTime} EST</strong>.
                </div>
              )}

              {shiftInfo && shiftInfo.offDays.length === 1 && (
                <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 text-blue-900 dark:text-blue-100 text-sm leading-relaxed space-y-2">
                  <p>
                    Tomorrow is your <strong>{shiftInfo.offDays[0].reason} — {formatDate(shiftInfo.offDays[0].date)}</strong>.
                  </p>
                  <p>
                    Your next shift is on <strong>{formatDate(shiftInfo.nextShiftDate)}</strong>, at <strong>{shiftInfo.nextShiftStartTime} EST</strong>.
                  </p>
                </div>
              )}

              {shiftInfo && shiftInfo.offDays.length > 1 && (
                <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 text-blue-900 dark:text-blue-100 text-sm leading-relaxed space-y-3">
                  <p className="font-medium">Your upcoming days off:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {shiftInfo.offDays.map((offDay, idx) => (
                      <li key={idx}>
                        <strong>{formatDate(offDay.date)}</strong> — {offDay.reason}
                      </li>
                    ))}
                  </ul>
                  <p>
                    Your next shift is on <strong>{formatDate(shiftInfo.nextShiftDate)}</strong>, at <strong>{shiftInfo.nextShiftStartTime} EST</strong>.
                  </p>
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={onAcknowledge}
            disabled={loading || !!error}
            className="bg-blue-600 hover:bg-blue-700"
          >
            I Acknowledge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
