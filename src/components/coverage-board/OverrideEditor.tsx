import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import { parseTimeToDecimal } from './ShiftBlock';
import type { AgentScheduleRow, CoverageOverride } from '@/lib/coverageBoardApi';
import { getScheduleForDay, getDisplayName } from '@/lib/coverageBoardApi';

export interface PendingOverride {
  agent_id: string;
  date: string;
  override_start: string;
  override_end: string;
  reason: string;
  _delete?: boolean; // flag to mark for deletion on save
}

interface OverrideEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: AgentScheduleRow | null;
  date: Date | null;
  dayOffset: number;
  existingOverride?: CoverageOverride | null;
  pendingOverride?: PendingOverride | null;
  onApply: (override: PendingOverride) => void;
  onRemove: (agentId: string, dateStr: string) => void;
}

const OFFSET_TO_JS_DAY = [1, 2, 3, 4, 5, 6, 0];

export function OverrideEditor({
  open,
  onOpenChange,
  agent,
  date,
  dayOffset,
  existingOverride,
  pendingOverride,
  onApply,
  onRemove,
}: OverrideEditorProps) {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  // Pre-fill from pending or existing override
  useEffect(() => {
    if (pendingOverride && !pendingOverride._delete) {
      setStartTime(pendingOverride.override_start);
      setEndTime(pendingOverride.override_end);
      setReason(pendingOverride.reason);
    } else if (existingOverride) {
      setStartTime(existingOverride.override_start);
      setEndTime(existingOverride.override_end);
      setReason(existingOverride.reason || '');
    } else {
      setStartTime('');
      setEndTime('');
      setReason('');
    }
    setError('');
  }, [pendingOverride, existingOverride, open]);

  if (!agent || !date) return null;

  const dateStr = format(date, 'yyyy-MM-dd');
  const jsDayIndex = OFFSET_TO_JS_DAY[dayOffset];
  const { schedule: baseSchedule } = getScheduleForDay(agent, jsDayIndex);
  const displayName = getDisplayName(agent);
  const hasExisting = !!existingOverride || (!!pendingOverride && !pendingOverride._delete);

  const handleApply = () => {
    // Validate times
    const startDec = parseTimeToDecimal(startTime.trim());
    const endDec = parseTimeToDecimal(endTime.trim());

    if (startDec === null) {
      setError('Invalid start time. Use format like "9:00 AM" or "21:00".');
      return;
    }
    if (endDec === null) {
      setError('Invalid end time. Use format like "6:00 PM" or "18:00".');
      return;
    }

    onApply({
      agent_id: agent.id,
      date: dateStr,
      override_start: startTime.trim(),
      override_end: endTime.trim(),
      reason: reason.trim() || 'manual',
    });
    onOpenChange(false);
  };

  const handleRemove = () => {
    onRemove(agent.id, dateStr);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="text-base">Override Schedule</DialogTitle>
          <DialogDescription className="text-xs">
            {displayName} — {format(date, 'EEE, MMM d yyyy')}
          </DialogDescription>
        </DialogHeader>

        {/* Base schedule display */}
        <div className="text-xs text-muted-foreground bg-muted rounded px-3 py-2">
          <span className="font-medium">Base schedule:</span>{' '}
          {baseSchedule && baseSchedule.toLowerCase() !== 'day off' ? baseSchedule : 'None / Day Off'}
        </div>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Start Time</Label>
              <Input
                placeholder="e.g. 9:00 AM"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End Time</Label>
              <Input
                placeholder="e.g. 6:00 PM"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Reason (optional)</Label>
            <Input
              placeholder="e.g. schedule adjustment"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter className="flex items-center gap-2 sm:justify-between">
          {hasExisting ? (
            <Button variant="destructive" size="sm" onClick={handleRemove} className="gap-1">
              <Trash2 className="h-3 w-3" /> Remove Override
            </Button>
          ) : (
            <div />
          )}
          <Button size="sm" onClick={handleApply}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
